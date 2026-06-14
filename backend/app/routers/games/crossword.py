from fastapi import APIRouter, Query
import random
import hashlib
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/games/crossword", tags=["crossword"])

# ---------------------------------------------------------------------------
# Pre-built crossword puzzles
# grid: 1 = white cell, 0 = black cell
# solution: letter per white cell ('' for black)
# ---------------------------------------------------------------------------
PUZZLES: List[Dict[str, Any]] = [
    {
        "id": 1,
        "size": 7,
        "grid": [
            [1,1,1,1,0,1,1],
            [1,0,1,0,1,1,1],
            [1,1,1,1,0,1,0],
            [0,1,1,1,1,0,1],
            [1,1,0,1,1,1,1],
            [1,1,1,0,1,0,1],
            [1,1,1,1,0,1,1],
        ],
        "solution": [
            ["P","L","A","Y","","B","E"],
            ["A","","R","","G","A","M"],
            ["T","R","A","P","","R",""],
            ["","A","C","E","S","","N"],
            ["M","P","","S","T","A","R"],
            ["A","E","A","","E","","O"],
            ["Z","E","T","A","","W","N"],
        ],
        "clues": {
            "across": [
                {"num":1,"row":0,"col":0,"len":4,"clue":"Engage in a game"},
                {"num":4,"row":0,"col":5,"len":2,"clue":"To exist"},
                {"num":5,"row":1,"col":4,"len":3,"clue":"Sport category"},
                {"num":6,"row":2,"col":0,"len":4,"clue":"Set a snare"},
                {"num":8,"row":3,"col":1,"len":4,"clue":"Card-game high cards"},
                {"num":10,"row":4,"col":0,"len":2,"clue":"Shortened max-opp."},
                {"num":11,"row":4,"col":3,"len":4,"clue":"Celestial body"},
                {"num":13,"row":5,"col":0,"len":3,"clue":"Labyrinth (anagram)"},
                {"num":15,"row":6,"col":0,"len":4,"clue":"Greek letter"},
                {"num":16,"row":6,"col":5,"len":2,"clue":"Victory (slang)"},
            ],
            "down": [
                {"num":1,"row":0,"col":0,"len":6,"clue":"Father, informally"},
                {"num":2,"row":0,"col":2,"len":7,"clue":"Artistic works"},
                {"num":3,"row":0,"col":3,"len":3,"clue":"Dried grass"},
                {"num":4,"row":0,"col":5,"len":5,"clue":"Sports equipment"},
                {"num":5,"row":1,"col":4,"len":4,"clue":"Exclamation of surprise"},
                {"num":7,"row":2,"col":5,"len":5,"clue":"Blemish"},
                {"num":9,"row":3,"col":4,"len":4,"clue":"Trunk appendage"},
                {"num":12,"row":4,"col":3,"len":3,"clue":"Push down keys"},
                {"num":14,"row":4,"col":6,"len":3,"clue":"Fixed in memory"},
            ],
        },
    },
    {
        "id": 2,
        "size": 7,
        "grid": [
            [1,1,1,0,1,1,1],
            [1,0,1,0,1,0,1],
            [1,1,1,1,1,1,1],
            [0,0,1,0,1,0,0],
            [1,1,1,1,1,1,1],
            [1,0,1,0,1,0,1],
            [1,1,1,0,1,1,1],
        ],
        "solution": [
            ["N","E","T","","S","U","N"],
            ["A","","A","","E","","O"],
            ["P","I","G","E","O","N","S"],
            ["","","E","","N","",""],
            ["B","R","A","I","N","S","T"],
            ["O","","T","","E","","O"],
            ["X","E","S","","D","E","P"],
        ],
        "clues": {
            "across": [
                {"num":1,"row":0,"col":0,"len":3,"clue":"Mesh trap"},
                {"num":3,"row":0,"col":4,"len":3,"clue":"Our star"},
                {"num":5,"row":2,"col":0,"len":7,"clue":"City birds (plural)"},
                {"num":7,"row":4,"col":0,"len":7,"clue":"Genius storms"},
                {"num":9,"row":6,"col":0,"len":3,"clue":"Battles (plural)"},
                {"num":10,"row":6,"col":4,"len":3,"clue":"Deep"},
            ],
            "down": [
                {"num":1,"row":0,"col":0,"len":7,"clue":"Napoleon's island"},
                {"num":2,"row":0,"col":2,"len":7,"clue":"Tidy"},
                {"num":3,"row":0,"col":4,"len":7,"clue":"Antenna"},
                {"num":4,"row":0,"col":6,"len":7,"clue":"Announcement"},
                {"num":6,"row":2,"col":2,"len":3,"clue":"Small bird"},
                {"num":8,"row":2,"col":4,"len":3,"clue":"Digit after 9"},
            ],
        },
    },
    {
        "id": 3,
        "size": 7,
        "grid": [
            [1,1,1,1,1,0,1],
            [1,0,0,0,1,0,1],
            [1,1,1,0,1,1,1],
            [1,0,1,0,0,0,1],
            [1,1,1,0,1,1,1],
            [1,0,0,0,1,0,1],
            [1,0,1,1,1,1,1],
        ],
        "solution": [
            ["Q","U","I","Z","S","","H"],
            ["U","","","","O","","I"],
            ["E","A","S","","L","V","E"],
            ["S","","T","","","","N"],
            ["T","I","E","","G","A","M"],
            ["E","","","","R","","E"],
            ["D","","A","C","E","S","S"],
        ],
        "clues": {
            "across": [
                {"num":1,"row":0,"col":0,"len":5,"clue":"Trivia contest"},
                {"num":3,"row":0,"col":6,"len":1,"clue":"Prefix for 'story'"},
                {"num":5,"row":2,"col":0,"len":3,"clue":"Not difficult"},
                {"num":6,"row":2,"col":4,"len":3,"clue":"Past tense of 'live'"},
                {"num":8,"row":4,"col":0,"len":3,"clue":"Draw in sport"},
                {"num":9,"row":4,"col":4,"len":3,"clue":"Activity for points"},
                {"num":11,"row":6,"col":2,"len":5,"clue":"Top cards, plural"},
            ],
            "down": [
                {"num":1,"row":0,"col":0,"len":7,"clue":"Put a question to"},
                {"num":2,"row":0,"col":4,"len":5,"clue":"Sphere"},
                {"num":4,"row":2,"col":1,"len":3,"clue":"Drink slowly"},
                {"num":7,"row":2,"col":5,"len":3,"clue":"Short letter"},
                {"num":10,"row":4,"col":4,"len":3,"clue":"Female deer"},
            ],
        },
    },
]


