"""
Premium subscription billing — Razorpay integration.

Endpoints:
  POST /billing/create-subscription  → opens Razorpay Checkout
  POST /billing/verify-payment       → user-side verification (post-checkout)
  POST /billing/webhook              → Razorpay → us (source of truth)
  GET  /billing/status               → frontend entitlement check
  POST /billing/cancel               → cancel at period end

Notes:
- If Razorpay env vars are not set, endpoints return 503 (billing disabled).
  This lets the rest of the app run in dev without a Razorpay account.
- Webhook is the source of truth. verify-payment is a UX speedup so the user
  doesn't wait for the webhook round-trip; both paths are idempotent.
"""
import hmac
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.config import settings
from app.database import get_db
from app.routers.auth import get_current_user

logger = logging.getLogger("puzzle_hub.billing")

router = APIRouter(prefix="/billing", tags=["billing"])

# ── Rate limiter (mirrors pattern in routers/auth.py & games/shikaku.py) ───
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None


def _rate_limit(limit_string: str):
    def decorator(func):
        if limiter is not None:
            return limiter.limit(limit_string)(func)
        return func
    return decorator


# ── Razorpay client (lazy; tolerates missing creds) ────────────────────────
def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Billing is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )
    try:
        import razorpay
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="razorpay package not installed. Add to requirements.txt and pip install.",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _billing_enabled() -> bool:
    return bool(
        settings.RAZORPAY_KEY_ID
        and settings.RAZORPAY_KEY_SECRET
        and settings.RAZORPAY_PLAN_ID_MONTHLY
    )


def _verify_webhook_signature(raw_body: bytes, header_signature: str) -> bool:
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, header_signature or "")


def _verify_payment_signature(payment_id: str, sub_id: str, signature: str) -> bool:
    """Verifies Razorpay subscription payment signature.

    Razorpay spec: HMAC-SHA256("{payment_id}|{subscription_id}", key_secret).
    """
    secret = settings.RAZORPAY_KEY_SECRET
    if not secret:
        return False
    msg = f"{payment_id}|{sub_id}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/create-subscription", response_model=schemas.CreateSubscriptionResponse)
