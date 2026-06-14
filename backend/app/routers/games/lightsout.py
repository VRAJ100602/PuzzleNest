from fastapi import APIRouter, Query
import random

router = APIRouter(prefix="/games/lightsout", tags=["lightsout"])

def generate_lightsout(size=5, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
    board = [[False] * size for _ in range(size)]
    moves = random.randint(size * 2, size * 4)
    for _ in range(moves):
        r = random.randint(0, size - 1)
        c = random.randint(0, size - 1)
        board[r][c] = not board[r][c]
        if r > 0: board[r-1][c] = not board[r-1][c]
        if r < size-1: board[r+1][c] = not board[r+1][c]
        if c > 0: board[r][c-1] = not board[r][c-1]
        if c < size-1: board[r][c+1] = not board[r][c+1]
    return {"size": size, "board": board}

@router.get("/new")
def get_new_lightsout(
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = min(4 + (level - 1) // 20, 8)
        data = generate_lightsout(size)
        data["level"] = level
        return data

    if difficulty == "easy":
        return generate_lightsout(4)
    elif difficulty == "medium":
        return generate_lightsout(5)
    elif difficulty == "hard":
        return generate_lightsout(6)
    elif difficulty == "expert":
        return generate_lightsout(7)
    return generate_lightsout(5)
