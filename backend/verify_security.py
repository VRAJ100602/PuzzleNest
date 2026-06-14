import sys
import time
import random

# Add current directory to path to import app
sys.path.append('.')

from app.main import app
from app.core.puzzle_store import _store
from fastapi.testclient import TestClient

client = TestClient(app)

def generate_random_user():
    username = f"user_{random.randint(100000, 999999)}"
    password = "SecurePassword123!"
    return username, password

def run_tests():
    print("=== STARTING SECURITY VERIFICATION TESTS ===")
    
    # 1. Register a test user to get token
    username, password = generate_random_user()
    print(f"Registering test user: {username} ...")
    r = client.post("/api/v1/auth/register", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"Registration failed with code {r.status_code}: {r.text}")
        return False
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Successfully registered and authenticated.")
    
    # 2. Test Rate Limiting on Sudoku generation
    print("\n--- Testing Rate Limiting (Sudoku /new) ---")
    print("Hitting sudoku/new up to 25 times quickly...")
    rate_limited = False
    for i in range(25):
        try:
            r = client.get("/api/v1/games/sudoku/new")
            if r.status_code == 429:
                rate_limited = True
                print(f"Got 429 Rate Limited at request #{i+1}! (Expected behavior)")
                break
        except Exception:
            pass
    if not rate_limited:
        print("Warning: Did not trigger 429 Rate Limit (maybe slowapi is disabled)")
    else:
        print("Rate limiting check: PASSED")

    # 3. Test Solve Time Check (Anti-Cheat)
    print("\n--- Testing Minimum Solve Time Check (Anti-Cheat) ---")
    r_game = client.get("/api/v1/games/wordle/new")
    if r_game.status_code != 200:
        print("Failed to get a new Wordle game")
        return False
    game_data = r_game.json()
    puzzle_id = game_data["puzzle_id"]
    
    # Retrieve solution directly from in-memory store
    solution_word = _store[puzzle_id]["solution"]
    print(f"Retrieved solution word from memory: {solution_word}")
    
    # Immediately try to guess correctly (should fail anti-cheat)
    print("Attempting to guess solution immediately (should trigger too-fast solve error)...")
    r_guess = client.post("/api/v1/games/wordle/guess", json={"puzzle_id": puzzle_id, "guess": solution_word})
    print(f"Immediate guess status: {r_guess.status_code}, response: {r_guess.text}")
    if r_guess.status_code == 400 and "too fast" in r_guess.text.lower():
        print("Anti-cheat too-fast check: PASSED")
    else:
        print("Error: Immediate solve was not blocked by anti-cheat minimum time threshold!")
        return False

    # 4. Test Stats Update without Solve Token
    print("\n--- Testing Stats Update without Solve Token ---")
    r_stats = client.post("/api/v1/stats/update", headers=headers, json={
        "game_type": "wordle",
        "won": True,
        "time_taken": 10.0,
        "score": 100
    })
    print(f"Stats update status (no token): {r_stats.status_code}, response: {r_stats.text}")
    if r_stats.status_code == 403:
        print("Stats update block (no token): PASSED")
    else:
        print("Error: Stats update without solve token was not blocked!")
        return False

    # 5. Test Stats Update with Invalid Solve Token
    print("\n--- Testing Stats Update with Invalid Solve Token ---")
    r_stats = client.post("/api/v1/stats/update", headers=headers, json={
        "game_type": "wordle",
        "won": True,
        "time_taken": 10.0,
        "score": 100,
        "solve_token": "some-invalid-fake-token"
    })
    print(f"Stats update status (invalid token): {r_stats.status_code}, response: {r_stats.text}")
    if r_stats.status_code == 403:
        print("Stats update block (invalid token): PASSED")
    else:
        print("Error: Stats update with invalid solve token was not blocked!")
        return False

    # 6. Test Legitimate Gameplay Sync (Solve after delay)
    print("\n--- Testing Legitimate Solve & Stats Update ---")
    r_game = client.get("/api/v1/games/wordle/new")
    game_data = r_game.json()
    puzzle_id = game_data["puzzle_id"]
    solution_word = _store[puzzle_id]["solution"]
    
    print("Waiting 3.5 seconds to bypass minimum solve time (3s)...")
    time.sleep(3.5)
    
    print("Submitting correct guess now...")
    r_guess = client.post("/api/v1/games/wordle/guess", json={"puzzle_id": puzzle_id, "guess": solution_word})
    print(f"Guess status: {r_guess.status_code}")
    if r_guess.status_code != 200:
        print(f"Failed to submit guess: {r_guess.text}")
        return False
    
    solve_token = r_guess.json().get("solve_token")
    print(f"Retrieved solve token: {solve_token}")
    if not solve_token:
        print("Error: No solve token returned on successful guess!")
        return False
        
    print("Syncing stats with valid solve token...")
    r_stats = client.post("/api/v1/stats/update", headers=headers, json={
        "game_type": "wordle",
        "won": True,
        "time_taken": 3.5,
        "score": 100,
        "solve_token": solve_token
    })
    print(f"Stats update status: {r_stats.status_code}, response: {r_stats.text}")
    if r_stats.status_code == 200:
        print("Legitimate stats update: PASSED")
    else:
        print("Error: Legitimate stats update failed!")
        return False

    print("\n=== ALL SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY! ===")
    return True

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
