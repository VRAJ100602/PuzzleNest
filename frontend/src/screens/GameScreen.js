import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import Sudoku from '../components/Games/Sudoku';
import Game2048 from '../components/Games/Game2048';
import Shikaku from '../components/Games/Shikaku';
import Wordle from '../components/Games/Wordle';
import Nonogram from '../components/Games/Nonogram';
import Pipes from '../components/Games/Pipes';
import Tower from '../components/Games/Tower';
import Minesweeper from '../components/Games/Minesweeper';
import MemoryMatch from '../components/Games/MemoryMatch';
import SlidingPuzzle from '../components/Games/SlidingPuzzle';
import LightsOut from '../components/Games/LightsOut';
import ColorFlood from '../components/Games/ColorFlood';
import Pacman from '../components/Games/Pacman';

const GameScreen = ({ gameId, isDaily = false, level = null, gameMode = 'classic', onGoBack, onNextLevel }) => {
    const getGameDetails = () => {
        switch (gameId) {
            case 'sudoku':
                return { 
                    title: isDaily ? 'Daily Sudoku Challenge' : 'Sudoku', 
                    component: <Sudoku isDaily={isDaily} level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case '2048':
                return { 
                    title: '2048', 
                    component: <Game2048 level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'shikaku':
                return { 
                    title: isDaily ? 'Daily Shikaku Challenge' : 'Shikaku', 
                    component: <Shikaku isDaily={isDaily} level={level} gameMode={gameMode} onFinishGame={onGoBack} onNextLevel={onNextLevel} /> 
                };
            case 'wordle':
                return { 
                    title: isDaily ? 'Daily Wordle Challenge' : 'Wordle', 
                    component: <Wordle isDaily={isDaily} level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'nonogram':
                return { 
                    title: 'Nonogram', 
                    component: <Nonogram level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'pipes':
                return { 
                    title: 'Pipes', 
                    component: <Pipes level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'tower':
                return { 
                    title: 'Towers', 
                    component: <Tower level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'minesweeper':
                return { 
                    title: 'Minesweeper', 
                    component: <Minesweeper level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'memory':
                return { 
                    title: 'Memory Match', 
                    component: <MemoryMatch level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'sliding':
                return { 
                    title: 'Sliding Puzzle', 
                    component: <SlidingPuzzle level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'lightsout':
                return { 
                    title: 'Lights Out', 
                    component: <LightsOut level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'colorflood':
                return { 
                    title: 'Color Flood', 
                    component: <ColorFlood level={level} gameMode={gameMode} onFinishGame={onGoBack} /> 
                };
            case 'pacman':
                return { 
                    title: 'Pacman', 
                    component: <Pacman level={level} gameMode={gameMode} onFinishGame={onGoBack} onNextLevel={onNextLevel} /> 
                };
            default:
                return { 
                    title: 'Puzzle', 
                    component: <Text style={styles.errorText}>Game not found</Text> 
                };
        }
    };

    const details = getGameDetails();

    const getModeLabel = () => {
        if (isDaily) return '📅 Daily';
        if (gameMode === 'zen') return '🧘 Zen';
        if (gameMode === 'blitz') return '⚡ Blitz';
        return '⏱️ Classic';
    };

    return (
        <View style={styles.container}>
            {/* Top Bar: navigation back */}
            <View style={styles.topBar}>
                <Pressable onPress={onGoBack} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back to Hub</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.gameTitle}>{details.title}</Text>
                    <View style={[
                        styles.modeBadge,
                        gameMode === 'zen' && styles.modeBadgeZen,
                        gameMode === 'blitz' && styles.modeBadgeBlitz
                    ]}>
                        <Text style={styles.modeBadgeText}>{getModeLabel()}</Text>
                    </View>
                </View>
                <View style={styles.spacer} />
            </View>

            {/* Premium glass container holding the active game */}
            <GlassCard style={styles.gameCard}>
                {details.component}
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 40
    },
    topBar: {
        width: '100%',
        maxWidth: 550,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 10
    },
    backBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    backBtnText: {
        color: '#68686E',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    gameTitle: {
        color: '#1C1C1E', // Dark charcoal text color for premium contrast
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#007AFF',
    },
    modeBadgeZen: {
        backgroundColor: '#AF52DE',
    },
    modeBadgeBlitz: {
        backgroundColor: '#FF9500',
    },
    modeBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    spacer: {
        width: 100 // Visual balance spacer matching backBtn width
    },
    gameCard: {
        width: '100%',
        maxWidth: 550, // Expanded to accommodate 520px board size comfortably
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 20
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: 'bold',
        padding: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default GameScreen;
