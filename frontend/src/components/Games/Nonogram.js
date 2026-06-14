import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Nonogram = ({ isDaily, onFinishGame , level = null }) => {
    const [difficulty, setDifficulty] = useState('easy');
    const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'won'
    const [gameData, setGameData] = useState(null);
    const [board, setBoard] = useState([]); // 0=empty, 1=filled, -1=crossed
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        if (isDaily) {
            startDaily();
        }
    }, [isDaily]);

    const startDaily = async () => {
        setLoading(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let data;
            if (level) data = await api.getNonogramLevel(level);
            else data = await api.getNonogram(todayStr, 'medium');
            initGame(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startGame = async () => {
        setLoading(true);
        try {
            const data = await api.getNonogram(difficulty);
            initGame(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const initGame = (data) => {
        setGameData(data);
        const newBoard = Array(data.size).fill(0).map(() => Array(data.size).fill(0));
        setBoard(newBoard);
        setGameState('playing');
        setStartTime(Date.now());
    };

    const handleCellClick = (r, c) => {
        if (gameState !== 'playing') return;

        const newBoard = board.map(row => [...row]);
        // Cycle: 0 -> 1 -> -1 -> 0
        if (newBoard[r][c] === 0) newBoard[r][c] = 1;
        else if (newBoard[r][c] === 1) newBoard[r][c] = -1;
        else newBoard[r][c] = 0;

        setBoard(newBoard);
        checkWinCondition(newBoard);
    };
    const checkWinCondition = async (currentBoard) => {
        try {
            const res = await api.checkNonogram(gameData.puzzle_id, currentBoard);
            if (res.correct) {
                setGameState('won');
                const timeTaken = Math.floor((Date.now() - startTime) / 1000);
                api.updateStats('nonogram', true, timeTaken, 0, res.solve_token);
                if (isDaily) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    api.setDailyCompleted(todayStr, 'nonogram');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF2D55" />
                <Text style={styles.loadingText}>Generating Puzzle...</Text>
            </View>
        );
    }

    if (gameState === 'menu' && !isDaily) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.title}>Nonogram</Text>
                <Text style={styles.subtitle}>Select Difficulty</Text>
                <View style={styles.diffRow}>
                    {['easy', 'medium', 'hard', 'expert'].map(d => (
                        <Pressable 
                            key={d} 
                            style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
                            onPress={() => setDifficulty(d)}
                        >
                            <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <NeonButton title="Start Game" variant="danger" onPress={startGame} />
            </View>
        );
    }

    if (gameState === 'playing' || gameState === 'won') {
        const size = gameData.size;
        const cellSize = size === 10 ? 25 : 40;

        return (
            <View style={styles.boardContainer}>
                {gameState === 'won' && (
                    <View style={styles.winBanner}>
                        <Text style={styles.winText}>🎉 Puzzle Solved! 🎉</Text>
                        {isDaily && <Text style={styles.dailyWinText}>Daily Challenge Completed!</Text>}
                        <NeonButton title="Return to Hub" variant="primary" onPress={onFinishGame} style={{marginTop: 15}} />
                    </View>
                )}

                <View style={styles.gridWrapper}>
                    {/* Top Column Clues */}
                    <View style={styles.topCluesRow}>
                        <View style={styles.cornerCell} />
                        {gameData.col_clues.map((clueArr, c) => (
                            <View key={`colClue-${c}`} style={[styles.clueCell, { width: cellSize }]}>
                                {clueArr.map((num, idx) => (
                                    <Text key={idx} style={styles.clueText}>{num}</Text>
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* Rows with Row Clues */}
                    {board.map((row, r) => (
                        <View key={`row-${r}`} style={styles.row}>
                            <View style={styles.rowClueCell}>
                                <Text style={styles.rowClueText}>
                                    {gameData.row_clues[r].join(' ')}
                                </Text>
                            </View>
                            {row.map((cellState, c) => {
                                // Group border styling for blocks of 5
                                const borderRight = (c + 1) % 5 === 0 && c !== size - 1 ? 2 : 1;
                                const borderBottom = (r + 1) % 5 === 0 && r !== size - 1 ? 2 : 1;

                                return (
                                    <Pressable 
                                        key={`cell-${r}-${c}`} 
                                        style={[
                                            styles.cell, 
                                            { 
                                                width: cellSize, 
                                                height: cellSize,
                                                borderRightWidth: borderRight,
                                                borderBottomWidth: borderBottom
                                            },
                                            cellState === 1 && styles.cellFilled,
                                            cellState === -1 && styles.cellCrossed
                                        ]}
                                        onPress={() => handleCellClick(r, c)}
                                    >
                                        {cellState === -1 && <Text style={styles.crossText}>✕</Text>}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    <Text style={styles.instTitle}>How to play</Text>
                    <Text style={styles.instText}>• The numbers indicate unbroken lines of filled squares in any given row or column.</Text>
                    <Text style={styles.instText}>• Click a cell once to fill it.</Text>
                    <Text style={styles.instText}>• Click it again to mark it with a cross (X) if you know it's empty.</Text>
                </View>
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    centerContainer: {
        alignItems: 'center',
        padding: 20
    },
    boardContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        width: '100%'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FF2D55',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    subtitle: {
        fontSize: 16,
        color: '#68686E',
        marginBottom: 30,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    diffRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 30
    },
    diffBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 20,
        margin: 5
    },
    diffBtnActive: {
        backgroundColor: '#FF2D55',
        borderColor: '#FF2D55'
    },
    diffText: {
        color: '#68686E',
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    diffTextActive: {
        color: '#FFFFFF'
    },
    winBanner: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.3)'
    },
    winText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#34C759',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    dailyWinText: {
        color: '#34C759',
        marginTop: 5,
        fontWeight: 'bold'
    },
    gridWrapper: {
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#1C1C1E',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5
    },
    topCluesRow: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderColor: '#1C1C1E'
    },
    cornerCell: {
        width: 100, // Matches rowClueCell width
        borderRightWidth: 2,
        borderColor: '#1C1C1E',
        backgroundColor: '#F2F2F7'
    },
    clueCell: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 5,
        backgroundColor: '#F2F2F7',
        borderRightWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },
    clueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        lineHeight: 16
    },
    row: {
        flexDirection: 'row'
    },
    rowClueCell: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 10,
        backgroundColor: '#F2F2F7',
        borderRightWidth: 2,
        borderColor: '#1C1C1E',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    rowClueText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cell: {
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'rgba(0,0,0,0.2)',
        backgroundColor: '#FFFFFF',
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    cellFilled: {
        backgroundColor: '#1C1C1E'
    },
    cellCrossed: {
        backgroundColor: '#F5F5F7'
    },
    crossText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '900'
    },
    instructions: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#F2F2F7',
        padding: 20,
        borderRadius: 12
    },
    instTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    instText: {
        fontSize: 14,
        color: '#68686E',
        marginBottom: 5,
        lineHeight: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default Nonogram;
