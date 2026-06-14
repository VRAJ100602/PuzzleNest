from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Any
from datetime import datetime
import re

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def _validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not any(c.isupper() for c in v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(c.islower() for c in v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    return v


def _validate_email_format(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip().lower()
    if v == "":
        return None
    if len(v) > 254 or not _EMAIL_RE.match(v):
        raise ValueError("Invalid email address")
    return v


class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    email: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3-30 characters")
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores allowed)")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        return _validate_password_strength(v)

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        return _validate_email_format(v)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    coins: int
    achievements: Any
    store_purchases: Any
    last_login_date: Optional[str] = None
    login_streak: int = 0
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ── Password reset / email management ───────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    username_or_email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        return _validate_password_strength(v)

class UpdateEmailRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        v = _validate_email_format(v)
        if v is None:
            raise ValueError("Email is required")
        return v


class DailyRewardResponse(BaseModel):
    already_claimed: bool
    coins_earned: int
    login_streak: int
    total_coins: int
    day_number: int   # 1-7 within the weekly cycle
    message: str


class AchievementInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    coins: int
    unlocked: bool


class AchievementsCheckResponse(BaseModel):
    newly_unlocked: list
    all_achievements: list


class DeductCoinsRequest(BaseModel):
    amount: int


class PurchaseItemRequest(BaseModel):
    item_id: str
    price: int


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None


class GameStatsBase(BaseModel):
    game_type: str
    games_played: int = 0
    games_won: int = 0
    fast_time: Optional[float] = None
    high_score: int = 0

class GameStatsResponse(GameStatsBase):
    model_config = ConfigDict(from_attributes=True)

class GameStatsUpdate(BaseModel):
    game_type: str
    won: bool
    time_taken: Optional[float] = None
    score: Optional[int] = None
    solve_token: Optional[str] = None



class PuzzleSessionBase(BaseModel):
    game_type: str
    state_data: Any

class PuzzleSessionCreate(PuzzleSessionBase):
    pass

class PuzzleSessionUpdate(BaseModel):
    state_data: Any
    is_completed: bool
    score: int
    time_taken: float

class PuzzleSessionResponse(PuzzleSessionBase):
    id: int
    user_id: int
    is_completed: bool
    score: int
    time_taken: float
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Billing / Premium ─────────────────────────────────────────────────────
class BillingStatus(BaseModel):
    is_premium: bool
    premium_until: Optional[datetime] = None
    plan: Optional[str] = None
    can_cancel: bool = False


class CreateSubscriptionResponse(BaseModel):
    subscription_id: str
    key_id: str
    plan_id: str
    amount_paise: int
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    ok: bool
    premium_until: Optional[datetime] = None


class CancelSubscriptionResponse(BaseModel):
    ok: bool
    cancels_at: Optional[datetime] = None
