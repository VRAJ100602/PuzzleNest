from fastapi import APIRouter, Query
import random
import hashlib

router = APIRouter(
    prefix="/games/pipes",
    tags=["pipes"]
)

def get_direction(from_r, from_c, to_r, to_c):
    if to_r < from_r: return 'N'
    if to_r > from_r: return 'S'
    if to_c < from_c: return 'W'
    if to_c > from_c: return 'E'
    return None

def get_shape_for_path(prev_dir, next_dir):
    # dirs are 'N', 'S', 'E', 'W'
    # prev_dir is direction FROM prev TO current
    # next_dir is direction FROM current TO next
    
    # We want ports on current cell.
    # The port to prev is opposite of prev_dir.
    # The port to next is next_dir.
    
    def opposite(d):
        return {'N':'S', 'S':'N', 'E':'W', 'W':'E'}[d]
        
    ports = {opposite(prev_dir), next_dir}
    
    if ports == {'N', 'S'} or ports == {'E', 'W'}:
        return 'straight'
    else:
        return 'corner'

def generate_pipes(size=5, seed=None):
    if seed:
        random.seed(seed)
    else:
        random.seed()
        
    # 1. Generate random path from (0,0) to (size-1, size-1)
    def find_path():
        path = [(0, 0)]
        visited = {(0, 0)}
        
        while path[-1] != (size-1, size-1):
            r, c = path[-1]
            neighbors = []
            for nr, nc in [(r-1, c), (r+1, c), (r, c-1), (r, c+1)]:
                if 0 <= nr < size and 0 <= nc < size and (nr, nc) not in visited:
                    # Give preference to moving towards bottom-right to avoid getting stuck too easily
                    weight = 1
                    if nr > r or nc > c:
                        weight = 3
                    neighbors.extend([(nr, nc)] * weight)
            
            if not neighbors:
                return None # stuck
                
            next_cell = random.choice(neighbors)
            path.append(next_cell)
            visited.add(next_cell)
        return path

    path = None
    while not path:
        path = find_path()
        
    # 2. Build grid
    grid = []
    for r in range(size):
        row = []
        for c in range(size):
            row.append({
                'shape': random.choice(['straight', 'corner', 't', 'cross']),
                'rotation': random.choice([0, 90, 180, 270])
            })
        grid.append(row)
        
    # 3. Carve path
    for i in range(len(path)):
        r, c = path[i]
        
        if i == 0:
            # Source
            next_dir = get_direction(r, c, path[i+1][0], path[i+1][1])
            shape = 'source'
        elif i == len(path) - 1:
            # Sink
            prev_dir = get_direction(path[i-1][0], path[i-1][1], r, c)
            shape = 'sink'
        else:
            prev_dir = get_direction(path[i-1][0], path[i-1][1], r, c)
            next_dir = get_direction(r, c, path[i+1][0], path[i+1][1])
            shape = get_shape_for_path(prev_dir, next_dir)
            
        grid[r][c] = {
            'shape': shape,
            'rotation': random.choice([0, 90, 180, 270])
        }
        
    return {
        "size": size,
        "grid": grid
    }

@router.get("/new")
def get_new_pipes(
    difficulty: str = Query("medium"),
    level: int = None
):
    if level is not None:
        level = max(1, min(level, 100))
        size = int(4 + (level - 1) * 11 / 99)
    else:
        size = 5
        if difficulty == "easy":
            size = 5
        elif difficulty == "medium":
            size = 6
        elif difficulty == "hard":
            size = 8
        elif difficulty == "expert":
            size = 10
        
    res = generate_pipes(size)
    if level is not None:
        res["level"] = level
    return res

@router.get("/daily")
def get_daily_pipes(date: str, difficulty: str = Query("medium")):
    size = 5
    if difficulty == "easy":
        size = 5
    elif difficulty == "medium":
        size = 6
    elif difficulty == "hard":
        size = 8
    elif difficulty == "expert":
        size = 10
        
    seed_str = f"pipes-{date}-{difficulty}"
    seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16) % (10**8)
    return generate_pipes(size, seed=seed_int)