@_rate_limit("5/minute")
def create_subscription(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a Razorpay Subscription and return its id for the Checkout modal."""
    if not _billing_enabled():
        raise HTTPException(status_code=503, detail="Billing not configured.")

    client = _razorpay_client()

    try:
        sub = client.subscription.create({
            "plan_id": settings.RAZORPAY_PLAN_ID_MONTHLY,
            "customer_notify": 1,
            "total_count": 12,  # 12 monthly cycles = 1 year; user can cancel anytime
            "notes": {"username": current_user.username, "user_id": str(current_user.id)},
        })
    except Exception as e:
        logger.exception("Razorpay subscription.create failed")
        raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

    # Stash a pending subscription row so we can correlate on webhook
    existing = (
        db.query(models.Subscription)
        .filter(models.Subscription.provider_sub_id == sub["id"])
        .first()
    )
    if not existing:
        db.add(models.Subscription(
            user_id=current_user.id,
            provider="razorpay",
            provider_sub_id=sub["id"],
            plan="monthly_99",
            status=sub.get("status", "created"),
        ))
        db.commit()

    return schemas.CreateSubscriptionResponse(
        subscription_id=sub["id"],
        key_id=settings.RAZORPAY_KEY_ID,
        plan_id=settings.RAZORPAY_PLAN_ID_MONTHLY,
        amount_paise=settings.PREMIUM_MONTHLY_PRICE_PAISE,
    )


@router.post("/verify-payment", response_model=schemas.VerifyPaymentResponse)
@_rate_limit("10/minute")
def verify_payment(
    request: Request,
    body: schemas.VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """User-side verification — speeds up the UX by promoting the user
    immediately instead of waiting for the webhook. Webhook will reconcile."""
    if not _verify_payment_signature(
        body.razorpay_payment_id, body.razorpay_subscription_id, body.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Promote user
    premium_until = _now_utc() + timedelta(days=30)
    current_user.is_premium = True
    current_user.premium_until = premium_until

    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.provider_sub_id == body.razorpay_subscription_id)
        .first()
    )
    if sub:
        sub.status = "active"
        sub.current_period_end = premium_until

    # Idempotent transaction record
    tx_exists = (
        db.query(models.Transaction)
        .filter(models.Transaction.provider_payment_id == body.razorpay_payment_id)
        .first()
    )
    if not tx_exists:
        db.add(models.Transaction(
            user_id=current_user.id,
            subscription_id=sub.id if sub else None,
            provider="razorpay",
            provider_payment_id=body.razorpay_payment_id,
            amount_paise=settings.PREMIUM_MONTHLY_PRICE_PAISE,
            currency="INR",
            status="captured",
            raw_payload=json.dumps({"source": "verify-payment", "sub_id": body.razorpay_subscription_id}),
        ))

    db.commit()
    return schemas.VerifyPaymentResponse(ok=True, premium_until=premium_until)


@router.post("/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay → us. Source of truth. Always 200 on signature pass even if
    we don't recognize the event (so Razorpay doesn't retry forever)."""
    raw = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not _verify_webhook_signature(raw, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    etype = event.get("event", "")
    payload = event.get("payload", {})
    logger.info(f"Razorpay webhook: {etype}")

    sub_entity = payload.get("subscription", {}).get("entity") or {}
    pay_entity = payload.get("payment", {}).get("entity") or {}

    sub_id = sub_entity.get("id") or pay_entity.get("subscription_id")
    sub_row: Optional[models.Subscription] = None
    if sub_id:
        sub_row = (
            db.query(models.Subscription)
            .filter(models.Subscription.provider_sub_id == sub_id)
            .first()
        )

    if etype == "subscription.activated" and sub_row:
        sub_row.status = "active"
        # current_end is unix seconds
        ce = sub_entity.get("current_end")
        if ce:
            sub_row.current_period_end = datetime.fromtimestamp(ce, tz=timezone.utc)
        user = db.query(models.User).filter(models.User.id == sub_row.user_id).first()
        if user:
            user.is_premium = True
            user.premium_until = sub_row.current_period_end or (_now_utc() + timedelta(days=30))

    elif etype == "subscription.charged" and sub_row:
        ce = sub_entity.get("current_end")
        if ce:
            sub_row.current_period_end = datetime.fromtimestamp(ce, tz=timezone.utc)
        sub_row.status = "active"
        user = db.query(models.User).filter(models.User.id == sub_row.user_id).first()
        if user:
            user.is_premium = True
            user.premium_until = sub_row.current_period_end

    elif etype in ("subscription.cancelled", "subscription.completed", "subscription.expired") and sub_row:
        sub_row.status = etype.split(".")[1]
        # Don't immediately revoke premium — let access run until period_end.

    # Always log payment events idempotently
    if pay_entity.get("id"):
        pay_id = pay_entity["id"]
        existing = (
            db.query(models.Transaction)
            .filter(models.Transaction.provider_payment_id == pay_id)
            .first()
        )
        if not existing:
            db.add(models.Transaction(
                user_id=sub_row.user_id if sub_row else 0,
                subscription_id=sub_row.id if sub_row else None,
                provider="razorpay",
                provider_payment_id=pay_id,
                amount_paise=int(pay_entity.get("amount", 0)),
                currency=pay_entity.get("currency", "INR"),
                status=pay_entity.get("status", "captured"),
                raw_payload=json.dumps(event)[:8000],  # trim huge payloads
            ))

    db.commit()
    return {"received": True}


@router.get("/status", response_model=schemas.BillingStatus)
@_rate_limit("30/minute")
def billing_status(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Lazy expiry: if premium_until has passed, downgrade.
    now = _now_utc()
    if current_user.is_premium and current_user.premium_until:
        pu = current_user.premium_until
        if pu.tzinfo is None:
            pu = pu.replace(tzinfo=timezone.utc)
        if pu < now:
            current_user.is_premium = False
            db.commit()

    active_sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .filter(models.Subscription.status.in_(("active", "authenticated")))
        .order_by(models.Subscription.id.desc())
        .first()
    )

    return schemas.BillingStatus(
        is_premium=current_user.is_premium,
        premium_until=current_user.premium_until,
        plan=active_sub.plan if active_sub else None,
        can_cancel=bool(active_sub and not active_sub.cancel_at_period_end),
    )


@router.post("/cancel", response_model=schemas.CancelSubscriptionResponse)
@_rate_limit("3/minute")
def cancel_subscription(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .filter(models.Subscription.status.in_(("active", "authenticated")))
        .order_by(models.Subscription.id.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    client = _razorpay_client()
    try:
        client.subscription.cancel(sub.provider_sub_id, {"cancel_at_cycle_end": 1})
    except Exception as e:
        logger.exception("Razorpay subscription.cancel failed")
        raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

    sub.cancel_at_period_end = True
    db.commit()
    return schemas.CancelSubscriptionResponse(ok=True, cancels_at=sub.current_period_end)
