from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel
import random
import time
import hashlib
from typing import List
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
    prefix="/games/tower",
    tags=["tower"]
)

def count_visible(line):
    count = 0
    max_val = 0
    for h in line:
        if h > max_val:
            count += 1
            max_val = h
    return count

def generate_tower(size=4, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
        
    grid = [[0 for _ in range(size)] for _ in range(size)]
    
    def solve(r, c):
        if r == size:
            return True
        if c == size:
            return solve(r + 1, 0)
            
        nums = list(range(1, size + 1))
        random.shuffle(nums)
        
        for v in nums:
            # Check row
            if v in grid[r]:
                continue
            # Check col
            if v in [grid[i][c] for i in range(r)]:
                continue
                
            grid[r][c] = v
            if solve(r, c + 1):
                return True
            grid[r][c] = 0
            
        return False

    solve(0, 0)
    
    top_clues = []
    bottom_clues = []
    left_clues = []
    right_clues = []
    
    for c in range(size):
        col = [grid[r][c] for r in range(size)]
        top_clues.append(count_visible(col))
        bottom_clues.append(count_visible(list(reversed(col))))
        
    for r in range(size):
        row = grid[r]
        left_clues.append(count_visible(row))
        right_clues.append(count_visible(list(reversed(row))))
        
    puzzle_id = store_solution(grid)
    return {
        "size": size,
        "puzzle_id": puzzle_id,
        "top_clues": top_clues,
        "bottom_clues": bottom_clues,
        "left_clues": left_clues,
        "right_clues": right_clues
    }

@router.get("/new")
@_rate_limit("20/minute")
def get_new_tower(
    request: Request,
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = min(3 + (level - 1) // 15, 8)
    else:
        size = 4
        if difficulty == "easy":
            size = 4
        elif difficulty == "medium":
            size = 5
        elif difficulty == "hard":
            size = 6
        elif difficulty == "expert":
            size = 7
        
    res = generate_tower(size)
    if level is not None:
        res["level"] = level
    return res

@router.get("/daily")
@_rate_limit("20/minute")
def get_daily_tower(
    request: Request,
    date: str,
    difficulty: str = Query("medium")
):
    size = 4
    if difficulty == "easy":
        size = 4
    elif difficulty == "medium":
        size = 5
    elif difficulty == "hard":
        size = 6
    elif difficulty == "expert":
        size = 7
        
    seed_str = f"tower-{date}-{difficulty}"
    seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16) % (10**8)
    return generate_tower(size, seed=seed_int)


class TowerCheckRequest(BaseModel):
    puzzle_id: str
    submitted: List[List[int]]


@router.post("/check")
def check_tower(req: TowerCheckRequest):
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
        solve_token = create_solve_token(req.puzzle_id, "tower")
        remove_solution(req.puzzle_id)
        return {"correct": True, "solve_token": solve_token}
    return {"correct": False}
