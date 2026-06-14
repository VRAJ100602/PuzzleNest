from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel
import random
import time
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

router = APIRouter(prefix="/games/minesweeper", tags=["minesweeper"])

def generate_minesweeper(rows=9, cols=9, mines=10, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
    all_cells = [(r, c) for r in range(rows) for c in range(cols)]
    mine_cells = set(random.sample(all_cells, min(mines, len(all_cells) - 1)))
    board = []
    for r in range(rows):
        row = []
        for c in range(cols):
            if (r, c) in mine_cells:
                row.append(-1)
            else:
                count = 0
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) in mine_cells:
                            count += 1
                row.append(count)
        board.append(row)
    puzzle_id = store_solution(board)
    return {"rows": rows, "cols": cols, "mines": mines, "puzzle_id": puzzle_id, "board": board}

@router.get("/new")
@_rate_limit("20/minute")
def get_new_minesweeper(
    request: Request,
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = int(8 + (level - 1) * 12 / 99)
        mines = int(10 + (level - 1) * 70 / 99)
        data = generate_minesweeper(size, size, mines)
        data["level"] = level
        return data

    if difficulty == "easy":
        return generate_minesweeper(8, 8, 10)
    elif difficulty == "medium":
        return generate_minesweeper(12, 12, 25)
    elif difficulty == "hard":
        return generate_minesweeper(16, 16, 50)
    elif difficulty == "expert":
        return generate_minesweeper(20, 20, 80)
    return generate_minesweeper(12, 12, 25)


class MinesweeperRevealRequest(BaseModel):
    puzzle_id: str
    row: int
    col: int


@router.post("/reveal")
def reveal_cell(req: MinesweeperRevealRequest):
    board = get_solution(req.puzzle_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    
    rows = len(board)
    cols = len(board[0])
    
    if req.row < 0 or req.row >= rows or req.col < 0 or req.col >= cols:
        raise HTTPException(status_code=400, detail="Cell position out of bounds")
        
    value = board[req.row][req.col]
    if value == -1:
        return {"cells": [{"row": req.row, "col": req.col, "value": -1, "is_mine": True}]}
        
    # Perform BFS flood fill starting from (req.row, req.col)
    visited = set()
    queue = [(req.row, req.col)]
    cells_to_reveal = []
    
    while queue:
        r, c = queue.pop(0)
        if (r, c) in visited:
            continue
        visited.add((r, c))
        val = board[r][c]
        cells_to_reveal.append({"row": r, "col": c, "value": val, "is_mine": False})
        
        if val == 0:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        if board[nr][nc] != -1 and (nr, nc) not in visited:
                            queue.append((nr, nc))
                            
    return {"cells": cells_to_reveal}


class MinesweeperCheckRequest(BaseModel):
    puzzle_id: str
    revealed: list  # List of [row, col] pairs that the user has revealed


@router.post("/check")
def check_minesweeper(req: MinesweeperCheckRequest):
    board = get_solution(req.puzzle_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    rows = len(board)
    cols = len(board[0])
    # Count non-mine cells
    non_mine_count = sum(1 for r in range(rows) for c in range(cols) if board[r][c] != -1)
    # Check that all revealed cells are non-mine cells
    revealed_set = set()
    for cell in req.revealed:
        r, c = cell[0], cell[1]
        if r < 0 or r >= rows or c < 0 or c >= cols:
            continue
        if board[r][c] == -1:
            return {"correct": False, "detail": "A mine was revealed"}
        revealed_set.add((r, c))
    correct = len(revealed_set) == non_mine_count
    if correct:
        # Anti-Cheat: Validate elapsed solve time (minimum 5 seconds)
        gen_time = get_generation_time(req.puzzle_id)
        if gen_time:
            elapsed = time.time() - gen_time
            if elapsed < 5.0:
                raise HTTPException(status_code=400, detail="Solve time too fast. Suspicious activity detected.")
        solve_token = create_solve_token(req.puzzle_id, "minesweeper")
        remove_solution(req.puzzle_id)
        return {"correct": True, "solve_token": solve_token}
    return {"correct": False}


@router.get("/solution")
def get_minesweeper_solution(puzzle_id: str):
    board = get_solution(puzzle_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    remove_solution(puzzle_id)
    return {"solution": board}

