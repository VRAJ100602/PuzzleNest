import asyncio
import json
import random
import uuid
import re
import httpx
from collections import defaultdict
from typing import Dict, List, Optional
import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app import models
from app.core.config import settings
from app.database import SessionLocal

router = APIRouter(prefix="/multiplayer", tags=["multiplayer"])

# ── Maximum payload size for WebSocket messages (10 KB) ─────────────────────
MAX_WS_PAYLOAD_SIZE = 10_000

class Player:
    def __init__(self, username: str, user_id: Optional[int], websocket: WebSocket):
        self.username = username
        self.user_id = user_id
        self.websocket = websocket
        self.room_id: Optional[str] = None
        self.game_type: str = "sudoku"
        self.progress: float = 0.0

class Room:
    def __init__(self, room_id: str, game_type: str, player1: Player, player2: Player, puzzle_data: dict):
        self.room_id = room_id
        self.game_type = game_type
        self.players = {player1.username: player1, player2.username: player2}
        self.player1 = player1
        self.player2 = player2
        self.puzzle_data = puzzle_data
        self.winner: Optional[str] = None
        self.is_active = True

# In-memory matchmaking queue and active rooms
matchmaking_queues: Dict[str, List[Player]] = defaultdict(list)
active_rooms: Dict[str, Room] = {}
queue_lock = asyncio.Lock()

def authenticate_token(token: str) -> tuple[Optional[str], Optional[int]]:
    """Decode JWT token and return username and user ID if valid."""
    if not token:
        return None, None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if username:
            db = SessionLocal()
            try:
                user = db.query(models.User).filter(models.User.username == username).first()
                if user:
                    return user.username, user.id
            finally:
                db.close()
    except Exception as e:
        print(f"WS auth error: {e}")
    return None, None

def _sanitize_guest_name() -> str:
    """Generate a safe, random guest username that cannot impersonate real users."""
    return f"Guest_{random.randint(10000, 99999)}"

def update_db_stats(user_id: int, won: bool, game_type: str):
    """Update statistics in db for a registered user."""
    db = SessionLocal()
    try:
        stats = db.query(models.GameStats).filter(
            models.GameStats.user_id == user_id,
            models.GameStats.game_type == game_type
        ).first()
        if not stats:
            stats = models.GameStats(
                user_id=user_id,
                game_type=game_type,
                games_played=0,
                games_won=0,
                high_score=0
            )
            db.add(stats)
            db.flush()
        stats.games_played += 1
        if won:
            stats.games_won += 1
        db.commit()
    except Exception as e:
        print(f"Failed to update db stats for user {user_id}: {e}")
    finally:
        db.close()

