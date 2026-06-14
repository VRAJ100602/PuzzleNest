"""
Kings puzzle.

Place exactly K non-attacking kings on an N×N grid.
A king attacks all 8 orthogonally/diagonally adjacent cells.

The API returns grid size and required king count.
Some cells may be pre-blocked (-1) or pre-filled with a given king (1).
The frontend validates placement and detects win.
"""
from fastapi import APIRouter, Query
import random
import hashlib
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/games/kings", tags=["kings"])


# ---------------------------------------------------------------------------
# Pre-built puzzle layouts
# grid: 0=empty, -1=blocked, 1=pre-placed king
# required: additional kings the player must place
# ---------------------------------------------------------------------------
PUZZLES: List[Dict[str, Any]] = [
    # 5×5: place 5 non-attacking kings
    {
        "size": 5,
        "required_kings": 5,
        "grid": [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        "solution": [
            [1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0],
            [1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        "difficulty": "easy",
    },
    # 6×6: place 6 non-attacking kings, some blocked cells
    {
        "size": 6,
        "required_kings": 6,
        "grid": [
            [0, 0,-1, 0, 0, 0],
            [0, 0, 0, 0,-1, 0],
            [-1,0, 0, 0, 0, 0],
            [0, 0, 0,-1, 0, 0],
            [0,-1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0,-1],
        ],
        "solution": [
            [1, 0,-1, 1, 0, 0],
            [0, 0, 0, 0,-1, 1],
            [-1,1, 0, 0, 0, 0],
            [0, 0, 0,-1, 1, 0],
            [0,-1, 1, 0, 0, 0],
            [1, 0, 0, 0, 0,-1],
        ],
        "difficulty": "medium",
    },
    # 7×7: place 7 non-attacking kings
    {
        "size": 7,
        "required_kings": 7,
        "grid": [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        "solution": [
            [1, 0, 1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0, 0, 0],
            [1, 0, 1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        "difficulty": "hard",
    },
    # 6×6 with pre-placed kings
    {
        "size": 6,
        "required_kings": 4,
        "grid": [
            [1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        "solution": [
            [1, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 1],
            [0, 0, 0, 0, 0, 0],
            [1, 0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0, 0],
        ],
        "difficulty": "medium",
    },
]


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_kings(
    difficulty: str = Query("medium"),
    level: Optional[int] = None,
):
    pool = [p for p in PUZZLES if p["difficulty"] == difficulty] or PUZZLES
    p = random.choice(pool)
    return {
        "size": p["size"],
        "required_kings": p["required_kings"],
        "grid": p["grid"],
        "solution": p["solution"],
        "difficulty": difficulty,
        **({"level": level} if level is not None else {}),
    }


@router.get("/daily")
def get_daily_kings(date: str, difficulty: str = Query("medium")):
    random.seed(_seed_int(f"kings-{date}-{difficulty}"))
    pool = [p for p in PUZZLES if p["difficulty"] == difficulty] or PUZZLES
    p = random.choice(pool)
    random.seed()
    return {
        "size": p["size"],
        "required_kings": p["required_kings"],
        "grid": p["grid"],
        "solution": p["solution"],
        "difficulty": difficulty,
        "date": date,
    }