# ── 8×8 puzzles ────────────────────────────────────────────────────────────
PUZZLES.append({
    "id": 4,
    "size": 8,
    "grid": [
        [1,1,1,1,0,1,1,1],
        [1,0,1,0,1,1,0,1],
        [1,1,1,1,1,0,1,1],
        [1,0,1,0,1,1,1,0],
        [0,1,1,1,0,1,0,1],
        [1,1,0,1,1,1,1,1],
        [1,0,1,0,1,0,1,0],
        [1,1,1,1,0,1,1,1],
    ],
    "solution": [
        ["B","E","A","R","","C","A","T"],
        ["O","","S","","S","O","","R"],
        ["O","K","S","I","E","","P","E"],
        ["K","","Y","","N","E","E","",],
        ["","R","E","D","","S","R","T"],
        ["L","I","","O","C","E","A","N"],
        ["E","","S","","A","","Y","",],
        ["G","O","T","O","","E","E","L"],
    ],
    "clues": {
        "across": [
            {"num":1,"row":0,"col":0,"len":4,"clue":"Honey lover"},
            {"num":3,"row":0,"col":5,"len":3,"clue":"Feline pet"},
            {"num":5,"row":2,"col":0,"len":5,"clue":"OK + Type-I letter"},
            {"num":7,"row":2,"col":6,"len":2,"clue":"Sneak a glance"},
            {"num":8,"row":5,"col":0,"len":2,"clue":"Untrue"},
            {"num":9,"row":5,"col":3,"len":5,"clue":"Big blue body"},
            {"num":10,"row":7,"col":0,"len":4,"clue":"Travel to"},
            {"num":11,"row":7,"col":5,"len":3,"clue":"Snake-like fish"},
        ],
        "down": [
            {"num":1,"row":0,"col":0,"len":4,"clue":"Reserve in advance"},
            {"num":2,"row":0,"col":2,"len":3,"clue":"Ass (donkey)"},
            {"num":3,"row":0,"col":5,"len":3,"clue":"Maize plant"},
            {"num":4,"row":0,"col":7,"len":3,"clue":"Three (Roman num.)"},
            {"num":6,"row":2,"col":4,"len":2,"clue":"Detect (perceive)"},
            {"num":7,"row":4,"col":1,"len":3,"clue":"Travelled (past)"},
        ],
    },
})

