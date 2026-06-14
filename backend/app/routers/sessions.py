"""Puzzle-session persistence (Continue Where You Left Off)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/save", response_model=schemas.PuzzleSessionResponse)
def save_session(
    payload: schemas.PuzzleSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or overwrite the single active session for a game type."""
    existing = (
        db.query(models.PuzzleSession)
        .filter(
            models.PuzzleSession.user_id == current_user.id,
            models.PuzzleSession.game_type == payload.game_type,
            models.PuzzleSession.is_completed == False,
        )
        .first()
    )

    if existing:
        existing.state_data = payload.state_data
        db.commit()
        db.refresh(existing)
        return existing

    session = models.PuzzleSession(
        user_id=current_user.id,
        game_type=payload.game_type,
        state_data=payload.state_data,
        is_completed=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/active", response_model=List[schemas.PuzzleSessionResponse])
def get_active_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all incomplete sessions for the current user."""
    return (
        db.query(models.PuzzleSession)
        .filter(
            models.PuzzleSession.user_id == current_user.id,
            models.PuzzleSession.is_completed == False,
        )
        .order_by(models.PuzzleSession.updated_at.desc())
        .all()
    )


@router.post("/{session_id}/complete")
def complete_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a session as completed (called on game win/lose)."""
    session = (
        db.query(models.PuzzleSession)
        .filter(
            models.PuzzleSession.id == session_id,
            models.PuzzleSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_completed = True
    db.commit()
    return {"ok": True}


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hard-delete a session (e.g. user discards a saved game)."""
    session = (
        db.query(models.PuzzleSession)
        .filter(
            models.PuzzleSession.id == session_id,
            models.PuzzleSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}
