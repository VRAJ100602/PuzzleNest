import os
import secrets
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger("puzzlenest.config")

# Sentinel for "no key configured". Never use this value as a real key.
_INSECURE_DEFAULT_KEY = "change_me_to_a_random_secret_key_before_production"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Puzzle Hub API"
    API_V1_STR: str = "/api/v1"

    # SECRET_KEY must be set via environment variable or .env file in production.
    # Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
    # In dev, if unset, a random ephemeral key is generated at startup (tokens
    # won't survive a restart, which is fine locally). In production, booting
    # with a missing/weak key is a fatal error — see _enforce_secret_key().
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Short-lived access token (30 minutes)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh token lives 7 days

    # Environment: "development" or "production"
    ENV: str = os.getenv("ENV", "development")

    # Max accepted request body in bytes (reject larger → 413). Game/stats/billing
    # payloads are tiny; this caps memory-exhaustion attempts. Default 1 MiB.
    MAX_BODY_BYTES: int = int(os.getenv("MAX_BODY_BYTES", str(1024 * 1024)))

    # Comma-separated Host allowlist (blocks Host-header injection). Empty = allow
    # all (dev). Set to your domain(s) in production, e.g. "puzzlenest.app,www.puzzlenest.app".
    ALLOWED_HOSTS: str = os.getenv("ALLOWED_HOSTS", "")

    # CORS: comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:19006,http://localhost:8081,http://localhost:3000"
    )

    # SQLite Database config (use PostgreSQL in production)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./puzzle_hub.db")

    # ── Outbound email (password reset) ──────────────────────────────────────
    # Leave blank in dev: reset links are logged to the server console instead.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "PuzzleNest <no-reply@puzzlenest.local>")
    SITE_URL: str = os.getenv("SITE_URL", "http://localhost:8000")

    # ── Razorpay (Premium subscription billing) ─────────────────────────────
    # Leave blank in dev to disable billing endpoints gracefully.
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    RAZORPAY_PLAN_ID_MONTHLY: str = os.getenv("RAZORPAY_PLAN_ID_MONTHLY", "")
    PREMIUM_MONTHLY_PRICE_PAISE: int = int(os.getenv("PREMIUM_MONTHLY_PRICE_PAISE", "9900"))  # ₹99.00

    class Config:
        case_sensitive = True
        env_file = ".env"


def _enforce_secret_key(s: "Settings") -> None:
    """Fail-fast on a missing/weak SECRET_KEY in production; auto-generate in dev.

    A predictable JWT signing key lets anyone forge tokens and impersonate any
    user — so this is treated as a hard boot error in production.
    """
    is_prod = s.ENV.lower() in ("production", "prod")
    weak = (not s.SECRET_KEY) or s.SECRET_KEY == _INSECURE_DEFAULT_KEY or len(s.SECRET_KEY) < 32

    if is_prod and weak:
        raise RuntimeError(
            "FATAL: SECRET_KEY is missing or too weak for production.\n"
            "Set a strong key (>=32 chars) via the SECRET_KEY env var.\n"
            'Generate one: python -c "import secrets; print(secrets.token_hex(32))"'
        )

    if weak:
        # Dev convenience: random per-process key. Tokens won't survive restart.
        s.SECRET_KEY = secrets.token_hex(32)
        logger.warning(
            "SECRET_KEY not set — generated a random ephemeral key for this dev "
            "session. Set SECRET_KEY in .env to keep sessions across restarts."
        )


settings = Settings()
_enforce_secret_key(settings)
