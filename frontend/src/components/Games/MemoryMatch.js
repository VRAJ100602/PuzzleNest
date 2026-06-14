import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from 'react-native';
import NeonButton from '../Common/NeonButton';
import { api } from '../../utils/api';

const MemoryMatch = ({ isDaily = false, onFinishGame , level = null }) => {
    const [gameState, setGameState] = useState('menu'); // menu, playing, won
    const [difficulty, setDifficulty] = useState('medium');
    const [cards, setCards] = useState([]);
    const [cols, setCols] = useState(4);
    const [pairs, setPairs] = useState(0);
    const [moves, setMoves] = useState(0);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [time, setTime] = useState(0);
    const [locked, setLocked] = useState(false);

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
        setMatchedPairs(0);
        setFlippedIndices([]);
        setLocked(false);
        try {
            let data;
            if (level) data = await api.getMemoryLevel(level);
            else data = await api.getMemory(diff);
            setPairs(data.pairs);
            setCols(data.cols);
            setCards(data.cards.map((emoji, idx) => ({
                id: idx,
                emoji,
                flipped: false,
                matched: false
            })));
        } catch (e) {
            console.error(e);
        }
    };

    const handleFlip = (index) => {
        if (locked || gameState !== 'playing') return;
        if (cards[index].flipped || cards[index].matched) return;

        const newCards = [...cards];
        newCards[index].flipped = true;
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setLocked(true);
            setMoves(m => m + 1);
            
            const [firstIndex, secondIndex] = newFlipped;
            if (newCards[firstIndex].emoji === newCards[secondIndex].emoji) {
                // Match!
                setTimeout(() => {
                    const matchedCards = [...newCards];
                    matchedCards[firstIndex].matched = true;
                    matchedCards[secondIndex].matched = true;
                    setCards(matchedCards);
                    setFlippedIndices([]);
                    setLocked(false);
                    const newMatchedCount = matchedPairs + 1;
                    setMatchedPairs(newMatchedCount);
                    if (newMatchedCount === pairs) {
                        handleWin();
                    }
                }, 500);
            } else {
                // No match
                setTimeout(() => {
                    const resetCards = [...newCards];
                    resetCards[firstIndex].flipped = false;
                    resetCards[secondIndex].flipped = false;
                    setCards(resetCards);
                    setFlippedIndices([]);
                    setLocked(false);
                }, 1000);
            }
        }
    };

    const handleWin = async () => {
        setGameState('won');
        await api.updateStats('memory', true, time, moves);
    };

    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (gameState === 'menu') {
        return (
            <View style={styles.menuContainer}>
                <Text style={styles.menuTitle}>🃏 Memory Match</Text>
                <Text style={styles.menuDesc}>Select Difficulty</Text>
                <View style={styles.diffButtons}>
                    <NeonButton title="Easy (12 Cards)" onPress={() => startGame('easy')} variant="success" />
                    <NeonButton title="Medium (16 Cards)" onPress={() => startGame('medium')} variant="primary" />
                    <NeonButton title="Hard (24 Cards)" onPress={() => startGame('hard')} variant="orange" />
                    <NeonButton title="Expert (36 Cards)" onPress={() => startGame('expert')} variant="danger" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.gameContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.statText}>🔄 {moves} Moves</Text>
                <Text style={styles.statText}>⏱️ {formatTime(time)}</Text>
            </View>

            <View style={[styles.grid, { maxWidth: cols * 70 }]}>
                {cards.map((card, idx) => (
                    <Pressable
                        key={idx}
                        style={[
                            styles.card,
                            card.flipped || card.matched ? styles.cardFlipped : styles.cardHidden,
                            card.matched && styles.cardMatched
                        ]}
                        onPress={() => handleFlip(idx)}
                    >
                        <Text style={[styles.cardText, { opacity: (card.flipped || card.matched) ? 1 : 0 }]}>
                            {card.emoji}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {gameState === 'won' && (
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>Amazing Memory! 🧠</Text>
                    <Text style={styles.bannerDesc}>Completed in {formatTime(time)} with {moves} moves</Text>
                    <NeonButton title="Return to Hub" onPress={onFinishGame} variant="success" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: { alignItems: 'center', padding: 20 },
    menuTitle: { fontSize: 28, fontWeight: 'bold', color: '#4ECDC4', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    menuDesc: { fontSize: 16, color: '#68686E', marginBottom: 30, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    diffButtons: { gap: 15, width: 200 },
    gameContainer: { alignItems: 'center', width: '100%' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 400, paddingHorizontal: 20, marginBottom: 20 },
    statText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, padding: 10 },
    card: {
        width: 60,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({ 
            web: { 
                cursor: 'pointer', 
                transition: 'all 0.15s ease' 
            } 
        }),
    },
    cardHidden: {
        backgroundColor: '#4ECDC4',
        borderWidth: 1,
        borderColor: '#4ECDC4',
        borderBottomColor: '#2C9E95',
        borderBottomWidth: 5,
        ...Platform.select({ 
            web: { 
                boxShadow: '0 3px 0 #2C9E95, 0 4px 8px rgba(0,0,0,0.12)' 
            } 
        }),
    },
    cardFlipped: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#4ECDC4',
        borderBottomWidth: 2,
        borderBottomColor: '#4ECDC4',
        ...Platform.select({ 
            web: { 
                boxShadow: '0 1px 0 rgba(0,0,0,0.1)' 
            } 
        }),
    },
    cardMatched: {
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        borderColor: '#34C759',
        borderBottomWidth: 2,
        borderBottomColor: '#34C759',
    },
    cardText: { fontSize: 32 },
    banner: { marginTop: 30, alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, width: '100%' },
    bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    bannerDesc: { fontSize: 16, color: '#68686E', marginBottom: 20 },
});

export default MemoryMatch;
