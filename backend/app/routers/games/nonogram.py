from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel
import random
import time
import hashlib
from typing import List, Optional
from app.core.puzzle_store import store_solution, get_solution, remove_solution, get_generation_time
from app.core.security import create_solve_token

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    limiter = None

def _rate_limit(limit_string):
    def decorator(func):
        if limiter is not None:
            return limiter.limit(limit_string)(func)
        return func
    return decorator


router = APIRouter(
    prefix="/games/nonogram",
    tags=["nonogram"]
)

def generate_nonogram(size=5, fill_prob=0.6, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
        
    grid = []
    # Ensure grid is not completely empty
    while True:
        grid = []
        has_filled = False
        for _ in range(size):
            row = [1 if random.random() < fill_prob else 0 for _ in range(size)]
            if 1 in row:
                has_filled = True
            grid.append(row)
        if has_filled:
            break
        
    # Calculate row clues
    row_clues = []
    for row in grid:
        clues = []
        count = 0
        for cell in row:
            if cell == 1:
                count += 1
            elif count > 0:
                clues.append(count)
                count = 0
        if count > 0:
            clues.append(count)
        if not clues:
            clues.append(0)
        row_clues.append(clues)
        
    # Calculate column clues
    col_clues = []
    for c in range(size):
        clues = []
        count = 0
        for r in range(size):
            if grid[r][c] == 1:
                count += 1
            elif count > 0:
                clues.append(count)
                count = 0
        if count > 0:
            clues.append(count)
        if not clues:
            clues.append(0)
        col_clues.append(clues)
        
    puzzle_id = store_solution(grid)
    return {
        "size": size,
        "puzzle_id": puzzle_id,
        "row_clues": row_clues,
        "col_clues": col_clues
    }

@router.get("/new")
@_rate_limit("20/minute")
def get_new_nonogram(
    request: Request,
    difficulty: str = Query("medium"),
    level: Optional[int] = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = int(4 + (level - 1) * 11 / 99)
        prob = 0.65 - (level - 1) * 0.30 / 99
    else:
        size = 5
        prob = 0.5
        if difficulty == "easy":
            prob = 0.6
        elif difficulty == "medium":
            prob = 0.5
        elif difficulty == "hard":
            size = 10
            prob = 0.5
        elif difficulty == "expert":
            size = 10
            prob = 0.4
        
    result = generate_nonogram(size, prob)
    if level is not None:
        result["level"] = level
    return result


@router.get("/daily")
@_rate_limit("20/minute")
def get_daily_nonogram(
    request: Request,
    date: str,
    difficulty: str = Query("medium")
):
    size = 5
    prob = 0.5
    if difficulty == "easy":
        prob = 0.6
    elif difficulty == "medium":
        prob = 0.5
    elif difficulty == "hard":
        size = 10
        prob = 0.5
    elif difficulty == "expert":
        size = 10
        prob = 0.4
        
    seed_str = f"nonogram-{date}-{difficulty}"
    seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16) % (10**8)
    return generate_nonogram(size, prob, seed=seed_int)


class NonogramCheckRequest(BaseModel):
    puzzle_id: str
    submitted: List[List[int]]


@router.post("/check")
def check_nonogram(req: NonogramCheckRequest):
    solution = get_solution(req.puzzle_id)
    if solution is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    correct = req.submitted == solution
    if correct:
        # Anti-Cheat: Validate elapsed solve time (minimum 5 seconds)
        gen_time = get_generation_time(req.puzzle_id)
        if gen_time:
            elapsed = time.time() - gen_time
            if elapsed < 5.0:
                raise HTTPException(status_code=400, detail="Solve time too fast. Suspicious activity detected.")
        solve_token = create_solve_token(req.puzzle_id, "nonogram")
        remove_solution(req.puzzle_id)
        return {"correct": True, "solve_token": solve_token}
    return {"correct": False}

