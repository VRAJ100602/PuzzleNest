from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import time
from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

_lb_cache = {}
_LB_TTL = 30

def _cached(key, ttl=_LB_TTL):
    entry = _lb_cache.get(key)
    if entry and time.time() - entry[0] < ttl:
        return entry[1]
    return None

def _set_cache(key, data):
    _lb_cache[key] = (time.time(), data)

@router.get("/", response_model=List[schemas.GameStatsResponse])
def get_user_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = db.query(models.GameStats).filter(models.GameStats.user_id == current_user.id).all()
    return stats


@router.post("/update")
def update_game_stats(
    payload: schemas.GameStatsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Anti-Cheat check
    games_requiring_token = {"sudoku", "shikaku", "nonogram", "tower", "wordle", "minesweeper"}
    if payload.won and payload.game_type in games_requiring_token:
        from app.core.security import verify_solve_token
        if not verify_solve_token(payload.solve_token, payload.game_type):
            raise HTTPException(status_code=403, detail="Invalid or missing solve token")

    # Fetch or create the specific stats record
    stats = db.query(models.GameStats).filter(
        models.GameStats.user_id == current_user.id,
        models.GameStats.game_type == payload.game_type
    ).first()
    
    if not stats:
        stats = models.GameStats(
            user_id=current_user.id,
            game_type=payload.game_type,
            games_played=0,
            games_won=0,
            high_score=0
        )
        db.add(stats)
        db.flush()
        
    stats.games_played += 1
    if payload.won:
        stats.games_won += 1
        current_user.coins += 10
        if payload.time_taken is not None:
            if stats.fast_time is None or payload.time_taken < stats.fast_time:
                stats.fast_time = payload.time_taken
                
    if payload.score is not None and payload.score > stats.high_score:
        stats.high_score = payload.score
        
    db.commit()
    db.refresh(stats)
    return {"stats": stats, "coins": current_user.coins}


@router.post("/bulk-sync", response_model=List[schemas.GameStatsResponse])
def bulk_sync_stats(
    payload_list: List[schemas.GameStatsUpdate],
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.core.security import verify_solve_token
    games_requiring_token = {"sudoku", "shikaku", "nonogram", "tower", "wordle", "minesweeper"}
    
    # Pre-validate all tokens before making updates
    for payload in payload_list:
        if payload.won and payload.game_type in games_requiring_token:
            if not verify_solve_token(payload.solve_token, payload.game_type):
                raise HTTPException(status_code=403, detail=f"Invalid or missing solve token for {payload.game_type}")

    updated_stats = []
    for payload in payload_list:
        stats = db.query(models.GameStats).filter(
            models.GameStats.user_id == current_user.id,
            models.GameStats.game_type == payload.game_type
        ).first()
        
        if not stats:
            stats = models.GameStats(
                user_id=current_user.id,
                game_type=payload.game_type,
                games_played=0,
                games_won=0,
                high_score=0
            )
            db.add(stats)
            db.flush()
            
        stats.games_played += 1
        if payload.won:
            stats.games_won += 1
            if payload.time_taken is not None:
                if stats.fast_time is None or payload.time_taken < stats.fast_time:
                    stats.fast_time = payload.time_taken
                    
        if payload.score is not None and payload.score > stats.high_score:
            stats.high_score = payload.score
            
    db.commit()
    
    # Retrieve all updated stats
    stats_list = db.query(models.GameStats).filter(models.GameStats.user_id == current_user.id).all()
    return stats_list


@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    cached = _cached("overall")
    if cached is not None:
        return cached

    from sqlalchemy import func
    results = db.query(
        models.User.username,
        func.sum(models.GameStats.games_won).label("total_wins"),
        func.sum(models.GameStats.games_played).label("total_played")
    ).join(
        models.GameStats, models.User.id == models.GameStats.user_id
    ).group_by(
        models.User.username
    ).order_by(
        func.sum(models.GameStats.games_won).desc()
    ).limit(5).all()

    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append({
            "rank": rank,
            "username": r.username,
            "total_wins": int(r.total_wins or 0),
            "total_played": int(r.total_played or 0)
        })

    _set_cache("overall", leaderboard)
    return leaderboard


@router.get("/leaderboard/{game_type}/scores")
def get_game_score_leaderboard(game_type: str, db: Session = Depends(get_db)):
    """Public top-10 high scores for a specific game type."""
    cache_key = f"scores:{game_type}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    results = db.query(
        models.User.username,
        models.User.is_premium,
        models.GameStats.high_score,
        models.GameStats.games_won,
        models.GameStats.fast_time,
    ).join(
        models.GameStats, models.User.id == models.GameStats.user_id
    ).filter(
        models.GameStats.game_type == game_type,
        models.GameStats.high_score > 0
    ).order_by(
        models.GameStats.high_score.desc()
    ).limit(10).all()

    data = [
        {"rank": i+1, "username": r.username, "is_premium": bool(r.is_premium),
         "high_score": r.high_score, "games_won": r.games_won, "fast_time": r.fast_time}
        for i, r in enumerate(results)
    ]
    _set_cache(cache_key, data)
    return data


@router.get("/leaderboard/{game_type}/fastest")
def get_fastest_leaderboard(game_type: str, db: Session = Depends(get_db)):
    cache_key = f"fastest:{game_type}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    results = db.query(
        models.User.username,
        models.User.is_premium,
        models.GameStats.fast_time
    ).join(
        models.GameStats, models.User.id == models.GameStats.user_id
    ).filter(
        models.GameStats.game_type == game_type,
        models.GameStats.fast_time.isnot(None)
    ).order_by(
        models.GameStats.fast_time.asc()
    ).limit(10).all()

    leaderboard = []
    for rank, r in enumerate(results, 1):
        leaderboard.append({
            "rank": rank,
            "username": r.username,
            "is_premium": bool(r.is_premium),
            "fast_time": r.fast_time
        })
    _set_cache(cache_key, leaderboard)
    return leaderboard


