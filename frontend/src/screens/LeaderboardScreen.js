import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform, ActivityIndicator } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import { api } from '../utils/api';

const LeaderboardScreen = ({ onGoBack }) => {
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [gameType, setGameType] = useState('sudoku'); // Default

    const gamesList = ['sudoku', 'shikaku', 'nonogram', 'wordle', 'pipes', 'tower', 'minesweeper', 'memory', '2048', 'sliding', 'lightsout', 'colorflood'];

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${api.baseURL}/stats/leaderboard/${gameType}/fastest`);
                if (response.ok) {
                    const data = await response.json();
                    setLeaderboard(data);
                } else {
                    setLeaderboard([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [gameType]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={onGoBack} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>🏆 Leaderboards</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.card}>
                    <Text style={styles.subtitle}>Fastest Solve Times</Text>
                    
                    <View style={styles.gameSelector}>
                        <FlatList 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            data={gamesList}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Pressable 
                                    style={[styles.gameBtn, gameType === item && styles.gameBtnActive]}
                                    onPress={() => setGameType(item)}
                                >
                                    <Text style={[styles.gameBtnText, gameType === item && styles.gameBtnTextActive]}>
                                        {item.charAt(0).toUpperCase() + item.slice(1)}
                                    </Text>
                                </Pressable>
                            )}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList 
                            data={leaderboard}
                            keyExtractor={(item, idx) => item.username + idx}
                            renderItem={({ item, index }) => (
                                <View style={styles.row}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankText}>#{index + 1}</Text>
                                    </View>
                                    <Text style={styles.username}>{item.username}</Text>
                                    <Text style={styles.time}>{item.fast_time}s</Text>
                                </View>
                            )}
                            ListEmptyComponent={() => (
                                <Text style={styles.emptyText}>No times recorded yet for this game.</Text>
                            )}
                        />
                    )}
                </GlassCard>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
    backBtnText: { color: '#007AFF', fontWeight: 'bold' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' },
    content: { flex: 1, padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
    card: { flex: 1, padding: 20 },
    subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#1C1C1E', textAlign: 'center' },
    gameSelector: { marginBottom: 20 },
    gameBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 10 },
    gameBtnActive: { backgroundColor: '#007AFF' },
    gameBtnText: { color: '#1C1C1E', fontWeight: '600' },
    gameBtnTextActive: { color: '#FFF' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, marginBottom: 10 },
    rankBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,122,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    rankText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
    username: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
    time: { fontSize: 18, fontWeight: 'bold', color: '#34C759' },
    emptyText: { textAlign: 'center', marginTop: 40, color: '#68686E', fontSize: 16 }
});

export default LeaderboardScreen;
