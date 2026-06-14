"""Central achievement catalogue.

Each entry:
  id           – unique slug
  name         – display title
  description  – one-liner shown in the UI
  icon         – emoji
  coins        – reward on first unlock
  criteria     – dict that check_achievements() reads
"""

ACHIEVEMENTS = [
    # ── Total wins ─────────────────────────────────────────────────────────
    {
        "id": "first_win",
        "name": "First Victory",
        "description": "Win your first game",
        "icon": "🏆",
        "coins": 50,
        "criteria": {"type": "total_wins", "threshold": 1},
    },
    {
        "id": "win_5",
        "name": "Rising Star",
        "description": "Win 5 games total",
        "icon": "⭐",
        "coins": 25,
        "criteria": {"type": "total_wins", "threshold": 5},
    },
    {
        "id": "win_25",
        "name": "Puzzle Master",
        "description": "Win 25 games total",
        "icon": "🎯",
        "coins": 50,
        "criteria": {"type": "total_wins", "threshold": 25},
    },
    {
        "id": "win_100",
        "name": "Legend",
        "description": "Win 100 games total",
        "icon": "👑",
        "coins": 200,
        "criteria": {"type": "total_wins", "threshold": 100},
    },
    # ── Total games played ─────────────────────────────────────────────────
    {
        "id": "play_10",
        "name": "Dedicated Player",
        "description": "Play 10 games total",
        "icon": "🎮",
        "coins": 20,
        "criteria": {"type": "total_played", "threshold": 10},
    },
    {
        "id": "play_50",
        "name": "Puzzle Addict",
        "description": "Play 50 games total",
        "icon": "🔥",
        "coins": 40,
        "criteria": {"type": "total_played", "threshold": 50},
    },
    {
        "id": "play_200",
        "name": "Grinder",
        "description": "Play 200 games total",
        "icon": "💪",
        "coins": 100,
        "criteria": {"type": "total_played", "threshold": 200},
    },
    # ── Login streak ───────────────────────────────────────────────────────
    {
        "id": "streak_3",
        "name": "3-Day Streak",
        "description": "Log in 3 days in a row",
        "icon": "📅",
        "coins": 30,
        "criteria": {"type": "login_streak", "threshold": 3},
    },
    {
        "id": "streak_7",
        "name": "Week Warrior",
        "description": "Log in 7 days in a row",
        "icon": "🗓️",
        "coins": 75,
        "criteria": {"type": "login_streak", "threshold": 7},
    },
    {
        "id": "streak_30",
        "name": "Monthly Master",
        "description": "Log in 30 days in a row",
        "icon": "🌟",
        "coins": 300,
        "criteria": {"type": "login_streak", "threshold": 30},
    },
    # ── Per-game wins ──────────────────────────────────────────────────────
    {
        "id": "sudoku_5",
        "name": "Sudoku Solver",
        "description": "Win 5 Sudoku games",
        "icon": "🔢",
        "coins": 30,
        "criteria": {"type": "game_wins", "game": "sudoku", "threshold": 5},
    },
    {
        "id": "wordle_5",
        "name": "Word Wizard",
        "description": "Win 5 Wordle games",
        "icon": "📝",
        "coins": 30,
        "criteria": {"type": "game_wins", "game": "wordle", "threshold": 5},
    },
    {
        "id": "shikaku_5",
        "name": "Shape Shifter",
        "description": "Win 5 Shikaku games",
        "icon": "📐",
        "coins": 30,
        "criteria": {"type": "game_wins", "game": "shikaku", "threshold": 5},
    },
    {
        "id": "minesweeper_5",
        "name": "Bomb Defuser",
        "description": "Win 5 Minesweeper games",
        "icon": "💣",
        "coins": 30,
        "criteria": {"type": "game_wins", "game": "minesweeper", "threshold": 5},
    },
    # ── Variety ────────────────────────────────────────────────────────────
    {
        "id": "variety_3",
        "name": "Jack of All Puzzles",
        "description": "Win at least one game in 3 different game types",
        "icon": "🎭",
        "coins": 60,
        "criteria": {"type": "unique_game_wins", "threshold": 3},
    },
    {
        "id": "variety_7",
        "name": "Puzzle Polymath",
        "description": "Win at least one game in 7 different game types",
        "icon": "🌈",
        "coins": 150,
        "criteria": {"type": "unique_game_wins", "threshold": 7},
    },
    # ── Speed ──────────────────────────────────────────────────────────────
    {
        "id": "speed_sudoku",
        "name": "Speed Demon",
        "description": "Solve Sudoku in under 90 seconds",
        "icon": "⚡",
        "coins": 75,
        "criteria": {"type": "fast_time", "game": "sudoku", "threshold": 90},
    },
]
