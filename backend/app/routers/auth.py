from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from app.database import get_db
from app import models, schemas
from app.core import security
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login-oauth")

# ── Rate Limiter Setup ──────────────────────────────────────────────────────
# Import the limiter from main.py if slowapi is installed, otherwise no-op
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None

def _rate_limit(limit_string):
    """Decorator that applies rate limiting if slowapi is installed, otherwise no-op."""
    def decorator(func):
        if limiter is not None:
            return limiter.limit(limit_string)(func)
        return func
    return decorator


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=schemas.Token)
@_rate_limit("3/minute")
def register(request: Request, user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    if user_in.email:
        email_taken = db.query(models.User).filter(models.User.email == user_in.email).first()
        if email_taken:
            raise HTTPException(status_code=400, detail="Email already in use")

    hashed_password = security.get_password_hash(user_in.password)
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password
    )
    db.add(user)
    db.flush()  # Get user ID
    
    # Initialize game stats for the 4 core games
    games = ["sudoku", "2048", "shikaku", "wordle"]
    for game in games:
        stats = models.GameStats(
            user_id=user.id,
            game_type=game,
            games_played=0,
            games_won=0,
            high_score=0
        )
        db.add(stats)
        
    db.commit()
    db.refresh(user)
    
    access_token = security.create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
@_rate_limit("5/minute")
def login(request: Request, user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if not user:
        # Burn equivalent CPU so timing can't reveal whether the username exists.
        security.dummy_verify()
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = security.create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}


# OAuth2-compatible endpoint for FastAPI documentation (Swagger UI)
from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login-oauth", response_model=schemas.Token)
@_rate_limit("5/minute")
def login_oauth(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        security.dummy_verify()
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = security.create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ── Password reset ───────────────────────────────────────────────────────────
import logging
logger = logging.getLogger("puzzle_hub.auth")


def _send_reset_email(to_email: str, reset_link: str) -> bool:
    """Send the reset link via SMTP. Returns False if SMTP is not configured
    (dev mode) — in that case the link is logged to the server console."""
    if not settings.SMTP_HOST:
        logger.info(f"[DEV] Password reset link for {to_email}: {reset_link}")
        return False
    import smtplib
    from email.mime.text import MIMEText
    msg = MIMEText(
        "Someone (hopefully you) requested a password reset for your PuzzleNest account.\n\n"
        f"Reset your password here (link valid for 30 minutes):\n{reset_link}\n\n"
        "If you didn't request this, you can ignore this email — your password is unchanged."
    )
    msg["Subject"] = "PuzzleNest — Reset your password"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


@router.post("/forgot-password")
@_rate_limit("3/minute")
def forgot_password(request: Request, body: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always returns the same generic response so usernames/emails can't be enumerated."""
    ident = body.username_or_email.strip()
    user = db.query(models.User).filter(
        (models.User.username == ident) | (models.User.email == ident.lower())
    ).first()

    if user and user.email:
        token = security.create_reset_token(user.username)
        reset_link = f"{settings.SITE_URL}/reset.html?token={token}"
        try:
            _send_reset_email(user.email, reset_link)
        except Exception:
            logger.exception("Failed to send reset email")
    elif user and not user.email:
        logger.info(f"Password reset requested for '{user.username}' but no email on file")

    return {"ok": True, "message": "If that account has an email on file, a reset link has been sent."}


@router.post("/reset-password")
@_rate_limit("5/minute")
def reset_password(request: Request, body: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    from datetime import datetime, timezone

    result = security.verify_reset_token(body.token)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Request a new one.")
    username, issued_at = result

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Account no longer exists")

    # Single-use: reject a token issued before the most recent password change.
    if user.password_changed_at is not None:
        last_change = user.password_changed_at
        if last_change.tzinfo is None:
            last_change = last_change.replace(tzinfo=timezone.utc)
        if issued_at <= last_change:
            raise HTTPException(
                status_code=400,
                detail="This reset link has already been used. Request a new one.",
            )

    user.hashed_password = security.get_password_hash(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "message": "Password updated. You can sign in now."}


@router.post("/update-email", response_model=schemas.UserResponse)
@_rate_limit("5/minute")
def update_email(
    request: Request,
    body: schemas.UpdateEmailRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    taken = db.query(models.User).filter(
        models.User.email == body.email,
        models.User.id != current_user.id,
    ).first()
    if taken:
        raise HTTPException(status_code=400, detail="Email already in use by another account")

    current_user.email = body.email
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Daily Login Reward ───────────────────────────────────────────────────────
# Coins awarded per streak day (cycles every 7 days)
_DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 50]

@router.post("/daily-reward", response_model=schemas.DailyRewardResponse)
def claim_daily_reward(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import date, timedelta

    today = date.today().isoformat()  # "YYYY-MM-DD"

    # Already claimed today?
    if current_user.last_login_date == today:
        day_idx = ((current_user.login_streak or 1) - 1) % 7
        return schemas.DailyRewardResponse(
            already_claimed=True,
            coins_earned=0,
            login_streak=current_user.login_streak or 0,
            total_coins=current_user.coins or 0,
            day_number=day_idx + 1,
            message="Already claimed today — come back tomorrow! 🌙",
        )

    # Work out new streak value
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if current_user.last_login_date == yesterday:
        new_streak = (current_user.login_streak or 0) + 1
    else:
        new_streak = 1   # gap ≥ 2 days → reset streak

    day_idx = (new_streak - 1) % 7
    coins_earned = _DAILY_REWARDS[day_idx]

    current_user.last_login_date = today
    current_user.login_streak = new_streak
    current_user.coins = (current_user.coins or 0) + coins_earned
    db.commit()

    return schemas.DailyRewardResponse(
        already_claimed=False,
        coins_earned=coins_earned,
        login_streak=new_streak,
        total_coins=current_user.coins,
        day_number=day_idx + 1,
        message=f"Day {day_idx + 1} reward claimed! +{coins_earned} 🪙",
    )
