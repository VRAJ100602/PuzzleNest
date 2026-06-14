"""
Weekly tournament router.

Auto-rotating: each ISO week features one game (cycling through ten). The
active tournament is created lazily on the first request of the week.

Endpoints:
  GET  /tournaments/active             — current week's tournament + leaderboard
  GET  /tournaments/{id}/leaderboard   — top 50 entries
  POST /tournaments/{id}/submit        — submit a score (auth required, one-shot)
  GET  /tournaments/history            — past tournaments + your placement
"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter(prefix="/tournaments", tags=["tournaments"])

# Games eligible for tournaments (must have a /new endpoint)
TOURNAMENT_GAMES = [
    "sudoku", "crossword", "pipes", "mosaic", "shikaku",
    "lits", "snap", "atoms", "kings", "mambo",
    "nonogram", "wordle", "minesweeper", "2048",
]


def _week_id(d: datetime) -> str:
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _week_bounds(d: datetime) -> tuple[datetime, datetime]:
    # ISO week starts Monday
    monday = d - timedelta(days=d.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    sunday_end = monday + timedelta(days=7)
    return monday, sunday_end


def _seed_for(week_id: str, game_type: str) -> int:
    digest = hashlib.sha256(f"{week_id}:{game_type}".encode()).hexdigest()
    return int(digest[:8], 16)


def _get_or_create_active(db: Session) -> models.Tournament:
    now = datetime.now(timezone.utc)
    week = _week_id(now)
    existing = db.query(models.Tournament).filter_by(week_id=week).first()
    if existing:
        return existing
    # Pick game by week number — cycles through the list
    _, iso_week, _ = now.isocalendar()
    game = TOURNAMENT_GAMES[iso_week % len(TOURNAMENT_GAMES)]
    start, end = _week_bounds(now)
    t = models.Tournament(
        week_id=week,
        game_type=game,
        difficulty="medium",
        seed=_seed_for(week, game),
        starts_at=start,
        ends_at=end,
        status="active",
    )
    db.add(t)
    # Close out any previous active tournaments
    db.query(models.Tournament).filter(
        models.Tournament.status == "active",
        models.Tournament.week_id != week,
    ).update({"status": "ended"})
    db.commit()
    db.refresh(t)
    return t


class TournamentInfo(BaseModel):
    id: int
    week_id: str
    game_type: str
    difficulty: str
    seed: int
    starts_at: datetime
    ends_at: datetime
    status: str
    entries_count: int
    your_entry: Optional[dict] = None


class LeaderboardRow(BaseModel):
    rank: int
    username: str
    score: int
    time_taken: float
    submitted_at: datetime
    is_premium: bool = False


class SubmitRequest(BaseModel):
    score: int
    time_taken: float


@router.get("/active", response_model=TournamentInfo)
def get_active(db: Session = Depends(get_db)):
    t = _get_or_create_active(db)
    entries_count = db.query(models.TournamentEntry).filter_by(tournament_id=t.id).count()
    return TournamentInfo(
        id=t.id, week_id=t.week_id, game_type=t.game_type,
        difficulty=t.difficulty, seed=t.seed, starts_at=t.starts_at,
        ends_at=t.ends_at, status=t.status, entries_count=entries_count,
    )


@router.get("/{tournament_id}/leaderboard", response_model=List[LeaderboardRow])
def leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Tournament).filter_by(id=tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    # Best entry per user, ranked by score desc, time asc
    entries = (
        db.query(models.TournamentEntry, models.User)
        .join(models.User, models.User.id == models.TournamentEntry.user_id)
        .filter(models.TournamentEntry.tournament_id == tournament_id)
        .order_by(
            models.TournamentEntry.score.desc(),
            models.TournamentEntry.time_taken.asc(),
        )
        .limit(50)
        .all()
    )
    seen = set()
    rows: List[LeaderboardRow] = []
    rank = 1
    for entry, user in entries:
        if user.id in seen:
            continue
        seen.add(user.id)
        rows.append(LeaderboardRow(
            rank=rank,
            username=user.username,
            score=entry.score,
            time_taken=entry.time_taken,
            submitted_at=entry.submitted_at,
            is_premium=bool(user.is_premium),
        ))
        rank += 1
    return rows


@router.post("/{tournament_id}/submit")
def submit_entry(
    tournament_id: int,
    payload: SubmitRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    t = db.query(models.Tournament).filter_by(id=tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if t.status != "active":
        raise HTTPException(status_code=400, detail="Tournament has ended")
    now = datetime.now(timezone.utc)
    # Compare timezone-aware datetimes (ends_at is server_default tz-aware)
    if t.ends_at and now > t.ends_at:
        raise HTTPException(status_code=400, detail="Tournament window closed")
    if payload.score < 0 or payload.score > 10000:
        raise HTTPException(status_code=400, detail="Invalid score")
    if payload.time_taken < 0 or payload.time_taken > 36000:
        raise HTTPException(status_code=400, detail="Invalid time")
    # Keep only the best entry per user (highest score, fastest tiebreak)
    existing = (
        db.query(models.TournamentEntry)
        .filter_by(tournament_id=tournament_id, user_id=user.id)
        .order_by(
            models.TournamentEntry.score.desc(),
            models.TournamentEntry.time_taken.asc(),
        )
        .first()
    )
    if existing and (existing.score > payload.score or
                     (existing.score == payload.score and existing.time_taken <= payload.time_taken)):
        return {"ok": True, "improved": False, "best_score": existing.score, "best_time": existing.time_taken}
    entry = models.TournamentEntry(
        tournament_id=tournament_id,
        user_id=user.id,
        score=payload.score,
        time_taken=payload.time_taken,
    )
    db.add(entry)
    db.commit()
    return {"ok": True, "improved": True, "score": payload.score, "time_taken": payload.time_taken}


@router.get("/history")
def history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    past = (
        db.query(models.Tournament)
        .filter(models.Tournament.status == "ended")
        .order_by(models.Tournament.ends_at.desc())
        .limit(8)
        .all()
    )
    out = []
    for t in past:
        best = (
            db.query(models.TournamentEntry)
            .filter_by(tournament_id=t.id, user_id=user.id)
            .order_by(
                models.TournamentEntry.score.desc(),
                models.TournamentEntry.time_taken.asc(),
            )
            .first()
        )
        out.append({
            "week_id": t.week_id,
            "game_type": t.game_type,
            "your_score": best.score if best else None,
            "your_time": best.time_taken if best else None,
        })
    return out
