"""
Chain-Reaction / Atoms puzzle.

Each cell stores an atom count. Critical mass = number of orthogonal
neighbours (corners=2, edges=3, centre=4). When count >= critical mass
the cell explodes: it resets to 0 and each neighbour gains 1 atom,
potentially causing chain explosions.

API returns pre-built starting boards per difficulty level.
Win condition is checked client-side.
"""
from fastapi import APIRouter, Query
import random
import hashlib
from typing import List

router = APIRouter(prefix="/games/atoms", tags=["atoms"])

# ---------------------------------------------------------------------------
# Pre-built levels  –  each entry is a 2-D list of starting atom counts.
# 0 means the cell is empty.
# ---------------------------------------------------------------------------

LEVELS_EASY: List[List[List[int]]] = [
    [[0,1,0,1,0],
     [1,0,2,0,1],
     [0,2,0,2,0],
     [1,0,2,0,1],
     [0,1,0,1,0]],

    [[1,0,0,0,1],
     [0,0,1,0,0],
     [0,1,0,1,0],
     [0,0,1,0,0],
     [1,0,0,0,1]],
]

LEVELS_MEDIUM: List[List[List[int]]] = [
    [[0,0,1,0,0],
     [0,2,0,2,0],
     [1,0,3,0,1],
     [0,2,0,2,0],
     [0,0,1,0,0]],

    [[2,0,1,0,2],
     [0,1,0,1,0],
     [1,0,2,0,1],
     [0,1,0,1,0],
     [2,0,1,0,2]],
]

LEVELS_HARD: List[List[List[int]]] = [
    [[1,1,1,1,1],
     [1,2,2,2,1],
     [1,2,3,2,1],
     [1,2,2,2,1],
     [1,1,1,1,1]],

    [[3,0,2,0,3],
     [0,2,0,2,0],
     [2,0,3,0,2],
     [0,2,0,2,0],
     [3,0,2,0,3]],
]

ALL_LEVELS = {
    "easy": LEVELS_EASY,
    "medium": LEVELS_MEDIUM,
    "hard": LEVELS_HARD,
}


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_atoms(
    difficulty: str = Query("medium"),
    level: int = None,
):
    bucket = ALL_LEVELS.get(difficulty, LEVELS_MEDIUM)
    if level is not None:
        level = max(1, min(level, 100))
        if level <= 33:
            bucket = LEVELS_EASY
        elif level <= 66:
            bucket = LEVELS_MEDIUM
        else:
            bucket = LEVELS_HARD
    board = random.choice(bucket)
    size = len(board)
    return {
        "board": board,
        "size": size,
        "difficulty": difficulty,
        **({"level": level} if level is not None else {}),
    }


@router.get("/daily")
def get_daily_atoms(date: str, difficulty: str = Query("medium")):
    bucket = ALL_LEVELS.get(difficulty, LEVELS_MEDIUM)
    random.seed(_seed_int(f"atoms-{date}-{difficulty}"))
    board = random.choice(bucket)
    random.seed()
    return {
        "board": board,
        "size": len(board),
        "difficulty": difficulty,
        "date": date,
    }
