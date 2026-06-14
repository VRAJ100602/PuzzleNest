from fastapi import APIRouter, Query
import random

router = APIRouter(prefix="/games/colorflood", tags=["colorflood"])

def generate_colorflood(size=10, num_colors=6, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
    colors = list(range(num_colors))
    board = [[random.choice(colors) for _ in range(size)] for _ in range(size)]
    max_moves = size * 2 + num_colors
    return {"size": size, "board": board, "num_colors": num_colors, "max_moves": max_moves}

@router.get("/new")
def get_new_colorflood(
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = int(8 + (level - 1) * 8 / 99)
        num_colors = min(4 + (level - 1) // 20, 8)
        data = generate_colorflood(size, num_colors, int(size * 1.5))
        data["level"] = level
        return data

    if difficulty == "easy":
        return generate_colorflood(8, 4, 15)
    elif difficulty == "medium":
        return generate_colorflood(10, 6, 20)
    elif difficulty == "hard":
        return generate_colorflood(14, 6, 30)
    elif difficulty == "expert":
        return generate_colorflood(16, 8, 40)
    return generate_colorflood(10, 6, 20)
