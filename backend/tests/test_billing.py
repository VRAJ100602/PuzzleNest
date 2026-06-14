"""
Billing router unit tests — HMAC verification, webhook idempotency,
lazy premium expiry. No real Razorpay calls are made.

Run from backend/:
    python -m pytest tests/test_billing.py -v
"""
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

from app import models
from app.routers.billing import _verify_payment_signature, _verify_webhook_signature

from conftest import auth_headers, make_user

API = "/api/v1"
WEBHOOK_SECRET = "test_webhook_secret"
KEY_SECRET = "test_key_secret"


def _sign_webhook(raw_body: bytes) -> str:
    return hmac.new(WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()


def _sign_payment(payment_id: str, sub_id: str) -> str:
    msg = f"{payment_id}|{sub_id}".encode()
    return hmac.new(KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()


# ── Signature helpers (pure unit) ───────────────────────────────────────────

def test_payment_signature_valid():
    sig = _sign_payment("pay_abc", "sub_xyz")
    assert _verify_payment_signature("pay_abc", "sub_xyz", sig) is True


def test_payment_signature_tampered():
    sig = _sign_payment("pay_abc", "sub_xyz")
    assert _verify_payment_signature("pay_abc", "sub_DIFFERENT", sig) is False
    assert _verify_payment_signature("pay_abc", "sub_xyz", sig[:-1] + "0") is False
    assert _verify_payment_signature("pay_abc", "sub_xyz", "") is False


def test_webhook_signature_valid():
    body = b'{"event":"ping"}'
    assert _verify_webhook_signature(body, _sign_webhook(body)) is True


def test_webhook_signature_tampered():
    body = b'{"event":"ping"}'
    good = _sign_webhook(body)
    assert _verify_webhook_signature(b'{"event":"evil"}', good) is False
    assert _verify_webhook_signature(body, "deadbeef") is False
    assert _verify_webhook_signature(body, "") is False


# ── Webhook endpoint ────────────────────────────────────────────────────────

def test_webhook_rejects_bad_signature(client):
    body = json.dumps({"event": "payment.captured", "payload": {}})
    r = client.post(
        f"{API}/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": "bogus", "Content-Type": "application/json"},
    )
    assert r.status_code == 400


def test_webhook_accepts_good_signature(client):
    body = json.dumps({"event": "some.unknown.event", "payload": {}}).encode()
    r = client.post(
        f"{API}/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": _sign_webhook(body), "Content-Type": "application/json"},
    )
    assert r.status_code == 200
    assert r.json() == {"received": True}


def test_webhook_subscription_activated_promotes_user(client, db):
    user = make_user(db, "wh_user")
    db.add(models.Subscription(
        user_id=user.id, provider="razorpay",
        provider_sub_id="sub_activate1", plan="monthly_99", status="created",
    ))
    db.commit()

    current_end = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())
    body = json.dumps({
        "event": "subscription.activated",
        "payload": {
            "subscription": {"entity": {"id": "sub_activate1", "current_end": current_end}},
            "payment": {"entity": {"id": "pay_act1", "amount": 9900, "currency": "INR", "status": "captured"}},
        },
    }).encode()
    r = client.post(
        f"{API}/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": _sign_webhook(body), "Content-Type": "application/json"},
    )
    assert r.status_code == 200

    db.expire_all()
    refreshed = db.query(models.User).filter(models.User.id == user.id).first()
    assert refreshed.is_premium is True
    assert refreshed.premium_until is not None

    tx = db.query(models.Transaction).filter(
        models.Transaction.provider_payment_id == "pay_act1").all()
    assert len(tx) == 1


def test_webhook_idempotent_no_double_credit(client, db):
    """Replaying the same payment event must not create a second Transaction."""
    user = make_user(db, "idem_user")
    db.add(models.Subscription(
        user_id=user.id, provider="razorpay",
        provider_sub_id="sub_idem1", plan="monthly_99", status="created",
    ))
    db.commit()

    body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {"entity": {
                "id": "pay_idem1", "subscription_id": "sub_idem1",
                "amount": 9900, "currency": "INR", "status": "captured",
            }},
        },
    }).encode()
    headers = {"X-Razorpay-Signature": _sign_webhook(body), "Content-Type": "application/json"}

    r1 = client.post(f"{API}/billing/webhook", content=body, headers=headers)
    r2 = client.post(f"{API}/billing/webhook", content=body, headers=headers)
    assert r1.status_code == 200 and r2.status_code == 200

    db.expire_all()
    tx = db.query(models.Transaction).filter(
        models.Transaction.provider_payment_id == "pay_idem1").all()
    assert len(tx) == 1, "webhook replay must be a no-op"


# ── verify-payment endpoint ─────────────────────────────────────────────────

def test_verify_payment_bad_signature_rejected(client, db):
    user = make_user(db, "vp_bad_user")
    r = client.post(
        f"{API}/billing/verify-payment",
        json={
            "razorpay_payment_id": "pay_vp1",
            "razorpay_subscription_id": "sub_vp1",
            "razorpay_signature": "totally-wrong",
        },
        headers=auth_headers(user.username),
    )
    assert r.status_code == 400

    db.expire_all()
    refreshed = db.query(models.User).filter(models.User.id == user.id).first()
    assert refreshed.is_premium is False, "no premium without valid signature"


def test_verify_payment_good_signature_promotes(client, db):
    user = make_user(db, "vp_good_user")
    db.add(models.Subscription(
        user_id=user.id, provider="razorpay",
        provider_sub_id="sub_vp2", plan="monthly_99", status="created",
    ))
    db.commit()

    r = client.post(
        f"{API}/billing/verify-payment",
        json={
            "razorpay_payment_id": "pay_vp2",
            "razorpay_subscription_id": "sub_vp2",
            "razorpay_signature": _sign_payment("pay_vp2", "sub_vp2"),
        },
        headers=auth_headers(user.username),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True

    db.expire_all()
    refreshed = db.query(models.User).filter(models.User.id == user.id).first()
    assert refreshed.is_premium is True
    sub = db.query(models.Subscription).filter(
        models.Subscription.provider_sub_id == "sub_vp2").first()
    assert sub.status == "active"


# ── status endpoint ─────────────────────────────────────────────────────────

def test_status_free_user(client, db):
    user = make_user(db, "free_user")
    r = client.get(f"{API}/billing/status", headers=auth_headers(user.username))
    assert r.status_code == 200
    data = r.json()
    assert data["is_premium"] is False
    assert data["can_cancel"] is False


def test_status_active_premium(client, db):
    user = make_user(db, "prem_user")
    user.is_premium = True
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=10)
    db.commit()

    r = client.get(f"{API}/billing/status", headers=auth_headers(user.username))
    assert r.status_code == 200
    assert r.json()["is_premium"] is True


def test_status_lazy_expiry_downgrades(client, db):
    """Expired premium_until must flip is_premium to False on read."""
    user = make_user(db, "expired_user")
    user.is_premium = True
    user.premium_until = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()

    r = client.get(f"{API}/billing/status", headers=auth_headers(user.username))
    assert r.status_code == 200
    assert r.json()["is_premium"] is False

    db.expire_all()
    refreshed = db.query(models.User).filter(models.User.id == user.id).first()
    assert refreshed.is_premium is False, "lazy expiry must persist the downgrade"


def test_status_requires_auth(client):
    r = client.get(f"{API}/billing/status")
    assert r.status_code == 401
