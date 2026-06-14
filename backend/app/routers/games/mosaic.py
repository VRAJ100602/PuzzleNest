"""
Mosaic puzzle (aka 'Fill-a-Pix' / 'Painted Cells').

Every cell in the grid has a clue number that equals the count of filled
cells in its 3×3 neighbourhood (including itself).  The player clicks cells
to fill or unfill them until every clue is satisfied.
"""
from fastapi import APIRouter, Query
import random
import hashlib
from typing import List, Optional

router = APIRouter(prefix="/games/mosaic", tags=["mosaic"])


def _filled_count(grid: List[List[int]], r: int, c: int, size: int) -> int:
    total = 0
    for dr in range(-1, 2):
        for dc in range(-1, 2):
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                total += grid[nr][nc]
    return total


def generate_mosaic(size: int = 7, seed: Optional[int] = None) -> dict:
    if seed is not None:
        random.seed(seed)

    # Random solution grid – ~50 % fill probability
    while True:
        solution = [
            [1 if random.random() < 0.5 else 0 for _ in range(size)]
            for _ in range(size)
        ]
        filled = sum(v for row in solution for v in row)
        if 0.25 * size * size <= filled <= 0.75 * size * size:
            break

    # Compute clues
    clues = [
        [_filled_count(solution, r, c, size) for c in range(size)]
        for r in range(size)
    ]

    if seed is not None:
        random.seed()

    return {"size": size, "clues": clues, "solution": solution}


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


@router.get("/new")
def get_new_mosaic(
    difficulty: str = Query("medium"),
    level: Optional[int] = None,
    size: Optional[int] = Query(None, ge=6, le=8),
):
    # Explicit size param wins
    if size is not None:
        board_size = size
    elif level is not None:
        level = max(1, min(level, 100))
        board_size = int(5 + (level - 1) * 10 / 99)
    else:
        board_size = {"easy": 6, "medium": 8, "hard": 10, "expert": 12}.get(difficulty, 8)
    return {**generate_mosaic(board_size), "difficulty": difficulty,
            **({"level": level} if level is not None else {})}


@router.get("/daily")
def get_daily_mosaic(date: str, difficulty: str = Query("medium")):
    size = {"easy": 6, "medium": 8, "hard": 10, "expert": 12}.get(difficulty, 8)
    seed = _seed_int(f"mosaic-{date}-{difficulty}")
    return {**generate_mosaic(size, seed=seed), "difficulty": difficulty, "date": date}