# ── 9×9 puzzles ────────────────────────────────────────────────────────────
PUZZLES.append({
    "id": 5,
    "size": 9,
    "grid": [
        [1,1,1,1,0,1,1,1,1],
        [1,0,1,0,1,1,0,1,0],
        [1,1,1,1,1,0,1,1,1],
        [1,0,1,0,1,1,1,0,1],
        [0,1,1,1,0,1,0,1,1],
        [1,1,0,1,1,1,1,1,0],
        [1,0,1,0,1,0,1,0,1],
        [1,1,1,1,0,1,1,1,1],
        [1,0,1,0,1,1,0,1,1],
    ],
    "solution": [
        ["G","A","M","E","","S","N","O","W"],
        ["O","","O","","R","O","","P","",],
        ["L","A","O","R","A","","C","E","O"],
        ["F","","N","","S","E","A","","P"],
        ["","A","S","H","","R","","I","E"],
        ["T","O","","L","I","V","E","R","",],
        ["R","","D","","K","","S","","A"],
        ["E","A","R","S","","D","E","E","R"],
        ["E","","Y","","P","I","","C","T"],
    ],
    "clues": {
        "across": [
            {"num":1,"row":0,"col":0,"len":4,"clue":"Sport / contest"},
            {"num":4,"row":0,"col":5,"len":4,"clue":"White precipitation"},
            {"num":7,"row":2,"col":0,"len":5,"clue":"Asian country (anagram of OLAO + R)"},
            {"num":8,"row":2,"col":6,"len":3,"clue":"Chief Executive Officer"},
            {"num":9,"row":5,"col":3,"len":5,"clue":"Body organ"},
            {"num":10,"row":7,"col":0,"len":4,"clue":"Hearing organs"},
            {"num":11,"row":7,"col":5,"len":4,"clue":"Forest mammal"},
        ],
        "down": [
            {"num":1,"row":0,"col":0,"len":4,"clue":"Sport (recreation)"},
            {"num":2,"row":0,"col":2,"len":4,"clue":"Crescent satellite"},
            {"num":3,"row":0,"col":7,"len":2,"clue":"Surgical procedure"},
            {"num":5,"row":1,"col":4,"len":3,"clue":"Pasta sauce base"},
            {"num":6,"row":0,"col":8,"len":2,"clue":"Walked (past)"},
        ],
    },
})


def _seed_int(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest(), 16) % (10**9)


def _filter_by_size(size: Optional[int]):
    if size is None:
        return PUZZLES
    matches = [p for p in PUZZLES if p["size"] == size]
    return matches or PUZZLES


@router.get("/new")
def get_new_crossword(
    difficulty: str = Query("medium"),
    size: Optional[int] = Query(None, ge=7, le=9),
):
    pool = _filter_by_size(size)
    puzzle = random.choice(pool)
    return {
        "id": puzzle["id"],
        "size": puzzle["size"],
        "grid": puzzle["grid"],
        "solution": puzzle["solution"],
        "clues": puzzle["clues"],
        "difficulty": difficulty,
    }


@router.get("/daily")
def get_daily_crossword(
    date: str,
    difficulty: str = Query("medium"),
    size: Optional[int] = Query(None, ge=7, le=9),
):
    pool = _filter_by_size(size)
    random.seed(_seed_int(f"crossword-{date}-{difficulty}-{size or 'any'}"))
    puzzle = random.choice(pool)
    random.seed()
    return {
        "id": puzzle["id"],
        "size": puzzle["size"],
        "grid": puzzle["grid"],
        "solution": puzzle["solution"],
        "clues": puzzle["clues"],
        "difficulty": difficulty,
        "date": date,
    }
