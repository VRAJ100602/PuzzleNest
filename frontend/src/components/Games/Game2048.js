import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Game2048 = ({ onFinishGame , level = null }) => {
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)));
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [hasWonBefore, setHasWonBefore] = useState(false); // Can continue playing after 2048

    // Swipe touch helpers
    const touchStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Fetch high score
        const loadHighScore = async () => {
            try {
                const stats = await api.getStats();
                const record = stats.find(r => r.game_type === '2048');
                if (record) setHighScore(record.high_score || 0);
            } catch (e) {
                console.error(e);
            }
        };
        loadHighScore();

        // Try to resume saved game
        (async () => {
            if (!level) {
                try {
                    const saved = await api.loadGameProgress('2048');
                    if (saved && !saved.isCompleted && saved.board) {
                        setBoard(saved.board);
                        setScore(saved.score || 0);
                        setGameOver(false);
                        setGameWon(false);
                        return;
                    }
                } catch (e) { console.warn(e); }
            }
            startNewGame();
        })();
    }, []);

    // Keyboard controls for Web
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        
        const handleKeyDown = (e) => {
            if (gameOver) return;
            let moved = false;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    moved = moveUp();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    moved = moveDown();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    moved = moveLeft();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    moved = moveRight();
                    break;
                default:
                    return;
            }

            if (moved) {
                addNewTile();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [board, gameOver, gameWon, score]);

    const startNewGame = () => {
        let newBoard = Array(4).fill(null).map(() => Array(4).fill(0));
        newBoard = placeRandomTile(placeRandomTile(newBoard));
        setBoard(newBoard);
        setScore(0);
        setGameOver(false);
        setGameWon(false);
        setHasWonBefore(false);
        api.clearGameProgress('2048');
    };

    // Auto-save on board/score change
    useEffect(() => {
        if (gameOver || gameWon || level) return;
        const empty = board.every(row => row.every(v => v === 0));
        if (empty) return;
        const t = setTimeout(() => {
            api.saveGameProgress('2048', { board, score, isCompleted: false });
        }, 500);
        return () => clearTimeout(t);
    }, [board, score]);

    const placeRandomTile = (grid) => {
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }
        if (emptyCells.length === 0) return grid;
        
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const newGrid = [...grid.map(row => [...row])];
        newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
        return newGrid;
    };

    const addNewTile = () => {
        setBoard(prev => {
            const nextBoard = placeRandomTile(prev);
            checkGameStates(nextBoard);
            return nextBoard;
        });
    };

    const checkGameStates = (grid) => {
        if (!hasWonBefore) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (grid[r][c] === 2048) {
                        setGameWon(true);
                        setHasWonBefore(true);
                        api.clearGameProgress('2048');
                        api.updateStats('2048', true, null, score);
                        if (onFinishGame) onFinishGame('2048', true, score);
                        return;
                    }
                }
            }
        }

        let hasMoves = false;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) {
                    hasMoves = true;
                    break;
                }
                if (c < 3 && grid[r][c] === grid[r][c + 1]) {
                    hasMoves = true;
                    break;
                }
                if (r < 3 && grid[r][c] === grid[r + 1][c]) {
                    hasMoves = true;
                    break;
                }
            }
            if (hasMoves) break;
        }

        if (!hasMoves) {
            setGameOver(true);
            api.updateStats('2048', false, null, score);
            if (score > highScore) setHighScore(score);
        }
    };

    const rotateClockwise = (grid) => {
        const size = 4;
        let result = Array(size).fill(null).map(() => Array(size).fill(0));
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                result[c][size - 1 - r] = grid[r][c];
            }
        }
        return result;
    };

    const slideLeftAndMerge = (grid) => {
        let newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
        let moved = false;
        let scoreAddition = 0;

        for (let r = 0; r < 4; r++) {
            let row = grid[r].filter(val => val !== 0);
            let mergedRow = [];
            for (let i = 0; i < row.length; i++) {
                if (i < row.length - 1 && row[i] === row[i + 1]) {
                    mergedRow.push(row[i] * 2);
                    scoreAddition += row[i] * 2;
                    i++;
                } else {
                    mergedRow.push(row[i]);
                }
            }
            
            while (mergedRow.length < 4) {
                mergedRow.push(0);
            }
            
            newGrid[r] = mergedRow;

            if (JSON.stringify(newGrid[r]) !== JSON.stringify(grid[r])) {
                moved = true;
            }
        }

        if (scoreAddition > 0) {
            setScore(prev => prev + scoreAddition);
        }

        return { grid: newGrid, moved };
    };

    const moveLeft = () => {
        const res = slideLeftAndMerge(board);
        if (res.moved) {
            setBoard(res.grid);
            return true;
        }
        return false;
    };

    const moveRight = () => {
        let flipped = board.map(row => [...row].reverse());
        const res = slideLeftAndMerge(flipped);
        if (res.moved) {
            setBoard(res.grid.map(row => [...row].reverse()));
            return true;
        }
        return false;
    };

    const moveUp = () => {
        let rotated = rotateClockwise(rotateClockwise(rotateClockwise(board)));
        const res = slideLeftAndMerge(rotated);
        if (res.moved) {
            setBoard(rotateClockwise(res.grid));
            return true;
        }
        return false;
    };

    const moveDown = () => {
        let rotated = rotateClockwise(board);
        const res = slideLeftAndMerge(rotated);
        if (res.moved) {
            setBoard(rotateClockwise(rotateClockwise(rotateClockwise(res.grid))));
            return true;
        }
        return false;
    };

    const handleTouchStart = (e) => {
        const touch = e.nativeEvent.touches[0];
        touchStart.current = { x: touch.pageX, y: touch.pageY };
    };

    const handleTouchEnd = (e) => {
        if (gameOver) return;
        const touch = e.nativeEvent.changedTouches[0];
        const dx = touch.pageX - touchStart.current.x;
        const dy = touch.pageY - touchStart.current.y;
        
        const minSwipe = 30;
        let moved = false;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > minSwipe) moved = moveRight();
            else if (dx < -minSwipe) moved = moveLeft();
        } else {
            if (dy > minSwipe) moved = moveDown();
            else if (dy < -minSwipe) moved = moveUp();
        }

        if (moved) {
            addNewTile();
        }
    };

    const getTileStyle = (val) => {
        const stylesList = [styles.tile];
        if (val === 0) return stylesList;

        const valStyles = {
            2: styles.tile2,
            4: styles.tile4,
            8: styles.tile8,
            16: styles.tile16,
            32: styles.tile32,
            64: styles.tile64,
            128: styles.tile128,
            256: styles.tile256,
            512: styles.tile512,
            1024: styles.tile1024,
            2048: styles.tile2048,
        };

        const style = valStyles[val] || styles.tileSuper;
        stylesList.push(style);
        return stylesList;
    };

    return (
        <View style={styles.container}>
            {/* Header: Score board */}
            <View style={styles.header}>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>Score</Text>
                    <Text style={styles.scoreVal}>{score}</Text>
                </View>
                <View style={[styles.scoreBox, styles.highScoreBox]}>
                    <Text style={styles.scoreLabel}>High Score</Text>
                    <Text style={styles.scoreVal}>{Math.max(highScore, score)}</Text>
                </View>
            </View>

            {/* Instruction for desktop players */}
            {Platform.OS === 'web' && (
                <Text style={styles.instructionText}>
                    Use Arrow Keys or W-A-S-D to slide tiles
                </Text>
            )}

            {/* Main game board */}
            <View 
                style={styles.board}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {board.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => (
                            <View key={c} style={getTileStyle(val)}>
                                {val !== 0 && (
                                    <Text style={[
                                        styles.tileText,
                                        val >= 8 ? styles.tileTextWhite : styles.tileTextDark
                                    ]}>
                                        {val}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                ))}

                {/* Overlays: Game Over / Victory */}
                {gameOver && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayTitle}>Game Over!</Text>
                        <Text style={styles.overlayText}>Final Score: {score}</Text>
                        <NeonButton title="Try Again" variant="danger" onPress={startNewGame} />
                    </View>
                )}

                {gameWon && (
                    <View style={[styles.overlay, styles.overlayWin]}>
                        <Text style={[styles.overlayTitle, styles.winTitle]}>2048 Reached!</Text>
                        <Text style={styles.overlayText}>Amazing! Keep playing to stack more?</Text>
                        <View style={styles.overlayRow}>
                            <NeonButton title="Continue" variant="success" onPress={() => setGameWon(false)} style={{ marginRight: 10 }} />
                            <NeonButton title="Restart" variant="muted" onPress={startNewGame} />
                        </View>
                    </View>
                )}
            </View>

            {/* Instructions Section below grid */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>About 2048</Text>
                <Text style={styles.infoText}>
                    2048 is a popular sliding tile puzzle game. The game's objective is to slide numbered tiles on a grid to combine them to create a tile with the number 2048.
                </Text>
                <Text style={styles.infoSubTitle}>How to Play:</Text>
                <Text style={styles.infoText}>
                    • 1. Use Arrow Keys or W-A-S-D (desktop) or swipe (mobile) to slide tiles in four directions: Up, Down, Left, or Right.{"\n"}
                    • 2. When two tiles with the same number touch, they merge into one with double the value!{"\n"}
                    • 3. A new tile (usually 2, sometimes 4) randomly appears on an empty cell after every move.{"\n"}
                    • 4. Build up your tiles to reach 2048 to win! You can choose to continue playing to see how high you can score.{"\n"}
                    • 5. The game ends when the board is completely filled and no valid moves/merges remain.
                </Text>
            </View>

            <NeonButton title="Reset Game" variant="muted" onPress={startNewGame} style={styles.resetBtn} />
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
    header: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 350,
        justifyContent: 'space-between',
        marginBottom: 10
    },
    scoreBox: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)'
    },
    highScoreBox: {
        borderColor: 'rgba(0, 122, 255, 0.15)'
    },
    scoreLabel: {
        fontSize: 11,
        color: '#68686E',
        textTransform: 'uppercase',
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    scoreVal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    instructionText: {
        color: '#68686E',
        fontSize: 12,
        marginBottom: 15,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    board: {
        width: '100%',
        maxWidth: 350,
        aspectRatio: 1,
        backgroundColor: '#E5E5EA',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1.5,
        borderColor: '#AEAEB2',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    },
    row: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4
    },
    tile: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                transition: 'transform 0.1s ease-in-out, background-color 0.15s'
            }
        })
    },
    tileText: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    tileTextDark: {
        color: '#1C1C1E'
    },
    tileTextWhite: {
        color: '#FFFFFF'
    },
    tile2: {
        backgroundColor: '#ECE0D1',
    },
    tile4: {
        backgroundColor: '#EBE0CB',
    },
    tile8: {
        backgroundColor: '#FF9500',
        ...Platform.select({ web: { boxShadow: '0 0 10px rgba(255, 149, 0, 0.3)' } })
    },
    tile16: {
        backgroundColor: '#FF5E3A',
        ...Platform.select({ web: { boxShadow: '0 0 12px rgba(255, 94, 58, 0.4)' } })
    },
    tile32: {
        backgroundColor: '#FF3B30',
        ...Platform.select({ web: { boxShadow: '0 0 15px rgba(255, 59, 48, 0.5)' } })
    },
    tile64: {
        backgroundColor: '#FF2D55',
        ...Platform.select({ web: { boxShadow: '0 0 18px rgba(255, 45, 85, 0.5)' } })
    },
    tile128: {
        backgroundColor: '#5856D6',
        ...Platform.select({ web: { boxShadow: '0 0 20px rgba(88, 86, 214, 0.6)' } })
    },
    tile256: {
        backgroundColor: '#007AFF',
        ...Platform.select({ web: { boxShadow: '0 0 22px rgba(0, 122, 255, 0.6)' } })
    },
    tile512: {
        backgroundColor: '#34AADC',
        ...Platform.select({ web: { boxShadow: '0 0 25px rgba(52, 170, 220, 0.7)' } })
    },
    tile1024: {
        backgroundColor: '#4CD964',
        ...Platform.select({ web: { boxShadow: '0 0 28px rgba(76, 217, 100, 0.7)' } })
    },
    tile2048: {
        backgroundColor: '#00F0FF',
        ...Platform.select({ web: { boxShadow: '0 0 35px #00F0FF' } })
    },
    tileSuper: {
        backgroundColor: '#9D00FF',
        ...Platform.select({ web: { boxShadow: '0 0 45px #9D00FF' } })
    },
    infoSection: {
        marginTop: 30,
        width: '100%',
        maxWidth: 350,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoSubTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C1C1E',
        marginTop: 12,
        marginBottom: 6,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoText: {
        fontSize: 12,
        color: '#68686E',
        lineHeight: 18,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        zIndex: 5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    overlayWin: {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#34C759',
        borderWidth: 1.5,
        borderRadius: 12
    },
    overlayTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FF3B30',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    winTitle: {
        color: '#34C759'
    },
    overlayText: {
        fontSize: 16,
        color: '#1C1C1E',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    overlayRow: {
        flexDirection: 'row'
    },
    resetBtn: {
        marginTop: 20,
        paddingHorizontal: 30
    }
});

export default Game2048;
