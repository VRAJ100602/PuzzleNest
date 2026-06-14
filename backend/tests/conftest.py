"""
Shared fixtures for backend tests.

IMPORTANT: env vars are set BEFORE importing any app module, because
app.core.config.Settings and app.database.engine are built at import time.
"""
import os
import pathlib

_TESTS_DIR = pathlib.Path(__file__).parent
_TEST_DB = _TESTS_DIR / "test_billing.db"

# Must happen before `from app...` imports
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-only"
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_dummykey"
os.environ["RAZORPAY_KEY_SECRET"] = "test_key_secret"
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "test_webhook_secret"
os.environ["RAZORPAY_PLAN_ID_MONTHLY"] = "plan_test_monthly"

import pytest
from fastapi.testclient import TestClient

# Fresh DB file per test session
if _TEST_DB.exists():
    _TEST_DB.unlink()

from app.main import app                      # noqa: E402  (env must be set first)
from app.database import SessionLocal, Base, engine  # noqa: E402
from app import models                        # noqa: E402
from app.core import security                 # noqa: E402

Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def make_user(db, username: str) -> models.User:
    user = models.User(
        username=username,
        hashed_password=security.get_password_hash("Testpass1"),
        coins=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_headers(username: str) -> dict:
    token = security.create_access_token(username)
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
