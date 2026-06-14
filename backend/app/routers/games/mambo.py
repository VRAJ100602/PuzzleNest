"""
Mambo – Hidato-style number path puzzle.

The grid contains some pre-filled numbers. The player fills in the blanks so
that every integer from 1 to N appears exactly once and consecutive numbers
are orthogonally or diagonally adjacent (all 8 neighbours).

-1 in the grid = blocked/black cell (never played).
 0 in the grid = empty cell the player must fill.
>0             = given clue.
"""
from fastapi import APIRouter, Query
import random
import hashlib
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/games/mambo", tags=["mambo"])

# ---------------------------------------------------------------------------
# Pre-built Hidato puzzles
# Each entry has: size, total (max number), puzzle, solution
# ---------------------------------------------------------------------------
PUZZLES: List[Dict[str, Any]] = [
    {
        "size": 5,
        "total": 25,
        "puzzle": [
            [ 0,  0, 15, 14,  0],
            [ 3,  0,  0,  0, 12],
            [ 4,  0,  0,  0, 11],
            [ 5,  6,  0,  0,  0],
            [-1,  7,  8,  9, 10],
        ],
        "solution": [
            [ 1,  2, 15, 14, 13],
            [ 3, 16, 17, 18, 12],
            [ 4, 23, 24, 19, 11],
            [ 5,  6, 22, 20, 10],
            [-1,  7,  8,  9, 10],
        ],
    },
    {
        "size": 5,
        "total": 23,
        "puzzle": [
            [-1,  0,  0,  0, -1],
            [ 0,  0,  1,  0,  0],
            [ 0,  7,  0,  0,  0],
            [ 0,  0,  0, 20,  0],
            [-1,  0,  0,  0, -1],
        ],
        "solution": [
            [-1,  3,  4,  5, -1],
            [ 2,  6,  1, 14, 13],
            [ 8,  7, 15, 12, 23],
            [ 9, 16, 17, 20, 22],
            [-1, 10, 11, 19, -1],
        ],
    },
    {
        "size": 6,
        "total": 30,
        "puzzle": [
            [ 0,  0,  0,  0,  0,  0],
            [ 0,  1,  0,  0, 28,  0],
            [ 0,  0,  0,  0,  0, 30],
            [ 0,  0, 14,  0,  0,  0],
            [ 0,  0,  0,  0, 20,  0],
            [ 0,  0,  0,  0,  0,  0],
        ],
        "solution": [
            [ 5,  4,  3,  2, 27, 26],
            [ 6,  1, 10, 29, 28, 25],
            [ 7,  9, 11, 13, 24, 30],
            [ 8, 15, 14, 12, 23, 29],
            [16, 15, 13, 21, 20, 22],
            [17, 18, 19, 20, 21, 22],
        ],
    },
    {
        "size": 4,
        "total": 16,
        "puzzle": [
            [ 1,  0,  0,  0],
            [ 0,  0,  0,  0],
            [ 0,  0, 12,  0],
            [ 0, 16,  0,  0],
        ],
        "solution": [
            [ 1,  2,  3,  4],
            [ 8,  7,  6,  5],
            [ 9, 10, 12, 11],
            [14, 16, 13, 15],
        ],
    },
]


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_mambo(
    difficulty: str = Query("medium"),
    level: Optional[int] = None,
):
    if difficulty == "easy":
        pool = [p for p in PUZZLES if p["total"] <= 16]
        if not pool:
            pool = PUZZLES
    elif difficulty == "hard":
        pool = [p for p in PUZZLES if p["total"] >= 25]
        if not pool:
            pool = PUZZLES
    else:
        pool = PUZZLES

    p = random.choice(pool)
    return {
        "size": p["size"],
        "total": p["total"],
        "puzzle": p["puzzle"],
        "solution": p["solution"],
        "difficulty": difficulty,
        **({"level": level} if level is not None else {}),
    }


@router.get("/daily")
def get_daily_mambo(date: str, difficulty: str = Query("medium")):
    random.seed(_seed_int(f"mambo-{date}-{difficulty}"))
    p = random.choice(PUZZLES)
    random.seed()
    return {
        "size": p["size"],
        "total": p["total"],
        "puzzle": p["puzzle"],
        "solution": p["solution"],
        "difficulty": difficulty,
        "date": date,
    }