# Allowed game types to prevent injection via game_type parameter
ALLOWED_GAME_TYPES = frozenset([
    "sudoku", "2048", "shikaku", "wordle", "nonogram",
    "pipes", "tower", "minesweeper", "memory", "sliding",
    "lightsout", "colorflood",
    # New game types added with multiplayer support
    "crossword", "atoms", "mosaic", "lits", "mambo", "kings", "snap",
])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await websocket.accept()
    
    # 1. Authenticate user or assign a safe Guest name
    # NOTE: We no longer accept user-provided usernames via query parameter
    # to prevent impersonation attacks.
    db_username, db_user_id = authenticate_token(token) if token else (None, None)
    
    if db_username:
        player_username = db_username
        player_user_id = db_user_id
    else:
        player_username = _sanitize_guest_name()
        player_user_id = None
        
    player = Player(player_username, player_user_id, websocket)
    
    print(f"Player {player_username} connected to multiplayer WS.")
    
    try:
        while True:
            # Wait for messages from this client
            data = await websocket.receive_text()

            # Guard against oversized payloads
            if len(data) > MAX_WS_PAYLOAD_SIZE:
                await websocket.send_json({"type": "error", "detail": "Payload too large"})
                continue

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            msg_type = message.get("type")
            
            if msg_type == "join_queue":
                game_type = message.get("game_type", "sudoku")

                # Validate game_type against whitelist
                if game_type == "random":
                    game_type = random.choice(list(ALLOWED_GAME_TYPES))
                elif game_type not in ALLOWED_GAME_TYPES:
                    await websocket.send_json({"type": "error", "detail": "Invalid game type"})
                    continue

                player.game_type = game_type
                
                async with queue_lock:
                    queue = matchmaking_queues[game_type]
                    # Avoid duplicates
                    if any(p.username == player.username for p in queue):
                        continue
                    
                    # Add to queue
                    queue.append(player)
                    print(f"Player {player.username} joined {game_type} queue. Queue size: {len(queue)}")
                    
                    # Send queue status
                    await websocket.send_json({"type": "queue_joined", "username": player.username, "game_type": game_type})
                    
                    # Trigger match check if queue has >= 2 players
                    if len(queue) >= 2:
                        p1 = queue.pop(0)
                        p2 = queue.pop(0)
                        
                        # Create match room
                        room_id = str(uuid.uuid4())
                        
                        # Generate puzzle via internal API call
                        try:
                            async with httpx.AsyncClient() as client:
                                url = f"http://127.0.0.1:8000/api/v1/games/{game_type}/new?difficulty=medium"
                                resp = await client.get(url)
                                puzzle_data = resp.json()
                        except Exception as e:
                            print(f"Error fetching puzzle for {game_type}: {e}")
                            puzzle_data = {}
                        
                        room = Room(room_id, game_type, p1, p2, puzzle_data)
                        active_rooms[room_id] = room
                        
                        p1.room_id = room_id
                        p2.room_id = room_id
                        
                        payload1 = {
                            "type": "match_found",
                            "room_id": room_id,
                            "game_type": game_type,
                            "opponent": {"username": p2.username},
                            "puzzle_data": puzzle_data
                        }
                        payload2 = {
                            "type": "match_found",
                            "room_id": room_id,
                            "game_type": game_type,
                            "opponent": {"username": p1.username},
                            "puzzle_data": puzzle_data
                        }
                        
                        await p1.websocket.send_json(payload1)
                        await p2.websocket.send_json(payload2)
                        
                        print(f"Match found! Room {room_id} created between {p1.username} and {p2.username} for {game_type}")
                        
            elif msg_type == "leave_queue":
                game_type = player.game_type
                async with queue_lock:
                    # Check and remove player
                    if game_type in matchmaking_queues:
                        queue = matchmaking_queues[game_type]
                        to_remove = None
                        for p in queue:
                            if p.username == player.username:
                                to_remove = p
                                break
                        if to_remove:
                            queue.remove(to_remove)
                            print(f"Player {player.username} left {game_type} matchmaking queue.")
                    await websocket.send_json({"type": "queue_left"})
                    
            elif msg_type == "progress":
                room_id = player.room_id
                if room_id and room_id in active_rooms:
                    room = active_rooms[room_id]
                    progress = message.get("progress", 0.0)

                    # Validate progress value
                    if not isinstance(progress, (int, float)) or progress < 0 or progress > 100:
                        continue

                    player.progress = progress
                    
                    # Find opponent
                    opponent = room.player2 if player.username == room.player1.username else room.player1
                    # Send opponent progress to opponent
                    try:
                        await opponent.websocket.send_json({
                            "type": "opponent_progress",
                            "progress": progress
                        })
                    except Exception as e:
                        print(f"Failed to send progress update: {e}")
                        
            elif msg_type == "solve":
                room_id = player.room_id
                if room_id and room_id in active_rooms:
                    room = active_rooms[room_id]
                    if room.is_active and not room.winner:
                        room.winner = player.username
                        room.is_active = False
                        
                        # Send game_over to player 1 and 2
                        game_over_data = {
                            "type": "game_over",
                            "winner": player.username,
                            "reason": "solved"
                        }
                        
                        # Update stats if users are registered
                        if room.player1.user_id:
                            update_db_stats(room.player1.user_id, room.player1.username == player.username, room.game_type)
                        if room.player2.user_id:
                            update_db_stats(room.player2.user_id, room.player2.username == player.username, room.game_type)
                            
                        try:
                            await room.player1.websocket.send_json(game_over_data)
                        except Exception:
                            pass
                        try:
                            await room.player2.websocket.send_json(game_over_data)
                        except Exception:
                            pass
                        
                        # Clean up room
                        del active_rooms[room_id]
                        print(f"Game over in room {room_id}. Winner: {player.username}")
                        
    except WebSocketDisconnect:
        print(f"Player {player.username} disconnected.")
        # Handle disconnect cleanups
        async with queue_lock:
            game_type = player.game_type
            if game_type in matchmaking_queues:
                queue = matchmaking_queues[game_type]
                to_remove = None
                for p in queue:
                    if p.username == player.username:
                        to_remove = p
                        break
                if to_remove:
                    queue.remove(to_remove)
                
        room_id = player.room_id
        if room_id and room_id in active_rooms:
            room = active_rooms[room_id]
            if room.is_active:
                room.is_active = False
                opponent = room.player2 if player.username == room.player1.username else room.player1
                room.winner = opponent.username
                
                # Update stats if users are registered
                if room.player1.user_id:
                    update_db_stats(room.player1.user_id, room.player1.username == opponent.username, room.game_type)
                if room.player2.user_id:
                    update_db_stats(room.player2.user_id, room.player2.username == opponent.username, room.game_type)
                
                try:
                    await opponent.websocket.send_json({
                        "type": "game_over",
                        "winner": opponent.username,
                        "reason": "forfeit"
                    })
                except Exception:
                    pass
                    
            if room_id in active_rooms:
                del active_rooms[room_id]
