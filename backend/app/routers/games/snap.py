"""
Snap (Memory Match) — alias over the memory game, served at /games/snap.
"""
from fastapi import APIRouter, Query
import random, hashlib

router = APIRouter(prefix="/games/snap", tags=["snap"])

# Emojis defined via Unicode escape sequences so the source stays pure-ASCII
# and is immune to any file-encoding mismatch (cp1252 vs utf-8) on Windows.
EMOJIS = [
    "\U0001F31F", "\U0001F3AF", "\U0001F525", "\U0001F48E",  # 🌟 🎯 🔥 💎
    "\U0001F3AA", "\U0001F308", "\U0001F3B8", "\U0001F3C6",  # 🎪 🌈 🎸 🏆
    "\U0001F680", "\U0001F33A", "\U0001F98B", "\U0001F3AD",  # 🚀 🌺 🦋 🎭
    "\U0001F319", "\U0001F340", "\U00002B50", "\U0001F3A8",  # 🌙 🍀 ⭐ 🎨
    "\U0001F3B5", "\U0001F30A", "\U0001F355", "\U0001F697",  # 🎵 🌊 🍕 🚗
    "\U0001F431", "\U0001F43C", "\U0001F47E", "\U0001F451",  # 🐱 🐼 👾 👑
]

def _build_deck(pairs: int, cols: int):
    selected = EMOJIS[:pairs]
    cards = selected * 2
    random.shuffle(cards)
    rows = (pairs * 2 + cols - 1) // cols
    return {"cards": cards, "rows": rows, "cols": cols, "pairs": pairs}


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_snap(difficulty: str = Query("medium"), level: int = None):
    if level is not None:
        level = max(1, min(level, 100))
        pairs = int(6 + (level - 1) * 18 / 99)
        cols  = 8 if pairs > 18 else 6 if pairs > 8 else 4
    else:
        pairs, cols = {"easy": (6, 4), "medium": (8, 4), "hard": (12, 6), "expert": (18, 6)}.get(difficulty, (8, 4))
    return _build_deck(pairs, cols)


@router.get("/daily")
def get_daily_snap(date: str, difficulty: str = Query("medium")):
    pairs, cols = {"easy": (6, 4), "medium": (8, 4), "hard": (12, 6), "expert": (18, 6)}.get(difficulty, (8, 4))
    random.seed(_seed_int(f"snap-{date}-{difficulty}"))
    deck = _build_deck(pairs, cols)
    random.seed()
    return {**deck, "date": date}
