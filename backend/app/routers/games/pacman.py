from fastapi import APIRouter, Query
import uuid
from typing import Optional

router = APIRouter(prefix="/games/pacman", tags=["pacman"])

@router.get("/new")
def get_new_pacman(level: Optional[int] = None):
    # Base configuration
    ghost_speed = 0.08
    frightened_duration = 6.0
    map_index = 0
    
    if level is not None:
        level = max(1, min(level, 100))
        # Formulas to scale parameters dynamically up to 100 levels
        ghost_speed = round(0.06 + (level - 1) * 0.08 / 99, 4)
        frightened_duration = round(max(1.5, 10.0 - (level - 1) * 8.5 / 99), 2)
        map_index = (level - 1) % 4
        
    res = {
        "puzzle_id": str(uuid.uuid4()),
        "ghost_speed": ghost_speed,
        "frightened_duration": frightened_duration,
        "map_index": map_index
    }
    
    if level is not None:
        res["level"] = level
        
    return res
