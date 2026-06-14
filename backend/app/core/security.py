import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Union
import jwt
import bcrypt
from app.core.config import settings

def _prehash(password: str) -> bytes:
    """Map an arbitrary-length password into a fixed 44-byte token before bcrypt.

    bcrypt silently truncates input at 72 bytes, so two long passwords sharing
    a 72-byte prefix would collide. SHA-256 + base64 yields a fixed 44-byte,
    null-byte-free value that sidesteps both the truncation and the NUL issue.
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    hashed_bytes = hashed_password.encode("utf-8")
    # New scheme: password was pre-hashed before bcrypt.
    try:
        if bcrypt.checkpw(_prehash(plain_password), hashed_bytes):
            return True
    except Exception:
        pass
    # Legacy scheme: bcrypt applied directly to the (truncated) password.
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(_prehash(password), salt).decode("utf-8")


# A real bcrypt hash of a random value, generated once at import so the decoy
# below burns the same CPU as a genuine verify (same cost factor).
_DUMMY_HASH = bcrypt.hashpw(_prehash("decoy-never-matches"), bcrypt.gensalt())


def dummy_verify() -> None:
    """Constant-time-ish decoy: run a bcrypt check to match the cost of a real
    verify when the username doesn't exist. Result is intentionally ignored."""
    try:
        bcrypt.checkpw(_prehash("decoy"), _DUMMY_HASH)
    except Exception:
        pass


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_solve_token(puzzle_id: str, game_type: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=120)  # Valid for 2 mins
    to_encode = {
        "exp": expire,
        "puzzle_id": puzzle_id,
        "game_type": game_type,
        "solve": True
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_solve_token(token: str, game_type: str) -> bool:
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("game_type") != game_type:
            return False
        if not payload.get("solve"):
            return False
        return True
    except jwt.PyJWTError:
        return False


def create_reset_token(username: str) -> str:
    """Short-lived token for the password-reset email link.

    Embeds `iat` (issued-at) so the reset endpoint can reject a token that was
    issued before the user's last password change — making reset links single-use.
    """
    now = datetime.now(timezone.utc)
    to_encode = {
        "exp": now + timedelta(minutes=30),
        "iat": now,
        "sub": username,
        "purpose": "password_reset",
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_reset_token(token: str) -> Union[tuple, None]:
    """Returns (username, issued_at_datetime) if the reset token is structurally
    valid, else None. The caller must still check issued_at against the user's
    password_changed_at to enforce single use."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        username = payload.get("sub")
        iat = payload.get("iat")
        if not username or iat is None:
            return None
        issued_at = datetime.fromtimestamp(iat, tz=timezone.utc)
        return username, issued_at
    except jwt.PyJWTError:
        return None

