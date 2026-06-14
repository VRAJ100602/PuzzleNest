import uuid
import time
import threading

_store = {}
_lock = threading.Lock()
_TTL = 3600 * 2  # 2 hours


def store_solution(solution) -> str:
    puzzle_id = str(uuid.uuid4())
    with _lock:
        _store[puzzle_id] = {"solution": solution, "created_at": time.time()}
    return puzzle_id


def get_solution(puzzle_id: str):
    with _lock:
        entry = _store.get(puzzle_id)
        if entry is None:
            return None
        if time.time() - entry["created_at"] > _TTL:
            del _store[puzzle_id]
            return None
        return entry["solution"]


def remove_solution(puzzle_id: str):
    with _lock:
        _store.pop(puzzle_id, None)


def cleanup_expired():
    with _lock:
        now = time.time()
        expired = [k for k, v in _store.items() if now - v["created_at"] > _TTL]
        for k in expired:
            del _store[k]


def get_generation_time(puzzle_id: str):
    with _lock:
        entry = _store.get(puzzle_id)
        if entry is None:
            return None
        return entry["created_at"]

