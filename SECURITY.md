# PuzzleNest — Security

This document describes the security model, the controls in place, and the
checklist for deploying safely. No system is "unhackable" — the goal here is to
make automated attacks fail outright and targeted attacks expensive, while
keeping the blast radius of any single bug small.

## Reporting a vulnerability
Email **vrajpanchal1006@gmail.com** with reproduction steps. See
`web/.well-known/security.txt`. Please give a reasonable window to fix before
public disclosure and don't degrade service for other players while testing.

---

## Threat model (what we defend against)
| Threat | Defense |
|---|---|
| Credential stuffing / brute force | Per-IP rate limits on auth (slowapi); bcrypt cost factor |
| Password DB theft | bcrypt hashing (salted, slow); SHA-256 pre-hash avoids 72-byte truncation |
| JWT forgery | Strong `SECRET_KEY` enforced in production; HS256 |
| Username enumeration | Generic login error + constant-time decoy hash on missing user |
| Password-reset link abuse | Single-use tokens (invalidated by `password_changed_at`), 30-min expiry, purpose-scoped |
| SQL injection | SQLAlchemy ORM everywhere; no string-built SQL |
| XSS | Input validation (alphanumeric usernames) + output escaping + CSP |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| CSRF | Bearer tokens in `Authorization` header (not cookies) → CSRF N/A |
| Clickjacked/blind payment fraud | Razorpay-hosted checkout; HMAC-verified webhooks; idempotent transactions |
| Host-header injection | `TrustedHostMiddleware` (production) |
| Request-body memory DoS | `MAX_BODY_BYTES` middleware (413 on oversize) |
| WebSocket flooding | 10 KB payload cap; JWT-authenticated; guest names can't impersonate |
| Game-score cheating | Server-side solve tokens + minimum solve-time anti-cheat |
| Info leakage | `/docs` disabled in prod; generic errors; stack not advertised |

## Controls implemented
- **Auth**: bcrypt + SHA-256 pre-hash, JWT (30-min access tokens), per-route rate limits.
- **Secrets**: `SECRET_KEY` fail-fast in production (`app/core/config.py::_enforce_secret_key`).
- **Headers** (`app/main.py::SecurityHeadersMiddleware`): CSP, HSTS (prod),
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- **CORS**: explicit origin allowlist, not `*`.
- **Output escaping**: `escapeHtml()` on all user-controlled strings rendered to `innerHTML`.
- **Billing**: webhook HMAC-SHA256 verification, payment-signature verification,
  `provider_payment_id` UNIQUE for idempotency, lazy + daily premium expiry.

### Known trade-off: CSP `'unsafe-inline'`
The frontend uses inline `onclick=` handlers and inline `<style>`, so the CSP
allows `'unsafe-inline'` for script/style. This means the CSP is *not* the
primary XSS defense — input validation and output escaping are. To reach a
strict nonce-based CSP later, refactor inline handlers into external JS and add
per-response nonces.

---

## Production deploy checklist
1. **Secrets** — set a strong `SECRET_KEY` (`python -c "import secrets; print(secrets.token_hex(32))"`).
   Set `ENV=production`. Copy `backend/.env.example` → `.env` and fill it in.
2. **Host/CORS** — set `ALLOWED_HOSTS` to your domain(s) and `ALLOWED_ORIGINS`
   to the exact front-end origin(s).
3. **HTTPS** — terminate TLS at the host/proxy. HSTS is auto-added in production.
4. **Run uvicorn behind the proxy correctly** so rate limiting keys on the real
   client IP (not the proxy) and the tech stack isn't advertised:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000 \
       --proxy-headers --forwarded-allow-ips="<proxy-ip-or-*>" \
       --no-server-header
   ```
   `--forwarded-allow-ips` must list the trusted proxy only — never blindly
   trust `X-Forwarded-For` from arbitrary clients (it's spoofable).
5. **Database** — use PostgreSQL (`DATABASE_URL=postgresql+psycopg://...`), not
   SQLite. Run `python migrate.py` after deploy.
6. **Razorpay** — set live keys + webhook secret; point the webhook at
   `https://<domain>/api/v1/billing/webhook`.
7. **Dependencies** — run `pip-audit` before each release (see below).
8. **Backups** — schedule DB backups; test a restore.

## Auditing dependencies
```
pip install pip-audit
cd backend && pip-audit -r requirements.txt
```

## Running the security tests
```
cd backend && python -m pytest tests/test_security.py -v
```
