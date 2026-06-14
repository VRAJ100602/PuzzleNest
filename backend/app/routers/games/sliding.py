from fastapi import APIRouter, Query
import random

router = APIRouter(prefix="/games/sliding", tags=["sliding"])

def generate_sliding(size=4, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
    tiles = list(range(1, size * size)) + [0]
    empty_idx = size * size - 1
    for _ in range(size * size * 20):
        r, c = empty_idx // size, empty_idx % size
        moves = []
        if r > 0: moves.append(empty_idx - size)
        if r < size - 1: moves.append(empty_idx + size)
        if c > 0: moves.append(empty_idx - 1)
        if c < size - 1: moves.append(empty_idx + 1)
        swap_idx = random.choice(moves)
        tiles[empty_idx], tiles[swap_idx] = tiles[swap_idx], tiles[empty_idx]
        empty_idx = swap_idx
    return {"size": size, "tiles": tiles}

@router.get("/new")
def get_new_sliding(
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = min(3 + (level - 1) // 25, 6)
        data = generate_sliding(size)
        data["level"] = level
        return data

    if difficulty == "easy":
        return generate_sliding(3)
    elif difficulty == "medium":
        return generate_sliding(4)
    elif difficulty == "hard":
        return generate_sliding(5)
    return generate_sliding(4)
