from fastapi import APIRouter, Query
import random

router = APIRouter(prefix="/games/memory", tags=["memory"])

@router.get("/new")
def get_new_memory(
    difficulty: str = Query("medium"),
    level: int = None
):
    emojis = [
        '🌟', '🎯', '🔥', '💎', '🎪', '🌈', '🎸', '🏆', '🚀', '🌺', '🦋', '🎭', '🌙', '🍀', '⭐', '🎨', '🎵', '🌊',
        '🍕', '🚗', '🐱', '🐼', '👾', '👑', '🔑', '💡', '🎈', '🍉', '🍦', '🧸'
    ]
    
    if level is not None:
        level = max(1, min(level, 100))
        pairs = int(6 + (level - 1) * 18 / 99)
        cols = 8 if pairs > 18 else 6 if pairs > 8 else 4
    elif difficulty == "easy":
        pairs, cols = 6, 4
    elif difficulty == "medium":
        pairs, cols = 8, 4
    elif difficulty == "hard":
        pairs, cols = 12, 6
    elif difficulty == "expert":
        pairs, cols = 18, 6
    else:
        pairs, cols = 8, 4
        
    selected = emojis[:pairs]
    cards = selected * 2
    random.shuffle(cards)
    rows = (pairs * 2) // cols
    data = {"cards": cards, "rows": rows, "cols": cols, "pairs": pairs}
    if level is not None:
        data["level"] = level
    return data
