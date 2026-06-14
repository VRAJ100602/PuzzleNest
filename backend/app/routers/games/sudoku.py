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


router = APIRouter(prefix="/games/sudoku", tags=["sudoku"])

def is_valid(board: List[List[int]], row: int, col: int, num: int) -> bool:
    for x in range(9):
        if board[row][x] == num:
            return False
            
    for x in range(9):
        if board[x][col] == num:
            return False
            
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[i + start_row][j + start_col] == num:
                return False
                
    return True

def generate_solved_board() -> List[List[int]]:
    board = [[0 for _ in range(9)] for _ in range(9)]
    
    def fill_grid(board: List[List[int]]) -> bool:
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    numbers = list(range(1, 10))
                    random.shuffle(numbers)
                    for num in numbers:
                        if is_valid(board, i, j, num):
                            board[i][j] = num
                            if fill_grid(board):
                                return True
                            board[i][j] = 0
                    return False
        return True
        
    fill_grid(board)
    return board

def copy_board(board: List[List[int]]) -> List[List[int]]:
    return [row[:] for row in board]

def generate_puzzle(solved: List[List[int]], difficulty: str, empty_count_override: int = None) -> List[List[int]]:
    puzzle = copy_board(solved)
    
    if empty_count_override is not None:
        empty_count = empty_count_override
    else:
        # Map all 6 difficulties to specific empty cell counts
        if difficulty == "easy":
            empty_count = 32  # 49 clues
        elif difficulty == "medium":
            empty_count = 40  # 41 clues
        elif difficulty == "hard":
            empty_count = 48  # 33 clues
        elif difficulty == "expert":
            empty_count = 53  # 28 clues
        elif difficulty == "master":
            empty_count = 56  # 25 clues
        elif difficulty == "extreme":
            empty_count = 59  # 22 clues
        else:
            empty_count = 40
        
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    
    removed = 0
    for r, c in cells:
        if removed >= empty_count:
            break
        puzzle[r][c] = 0
        removed += 1
        
    return puzzle


@router.get("/new")
@_rate_limit("20/minute")
def get_new_sudoku(
    request: Request,
    difficulty: str = Query("medium", pattern="^(easy|medium|hard|expert|master|extreme)$"),
    level: Optional[int] = None
):
    solved = generate_solved_board()
    
    if level is not None:
        level = max(1, min(level, 100))
        empty_cells = int(28 + (level - 1) * 36 / 99)
        puzzle = generate_puzzle(solved, difficulty, empty_count_override=empty_cells)
    else:
        puzzle = generate_puzzle(solved, difficulty)
    
    puzzle_id = store_solution(solved)
    response = {
        "puzzle": puzzle,
        "puzzle_id": puzzle_id,
        "difficulty": difficulty
    }
    if level is not None:
        response["level"] = level
    return response


@router.get("/daily")
@_rate_limit("20/minute")
def get_daily_sudoku(
    request: Request,
    date: str, 
    difficulty: str = Query("medium", pattern="^(easy|medium|hard|expert|master|extreme)$")
):
    # Deterministic seed using the date and difficulty
    random.seed(f"sudoku-{date}-{difficulty}")
    solved = generate_solved_board()
    puzzle = generate_puzzle(solved, difficulty)
    
    # Reset random seed
    random.seed()
    
    puzzle_id = store_solution(solved)
    return {
        "puzzle": puzzle,
        "puzzle_id": puzzle_id,
        "difficulty": difficulty,
        "date": date
    }


class SudokuCheckRequest(BaseModel):
    puzzle_id: str
    submitted: List[List[int]]


@router.post("/check")
def check_sudoku(req: SudokuCheckRequest):
    solution = get_solution(req.puzzle_id)
    if solution is None:
        raise HTTPException(status_code=404, detail="Puzzle not found or expired")
    correct = req.submitted == solution
    if correct:
        # Anti-Cheat: Validate elapsed solve time (minimum 15 seconds)
        gen_time = get_generation_time(req.puzzle_id)
        if gen_time:
            elapsed = time.time() - gen_time
            if elapsed < 15.0:
                raise HTTPException(
                    status_code=400,
                    detail="Solve time too fast. Suspicious activity detected."
                )
        solve_token = create_solve_token(req.puzzle_id, "sudoku")
        remove_solution(req.puzzle_id)
        return {"correct": True, "solve_token": solve_token}
    return {"correct": False}

