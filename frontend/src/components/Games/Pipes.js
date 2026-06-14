import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const basePorts = {
    'straight': [0, 180],
    'corner': [90, 180],
    't': [90, 180, 270],
    'cross': [0, 90, 180, 270],
    'source': [180],
    'sink': [180]
};

const dirOffsets = {
    0: { dr: -1, dc: 0 },
    90: { dr: 0, dc: 1 },
    180: { dr: 1, dc: 0 },
    270: { dr: 0, dc: -1 }
};

const Pipes = ({ isDaily, onFinishGame , level = null }) => {
    const [difficulty, setDifficulty] = useState('easy');
    const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'won'
    const [gameData, setGameData] = useState(null);
    const [board, setBoard] = useState([]);
    const [filledSet, setFilledSet] = useState(new Set());
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
            if (level) data = await api.getPipesLevel(level);
            else data = await api.getPipes(todayStr, 'medium');
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
            const data = await api.getPipes(difficulty);
            initGame(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const initGame = (data) => {
        setGameData(data);
        setBoard(data.grid);
        setGameState('playing');
        setStartTime(Date.now());
        updateFlow(data.grid, data.size);
    };

    const handleCellClick = (r, c) => {
        if (gameState !== 'playing') return;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c].rotation = (newBoard[r][c].rotation + 90) % 360;
        setBoard(newBoard);
        updateFlow(newBoard, gameData.size);
    };

    const updateFlow = (currentBoard, size) => {
        const queue = [];
        const visited = new Set();
        
        let sourceCell = null;
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                if (currentBoard[r][c].shape === 'source') {
                    sourceCell = {r, c};
                }
            }
        }
        
        if (!sourceCell) return;
        
        queue.push(sourceCell);
        visited.add(`${sourceCell.r},${sourceCell.c}`);

        let isWin = false;

        while (queue.length > 0) {
            const {r, c} = queue.shift();
            const cell = currentBoard[r][c];
            if (cell.shape === 'sink') {
                isWin = true;
            }

            const cellPorts = basePorts[cell.shape].map(p => (p + cell.rotation) % 360);
            
            for (let port of cellPorts) {
                const nr = r + dirOffsets[port].dr;
                const nc = c + dirOffsets[port].dc;
                const nKey = `${nr},${nc}`;
                
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(nKey)) {
                    const nCell = currentBoard[nr][nc];
                    const nPorts = basePorts[nCell.shape].map(p => (p + nCell.rotation) % 360);
                    const requiredNPort = (port + 180) % 360;
                    
                    if (nPorts.includes(requiredNPort)) {
                        visited.add(nKey);
                        queue.push({r: nr, c: nc});
                    }
                }
            }
        }

        setFilledSet(visited);

        if (isWin) {
            setGameState('won');
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            api.updateStats('pipes', true, timeTaken, 0);
            if (isDaily) {
                const todayStr = new Date().toISOString().split('T')[0];
                api.setDailyCompleted(todayStr, 'pipes');
            }
        }
    };

    const renderPipeShape = (shape, isFilled) => {
        const color = isFilled ? '#5AC8FA' : '#68686E';
        const thick = 8;
        const half = '50%';
        const oHalf = '50%';
        
        const lineStyles = {
            position: 'absolute',
            backgroundColor: color,
        };

        const renderLine = (angle) => {
            if (angle === 0) return <View style={[lineStyles, { left: '50%', marginLeft: -thick/2, top: 0, height: '50%', width: thick }]} key="0"/>;
            if (angle === 90) return <View style={[lineStyles, { top: '50%', marginTop: -thick/2, left: '50%', width: '50%', height: thick }]} key="90"/>;
            if (angle === 180) return <View style={[lineStyles, { left: '50%', marginLeft: -thick/2, top: '50%', height: '50%', width: thick }]} key="180"/>;
            if (angle === 270) return <View style={[lineStyles, { top: '50%', marginTop: -thick/2, left: 0, width: '50%', height: thick }]} key="270"/>;
        };

        const centerDot = <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -thick/2, marginTop: -thick/2, width: thick, height: thick, backgroundColor: color }} key="center" />;
        const sourceDot = <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -12, marginTop: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: color }} key="source" />;
        const sinkDot = <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -12, marginTop: -12, width: 24, height: 24, backgroundColor: color }} key="sink" />;

        const elements = basePorts[shape].map(renderLine);
        
        if (shape === 'source') elements.push(sourceDot);
        else if (shape === 'sink') elements.push(sinkDot);
        else elements.push(centerDot);

        return elements;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#5AC8FA" />
                <Text style={styles.loadingText}>Generating Pipeline...</Text>
            </View>
        );
    }

    if (gameState === 'menu' && !isDaily) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.title}>Pipes</Text>
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
                <NeonButton title="Start Game" variant="primary" onPress={startGame} />
            </View>
        );
    }

    if (gameState === 'playing' || gameState === 'won') {
        const size = gameData.size;
        const cellSize = size >= 8 ? 40 : 60; // scale based on difficulty

        return (
            <View style={styles.boardContainer}>
                {gameState === 'won' && (
                    <View style={styles.winBanner}>
                        <Text style={styles.winText}>🎉 Flow Connected! 🎉</Text>
                        {isDaily && <Text style={styles.dailyWinText}>Daily Challenge Completed!</Text>}
                        <NeonButton title="Return to Hub" variant="primary" onPress={onFinishGame} style={{marginTop: 15}} />
                    </View>
                )}

                <View style={styles.gridWrapper}>
                    {board.map((row, r) => (
                        <View key={`row-${r}`} style={styles.row}>
                            {row.map((cell, c) => {
                                const isFilled = filledSet.has(`${r},${c}`);
                                return (
                                    <Pressable 
                                        key={`cell-${r}-${c}`} 
                                        style={[styles.cell, { width: cellSize, height: cellSize }]}
                                        onPress={() => handleCellClick(r, c)}
                                    >
                                        <View style={{ width: '100%', height: '100%', transform: [{ rotate: `${cell.rotation}deg` }] }}>
                                            {renderPipeShape(cell.shape, isFilled)}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    <Text style={styles.instTitle}>How to play</Text>
                    <Text style={styles.instText}>• Click any pipe tile to rotate it 90 degrees clockwise.</Text>
                    <Text style={styles.instText}>• The circular tile is the Source (Water Start).</Text>
                    <Text style={styles.instText}>• The square tile is the Sink (Water End).</Text>
                    <Text style={styles.instText}>• Connect a continuous pipe from Source to Sink to win.</Text>
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
        color: '#5AC8FA',
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
        backgroundColor: '#5AC8FA',
        borderColor: '#5AC8FA'
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
        backgroundColor: '#2C2C2E', // Dark background for pipes
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5
    },
    row: {
        flexDirection: 'row'
    },
    cell: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        ...Platform.select({ web: { cursor: 'pointer' } })
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

export default Pipes;
