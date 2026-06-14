from fastapi import APIRouter
from typing import Dict, List, Any

router = APIRouter(prefix="/games/levels", tags=["levels"])


def _sudoku_params(level: int) -> Dict[str, Any]:
    empty_cells = int(28 + (level - 1) * 36 / 99)
    return {"empty_cells": empty_cells}


def _shikaku_params(level: int) -> Dict[str, Any]:
    grid_size = int(4 + (level - 1) * 11 / 99)
    return {"grid_size": grid_size}


def _nonogram_params(level: int) -> Dict[str, Any]:
    grid_size = int(4 + (level - 1) * 11 / 99)
    fill_prob = round(0.65 - (level - 1) * 0.30 / 99, 4)
    return {"grid_size": grid_size, "fill_prob": fill_prob}


def _pipes_params(level: int) -> Dict[str, Any]:
    grid_size = int(4 + (level - 1) * 11 / 99)
    return {"grid_size": grid_size}


def _tower_params(level: int) -> Dict[str, Any]:
    grid_size = min(3 + (level - 1) // 15, 8)
    return {"grid_size": grid_size}


def _wordle_params(level: int) -> Dict[str, Any]:
    if level <= 30:
        max_guesses = 6
    elif level <= 60:
        max_guesses = 5
    elif level <= 80:
        max_guesses = 4
    else:
        max_guesses = 3
    return {"max_guesses": max_guesses}


def _game_2048_params(level: int) -> Dict[str, Any]:
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
    return {"target_tile": target_tile, "grid_size": 4}

def _minesweeper_params(level: int) -> Dict[str, Any]:
    size = int(8 + (level - 1) * 12 / 99)
    mines = int(10 + (level - 1) * 70 / 99)
    return {"rows": size, "cols": size, "mines": mines}

def _memory_params(level: int) -> Dict[str, Any]:
    pairs = int(6 + (level - 1) * 18 / 99)
    return {"pairs": pairs}

def _sliding_params(level: int) -> Dict[str, Any]:
    size = min(3 + (level - 1) // 25, 6)
    return {"size": size}

def _lightsout_params(level: int) -> Dict[str, Any]:
    size = min(4 + (level - 1) // 20, 8)
    return {"size": size}

def _colorflood_params(level: int) -> Dict[str, Any]:
    size = int(8 + (level - 1) * 8 / 99)
    num_colors = min(4 + (level - 1) // 20, 8)
    return {"size": size, "num_colors": num_colors}

def _pacman_params(level: int) -> Dict[str, Any]:
    ghost_speed = round(0.06 + (level - 1) * 0.08 / 99, 4)
    frightened_duration = round(max(1.5, 10.0 - (level - 1) * 8.5 / 99), 2)
    map_index = (level - 1) % 4
    return {"ghost_speed": ghost_speed, "frightened_duration": frightened_duration, "map_index": map_index}


def _crossword_params(level: int) -> Dict[str, Any]:
    difficulty = "easy" if level <= 15 else "medium" if level <= 35 else "hard"
    return {"difficulty": difficulty}

def _atoms_params(level: int) -> Dict[str, Any]:
    difficulty = "easy" if level <= 15 else "medium" if level <= 35 else "hard"
    return {"difficulty": difficulty}

def _mosaic_params(level: int) -> Dict[str, Any]:
    size = int(5 + (level - 1) * 10 / 49)
    return {"size": size}

def _lits_params(level: int) -> Dict[str, Any]:
    difficulty = "easy" if level <= 15 else "medium" if level <= 35 else "hard"
    return {"difficulty": difficulty}

def _mambo_params(level: int) -> Dict[str, Any]:
    difficulty = "easy" if level <= 15 else "medium" if level <= 35 else "hard"
    return {"difficulty": difficulty}

def _kings_params(level: int) -> Dict[str, Any]:
    difficulty = "easy" if level <= 15 else "medium" if level <= 35 else "hard"
    return {"difficulty": difficulty}

def _snap_params(level: int) -> Dict[str, Any]:
    pairs = int(4 + (level - 1) * 20 / 49)
    return {"pairs": pairs}

_GAME_PARAM_FUNCS = {
    "sudoku": _sudoku_params,
    "shikaku": _shikaku_params,
    "nonogram": _nonogram_params,
    "pipes": _pipes_params,
    "tower": _tower_params,
    "wordle": _wordle_params,
    "2048": _game_2048_params,
    "minesweeper": _minesweeper_params,
    "memory": _memory_params,
    "sliding": _sliding_params,
    "lightsout": _lightsout_params,
    "colorflood": _colorflood_params,
    "pacman": _pacman_params,
    # New puzzle types
    "crossword": _crossword_params,
    "atoms": _atoms_params,
    "mosaic": _mosaic_params,
    "lits": _lits_params,
    "mambo": _mambo_params,
    "kings": _kings_params,
    "snap": _snap_params,
}


def get_level_params(game_type: str, level: int) -> Dict[str, Any]:
    """Return the parameter dict for a given game type and level (1-100)."""
    level = max(1, min(level, 100))
    func = _GAME_PARAM_FUNCS.get(game_type)
    if func is None:
        return {}
    return func(level)


@router.get("/config")
def get_levels_config():
    """Return the 100-level definitions for all games."""
    config: Dict[str, List[Dict[str, Any]]] = {}
    for game_type, func in _GAME_PARAM_FUNCS.items():
        levels = []
        for lvl in range(1, 101):
            params = func(lvl)
            params["level"] = lvl
            levels.append(params)
        config[game_type] = levels
    return config
