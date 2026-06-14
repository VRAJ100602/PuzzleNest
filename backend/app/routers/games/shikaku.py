from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel
import random
import time
from typing import List, Dict, Any, Optional
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


router = APIRouter(prefix="/games/shikaku", tags=["shikaku"])

def generate_shikaku_board(width: int, height: int) -> Dict[str, Any]:
    # We want to partition the grid into rectangles
    # Rectangles are represented as {"x": x, "y": y, "w": w, "h": h, "area": w*h}
    rectangles = []
    grid = [[False for _ in range(width)] for _ in range(height)]
    
    # Simple greedy partitioner with backtracking/retry
    def partition():
        nonlocal rectangles, grid
        rectangles = []
        grid = [[False for _ in range(width)] for _ in range(height)]
        
        for y in range(height):
            for x in range(width):
                if grid[y][x]:
                    continue
                
                # Find available dimensions at (x, y)
                valid_rects = []
                # Max area of a single rectangle, e.g., 12 to make it interesting
                for w in range(1, min(width - x + 1, 6)):
                    for h in range(1, min(height - y + 1, 6)):
                        # Skip area 1 if we want it to be more fun, or allow it occasionally
                        area = w * h
                        if area > 12:
                            continue
                        # Check if all cells in this candidate rectangle are free
                        free = True
                        for ry in range(y, y + h):
                            for rx in range(x, x + w):
                                if grid[ry][rx]:
                                    free = False
                                    break
                            if not free:
                                break
                        if free:
                            valid_rects.append((w, h))
                
                if not valid_rects:
                    return False
                
                # Pick a random rectangle size
                w, h = random.choice(valid_rects)
                
                # Mark cells
                for ry in range(y, y + h):
                    for rx in range(x, x + w):
                        grid[ry][rx] = True
                        
                rectangles.append({
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "area": w * h
                })
        return True

    # Try generating until successful
    retries = 0
    while not partition() and retries < 100:
        retries += 1
        
    # Place clues. For each rectangle, pick a random cell inside it
    clues = [[0 for _ in range(width)] for _ in range(height)]
    for r in rectangles:
        cx = random.randint(r["x"], r["x"] + r["w"] - 1)
        cy = random.randint(r["y"], r["y"] + r["h"] - 1)
        clues[cy][cx] = r["area"]
        
    puzzle_id = store_solution(rectangles)
    return {
        "width": width,
        "height": height,
        "clues": clues,
        "puzzle_id": puzzle_id
    }


@router.get("/new")
@_rate_limit("20/minute")
def get_new_shikaku(
    request: Request,
    difficulty: str = Query("medium", pattern="^(easy|medium|hard)$"),
    level: Optional[int] = None,
    size: Optional[int] = Query(None, ge=5, le=9),
):
    # Explicit size param wins over level / difficulty
    if size is not None:
        board_size = size
    elif level is not None:
        level = max(1, min(level, 100))
        board_size = int(4 + (level - 1) * 11 / 99)
    else:
        if difficulty == "easy":
            board_size = 5
        elif difficulty == "medium":
            board_size = 8
        else:  # hard
            board_size = 10

    board = generate_shikaku_board(board_size, board_size)
    if level is not None:
        board["level"] = level
    if size is not None:
        board["size"] = size
    return board


@router.get("/daily")
@_rate_limit("20/minute")
def get_daily_shikaku(
    request: Request,
    date: str,
    difficulty: str = Query("medium", pattern="^(easy|medium|hard)$")
):
    # Deterministic seed using the date and difficulty
    random.seed(f"shikaku-{date}-{difficulty}")
    
    if difficulty == "easy":
        size = 5
    elif difficulty == "medium":
        size = 8
    else:  # hard
        size = 10
        
    board = generate_shikaku_board(size, size)
    
    # Reset random seed
    random.seed()
    
    return {
        **board,
        "difficulty": difficulty,
        "date": date
    }


class ShikakuCheckRequest(BaseModel):
    puzzle_id: str
    submitted: List[Dict[str, int]]


@router.post("/check")
def check_shikaku(req: ShikakuCheckRequest):
    solution = get_solution(req.puzzle_id)
    if solution is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    # Sort both lists for comparison (order-independent)
    sorted_solution = sorted(solution, key=lambda r: (r["x"], r["y"], r["w"], r["h"]))
    sorted_submitted = sorted(req.submitted, key=lambda r: (r["x"], r["y"], r["w"], r["h"]))
    correct = sorted_submitted == sorted_solution
    if correct:
        # Anti-Cheat: Validate elapsed solve time (minimum 5 seconds)
        gen_time = get_generation_time(req.puzzle_id)
        if gen_time:
            elapsed = time.time() - gen_time
            if elapsed < 5.0:
                raise HTTPException(status_code=400, detail="Solve time too fast. Suspicious activity detected.")
        solve_token = create_solve_token(req.puzzle_id, "shikaku")
        remove_solution(req.puzzle_id)
        return {"correct": True, "solve_token": solve_token}
    return {"correct": False}

