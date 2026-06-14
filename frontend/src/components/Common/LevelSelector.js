import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, ScrollView } from 'react-native';
import GlassCard from './GlassCard';

const TOTAL_LEVELS = 100;
const COLUMNS = 10;

const GAME_TITLES = {
    sudoku: 'Sudoku',
    '2048': '2048',
    shikaku: 'Shikaku',
    wordle: 'Wordle',
    nonogram: 'Nonogram',
    pipes: 'Pipes',
    tower: 'Towers',
    minesweeper: 'Minesweeper',
    memory: 'Memory Match',
    sliding: 'Sliding Puzzle',
    lightsout: 'Lights Out',
    colorflood: 'Color Flood',
    pacman: 'Pacman',
};

const GAME_COLORS = {
    sudoku: '#007AFF',
    '2048': '#FF9500',
    shikaku: '#9D00FF',
    wordle: '#34C759',
    nonogram: '#FF2D55',
    pipes: '#5AC8FA',
    tower: '#AF52DE',
    minesweeper: '#FF6B6B',
    memory: '#4ECDC4',
    sliding: '#E17055',
    lightsout: '#FDCB6E',
    colorflood: '#45B7D1',
    pacman: '#FFD700',
};

const GAME_DARK_COLORS = {
    sudoku: '#0051A8',
    '2048': '#CC7600',
    shikaku: '#6B00B0',
    wordle: '#208A39',
    nonogram: '#C71F3B',
    pipes: '#15A3E6',
    tower: '#802FAD',
    minesweeper: '#D63B3B',
    memory: '#2C9E95',
    sliding: '#B34A32',
    lightsout: '#D2A13D',
    colorflood: '#2092AC',
    pacman: '#CCAB00',
};

const LevelSelector = ({ gameId, accentColor = '#007AFF', onSelectLevel, onBack }) => {
    const [completedLevels, setCompletedLevels] = useState([]);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Load completed levels from localStorage
        try {
            const key = `levels_completed_${gameId}`;
            const data = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
            if (data) {
                setCompletedLevels(JSON.parse(data));
            }
        } catch (e) {
            console.error('Failed to load completed levels', e);
        }
    }, [gameId]);

    useEffect(() => {
        // Pulsing animation for current level
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.18,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    const currentLevel = (() => {
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            if (!completedLevels.includes(i)) return i;
        }
        return TOTAL_LEVELS + 1; // all done
    })();

    const activeAccentColor = accentColor !== '#007AFF' ? accentColor : (GAME_COLORS[gameId] || '#007AFF');
    const completedCount = completedLevels.length;
    const progressPercent = (completedCount / TOTAL_LEVELS) * 100;
    const gameTitle = GAME_TITLES[gameId] || 'Puzzle';

    const renderLevel = (levelNum) => {
        const isCompleted = completedLevels.includes(levelNum);
        const isCurrent = levelNum === currentLevel;
        const isLocked = levelNum > currentLevel;

        const darkColor = GAME_DARK_COLORS[gameId] || '#333';

        if (isCurrent) {
            return (
                <Animated.View
                    key={levelNum}
                    style={[
                        styles.levelCircle,
                        styles.levelCurrent,
                        {
                            borderColor: activeAccentColor,
                            borderBottomColor: darkColor,
                            borderBottomWidth: 4,
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    <Pressable
                        onPress={() => onSelectLevel(levelNum)}
                        style={styles.levelPressable}
                    >
                        <Text style={[styles.levelText, styles.levelTextCurrent, { color: activeAccentColor }]}>
                            {levelNum}
                        </Text>
                    </Pressable>
                </Animated.View>
            );
        }

        if (isCompleted) {
            return (
                <Pressable
                    key={levelNum}
                    onPress={() => onSelectLevel(levelNum)}
                    style={({ pressed }) => [
                        styles.levelCircle,
                        styles.levelCompleted,
                        { 
                            backgroundColor: activeAccentColor,
                            borderColor: activeAccentColor,
                            borderBottomColor: darkColor,
                            borderBottomWidth: pressed ? 1.5 : 5,
                            transform: [{ translateY: pressed ? 3.5 : 0 }]
                        },
                        Platform.select({
                            web: {
                                boxShadow: pressed 
                                    ? '0 1px 0 rgba(0,0,0,0.1)' 
                                    : `0 3px 0 ${darkColor}, 0 4px 8px rgba(0,0,0,0.15)`
                            }
                        })
                    ]}
                >
                    <Text style={styles.levelCheckmark}>✓</Text>
                </Pressable>
            );
        }

        // Locked
        return (
            <View
                key={levelNum}
                style={[styles.levelCircle, styles.levelLocked]}
            >
                <Text style={styles.levelTextLocked}>{levelNum}</Text>
            </View>
        );
    };

    // Build rows
    const rows = [];
    for (let r = 0; r < Math.ceil(TOTAL_LEVELS / COLUMNS); r++) {
        const rowLevels = [];
        for (let c = 0; c < COLUMNS; c++) {
            const num = r * COLUMNS + c + 1;
            if (num <= TOTAL_LEVELS) {
                rowLevels.push(renderLevel(num));
            }
        }
        rows.push(
            <View key={r} style={styles.gridRow}>
                {rowLevels}
            </View>
        );
    }

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
            {/* Back button */}
            <Pressable onPress={onBack} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>

            <GlassCard style={styles.mainCard}>
                {/* Game title */}
                <Text style={[styles.gameTitle, { color: activeAccentColor }]}>
                    {gameTitle} Levels
                </Text>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progressPercent}%`, backgroundColor: activeAccentColor },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {completedCount} / {TOTAL_LEVELS} Completed
                    </Text>
                </View>

                {/* Level grid */}
                <View style={styles.grid}>
                    {rows}
                </View>
            </GlassCard>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        width: '100%',
    },
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 40,
        paddingTop: 10,
    },
    backBtn: {
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        marginBottom: 16,
        marginLeft: 10,
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    backBtnText: {
        color: '#68686E',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    mainCard: {
        width: '100%',
        maxWidth: 620,
        padding: 28,
        alignItems: 'center',
    },
    gameTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({
            web: {
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            },
        }),
    },
    progressContainer: {
        width: '100%',
        marginBottom: 24,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
        ...Platform.select({
            web: {
                transition: 'width 0.4s ease',
            },
        }),
    },
    progressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    grid: {
        width: '100%',
        alignItems: 'center',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    levelCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        ...Platform.select({
            web: {
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            },
        }),
    },
    levelPressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    levelCompleted: {
        ...Platform.select({
            web: {
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
                elevation: 3,
            },
        }),
    },
    levelCurrent: {
        borderWidth: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        ...Platform.select({
            web: {
                boxShadow: '0 0 12px rgba(0, 122, 255, 0.25)',
            },
        }),
    },
    levelLocked: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        opacity: 0.45,
    },
    levelCheckmark: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
    },
    levelText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    levelTextCurrent: {
        fontSize: 16,
        fontWeight: '900',
    },
    levelTextLocked: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
});

export default LevelSelector;
