"""
LITS puzzle.

Rules (simplified for this implementation):
  1. Each region must contain exactly one shaded tetromino (L, I, T, or S shape).
  2. Two shaded tetrominoes of the SAME type may not share an edge.
  3. All shaded cells must be orthogonally connected.
  4. No 2×2 block of shaded cells.

The API returns pre-built puzzles. The frontend validates rules and detects victory.
"""
from fastapi import APIRouter, Query
import random
import hashlib
from typing import List, Dict, Any

router = APIRouter(prefix="/games/lits", tags=["lits"])

# ---------------------------------------------------------------------------
# Each puzzle stores:
#   regions  – 2-D grid of region IDs (0-based integers)
#   solution – 2-D grid: 1 = shaded, 0 = unshaded
#   shapes   – map region_id → tetromino letter
# ---------------------------------------------------------------------------
PUZZLES: List[Dict[str, Any]] = [
    {
        "size": 6,
        "regions": [
            [0, 1, 1, 1, 2, 2],
            [0, 0, 0, 1, 1, 2],
            [3, 0, 4, 4, 2, 2],
            [3, 3, 4, 5, 5, 2],
            [3, 3, 4, 5, 5, 5],
            [3, 3, 4, 5, 5, 5],
        ],
        "solution": [
            [1, 0, 1, 1, 0, 1],
            [1, 1, 0, 1, 1, 1],
            [0, 1, 1, 0, 0, 1],
            [1, 0, 1, 1, 1, 1],
            [1, 0, 1, 0, 1, 0],
            [1, 1, 1, 0, 1, 0],
        ],
        "shapes": {0: "S", 1: "S", 2: "I", 3: "L", 4: "I", 5: "L"},
    },
    {
        "size": 6,
        "regions": [
            [0, 0, 0, 1, 1, 1],
            [0, 0, 2, 1, 1, 1],
            [3, 2, 2, 2, 4, 4],
            [3, 3, 3, 2, 4, 4],
            [3, 5, 5, 2, 2, 4],
            [3, 5, 5, 5, 5, 4],
        ],
        "solution": [
            [1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1, 0],
            [1, 1, 1, 1, 0, 1],
            [1, 0, 0, 1, 1, 1],
            [1, 0, 1, 0, 0, 1],
            [1, 1, 1, 1, 0, 0],
        ],
        "shapes": {0: "L", 1: "T", 2: "L", 3: "I", 4: "T", 5: "T"},
    },
    {
        "size": 7,
        "regions": [
            [0, 0, 0, 1, 1, 1, 2],
            [3, 0, 0, 1, 4, 1, 2],
            [3, 3, 4, 4, 4, 1, 2],
            [3, 3, 5, 4, 6, 2, 2],
            [3, 5, 5, 4, 6, 7, 7],
            [3, 5, 5, 6, 6, 6, 7],
            [3, 5, 5, 6, 6, 6, 7],
        ],
        "solution": [
            [1, 1, 1, 1, 1, 1, 1],
            [0, 1, 0, 1, 0, 0, 1],
            [1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 1, 0, 0, 1],
            [1, 0, 1, 0, 0, 1, 1],
            [0, 0, 1, 0, 1, 0, 1],
            [0, 1, 1, 1, 1, 1, 1],
        ],
        "shapes": {0: "T", 1: "L", 2: "I", 3: "L", 4: "T", 5: "L", 6: "T", 7: "L"},
    },
]


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_lits(difficulty: str = Query("medium")):
    if difficulty == "easy":
        pool = PUZZLES[:1]
    elif difficulty == "hard":
        pool = PUZZLES[2:]
    else:
        pool = PUZZLES
    p = random.choice(pool)
    return {
        "size": p["size"],
        "regions": p["regions"],
        "solution": p["solution"],
        "shapes": p["shapes"],
        "difficulty": difficulty,
    }


@router.get("/daily")
def get_daily_lits(date: str, difficulty: str = Query("medium")):
    random.seed(_seed_int(f"lits-{date}-{difficulty}"))
    pool = PUZZLES
    p = random.choice(pool)
    random.seed()
    return {
        "size": p["size"],
        "regions": p["regions"],
        "solution": p["solution"],
        "shapes": p["shapes"],
        "difficulty": difficulty,
        "date": date,
    }