@router.post("/check-achievements", response_model=schemas.AchievementsCheckResponse)
def check_achievements(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluate every achievement against the user's current stats.
    Unlock newly-earned ones, award coins, and return the full list."""
    from app.core.achievements import ACHIEVEMENTS
    import json

    all_stats = db.query(models.GameStats).filter(
        models.GameStats.user_id == current_user.id
    ).all()

    total_wins   = sum(s.games_won   for s in all_stats)
    total_played = sum(s.games_played for s in all_stats)
    unique_wins  = sum(1 for s in all_stats if s.games_won > 0)
    wins_by_game = {s.game_type: s.games_won   for s in all_stats}
    time_by_game = {s.game_type: s.fast_time   for s in all_stats}
    login_streak = current_user.login_streak or 0

    # Parse currently-unlocked achievement ids
    try:
        unlocked_ids = set(json.loads(current_user.achievements or "[]"))
    except Exception:
        unlocked_ids = set()

    newly_unlocked = []
    coins_to_award = 0

    for ach in ACHIEVEMENTS:
        c = ach["criteria"]
        earned = False

        if c["type"] == "total_wins":
            earned = total_wins >= c["threshold"]
        elif c["type"] == "total_played":
            earned = total_played >= c["threshold"]
        elif c["type"] == "login_streak":
            earned = login_streak >= c["threshold"]
        elif c["type"] == "game_wins":
            earned = wins_by_game.get(c["game"], 0) >= c["threshold"]
        elif c["type"] == "unique_game_wins":
            earned = unique_wins >= c["threshold"]
        elif c["type"] == "fast_time":
            t = time_by_game.get(c["game"])
            earned = t is not None and t <= c["threshold"]

        if earned and ach["id"] not in unlocked_ids:
            unlocked_ids.add(ach["id"])
            newly_unlocked.append({
                "id":          ach["id"],
                "name":        ach["name"],
                "description": ach["description"],
                "icon":        ach["icon"],
                "coins":       ach["coins"],
            })
            coins_to_award += ach["coins"]

    if newly_unlocked:
        current_user.achievements = json.dumps(list(unlocked_ids))
        current_user.coins = (current_user.coins or 0) + coins_to_award
        db.commit()

    all_achievements = [
        {
            "id":          a["id"],
            "name":        a["name"],
            "description": a["description"],
            "icon":        a["icon"],
            "coins":       a["coins"],
            "unlocked":    a["id"] in unlocked_ids,
        }
        for a in ACHIEVEMENTS
    ]

    return schemas.AchievementsCheckResponse(
        newly_unlocked=newly_unlocked,
        all_achievements=all_achievements,
    )


@router.post("/deduct-coins")
def deduct_coins(
    payload: schemas.DeductCoinsRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.coins < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    current_user.coins -= payload.amount
    db.commit()
    return {"coins": current_user.coins}


@router.post("/purchase-item")
def purchase_item(
    payload: schemas.PurchaseItemRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.coins < payload.price:
        raise HTTPException(status_code=400, detail="Insufficient coins")

    import json
    try:
        purchases = json.loads(current_user.store_purchases or '[]')
    except Exception:
        purchases = []

    if payload.item_id in purchases:
        raise HTTPException(status_code=400, detail="Item already purchased")

    purchases.append(payload.item_id)
    current_user.store_purchases = json.dumps(purchases)
    current_user.coins -= payload.price
    db.commit()
    return {"coins": current_user.coins, "store_purchases": purchases}


@router.get("/profile/{username}")
def get_public_profile(username: str, db: Session = Depends(get_db)):
    """Public profile — no auth required."""
    import json
    from app.core.achievements import ACHIEVEMENTS

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_stats = db.query(models.GameStats).filter(
        models.GameStats.user_id == user.id
    ).all()

    total_wins   = sum(s.games_won   for s in all_stats)
    total_played = sum(s.games_played for s in all_stats)

    try:
        unlocked_ids = set(json.loads(user.achievements or "[]"))
    except Exception:
        unlocked_ids = set()

    achievements = [
        {
            "id": a["id"],
            "name": a["name"],
            "description": a["description"],
            "icon": a["icon"],
            "unlocked": a["id"] in unlocked_ids,
        }
        for a in ACHIEVEMENTS
    ]

    game_stats = [
        {
            "game_type": s.game_type,
            "games_played": s.games_played,
            "games_won": s.games_won,
            "high_score": s.high_score,
            "fast_time": s.fast_time,
        }
        for s in all_stats if s.games_played > 0
    ]

    return {
        "username": user.username,
        "is_premium": bool(user.is_premium),
        "login_streak": user.login_streak or 0,
        "total_wins": total_wins,
        "total_played": total_played,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "achievements": achievements,
        "game_stats": game_stats,
    }

