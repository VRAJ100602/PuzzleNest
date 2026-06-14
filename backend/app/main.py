import os
import pathlib
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.database import engine, Base
from app.routers import auth, stats, multiplayer, sessions, billing, tournaments
from app.routers.games import (
    sudoku, wordle, shikaku, game_2048, nonogram, pipes, tower,
    minesweeper, memory, sliding, lightsout, colorflood, pacman, levels,
    # ── New puzzle types ──────────────────────────────────────────────
    crossword, atoms, mosaic, lits, mambo, kings, snap,
)
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("puzzlenest")

# Create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)

# ── Security Headers Middleware ──────────────────────────────────────────────
# Content-Security-Policy.
# 'unsafe-inline' is present for script/style because the frontend uses inline
# event handlers (onclick=...) and inline <style>. The CSP still blocks the
# high-impact vectors: injecting scripts from other origins, plugins/objects,
# clickjacking (frame-ancestors), <base> hijacking, and form exfiltration.
# Primary XSS defense remains input validation (alphanumeric usernames) plus
# output escaping on the client. Razorpay + Google Fonts origins are allowlisted.
_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https://*.razorpay.com https://api.razorpay.com; "
    "frame-src https://*.razorpay.com https://api.razorpay.com; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'; "
    "upgrade-insecure-requests"
)

_PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), browsing-topics=()"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds essential security headers to every HTTP response."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = _CSP
        response.headers["Permissions-Policy"] = _PERMISSIONS_POLICY
        # Isolate browsing context without breaking the Razorpay iframe.
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        # Don't leak the tech stack.
        response.headers["X-Powered-By"] = "PuzzleNest"
        response.headers["Server"] = "PuzzleNest"
        # Only add HSTS in production (requires HTTPS)
        if settings.ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

# ── App Initialization ──────────────────────────────────────────────────────
# Disable Swagger/OpenAPI docs in production to reduce attack surface
is_production = settings.ENV == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
)

# ── Middleware Stack ─────────────────────────────────────────────────────────
# 1. Security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

# 2. Host-header allowlist (blocks Host-header injection / cache poisoning).
#    Only enabled when ALLOWED_HOSTS is configured (production).
from starlette.middleware.trustedhost import TrustedHostMiddleware
_allowed_hosts = [h.strip() for h in settings.ALLOWED_HOSTS.split(",") if h.strip()]
if _allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

# 3. CORS — restricted to configured origins only
allowed_origins = [
    origin.strip()
    for origin in settings.ALLOWED_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# 4. Reject oversized request bodies early (memory-exhaustion guard).
from starlette.responses import JSONResponse

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl is not None:
        try:
            if int(cl) > settings.MAX_BODY_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Request body too large"})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
    return await call_next(request)

# 5. Request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_host = request.client.host if request.client else "unknown"
    logger.info(f"{request.method} {request.url.path} from {client_host}")
    response = await call_next(request)
    return response

# ── Rate Limiting ────────────────────────────────────────────────────────────
# slowapi is imported and configured here; per-route limits are applied
# in the individual routers (see auth.py for @limiter.limit decorators).
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.info("Rate limiting enabled (slowapi)")
except ImportError:
    logger.warning(
        "slowapi not installed — rate limiting disabled. "
        "Install with: pip install slowapi"
    )
    limiter = None

# ── Routers ──────────────────────────────────────────────────────────────────
# Include Authentication and Stats Routers
app.include_router(auth.router,        prefix=settings.API_V1_STR)
app.include_router(stats.router,       prefix=settings.API_V1_STR)
app.include_router(multiplayer.router, prefix=settings.API_V1_STR)
app.include_router(sessions.router,    prefix=settings.API_V1_STR)
app.include_router(billing.router,     prefix=settings.API_V1_STR)
app.include_router(tournaments.router, prefix=settings.API_V1_STR)


# Include Game Routers
app.include_router(sudoku.router, prefix=settings.API_V1_STR)
app.include_router(wordle.router, prefix=settings.API_V1_STR)
app.include_router(shikaku.router, prefix=settings.API_V1_STR)
app.include_router(game_2048.router, prefix=settings.API_V1_STR)
app.include_router(nonogram.router, prefix=settings.API_V1_STR)
app.include_router(pipes.router, prefix=settings.API_V1_STR)
app.include_router(tower.router, prefix=settings.API_V1_STR)
app.include_router(minesweeper.router, prefix=settings.API_V1_STR)
app.include_router(memory.router, prefix=settings.API_V1_STR)
app.include_router(sliding.router, prefix=settings.API_V1_STR)
app.include_router(lightsout.router, prefix=settings.API_V1_STR)
app.include_router(colorflood.router, prefix=settings.API_V1_STR)
app.include_router(pacman.router, prefix=settings.API_V1_STR)
app.include_router(levels.router, prefix=settings.API_V1_STR)

# ── New game routers ──────────────────────────────────────────────────────
app.include_router(crossword.router, prefix=settings.API_V1_STR)
app.include_router(atoms.router, prefix=settings.API_V1_STR)
app.include_router(mosaic.router, prefix=settings.API_V1_STR)
app.include_router(lits.router, prefix=settings.API_V1_STR)
app.include_router(mambo.router, prefix=settings.API_V1_STR)
app.include_router(kings.router, prefix=settings.API_V1_STR)
app.include_router(snap.router,  prefix=settings.API_V1_STR)

# ── Daily premium-expiry sweep ────────────────────────────────────────────
# Lazy expiry in /billing/status covers users who open the site; this loop
# catches subscribers who lapse without ever hitting that endpoint.
import asyncio
from datetime import datetime, timezone

async def _premium_expiry_loop():
    from app.database import SessionLocal
    from app import models
    while True:
        try:
            db = SessionLocal()
            # SQLite stores naive UTC datetimes (models use datetime.utcnow)
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            expired = (
                db.query(models.User)
                .filter(models.User.is_premium == True)
                .filter(models.User.premium_until.isnot(None))
                .filter(models.User.premium_until < now)
                .all()
            )
            for u in expired:
                u.is_premium = False
            if expired:
                db.commit()
                logger.info(f"Premium expiry sweep: downgraded {len(expired)} user(s)")
            db.close()
        except Exception:
            logger.exception("Premium expiry sweep failed")
        await asyncio.sleep(24 * 3600)

@app.on_event("startup")
async def _start_premium_sweep():
    asyncio.create_task(_premium_expiry_loop())


@app.get("/api")
def root():
    return {"message": "Welcome to the Puzzle Hub API! Go to /docs for Swagger UI documentation."}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}

# ── Serve Web Frontend (must be last – catches all remaining paths) ───────
class SmartCacheStaticFiles(StaticFiles):
    """Static file server with asset-type-aware caching.

    - CSS/JS/SVG/fonts: cached for 1 day, revalidate after (fast 304s)
    - HTML: no-cache (always check for fresh version, still uses ETag)
    - Service worker: no-cache (browsers need fresh SW to detect updates)
    """
    _LONG_CACHE_EXTS = {".css", ".js", ".svg", ".woff2", ".woff", ".ttf", ".png", ".jpg", ".ico", ".json"}

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        ext = pathlib.Path(path).suffix.lower()
        if path == "sw.js":
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        elif ext in self._LONG_CACHE_EXTS:
            response.headers["Cache-Control"] = "public, max-age=86400, must-revalidate"
        else:
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        return response

_WEB_DIR = pathlib.Path(__file__).parent.parent.parent / "web"
if _WEB_DIR.exists():
    app.mount("/", SmartCacheStaticFiles(directory=str(_WEB_DIR), html=True), name="web")
