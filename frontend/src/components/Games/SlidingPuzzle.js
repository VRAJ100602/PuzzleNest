import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import NeonButton from '../Common/NeonButton';
import { api } from '../../utils/api';

const SlidingPuzzle = ({ isDaily = false, onFinishGame , level = null }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, won
    const [difficulty, setDifficulty] = useState('medium');
    const [tiles, setTiles] = useState([]);
    const [size, setSize] = useState(4);
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
            if (level) data = await api.getSlidingLevel(level);
            else data = await api.getSliding(diff);
            setSize(data.size);
            setTiles(data.tiles);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTilePress = (index) => {
        if (gameState !== 'playing') return;

        const emptyIndex = tiles.indexOf(0);
        const r1 = Math.floor(index / size);
        const c1 = index % size;
        const r2 = Math.floor(emptyIndex / size);
        const c2 = emptyIndex % size;

        // Check if adjacent
        if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
            const newTiles = [...tiles];
            newTiles[emptyIndex] = newTiles[index];
            newTiles[index] = 0;
            setTiles(newTiles);
            setMoves(m => m + 1);
            checkWin(newTiles);
        }
    };

    const checkWin = async (currentTiles) => {
        let won = true;
        for (let i = 0; i < currentTiles.length - 1; i++) {
            if (currentTiles[i] !== i + 1) {
                won = false;
                break;
            }
        }
        if (won && currentTiles[currentTiles.length - 1] === 0) {
            setGameState('won');
            await api.updateStats('sliding', true, time, moves);
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
                <Text style={styles.menuTitle}>🧩 Sliding Puzzle</Text>
                <Text style={styles.menuDesc}>Select Difficulty</Text>
                <View style={styles.diffButtons}>
                    <NeonButton title="Easy (3x3)" onPress={() => startGame('easy')} variant="success" />
                    <NeonButton title="Medium (4x4)" onPress={() => startGame('medium')} variant="primary" />
                    <NeonButton title="Hard (5x5)" onPress={() => startGame('hard')} variant="orange" />
                </View>
            </View>
        );
    }

    const tileSize = 300 / size;

    return (
        <View style={styles.gameContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.statText}>🔄 {moves} Moves</Text>
                <Text style={styles.statText}>⏱️ {formatTime(time)}</Text>
            </View>

            <View style={[styles.board, { width: tileSize * size + 10, height: tileSize * size + 10 }]}>
                {tiles.map((tile, index) => {
                    const row = Math.floor(index / size);
                    const col = index % size;
                    return tile !== 0 ? (
                        <Pressable
                            key={tile}
                            style={[
                                styles.tile,
                                {
                                    width: tileSize - 4,
                                    height: tileSize - 4,
                                    left: col * tileSize + 5,
                                    top: row * tileSize + 5,
                                }
                            ]}
                            onPress={() => handleTilePress(index)}
                        >
                            <Text style={[styles.tileText, { fontSize: size > 4 ? 20 : 28 }]}>{tile}</Text>
                        </Pressable>
                    ) : null;
                })}
            </View>

            {gameState === 'won' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Sorted! 🎉</Text>
                    <Text style={styles.bannerDesc}>Completed in {formatTime(time)} with {moves} moves</Text>
                    <NeonButton title="Return to Hub" onPress={onFinishGame} variant="success" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: { alignItems: 'center', padding: 20 },
    menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#E17055', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    menuDesc: { fontSize: 16, color: '#68686E', marginBottom: 30, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    diffButtons: { gap: 15, width: 200 },
    gameContainer: { alignItems: 'center', width: '100%' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 350, paddingHorizontal: 20, marginBottom: 20 },
    statText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    board: { backgroundColor: '#FFD3B6', borderRadius: 10, position: 'relative' },
    tile: {
        position: 'absolute',
        backgroundColor: '#E17055',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#E17055',
        borderBottomColor: '#B34A32',
        borderBottomWidth: 5,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({ 
            web: { 
                cursor: 'pointer', 
                transition: 'left 0.2s, top 0.2s, border-bottom-width 0.1s', 
                boxShadow: '0 3px 0 #B34A32, 0 4px 8px rgba(0,0,0,0.15)' 
            } 
        }),
    },
    tileText: { fontWeight: 'bold', color: '#FFFFFF', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    banner: { marginTop: 30, alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, width: '100%' },
    bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    bannerDesc: { fontSize: 16, color: '#68686E', marginBottom: 20 },
});

export default SlidingPuzzle;
