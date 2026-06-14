import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import NeonButton from '../Common/NeonButton';
import { api } from '../../utils/api';

const Minesweeper = ({ isDaily = false, onFinishGame , level = null, gameMode = 'classic' }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, won, lost
    const [difficulty, setDifficulty] = useState('medium');
    const [puzzleId, setPuzzleId] = useState(null);
    const [board, setBoard] = useState([]);
    const [solutionBoard, setSolutionBoard] = useState([]);
    const [mines, setMines] = useState(0);
    const [flags, setFlags] = useState(0);
    const [time, setTime] = useState(0);
    const [coins, setCoins] = useState(0);

    // Initial load coins
    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const me = await api.getMe();
                if (me) setCoins(me.coins || 0);
            } catch (e) {
                console.warn(e);
            }
        };
        fetchCoins();
        if (level) {
            startGame('medium'); // Auto-start if level is loaded directly
        }
    }, [level]);

    // Timer logic
    useEffect(() => {
        let timer;
        if (gameState === 'playing') {
            if (gameMode === 'blitz') {
                setTime(60);
                timer = setInterval(() => {
                    setTime(t => {
                        if (t <= 1) {
                            clearInterval(timer);
                            setGameState('lost');
                            revealAllMines();
                            return 0;
                        }
                        return t - 1;
                    });
                }, 1000);
            } else if (gameMode === 'classic') {
                setTime(0);
                timer = setInterval(() => setTime(t => t + 1), 1000);
            }
        }
        return () => clearInterval(timer);
    }, [gameState, gameMode]);

    const startGame = async (diff) => {
        setDifficulty(diff);
        setGameState('playing');
        setTime(gameMode === 'blitz' ? 60 : 0);
        setFlags(0);
        try {
            let data;
            if (level) data = await api.getMinesweeperLevel(level);
            else data = await api.getMinesweeper(diff);
            
            setMines(data.mines);
            setPuzzleId(data.puzzle_id);
            setSolutionBoard(data.board || []);
            
            const initialBoard = Array(data.rows).fill(0).map(() =>
                Array(data.cols).fill(0).map(() => ({
                    value: null,
                    revealed: false,
                    flagged: false
                }))
            );
            setBoard(initialBoard);
        } catch (e) {
            console.error(e);
        }
    };

    const revealAllMines = () => {
        setBoard(prevBoard =>
            prevBoard.map((row, rIdx) =>
                row.map((cell, cIdx) => ({
                    ...cell,
                    value: solutionBoard[rIdx]?.[cIdx],
                    revealed: cell.revealed || solutionBoard[rIdx]?.[cIdx] === -1
                }))
            )
        );
    };

    const handleReveal = async (r, c) => {
        if (gameState !== 'playing') return;
        if (board[r][c].flagged || board[r][c].revealed) return;

        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        const hitValue = solutionBoard[r][c];

        if (hitValue === -1) {
            if (gameMode === 'blitz') {
                // In Blitz mode, hitting a mine subtracts 15s instead of instant death
                newBoard[r][c].value = -1;
                newBoard[r][c].revealed = true;
                setBoard(newBoard);
                setTime(t => {
                    const nextTime = Math.max(0, t - 15);
                    if (nextTime <= 0) {
                        setGameState('lost');
                        revealAllMines();
                    }
                    return nextTime;
                });
                alert("💥 Hit a mine! -15 seconds!");
            } else {
                // Instant death in Zen / Classic
                revealAllMines();
                setGameState('lost');
            }
            return;
        }

        // Perform client-side flood fill for zero values
        const revealQueue = [[r, c]];
        const visited = new Set();
        const rows = board.length;
        const cols = board[0].length;

        while (revealQueue.length > 0) {
            const [currR, currC] = revealQueue.shift();
            const key = `${currR},${currC}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const val = solutionBoard[currR][currC];
            newBoard[currR][currC].value = val;
            newBoard[currR][currC].revealed = true;

            if (val === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = currR + dr;
                        const nc = currC + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            if (solutionBoard[nr][nc] !== -1 && !newBoard[nr][nc].revealed) {
                                revealQueue.push([nr, nc]);
                            }
                        }
                    }
                }
            }
        }

        if (gameMode === 'blitz') {
            setTime(t => t + 2); // Correct reveal gives +2 seconds
        }

        setBoard(newBoard);
        checkWin(newBoard);
    };

    const handleFlag = (e, r, c) => {
        if (e && e.preventDefault) e.preventDefault();
        if (gameState !== 'playing') return;
        if (board[r][c].revealed) return;

        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        if (newBoard[r][c].flagged) {
            newBoard[r][c].flagged = false;
            setFlags(f => f - 1);
        } else {
            newBoard[r][c].flagged = true;
            setFlags(f => f + 1);
        }
        setBoard(newBoard);
    };

    const handleHint = async () => {
        if (gameState !== 'playing') return;
        if (coins < 15) {
            alert("Need 15 coins for a hint!");
            return;
        }

        const confirmHint = window.confirm("Spend 15 coins to reveal a safe cell?");
        if (!confirmHint) return;

        try {
            const res = await api.deductCoins(15);
            if (res) {
                setCoins(res.coins);
                
                // Find all safe unrevealed cells
                const safeCells = [];
                board.forEach((row, r) => {
                    row.forEach((cell, c) => {
                        if (!cell.revealed && solutionBoard[r][c] !== -1) {
                            safeCells.push([r, c]);
                        }
                    });
                });

                if (safeCells.length === 0) return;

                const [hintR, hintC] = safeCells[Math.floor(Math.random() * safeCells.length)];
                handleReveal(hintR, hintC);
            }
        } catch (e) {
            alert("Failed to buy hint");
        }
    };
    const checkWin = async (currentBoard) => {
        let revealedCount = 0;
        const rows = currentBoard.length;
        const cols = currentBoard[0].length;
        const totalNonMines = rows * cols - mines;

        const revealed = [];
        currentBoard.forEach((row, rIdx) => {
            row.forEach((cell, cIdx) => {
                if (cell.revealed && cell.value !== -1) {
                    revealedCount++;
                    revealed.push([rIdx, cIdx]);
                }
            });
        });

        if (revealedCount === totalNonMines) {
            try {
                const res = await api.checkMinesweeper(puzzleId, revealed);
                if (res.correct) {
                    setGameState('won');
                    api.updateStats('minesweeper', true, time, 0, res.solve_token);
                }
            } catch (e) {
                console.error(e);
            }
        }
    };
    const getNumberColor = (num) => {
        const colors = ['', '#007AFF', '#34C759', '#FF3B30', '#5856D6', '#FF9500', '#5AC8FA', '#4CD964', '#8E8E93'];
        return colors[num] || '#1C1C1E';
    };

    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameState === 'menu') {
        return (
            <View style={styles.menuContainer}>
                <Text style={styles.menuTitle}>💣 Minesweeper</Text>
                <Text style={styles.menuDesc}>Select Difficulty</Text>
                <View style={styles.diffButtons}>
                    <NeonButton title="Easy (8x8)" onPress={() => startGame('easy')} variant="success" />
                    <NeonButton title="Medium (12x12)" onPress={() => startGame('medium')} variant="primary" />
                    <NeonButton title="Hard (16x16)" onPress={() => startGame('hard')} variant="orange" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.gameContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.statText}>🚩 {mines - flags}</Text>
                <Pressable onPress={handleHint} style={styles.hintBtn}>
                    <Text style={styles.hintBtnText}>💡 Hint (15c)</Text>
                </Pressable>
                {gameMode !== 'zen' && <Text style={styles.statText}>⏱️ {formatTime(time)}</Text>}
            </View>

            <View style={styles.boardContainer}>
                {board.map((row, rIdx) => (
                    <View key={`r-${rIdx}`} style={styles.row}>
                        {row.map((cell, cIdx) => (
                            <Pressable
                                key={`c-${cIdx}`}
                                style={[
                                    styles.cell,
                                    { 
                                        width: Math.min(30, 300 / board.length), 
                                        height: Math.min(30, 300 / board.length),
                                        backgroundColor: cell.revealed ? 'rgba(0,0,0,0.05)' : '#FF6B6B',
                                        borderWidth: cell.revealed ? 1 : 0,
                                        borderColor: 'rgba(0,0,0,0.1)'
                                    }
                                ]}
                                onPress={() => handleReveal(rIdx, cIdx)}
                                onLongPress={(e) => handleFlag(e, rIdx, cIdx)}
                                delayLongPress={300}
                                {...(Platform.OS === 'web' ? { onContextMenu: (e) => handleFlag(e, rIdx, cIdx) } : {})}
                            >
                                {cell.revealed && cell.value === -1 && <Text style={styles.cellEmoji}>💣</Text>}
                                {cell.revealed && cell.value > 0 && <Text style={[styles.cellNum, { color: getNumberColor(cell.value), fontSize: Math.min(18, 200 / board.length) }]}>{cell.value}</Text>}
                                {!cell.revealed && cell.flagged && <Text style={styles.cellEmoji}>🚩</Text>}
                            </Pressable>
                        ))}
                    </View>
                ))}
            </View>

            {gameState === 'lost' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>BOOM! 💥</Text>
                    <View style={styles.bannerActions}>
                        <NeonButton title="Try Again" onPress={() => startGame(difficulty)} variant="primary" />
                        <NeonButton title="Return to Hub" onPress={onFinishGame} variant="muted" />
                    </View>
                </View>
            )}

            {gameState === 'won' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Cleared! 🎉</Text>
                    <Text style={styles.bannerDesc}>Time: {formatTime(time)}</Text>
                    <NeonButton title="Return to Hub" onPress={onFinishGame} variant="success" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: { alignItems: 'center', padding: 20 },
    menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    menuDesc: { fontSize: 16, color: '#68686E', marginBottom: 30, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    diffButtons: { gap: 15, width: 200 },
    gameContainer: { alignItems: 'center', width: '100%' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 350, paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' },
    statText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    hintBtn: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(255,149,0,0.15)', borderRadius: 12 },
    hintBtnText: { color: '#FF9500', fontWeight: 'bold', fontSize: 13 },
    boardContainer: { padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10 },
    row: { flexDirection: 'row' },
    cell: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 1,
        borderRadius: 4,
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    cellNum: { fontWeight: '900', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    cellEmoji: { fontSize: 16 },
    banner: { marginTop: 30, alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, width: '100%' },
    bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    bannerDesc: { fontSize: 16, color: '#68686E', marginBottom: 20 },
    bannerActions: { flexDirection: 'row', gap: 15 }
});

export default Minesweeper;
