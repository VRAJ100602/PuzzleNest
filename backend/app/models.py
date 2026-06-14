from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    # Optional — used for password recovery and receipts. Uniqueness enforced
    # via partial index in migrate.py (SQLite ALTER can't add UNIQUE columns).
    email = Column(String, nullable=True, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    coins = Column(Integer, default=0)
    achievements = Column(JSON, default='[]')
    store_purchases = Column(JSON, default='[]')
    last_login_date = Column(String, nullable=True)   # ISO date: YYYY-MM-DD
    login_streak = Column(Integer, default=0)

    # Bumped whenever the password changes; invalidates outstanding reset
    # tokens (a token issued before this time is rejected → single use).
    password_changed_at = Column(DateTime(timezone=True), nullable=True)

    # ── Premium subscription fields ───────────────────────────────────────
    is_premium = Column(Boolean, default=False, nullable=False)
    premium_until = Column(DateTime(timezone=True), nullable=True)
    razorpay_customer_id = Column(String, nullable=True, unique=True, index=True)

    stats = relationship("GameStats", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("PuzzleSession", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")


class GameStats(Base):
    __tablename__ = "game_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_type = Column(String, nullable=False)  # 'sudoku', '2048', 'shikaku', 'wordle'
    games_played = Column(Integer, default=0)
    games_won = Column(Integer, default=0)
    fast_time = Column(Float, nullable=True)  # in seconds
    high_score = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="stats")


class PuzzleSession(Base):
    __tablename__ = "puzzle_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_type = Column(String, nullable=False)
    state_data = Column(JSON, nullable=True)  # Current board layout, grid shading
    is_completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    time_taken = Column(Float, default=0.0)  # in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="sessions")


# ── Subscriptions (Razorpay) ──────────────────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String, default="razorpay", nullable=False)
    provider_sub_id = Column(String, unique=True, nullable=False, index=True)
    plan = Column(String, default="monthly_99", nullable=False)
    # statuses: created | authenticated | active | paused | halted | cancelled | completed | expired
    status = Column(String, default="created", nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")


# ── Transactions (audit log; one row per Razorpay payment event) ───────────
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True, index=True)
    provider = Column(String, default="razorpay", nullable=False)
    provider_payment_id = Column(String, unique=True, nullable=False, index=True)
    amount_paise = Column(Integer, nullable=False)  # 9900 = ₹99.00
    currency = Column(String, default="INR", nullable=False)
    # statuses: created | authorized | captured | refunded | failed
    status = Column(String, default="created", nullable=False)
    raw_payload = Column(Text, nullable=True)  # JSON-stringified webhook payload for audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Weekly Tournament + Entries ───────────────────────────────────────────
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    # ISO week identifier, e.g. "2026-W24" — unique per tournament
    week_id = Column(String, unique=True, nullable=False, index=True)
    game_type = Column(String, nullable=False)        # 'sudoku', 'pipes', ...
    difficulty = Column(String, default="medium", nullable=False)
    seed = Column(Integer, nullable=False)            # Random seed used to generate puzzle
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="active", nullable=False)  # active | ended
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entries = relationship("TournamentEntry", back_populates="tournament", cascade="all, delete-orphan")


class TournamentEntry(Base):
    __tablename__ = "tournament_entries"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Integer, default=0, nullable=False)
    time_taken = Column(Float, default=0.0, nullable=False)  # seconds
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    tournament = relationship("Tournament", back_populates="entries")
    user = relationship("User")
