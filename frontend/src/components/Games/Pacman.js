import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';
import GlassCard from '../Common/GlassCard';

// Maze templates (19x19)
// 1 = Wall, 2 = Dot, 3 = Power Pellet, 0 = Empty, 4 = Ghost Gate / Spawner Area
const MAZES = [
    // Maze 0: Standard Symmetrical Loop
    [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
        [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Maze 1: Open Pathways with Core Block
    [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,3,1],
        [1,2,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,2,1],
        [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
        [1,2,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,2,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
        [1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Maze 2: Pillars & Long Halls
    [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,1,1,2,1,2,2,2,1,2,2,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,1,1,0,1,0,1,1,1,2,2,2,2,1],
        [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [1,2,2,2,2,1,0,0,0,0,0,0,0,1,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,1,1,2,2,2,2,2,1,2,2,2,2,2,1,1,2,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,3,2,2,2,1,1,1,2,0,2,1,1,1,2,2,2,3,1],
        [1,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Maze 3: Central Loop Ring
    [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
        [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
        [1,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,2,1],
        [1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
        [1,2,2,2,2,1,2,2,2,2,2,2,2,1,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1],
        [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
        [1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ]
];

const TILE_SIZE = 20;

const Pacman = ({ level = null, gameMode = 'classic', onFinishGame, onNextLevel }) => {
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [runtimeError, setRuntimeError] = useState(null);

    // Canvas references
    const canvasRef = useRef(null);
    const requestRef = useRef(null);

    // Game state tracking values (mutable, direct updates for animation loop)
    const gameState = useRef({
        grid: [],
        totalDots: 0,
        dotsEaten: 0,
        ghostSpeed: 1.5, // pixels per frame
        pacSpeed: 2,
        frightenedDuration: 360, // frames (~6 seconds)
        frightenedTimer: 0,
        lives: 3,
        score: 0,
        startTime: Date.now(),
        lastElapsed: 0,
        
        // Pacman
        pacman: {
            x: 9 * TILE_SIZE + TILE_SIZE / 2,
            y: 15 * TILE_SIZE + TILE_SIZE / 2,
            dirX: 0,
            dirY: 0,
            nextDirX: 0,
            nextDirY: 0,
            mouthAngle: 0.2,
            mouthGrow: 0.02
        },

        // Ghosts
        ghosts: [
            { name: 'Blinky', color: '#FF0000', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 8 * TILE_SIZE + TILE_SIZE / 2, dirX: 1, dirY: 0, state: 'house', targetX: 9, targetY: 8, respawnTimer: 0 },
            { name: 'Pinky', color: '#FFC0CB', x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 8, targetY: 9, respawnTimer: 60 },
            { name: 'Inky', color: '#00FFFF', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 9, targetY: 9, respawnTimer: 180 },
            { name: 'Clyde', color: '#FFB852', x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 10, targetY: 9, respawnTimer: 300 }
        ]
    });

    useEffect(() => {
        loadGameConfig();
    }, [level]);

    // Timer logic
    useEffect(() => {
        if (!timerActive || gameStatus !== 'playing') return;
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timerActive, gameStatus]);

    const loadGameConfig = async () => {
        setLoading(true);
        setScore(0);
        setLives(3);
        setGameStatus('playing');
        setElapsedTime(0);
        setTimerActive(false);

        try {
            let config;
            if (level) {
                config = await api.getPacmanLevel(level);
            } else {
                config = await api.getPacman();
            }

            // Load parameters
            const gSpeed = config.ghost_speed ? config.ghost_speed * TILE_SIZE : 1.5;
            const frightSec = config.frightened_duration || 6.0;
            const mapIdx = config.map_index || 0;

            // Load map
            const originalMap = MAZES[mapIdx] || MAZES[0];
            const activeGrid = originalMap.map(row => [...row]);

            // Count dots
            let dots = 0;
            for (let r = 0; r < activeGrid.length; r++) {
                for (let c = 0; c < activeGrid[r].length; c++) {
                    if (activeGrid[r][c] === 2 || activeGrid[r][c] === 3) {
                        dots++;
                    }
                }
            }

            gameState.current = {
                grid: activeGrid,
                totalDots: dots,
                dotsEaten: 0,
                ghostSpeed: gSpeed,
                pacSpeed: 2.5,
                frightenedDuration: Math.round(frightSec * 60), // frames at 60fps
                frightenedTimer: 0,
                lives: 3,
                score: 0,
                startTime: Date.now(),
                lastElapsed: 0,
                pacman: {
                    x: 9 * TILE_SIZE + TILE_SIZE / 2,
                    y: 15 * TILE_SIZE + TILE_SIZE / 2,
                    dirX: 0,
                    dirY: 0,
                    nextDirX: 0,
                    nextDirY: 0,
                    mouthAngle: 0.2,
                    mouthGrow: 0.02
                },
                ghosts: [
                    { name: 'Blinky', color: '#FF0000', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 8 * TILE_SIZE + TILE_SIZE / 2, dirX: 1, dirY: 0, state: 'chase', targetX: 9, targetY: 8, respawnTimer: 0 },
                    { name: 'Pinky', color: '#FFC0CB', x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 8, targetY: 9, respawnTimer: 60 },
                    { name: 'Inky', color: '#00FFFF', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 9, targetY: 9, respawnTimer: 180 },
                    { name: 'Clyde', color: '#FFB852', x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: -1, state: 'house', targetX: 10, targetY: 9, respawnTimer: 300 }
                ]
            };

            console.log("Pacman config loaded successfully:", {
                gSpeed,
                frightSec,
                mapIdx,
                dots,
                ghostsCount: gameState.current.ghosts.length
            });

            setLoading(false);
            setTimerActive(true);
        } catch (e) {
            console.error('Failed to load Pacman config', e);
            setLoading(false);
        }
    };

    // Keyboard support on Web
    useEffect(() => {
        if (Platform.OS !== 'web' || gameStatus !== 'playing' || loading) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    queueDirection(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    queueDirection(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    queueDirection(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    queueDirection(1, 0);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, loading]);

    // Canvas rendering loop
    useEffect(() => {
        if (loading || gameStatus !== 'playing') {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const loop = () => {
            try {
                updateGame();
                drawGame(ctx);
                requestRef.current = requestAnimationFrame(loop);
            } catch (err) {
                console.error("Pacman loop error:", err);
                setRuntimeError(err.message + "\n" + err.stack);
            }
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [loading, gameStatus]);

    const isColliding = (x, y, isPacman = false) => {
        const r = 8.5; // Collision radius (slightly less than 10 to allow smooth navigation)
        const corners = [
            { x: x - r, y: y - r },
            { x: x + r, y: y - r },
            { x: x - r, y: y + r },
            { x: x + r, y: y + r }
        ];

        const grid = gameState.current.grid;
        if (!grid || grid.length === 0) return false;

        for (const corner of corners) {
            let cx = corner.x;
            let cy = corner.y;

            // Handle horizontal screen wrapping
            if (cx < 0) cx += 19 * TILE_SIZE;
            if (cx >= 19 * TILE_SIZE) cx -= 19 * TILE_SIZE;

            const gridX = Math.floor(cx / TILE_SIZE);
            const gridY = Math.floor(cy / TILE_SIZE);

            if (gridY < 0 || gridY >= grid.length || gridX < 0 || gridX >= grid[0].length) {
                return true; // Out of bounds is colliding
            }

            const cell = grid[gridY][gridX];
            if (cell === 1) return true; // Wall
            if (cell === 4 && isPacman) return true; // Spawner gate is wall for Pacman
        }

        return false;
    };

    const isValidMove = (posX, posY, dx, dy, isPacman = false) => {
        const speed = isPacman ? gameState.current.pacSpeed : gameState.current.ghostSpeed;
        if (dx === 0 && dy === 0) return !isColliding(posX, posY, isPacman);
        
        // For checking potential moves (like ghost pathfinding where dx, dy are unit vectors),
        // we check a full TILE_SIZE step to see if the next tile is clear
        const step = isPacman ? speed : TILE_SIZE;
        return !isColliding(posX + dx * step, posY + dy * step, isPacman);
    };

    const queueDirection = (dx, dy) => {
        const pac = gameState.current.pacman;
        pac.nextDirX = dx;
        pac.nextDirY = dy;
        // If not moving, or if making an instant 180-degree turnaround, apply immediately
        const isOpposite = (dx !== 0 && dx === -pac.dirX) || (dy !== 0 && dy === -pac.dirY);
        if ((pac.dirX === 0 && pac.dirY === 0) || isOpposite) {
            if (isValidMove(pac.x, pac.y, dx, dy, true)) {
                pac.dirX = dx;
                pac.dirY = dy;
            }
        }
    };

    const checkCenteredAndSnap = (entity, speed) => {
        const centerOffset = TILE_SIZE / 2;
        const checkValX = (entity.x - centerOffset) % TILE_SIZE;
        const checkValY = (entity.y - centerOffset) % TILE_SIZE;
        
        const absValX = Math.abs(checkValX);
        const absValY = Math.abs(checkValY);
        
        const distToCenterX = absValX > TILE_SIZE / 2 ? TILE_SIZE - absValX : absValX;
        const distToCenterY = absValY > TILE_SIZE / 2 ? TILE_SIZE - absValY : absValY;
        
        const closeX = distToCenterX < speed;
        const closeY = distToCenterY < speed;
        
        if (closeX && closeY) {
            entity.x = Math.round((entity.x - centerOffset) / TILE_SIZE) * TILE_SIZE + centerOffset;
            entity.y = Math.round((entity.y - centerOffset) / TILE_SIZE) * TILE_SIZE + centerOffset;
            return true;
        }
        return false;
    };

    const updateGame = () => {
        const state = gameState.current;
        const pac = state.pacman;

        if (!state.logCounter) state.logCounter = 0;
        state.logCounter++;
        if (state.logCounter % 60 === 1) {
            console.log("Pacman update:", {
                pacX: pac.x,
                pacY: pac.y,
                pacDir: [pac.dirX, pac.dirY],
                ghosts: state.ghosts.map(g => ({ name: g.name, x: g.x, y: g.y, state: g.state, timer: g.respawnTimer }))
            });
        }

        // Update elapsed time (once per second)
        if (gameStatus === 'playing') {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            if (elapsed !== state.lastElapsed) {
                state.lastElapsed = elapsed;
                setElapsedTime(elapsed);
            }
        }

        // 1. Pacman movement
        // Check if next direction is valid and Pacman is centered on a tile
        const pacCentered = checkCenteredAndSnap(pac, state.pacSpeed);

        if (pacCentered && (pac.nextDirX !== 0 || pac.nextDirY !== 0)) {
            if (isValidMove(pac.x, pac.y, pac.nextDirX, pac.nextDirY, true)) {
                pac.dirX = pac.nextDirX;
                pac.dirY = pac.nextDirY;
            }
        }

        // Apply movement
        if (isValidMove(pac.x, pac.y, pac.dirX, pac.dirY, true)) {
            pac.x += pac.dirX * state.pacSpeed;
            pac.y += pac.dirY * state.pacSpeed;

            // Screen wrapping
            if (pac.x < 0) pac.x = 19 * TILE_SIZE - TILE_SIZE / 2;
            if (pac.x > 19 * TILE_SIZE) pac.x = TILE_SIZE / 2;

            // Eating dots
            const gridX = Math.floor(pac.x / TILE_SIZE);
            const gridY = Math.floor(pac.y / TILE_SIZE);

            if (state.grid[gridY] && state.grid[gridY][gridX] === 2) {
                state.grid[gridY][gridX] = 0;
                state.score += 10;
                setScore(state.score);
                state.dotsEaten++;
                checkWin(state);
            } else if (state.grid[gridY] && state.grid[gridY][gridX] === 3) {
                // Power Pellet
                state.grid[gridY][gridX] = 0;
                state.score += 50;
                setScore(state.score);
                state.dotsEaten++;
                triggerFrightenedMode(state);
                checkWin(state);
            }

            // Animate mouth
            pac.mouthAngle += pac.mouthGrow;
            if (pac.mouthAngle > 0.4 || pac.mouthAngle < 0.05) {
                pac.mouthGrow = -pac.mouthGrow;
            }
        } else {
            // Stop if colliding
            pac.dirX = 0;
            pac.dirY = 0;
        }

        // 2. Frightened Timer
        if (state.frightenedTimer > 0) {
            state.frightenedTimer--;
            if (state.frightenedTimer === 0) {
                // Return ghosts to chase/scatter
                state.ghosts.forEach(g => {
                    if (g.state === 'frightened') g.state = 'chase';
                });
            }
        }

        // 3. Ghosts movement
        state.ghosts.forEach(g => {
            // Respawn timers
            if (g.state === 'house') {
                if (g.respawnTimer > 0) {
                    g.respawnTimer--;
                } else {
                    g.state = 'chase';
                    g.x = 9 * TILE_SIZE + TILE_SIZE / 2;
                    g.y = 8 * TILE_SIZE + TILE_SIZE / 2;
                }
                return;
            }

            if (g.state === 'eaten') {
                // Return to house
                const houseX = 9 * TILE_SIZE + TILE_SIZE / 2;
                const houseY = 9 * TILE_SIZE + TILE_SIZE / 2;
                const dx = houseX - g.x;
                const dy = houseY - g.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 4) {
                    g.state = 'house';
                    g.respawnTimer = 120; // Stay inside for a bit
                } else {
                    g.x += Math.sign(dx) * 4;
                    g.y += Math.sign(dy) * 4;
                }
                return;
            }

            // Ghost is moving in grid
            const speed = g.state === 'frightened' ? state.ghostSpeed * 0.5 : state.ghostSpeed;
            const gCentered = checkCenteredAndSnap(g, speed);

            if (gCentered) {
                const currGridX = Math.floor(g.x / TILE_SIZE);
                const currGridY = Math.floor(g.y / TILE_SIZE);

                // Decide next move
                const possibleMoves = [];
                const directions = [
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 },  // Down
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 }   // Right
                ];

                directions.forEach(d => {
                    // Prevent turning backwards instantly (unless frightened/eaten state change)
                    if (d.dx === -g.dirX && d.dy === -g.dirY) return;

                    if (isValidMove(g.x, g.y, d.dx, d.dy)) {
                        possibleMoves.push(d);
                    }
                });

                if (possibleMoves.length === 0) {
                    // Fallback: allow turning backward if no other moves are valid (dead end)
                    const backward = { dx: -g.dirX, dy: -g.dirY };
                    if (isValidMove(g.x, g.y, backward.dx, backward.dy)) {
                        possibleMoves.push(backward);
                    }
                }

                if (possibleMoves.length > 0) {
                    let bestMove = possibleMoves[0];

                    if (g.state === 'frightened') {
                        // Frightened ghosts make random moves
                        bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                    } else {
                        // Target tile based on ghost personality
                        let targetTx = currGridX;
                        let targetTy = currGridY;

                        const pacGridX = Math.floor(pac.x / TILE_SIZE);
                        const pacGridY = Math.floor(pac.y / TILE_SIZE);

                        if (g.name === 'Blinky') {
                            // Directly target Pacman
                            targetTx = pacGridX;
                            targetTy = pacGridY;
                        } else if (g.name === 'Pinky') {
                            // Target 4 spaces ahead of Pacman
                            targetTx = pacGridX + pac.dirX * 4;
                            targetTy = pacGridY + pac.dirY * 4;
                        } else if (g.name === 'Inky') {
                            // Mirror-target combination of Blinky and Pacman
                            const blinky = state.ghosts[0];
                            const blinkyGridX = Math.floor(blinky.x / TILE_SIZE);
                            const blinkyGridY = Math.floor(blinky.y / TILE_SIZE);
                            targetTx = pacGridX + (pacGridX - blinkyGridX);
                            targetTy = pacGridY + (pacGridY - blinkyGridY);
                        } else {
                            // Clyde: Chases if far, wanders to corner if close
                            const distPac = Math.sqrt((currGridX - pacGridX)**2 + (currGridY - pacGridY)**2);
                            if (distPac > 6) {
                                targetTx = pacGridX;
                                targetTy = pacGridY;
                            } else {
                                targetTx = 1;
                                targetTy = 17;
                            }
                        }

                        // Select move that minimizes straight-line distance to target
                        let minDist = Infinity;
                        possibleMoves.forEach(m => {
                            const nextTx = currGridX + m.dx;
                            const nextTy = currGridY + m.dy;
                            const dist = (nextTx - targetTx)**2 + (nextTy - targetTy)**2;
                            if (dist < minDist) {
                                minDist = dist;
                                bestMove = m;
                            }
                        });
                    }

                    g.dirX = bestMove.dx;
                    g.dirY = bestMove.dy;
                }
            }

            // Apply move (only if valid, or if in eaten/house state where it can bypass normal wall collisions)
            const canMove = g.state === 'eaten' || g.state === 'house' || isValidMove(g.x, g.y, g.dirX, g.dirY);
            if (canMove) {
                g.x += g.dirX * speed;
                g.y += g.dirY * speed;
            } else {
                // Force stop and snap if blocked
                g.dirX = 0;
                g.dirY = 0;
                checkCenteredAndSnap(g, speed);
            }

            // Wrap ghost
            if (g.x < 0) g.x = 19 * TILE_SIZE - TILE_SIZE / 2;
            if (g.x > 19 * TILE_SIZE) g.x = TILE_SIZE / 2;

            // 4. Ghost Pacman Collision check
            const dx = g.x - pac.x;
            const dy = g.y - pac.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < TILE_SIZE - 4) {
                if (g.state === 'frightened') {
                    // Eat ghost
                    g.state = 'eaten';
                    state.score += 200;
                    setScore(state.score);
                } else if (g.state !== 'eaten' && g.state !== 'house') {
                    // Lose a life
                    handlePacDeath(state);
                }
            }
        });
    };

    const triggerFrightenedMode = (state) => {
        state.frightenedTimer = state.frightenedDuration;
        state.ghosts.forEach(g => {
            if (g.state === 'chase') {
                g.state = 'frightened';
            }
        });
    };

    const handlePacDeath = (state) => {
        state.lives--;
        setLives(state.lives);

        if (state.lives > 0) {
            // Reset positions
            state.pacman.x = 9 * TILE_SIZE + TILE_SIZE / 2;
            state.pacman.y = 15 * TILE_SIZE + TILE_SIZE / 2;
            state.pacman.dirX = 0;
            state.pacman.dirY = 0;
            state.pacman.nextDirX = 0;
            state.pacman.nextDirY = 0;

            state.ghosts.forEach((g, i) => {
                g.x = (8 + i % 3) * TILE_SIZE + TILE_SIZE / 2;
                g.y = 9 * TILE_SIZE + TILE_SIZE / 2;
                g.state = 'house';
                g.respawnTimer = 60 * i;
            });
        } else {
            setLives(0);
            setGameStatus('lost');
            setTimerActive(false);
            api.updateStats('pacman', false, state.lastElapsed, state.score);
        }
    };

    const checkWin = (state) => {
        if (state.dotsEaten >= state.totalDots) {
            setGameStatus('won');
            setTimerActive(false);
            api.updateStats('pacman', true, state.lastElapsed, state.score);
            // If Level Mode, save completion state
            if (level) {
                api.markLevelComplete('pacman', level);
            }
        }
    };

    const drawGame = (ctx) => {
        const state = gameState.current;
        const grid = state.grid;

        if (!state.drawCounter) state.drawCounter = 0;
        state.drawCounter++;
        if (state.drawCounter % 60 === 1) {
            console.log("Pacman draw:", {
                gridRows: grid ? grid.length : 0,
                pacX: state.pacman.x,
                pacY: state.pacman.y
            });
        }

        // Clear canvas
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, 19 * TILE_SIZE, 19 * TILE_SIZE);

        // Draw grid
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const cell = grid[r][c];
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;

                if (cell === 1) {
                    // Draw neon blue walls
                    ctx.fillStyle = '#007AFF';
                    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                } else if (cell === 2) {
                    // Small food dots
                    ctx.beginPath();
                    ctx.fillStyle = '#FFD700';
                    ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cell === 3) {
                    // Big power pellet (pulse effect)
                    const pulse = 4 + Math.sin(Date.now() / 80) * 1.5;
                    ctx.beginPath();
                    ctx.fillStyle = '#FF9500';
                    ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, pulse, 0, Math.PI * 2);
                    ctx.fill();
                } else if (cell === 4) {
                    // Ghost house door
                    ctx.fillStyle = '#FFC0CB';
                    ctx.fillRect(x, y + 8, TILE_SIZE, 4);
                }
            }
        }

        // Draw Pacman
        const pac = state.pacman;
        let rotationAngle = 0;
        if (pac.dirX === 1) rotationAngle = 0;
        else if (pac.dirX === -1) rotationAngle = Math.PI;
        else if (pac.dirY === 1) rotationAngle = Math.PI / 2;
        else if (pac.dirY === -1) rotationAngle = -Math.PI / 2;

        ctx.beginPath();
        ctx.fillStyle = '#FFFF00';
        ctx.arc(
            pac.x,
            pac.y,
            TILE_SIZE / 2 - 1,
            rotationAngle + pac.mouthAngle,
            rotationAngle + Math.PI * 2 - pac.mouthAngle
        );
        ctx.lineTo(pac.x, pac.y);
        ctx.fill();

        // Draw ghosts
        state.ghosts.forEach(g => {
            if (g.state === 'house' && g.respawnTimer > 0) return;

            ctx.beginPath();
            if (g.state === 'frightened') {
                // Pulse blue and white at the end of frightened duration
                const durationLeft = state.frightenedTimer;
                const isFlickering = durationLeft < 120 && Math.floor(durationLeft / 15) % 2 === 0;
                ctx.fillStyle = isFlickering ? '#FFFFFF' : '#0000FF';
            } else if (g.state === 'eaten') {
                // Invisible body, just eyes
                ctx.fillStyle = 'transparent';
            } else {
                ctx.fillStyle = g.color;
            }

            if (g.state !== 'eaten') {
                ctx.arc(g.x, g.y - 1, TILE_SIZE / 2 - 1, Math.PI, 0, false);
                ctx.lineTo(g.x + TILE_SIZE / 2 - 1, g.y + TILE_SIZE / 2);
                ctx.lineTo(g.x - TILE_SIZE / 2 + 1, g.y + TILE_SIZE / 2);
                ctx.fill();
            }

            // Draw Eyes
            const eyeOffset = g.state === 'eaten' ? 0 : 1.5;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(g.x - 3, g.y - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(g.x + 3, g.y - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Pupil pupil moves to direction
            ctx.fillStyle = '#0000FF';
            ctx.beginPath();
            const px = g.dirX * eyeOffset;
            const py = g.dirY * eyeOffset;
            ctx.arc(g.x - 3 + px, g.y - 2 + py, 1.2, 0, Math.PI * 2);
            ctx.arc(g.x + 3 + px, g.y - 2 + py, 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <View style={styles.container}>
            {runtimeError && (
                <View style={{ backgroundColor: '#FF3B30', padding: 15, borderRadius: 8, marginBottom: 15, width: '100%', maxWidth: 380 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Game Loop Error:</Text>
                    <Text style={{ color: '#FFFFFF', fontFamily: 'monospace', fontSize: 11, marginTop: 5 }}>{runtimeError}</Text>
                </View>
            )}
            {/* HUD */}
            <View style={styles.hud}>
                <View style={styles.hudSection}>
                    <Text style={styles.hudLabel}>SCORE</Text>
                    <Text style={styles.hudValue}>{score}</Text>
                </View>
                <View style={styles.hudSection}>
                    <Text style={styles.hudLabel}>TIME</Text>
                    <Text style={styles.hudValue}>{formatTime(elapsedTime)}</Text>
                </View>
                <View style={styles.hudSection}>
                    <Text style={styles.hudLabel}>LIVES</Text>
                    <Text style={[styles.hudValue, { color: '#FF3B30' }]}>
                        {'❤️'.repeat(lives) || '💀'}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.loadingText}>Configuring level {level}...</Text>
                </View>
            ) : (
                <View style={styles.gameWrapper}>
                    <canvas
                        ref={canvasRef}
                        width={19 * TILE_SIZE}
                        height={19 * TILE_SIZE}
                        style={{
                            borderRadius: 12,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            border: '4px solid rgba(255, 255, 255, 0.1)',
                            maxWidth: '100%',
                            touchAction: 'none' // Prevent double-tap zooming on mobile
                        }}
                    />

                    {/* Virtual Joystick controls for Touch / Mobile layout */}
                    <View style={styles.joystickContainer}>
                        <View style={styles.joystickRow}>
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.controlBtn,
                                    {
                                        borderBottomWidth: pressed ? 1.5 : 4.5,
                                        transform: [{ translateY: pressed ? 3 : 0 }]
                                    }
                                ]} 
                                onPress={() => queueDirection(0, -1)}
                            >
                                <Text style={styles.controlBtnText}>▲</Text>
                            </Pressable>
                        </View>
                        <View style={styles.joystickRow}>
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.controlBtn,
                                    {
                                        borderBottomWidth: pressed ? 1.5 : 4.5,
                                        transform: [{ translateY: pressed ? 3 : 0 }]
                                    }
                                ]} 
                                onPress={() => queueDirection(-1, 0)}
                            >
                                <Text style={styles.controlBtnText}>◀</Text>
                            </Pressable>
                            <View style={styles.controlCenter} />
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.controlBtn,
                                    {
                                        borderBottomWidth: pressed ? 1.5 : 4.5,
                                        transform: [{ translateY: pressed ? 3 : 0 }]
                                    }
                                ]} 
                                onPress={() => queueDirection(1, 0)}
                            >
                                <Text style={styles.controlBtnText}>▶</Text>
                            </Pressable>
                        </View>
                        <View style={styles.joystickRow}>
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.controlBtn,
                                    {
                                        borderBottomWidth: pressed ? 1.5 : 4.5,
                                        transform: [{ translateY: pressed ? 3 : 0 }]
                                    }
                                ]} 
                                onPress={() => queueDirection(0, 1)}
                            >
                                <Text style={styles.controlBtnText}>▼</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            {gameStatus === 'won' && level && (
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 15 }}>
                    <NeonButton 
                        title="Submit & Next Level →" 
                        variant="success" 
                        onPress={onNextLevel}
                        style={{ width: '100%', maxWidth: 350 }}
                    />
                </View>
            )}

            {/* Victory / Defeat Overlays */}
            {gameStatus === 'won' && !level && (
                <View style={styles.overlay}>
                    <GlassCard style={styles.overlayCard}>
                        <Text style={[styles.overlayTitle, { color: '#4CD964' }]}>LEVEL CLEARED!</Text>
                        <Text style={styles.overlaySubtitle}>All dots eaten successfully!</Text>
                        <Text style={styles.overlayStat}>Total Score: {score}</Text>
                        <Text style={styles.overlayStat}>Time: {formatTime(elapsedTime)}</Text>
                        <NeonButton title="Play Again" variant="success" onPress={loadGameConfig} />
                    </GlassCard>
                </View>
            )}

            {gameStatus === 'lost' && (
                <View style={styles.overlay}>
                    <GlassCard style={styles.overlayCard}>
                        <Text style={[styles.overlayTitle, { color: '#FF3B30' }]}>GAME OVER</Text>
                        <Text style={styles.overlaySubtitle}>Out of lives!</Text>
                        <Text style={styles.overlayStat}>Score: {score}</Text>
                        <NeonButton title="Try Again" variant="primary" onPress={loadGameConfig} />
                    </GlassCard>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        width: '100%'
    },
    hud: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 380,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
    },
    hudSection: {
        alignItems: 'center',
        flex: 1
    },
    hudLabel: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: '900',
        letterSpacing: 0.8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    hudValue: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        marginTop: 2
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 380,
        width: 380,
        backgroundColor: '#0a0a14',
        borderRadius: 12
    },
    loadingText: {
        color: '#FFD700',
        marginTop: 15,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    gameWrapper: {
        alignItems: 'center'
    },
    joystickContainer: {
        marginTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: 180,
        height: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 90,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        // Only show controls on mobile/touch layout dynamically if user prefers, but always show them here for accessibility
    },
    joystickRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        borderBottomColor: 'rgba(0, 0, 0, 0.25)',
        ...Platform.select({ 
            web: { 
                cursor: 'pointer', 
                userSelect: 'none',
                transition: 'transform 0.1s ease, border-bottom-width 0.1s ease, box-shadow 0.1s ease',
                boxShadow: '0 3px 0 rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0,0,0,0.1)'
            } 
        }),
    },
    controlBtnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold'
    },
    controlCenter: {
        width: 48,
        height: 48
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        borderRadius: 12,
        padding: 20
    },
    overlayCard: {
        width: '100%',
        maxWidth: 300,
        padding: 24,
        alignItems: 'center'
    },
    overlayTitle: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    overlaySubtitle: {
        fontSize: 14,
        color: '#EBEBF5',
        marginBottom: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    overlayStat: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '700',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default Pacman;
