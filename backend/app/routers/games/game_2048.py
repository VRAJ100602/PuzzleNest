from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/games/2048", tags=["2048"])

@router.get("/config")
def get_2048_config():
    # Return game configurations like board size (4x4) and target value (2048)
    return {
        "grid_size": 4,
        "target_tile": 2048
    }

@router.get("/new")
def get_new_2048(level: Optional[int] = None):
    target_tile = 2048
    grid_size = 4
    if level is not None:
        level = max(1, min(level, 100))
        if level <= 10:
            target_tile = 128
        elif level <= 25:
            target_tile = 256
        elif level <= 45:
            target_tile = 512
        elif level <= 65:
            target_tile = 1024
        elif level <= 85:
            target_tile = 2048
        elif level <= 95:
            target_tile = 4096
        else:
            target_tile = 8192
            
    res = {
        "grid_size": grid_size,
        "target_tile": target_tile
    }
    if level is not None:
        res["level"] = level
    return res
