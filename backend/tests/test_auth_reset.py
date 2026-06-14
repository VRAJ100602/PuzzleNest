"""
Email + password-reset flow tests.

Run from backend/:
    python -m pytest tests/test_auth_reset.py -v
"""
from app import models
from app.core import security

from conftest import auth_headers, make_user

API = "/api/v1"


# ── forgot-password (never leaks account existence) ─────────────────────────

def test_forgot_password_unknown_account_generic_200(client):
    r = client.post(f"{API}/auth/forgot-password",
                    json={"username_or_email": "no_such_user_xyz"})
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_forgot_password_user_without_email_generic_200(client, db):
    make_user(db, "noemail_user")
    r = client.post(f"{API}/auth/forgot-password",
                    json={"username_or_email": "noemail_user"})
    assert r.status_code == 200
    assert r.json()["ok"] is True   # same response as unknown account


# ── reset-password ──────────────────────────────────────────────────────────

def test_reset_password_with_valid_token(client, db):
    user = make_user(db, "reset_user")
    token = security.create_reset_token(user.username)

    r = client.post(f"{API}/auth/reset-password",
                    json={"token": token, "new_password": "Newpass123"})
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Old password no longer works, new one does
    db.expire_all()
    refreshed = db.query(models.User).filter(models.User.id == user.id).first()
    assert security.verify_password("Newpass123", refreshed.hashed_password)
    assert not security.verify_password("Testpass1", refreshed.hashed_password)


def test_reset_password_with_garbage_token(client):
    r = client.post(f"{API}/auth/reset-password",
                    json={"token": "not-a-real-token", "new_password": "Newpass123"})
    assert r.status_code == 400


def test_reset_password_access_token_rejected(client, db):
    """A normal login JWT must not work as a reset token (purpose claim)."""
    user = make_user(db, "purpose_user")
    login_token = security.create_access_token(user.username)
    r = client.post(f"{API}/auth/reset-password",
                    json={"token": login_token, "new_password": "Newpass123"})
    assert r.status_code == 400


def test_reset_password_weak_password_rejected(client, db):
    user = make_user(db, "weakpass_user")
    token = security.create_reset_token(user.username)
    r = client.post(f"{API}/auth/reset-password",
                    json={"token": token, "new_password": "short"})
    assert r.status_code == 422   # pydantic validation


# ── update-email ────────────────────────────────────────────────────────────

def test_update_email_sets_email(client, db):
    user = make_user(db, "email_user")
    r = client.post(f"{API}/auth/update-email",
                    json={"email": "Email_User@Example.COM"},
                    headers=auth_headers(user.username))
    assert r.status_code == 200
    assert r.json()["email"] == "email_user@example.com"   # normalised lowercase


def test_update_email_duplicate_rejected(client, db):
    u1 = make_user(db, "dup_a")
    u2 = make_user(db, "dup_b")
    r1 = client.post(f"{API}/auth/update-email",
                     json={"email": "shared@example.com"},
                     headers=auth_headers(u1.username))
    assert r1.status_code == 200
    r2 = client.post(f"{API}/auth/update-email",
                     json={"email": "shared@example.com"},
                     headers=auth_headers(u2.username))
    assert r2.status_code == 400


def test_update_email_requires_auth(client):
    r = client.post(f"{API}/auth/update-email", json={"email": "x@example.com"})
    assert r.status_code == 401


# ── register with email ─────────────────────────────────────────────────────

def test_register_with_email(client, db):
    r = client.post(f"{API}/auth/register", json={
        "username": "reg_email_user",
        "password": "Testpass1",
        "email": "reg@example.com",
    })
    assert r.status_code == 200
    user = db.query(models.User).filter(models.User.username == "reg_email_user").first()
    assert user.email == "reg@example.com"
