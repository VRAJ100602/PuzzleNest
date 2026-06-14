import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Tower = ({ isDaily, onFinishGame , level = null }) => {
    const [difficulty, setDifficulty] = useState('easy');
    const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'won'
    const [gameData, setGameData] = useState(null);
    const [puzzleId, setPuzzleId] = useState(null);
    const [board, setBoard] = useState([]); // user input board
    const [selectedCell, setSelectedCell] = useState(null); // {r, c}
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        if (isDaily) startDaily();
    }, [isDaily]);

    const startDaily = async () => {
        setLoading(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let data;
            if (level) data = await api.getTowerLevel(level);
            else data = await api.getTower(todayStr, 'medium');
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
            const data = await api.getTower(difficulty);
            initGame(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const initGame = (data) => {
        setGameData(data);
        setPuzzleId(data.puzzle_id);
        const emptyBoard = Array(data.size).fill(0).map(() => Array(data.size).fill(0));
        setBoard(emptyBoard);
        setGameState('playing');
        setStartTime(Date.now());
        setSelectedCell(null);
    };

    const handleCellPress = (r, c) => {
        if (gameState !== 'playing') return;
        setSelectedCell({r, c});
    };

    const handleNumberInput = (num) => {
        if (gameState !== 'playing' || !selectedCell) return;
        
        const newBoard = board.map(row => [...row]);
        newBoard[selectedCell.r][selectedCell.c] = num;
        setBoard(newBoard);
        checkWin(newBoard);
    };
    const checkWin = async (currentBoard) => {
        // Quick local check: must be fully populated
        for (let r = 0; r < gameData.size; r++) {
            for (let c = 0; c < gameData.size; c++) {
                if (currentBoard[r][c] === 0) return;
            }
        }

        try {
            const res = await api.checkTower(puzzleId, currentBoard);
            if (res.correct) {
                setGameState('won');
                setSelectedCell(null);
                const timeTaken = Math.floor((Date.now() - startTime) / 1000);
                api.updateStats('tower', true, timeTaken, 0, res.solve_token);
                if (isDaily) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    api.setDailyCompleted(todayStr, 'tower');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#AF52DE" />
                <Text style={styles.loadingText}>Building Skyline...</Text>
            </View>
        );
    }

    if (gameState === 'menu' && !isDaily) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.title}>Towers</Text>
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
                <NeonButton title="Start Game" variant="purple" onPress={startGame} />
            </View>
        );
    }

    if (gameState === 'playing' || gameState === 'won') {
        const size = gameData.size;
        const cellSize = size >= 6 ? 40 : 50;

        return (
            <View style={styles.boardContainer}>
                {gameState === 'won' && (
                    <View style={styles.winBanner}>
                        <Text style={styles.winText}>🎉 City Planner Extraordinaire! 🎉</Text>
                        {isDaily && <Text style={styles.dailyWinText}>Daily Challenge Completed!</Text>}
                        <NeonButton title="Return to Hub" variant="primary" onPress={onFinishGame} style={{marginTop: 15}} />
                    </View>
                )}

                <View style={styles.puzzleWrapper}>
                    {/* Top Clues */}
                    <View style={[styles.clueRow, { marginLeft: cellSize }]}>
                        {gameData.top_clues.map((clue, c) => (
                            <View key={`top-${c}`} style={[styles.clueCell, { width: cellSize }]}>
                                <Text style={styles.clueText}>{clue}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Middle Section: Left clues + Grid + Right clues */}
                    {board.map((row, r) => (
                        <View key={`row-${r}`} style={styles.middleRow}>
                            {/* Left Clue */}
                            <View style={[styles.clueCell, { width: cellSize, height: cellSize }]}>
                                <Text style={styles.clueText}>{gameData.left_clues[r]}</Text>
                            </View>

                            {/* Grid Row */}
                            {row.map((val, c) => {
                                const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                                return (
                                    <Pressable 
                                        key={`cell-${r}-${c}`} 
                                        style={[
                                            styles.cell, 
                                            { width: cellSize, height: cellSize },
                                            isSelected && styles.cellSelected
                                        ]}
                                        onPress={() => handleCellPress(r, c)}
                                    >
                                        {val !== 0 && <Text style={styles.cellValText}>{val}</Text>}
                                    </Pressable>
                                );
                            })}

                            {/* Right Clue */}
                            <View style={[styles.clueCell, { width: cellSize, height: cellSize }]}>
                                <Text style={styles.clueText}>{gameData.right_clues[r]}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Bottom Clues */}
                    <View style={[styles.clueRow, { marginLeft: cellSize }]}>
                        {gameData.bottom_clues.map((clue, c) => (
                            <View key={`bot-${c}`} style={[styles.clueCell, { width: cellSize }]}>
                                <Text style={styles.clueText}>{clue}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Numpad */}
                {gameState === 'playing' && (
                    <View style={styles.numpad}>
                        {Array.from({length: size}, (_, i) => i + 1).map(num => (
                            <Pressable 
                                key={`num-${num}`} 
                                style={styles.numBtn}
                                onPress={() => handleNumberInput(num)}
                            >
                                <Text style={styles.numBtnText}>{num}</Text>
                            </Pressable>
                        ))}
                        <Pressable 
                            style={styles.numBtnDelete}
                            onPress={() => handleNumberInput(0)}
                        >
                            <Text style={styles.numBtnTextDelete}>⌫</Text>
                        </Pressable>
                    </View>
                )}

                {/* Instructions */}
                <View style={styles.instructions}>
                    <Text style={styles.instTitle}>How to play</Text>
                    <Text style={styles.instText}>• Fill the grid with numbers 1 to {size} representing skyscraper heights.</Text>
                    <Text style={styles.instText}>• Each row and column must contain every number exactly once.</Text>
                    <Text style={styles.instText}>• The clues around the edges indicate how many skyscrapers you can see looking from that direction (taller buildings block shorter ones).</Text>
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
        color: '#AF52DE',
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
        backgroundColor: '#AF52DE',
        borderColor: '#AF52DE'
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
    puzzleWrapper: {
        marginBottom: 30,
        alignItems: 'center'
    },
    clueRow: {
        flexDirection: 'row',
    },
    middleRow: {
        flexDirection: 'row',
    },
    clueCell: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5
    },
    clueText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cell: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C7C7CC',
        backgroundColor: '#FFFFFF',
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    cellSelected: {
        backgroundColor: 'rgba(175, 82, 222, 0.2)',
        borderColor: '#AF52DE',
        borderWidth: 2
    },
    cellValText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    numpad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 30,
        maxWidth: 400
    },
    numBtn: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 25,
        margin: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    numBtnText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#AF52DE',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    numBtnDelete: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        borderRadius: 25,
        margin: 5,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    numBtnTextDelete: {
        fontSize: 20,
        color: '#FFFFFF'
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

export default Tower;
