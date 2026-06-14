import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import NeonButton from '../Common/NeonButton';
import { api } from '../../utils/api';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF'];

const ColorFlood = ({ isDaily = false, onFinishGame , level = null }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, won, lost
    const [difficulty, setDifficulty] = useState('medium');
    const [board, setBoard] = useState([]);
    const [size, setSize] = useState(10);
    const [numColors, setNumColors] = useState(6);
    const [maxMoves, setMaxMoves] = useState(20);
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
            if (level) data = await api.getColorFloodLevel(level);
            else data = await api.getColorFlood(diff);
            setSize(data.size);
            setNumColors(data.num_colors);
            setMaxMoves(data.max_moves);
            setBoard(data.board);
        } catch (e) {
            console.error(e);
        }
    };

    const handleColorPick = (colorIndex) => {
        if (gameState !== 'playing') return;
        
        const targetColor = board[0][0];
        if (targetColor === colorIndex) return;

        const newBoard = JSON.parse(JSON.stringify(board));
        floodFill(newBoard, 0, 0, targetColor, colorIndex);
        setBoard(newBoard);
        
        const newMoves = moves + 1;
        setMoves(newMoves);
        
        checkWin(newBoard, newMoves);
    };

    const floodFill = (b, r, c, target, replacement) => {
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        if (b[r][c] !== target) return;

        b[r][c] = replacement;
        floodFill(b, r - 1, c, target, replacement);
        floodFill(b, r + 1, c, target, replacement);
        floodFill(b, r, c - 1, target, replacement);
        floodFill(b, r, c + 1, target, replacement);
    };

    const checkWin = async (b, currentMoves) => {
        const firstColor = b[0][0];
        let won = true;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (b[r][c] !== firstColor) {
                    won = false;
                    break;
                }
            }
        }
        
        if (won) {
            setGameState('won');
            await api.updateStats('colorflood', true, time, currentMoves);
        } else if (currentMoves >= maxMoves) {
            setGameState('lost');
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
                <Text style={styles.menuTitle}>🌊 Color Flood</Text>
                <Text style={styles.menuDesc}>Select Difficulty</Text>
                <View style={styles.diffButtons}>
                    <NeonButton title="Easy (8x8, 4C)" onPress={() => startGame('easy')} variant="success" />
                    <NeonButton title="Medium (10x10, 6C)" onPress={() => startGame('medium')} variant="primary" />
                    <NeonButton title="Hard (14x14, 6C)" onPress={() => startGame('hard')} variant="orange" />
                    <NeonButton title="Expert (16x16, 8C)" onPress={() => startGame('expert')} variant="danger" />
                </View>
            </View>
        );
    }

    const cellSize = Math.min(30, 300 / size);

    return (
        <View style={styles.gameContainer}>
            <View style={styles.headerRow}>
                <Text style={[styles.statText, moves >= maxMoves - 3 ? styles.warningText : null]}>
                    Moves: {moves} / {maxMoves}
                </Text>
                <Text style={styles.statText}>⏱️ {formatTime(time)}</Text>
            </View>

            <View style={styles.boardContainer}>
                {board.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((cellColor, c) => (
                            <View
                                key={`${r}-${c}`}
                                style={[
                                    styles.cell,
                                    {
                                        width: cellSize,
                                        height: cellSize,
                                        backgroundColor: COLORS[cellColor],
                                    }
                                ]}
                            />
                        ))}
                    </View>
                ))}
            </View>

            <View style={styles.palette}>
                {COLORS.slice(0, numColors).map((color, idx) => (
                    <Pressable
                        key={idx}
                        style={[styles.colorBtn, { backgroundColor: color }]}
                        onPress={() => handleColorPick(idx)}
                    />
                ))}
            </View>

            {gameState === 'lost' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Out of Moves! 😢</Text>
                    <View style={styles.bannerActions}>
                        <NeonButton title="Try Again" onPress={() => startGame(difficulty)} variant="primary" />
                        <NeonButton title="Return to Hub" onPress={onFinishGame} variant="muted" />
                    </View>
                </View>
            )}

            {gameState === 'won' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Flooded! 🌊</Text>
                    <Text style={styles.bannerDesc}>Completed in {formatTime(time)} with {moves} moves</Text>
                    <NeonButton title="Return to Hub" onPress={onFinishGame} variant="success" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: { alignItems: 'center', padding: 20 },
    menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#45B7D1', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    menuDesc: { fontSize: 16, color: '#68686E', marginBottom: 30, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    diffButtons: { gap: 15, width: 200 },
    gameContainer: { alignItems: 'center', width: '100%' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 350, paddingHorizontal: 20, marginBottom: 20 },
    statText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    warningText: { color: '#FF3B30' },
    boardContainer: { padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10, marginBottom: 20 },
    row: { flexDirection: 'row' },
    cell: { margin: 0 },
    palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 350 },
    colorBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        ...Platform.select({ web: { cursor: 'pointer' } }),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4
    },
    banner: { marginTop: 30, alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, width: '100%' },
    bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    bannerDesc: { fontSize: 16, color: '#68686E', marginBottom: 20 },
    bannerActions: { flexDirection: 'row', gap: 15 }
});

export default ColorFlood;
