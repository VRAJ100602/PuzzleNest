import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import NeonButton from '../Common/NeonButton';
import { api } from '../../utils/api';

const LightsOut = ({ isDaily = false, onFinishGame , level = null }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, won
    const [difficulty, setDifficulty] = useState('medium');
    const [board, setBoard] = useState([]);
    const [size, setSize] = useState(5);
    const [moves, setMoves] = useState(0);
    const [time, setTime] = useState(0);

    useEffect(() => {
        let timer;
        if (gameState === 'playing') {
            timer = setInterval(() => setTime(t => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [gameState]);

    const startGame = async (diff) => {
        setDifficulty(diff);
        setGameState('playing');
        setTime(0);
        setMoves(0);
        try {
            let data;
            if (level) data = await api.getLightsOutLevel(level);
            else data = await api.getLightsOut(diff);
            setSize(data.size);
            setBoard(data.board);
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggle = (r, c) => {
        if (gameState !== 'playing') return;

        const newBoard = JSON.parse(JSON.stringify(board));
        // Toggle center and adjacent
        newBoard[r][c] = !newBoard[r][c];
        if (r > 0) newBoard[r - 1][c] = !newBoard[r - 1][c];
        if (r < size - 1) newBoard[r + 1][c] = !newBoard[r + 1][c];
        if (c > 0) newBoard[r][c - 1] = !newBoard[r][c - 1];
        if (c < size - 1) newBoard[r][c + 1] = !newBoard[r][c + 1];

        setBoard(newBoard);
        setMoves(m => m + 1);
        checkWin(newBoard);
    };

    const checkWin = async (b) => {
        let won = true;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (b[r][c]) {
                    won = false;
                    break;
                }
            }
        }
        if (won) {
            setGameState('won');
            await api.updateStats('lightsout', true, time, moves);
        }
    };

    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameState === 'menu') {
        return (
            <View style={styles.menuContainer}>
                <Text style={styles.menuTitle}>💡 Lights Out</Text>
                <Text style={styles.menuDesc}>Select Difficulty</Text>
                <View style={styles.diffButtons}>
                    <NeonButton title="Easy (4x4)" onPress={() => startGame('easy')} variant="success" />
                    <NeonButton title="Medium (5x5)" onPress={() => startGame('medium')} variant="primary" />
                    <NeonButton title="Hard (6x6)" onPress={() => startGame('hard')} variant="orange" />
                    <NeonButton title="Expert (7x7)" onPress={() => startGame('expert')} variant="danger" />
                </View>
            </View>
        );
    }

    const cellSize = Math.min(60, 300 / size);

    return (
        <View style={styles.gameContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.statText}>🔄 {moves} Moves</Text>
                <Text style={styles.statText}>⏱️ {formatTime(time)}</Text>
            </View>

            <View style={styles.boardContainer}>
                {board.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((cell, c) => (
                            <Pressable
                                key={`${r}-${c}`}
                                style={({ pressed }) => [
                                    styles.cell,
                                    {
                                        width: cellSize,
                                        height: cellSize,
                                        backgroundColor: cell ? '#FDCB6E' : '#2D3436',
                                        borderWidth: 1,
                                        borderColor: cell ? '#FDCB6E' : '#2D3436',
                                        borderBottomColor: cell ? '#D2A13D' : '#151A1B',
                                        borderBottomWidth: cell ? (pressed ? 1.5 : 5) : 1.5,
                                        transform: [
                                            { translateY: cell ? (pressed ? 3.5 : 0) : 3.5 }
                                        ]
                                    },
                                    Platform.select({
                                        web: {
                                            boxShadow: cell 
                                                ? (pressed ? '0 1px 0 rgba(0,0,0,0.1)' : '0 3px 0 #D2A13D, 0 4px 10px rgba(253, 203, 110, 0.4)') 
                                                : 'none',
                                            cursor: 'pointer'
                                        }
                                    })
                                ]}
                                onPress={() => handleToggle(r, c)}
                            />
                        ))}
                    </View>
                ))}
            </View>

            {gameState === 'won' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Lights Out! 🌙</Text>
                    <Text style={styles.bannerDesc}>Completed in {formatTime(time)} with {moves} moves</Text>
                    <NeonButton title="Return to Hub" onPress={onFinishGame} variant="success" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: { alignItems: 'center', padding: 20 },
    menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#FDCB6E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    menuDesc: { fontSize: 16, color: '#68686E', marginBottom: 30, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    diffButtons: { gap: 15, width: 200 },
    gameContainer: { alignItems: 'center', width: '100%' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 350, paddingHorizontal: 20, marginBottom: 20 },
    statText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    boardContainer: { padding: 10, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 12 },
    row: { flexDirection: 'row' },
    cell: {
        margin: 2,
        borderRadius: 8,
        ...Platform.select({ 
            web: { 
                cursor: 'pointer', 
                transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-bottom-width 0.15s, box-shadow 0.15s, background-color 0.2s' 
            } 
        }),
    },
    banner: { marginTop: 30, alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, width: '100%' },
    bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    bannerDesc: { fontSize: 16, color: '#68686E', marginBottom: 20 },
});

export default LightsOut;
