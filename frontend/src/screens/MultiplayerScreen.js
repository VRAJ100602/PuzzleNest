import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Animated, Easing } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import NeonButton from '../components/Common/NeonButton';
import { useMultiplayer } from '../utils/useMultiplayer';
import { api } from '../utils/api';
import Sudoku from '../components/Games/Sudoku';
import Wordle from '../components/Games/Wordle';
import Shikaku from '../components/Games/Shikaku';
import Nonogram from '../components/Games/Nonogram';
import Game2048 from '../components/Games/Game2048';
import Pipes from '../components/Games/Pipes';
import Tower from '../components/Games/Tower';
import Minesweeper from '../components/Games/Minesweeper';
import SlidingPuzzle from '../components/Games/SlidingPuzzle';
import LightsOut from '../components/Games/LightsOut';
import ColorFlood from '../components/Games/ColorFlood';
import MemoryMatch from '../components/Games/MemoryMatch';

const GameComponents = {
    sudoku: Sudoku, wordle: Wordle, shikaku: Shikaku, nonogram: Nonogram,
    '2048': Game2048, pipes: Pipes, tower: Tower, minesweeper: Minesweeper,
    sliding: SlidingPuzzle, lightsout: LightsOut, colorflood: ColorFlood, memory: MemoryMatch
};

// ───── Inline Sudoku Race Board ─────
const BOARD_SIZE = 9;

const SudokuRaceBoard = ({ puzzle, solution, onProgressChange, onSolve, disabled }) => {
    const [board, setBoard] = useState([]);
    const [selected, setSelected] = useState(null);
    const [errors, setErrors] = useState(new Set());
    const initialPuzzleRef = useRef(null);

    useEffect(() => {
        if (puzzle) {
            const newBoard = puzzle.map(row => [...row]);
            setBoard(newBoard);
            initialPuzzleRef.current = puzzle.map(row => [...row]);
            setErrors(new Set());
            setSelected(null);
        }
    }, [puzzle]);

    const isEditable = (row, col) => {
        return initialPuzzleRef.current && initialPuzzleRef.current[row][col] === 0;
    };

    const calculateProgress = useCallback((currentBoard) => {
        if (!solution) return 0;
        let filled = 0;
        let total = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (initialPuzzleRef.current && initialPuzzleRef.current[r][c] === 0) {
                    total++;
                    if (currentBoard[r][c] === solution[r][c]) {
                        filled++;
                    }
                }
            }
        }
        return total === 0 ? 100 : Math.round((filled / total) * 100);
    }, [solution]);

    const checkWin = useCallback((currentBoard) => {
        if (!solution) return false;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] !== solution[r][c]) return false;
            }
        }
        return true;
    }, [solution]);

    const handleCellPress = (row, col) => {
        if (disabled) return;
        if (isEditable(row, col)) {
            setSelected({ row, col });
        }
    };

    const handleNumberInput = (num) => {
        if (!selected || disabled) return;
        const {
 row, col } = selected;
        if (!isEditable(row, col)) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = num;
        setBoard(newBoard);

        // Check error
        const newErrors = new Set(errors);
        const key = `${row}-${col}`;
        if (num !== 0 && num !== solution[row][col]) {
            newErrors.add(key);
        } else {
            newErrors.delete(key);
        }
        setErrors(newErrors);

        // Calculate progress
        const progress = calculateProgress(newBoard);
        if (onProgressChange) onProgressChange(progress);

        // Check win
        if (checkWin(newBoard)) {
            if (onSolve) onSolve();
        }
    };

    const handleClear = () => {
        if (!selected || disabled) return;
        const { row, col } = selected;
        if (!isEditable(row, col)) return;
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = 0;
        setBoard(newBoard);
        const newErrors = new Set(errors);
        newErrors.delete(`${row}-${col}`);
        setErrors(newErrors);
        const progress = calculateProgress(newBoard);
        if (onProgressChange) onProgressChange(progress);
    };

    const getCellStyle = (row, col) => {
        const isSelected = selected && selected.row === row && selected.col === col;
        const isError = errors.has(`${row}-${col}`);
        const isGiven = initialPuzzleRef.current && initialPuzzleRef.current[row][col] !== 0;
        const borderRight = (col + 1) % 3 === 0 && col < 8 ? 2 : 0.5;
        const borderBottom = (row + 1) % 3 === 0 && row < 8 ? 2 : 0.5;

        return [
            styles.cell,
            { borderRightWidth: borderRight, borderBottomWidth: borderBottom },
            isSelected && styles.cellSelected,
            isError && styles.cellError,
            isGiven && styles.cellGiven,
        ];
    };

    return (
        <View style={styles.boardContainer}>
            <View style={styles.board}>
                {board.map((row, rIdx) => (
                    <View key={rIdx} style={styles.boardRow}>
                        {row.map((cell, cIdx) => (
                            <Pressable
                                key={cIdx}
                                style={getCellStyle(rIdx, cIdx)}
                                onPress={() => handleCellPress(rIdx, cIdx)}
                            >
                                <Text style={[
                                    styles.cellText,
                                    initialPuzzleRef.current && initialPuzzleRef.current[rIdx][cIdx] !== 0
                                        ? styles.cellTextGiven
                                        : styles.cellTextUser,
                                    errors.has(`${rIdx}-${cIdx}`) && styles.cellTextError,
                                ]}>
                                    {cell !== 0 ? cell : ''}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ))}
            </View>
            {/* Number Pad */}
            <View style={styles.numPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Pressable
                        key={num}
                        style={({ pressed }) => [
                            styles.numBtn,
                            pressed && styles.numBtnPressed,
                        ]}
                        onPress={() => handleNumberInput(num)}
                    >
                        <Text style={styles.numBtnText}>{num}</Text>
                    </Pressable>
                ))}
                <Pressable
                    style={({ pressed }) => [styles.numBtn, styles.numBtnClear, pressed && styles.numBtnPressed]}
                    onPress={handleClear}
                >
                    <Text style={[styles.numBtnText, { fontSize: 14 }]}>✕</Text>
                </Pressable>
            </View>
        </View>
    );
};

// ───── Progress Bar Component ─────
const ProgressBar = ({ progress, color, label }) => (
    <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>{label}</Text>
            <Text style={[styles.progressPercent, { color }]}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
        </View>
    </View>
);

// ───── Pulsing Search Animation ─────
const PulsingOrb = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scaleAnim, { toValue: 1.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ]),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View style={[styles.pulsingOrb, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <Text style={styles.pulsingOrbIcon}>⚔️</Text>
        </Animated.View>
    );
};

// ───── Main MultiplayerScreen ─────
const MultiplayerScreen = () => {
    const {
        status, myUsername, opponent, puzzle, solution, gameType,
        opponentProgress, winner, gameOverReason, error,
        connect, joinQueue, leaveQueue, sendProgress, sendSolve, disconnect, reset,
    
    } = useMultiplayer();
    const [selectedGameToQueue, setSelectedGameToQueue] = useState('random');

    const [myProgress, setMyProgress] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        if (status === 'playing' && puzzle) { // puzzle is actually puzzle_data from hook
            api.setMultiplayerData(puzzle);
            api.setMultiplayerWinCallback(() => {
                handleSolve();
            });
        } else {
            api.setMultiplayerData(null);
            api.setMultiplayerWinCallback(null);
        }
        return () => {
            api.setMultiplayerData(null);
            api.setMultiplayerWinCallback(null);
        };
    }, [status, puzzle]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, [status]);

    const handleFindMatch = async () => {
        await connect();
        // Give a moment for WS to open then join queue
        setTimeout(() => {
            joinQueue(selectedGameToQueue);
        }, 600);
    };

    const handleCancelSearch = () => {
        leaveQueue();
        disconnect();
    };

    const handleProgressChange = (progress) => {
        setMyProgress(progress);
        sendProgress(progress);
    };

    const handleSolve = () => {
        sendSolve();
    };

    const handlePlayAgain = () => {
        setMyProgress(0);
        reset();
    };

    const handleBackToLobby = () => {
        setMyProgress(0);
        disconnect();
    };

    const iWon = winner === myUsername;

    // ── IDLE: Arena Lobby ──
    if (status === 'idle' || status === 'connecting') {
        return (
            <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>  
                <View style={styles.arenaHeader}>
                    <Text style={styles.arenaEmoji}>⚔️</Text>
                    <Text style={styles.arenaTitle}>MULTIPLAYER ARENA</Text>
                    <Text style={styles.arenaSubtitle}>Race head-to-head in a Sudoku showdown</Text>
                </View>

                <GlassCard style={styles.lobbyCard}>
                    <View style={styles.lobbyContent}>
                        <Text style={styles.lobbyIcon}>🏟️</Text>
                        <Text style={styles.lobbyTitle}>1v1 Sudoku Race</Text>
                        
                        <Text style={styles.lobbyDesc}>
                            Get matched with an opponent and race to solve the same puzzle. 
                            Your progress is shown to your opponent in real-time. First to solve wins!
                        </Text>

                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 15}}>
                            <Text style={{color: '#1C1C1E', fontWeight: 'bold', marginRight: 10}}>Select Game:</Text>
                            <select 
                                value={selectedGameToQueue} 
                                onChange={(e) => setSelectedGameToQueue(e.target.value)}
                                style={{padding: 8, borderRadius: 8, border: '1px solid #ccc'}}
                            >
                                <option value="random">🎲 Random Match</option>
                                <option value="sudoku">Sudoku</option>
                                <option value="wordle">Wordle</option>
                                <option value="shikaku">Shikaku</option>
                                <option value="nonogram">Nonogram</option>
                                <option value="2048">2048</option>
                                <option value="pipes">Pipes</option>
                                <option value="tower">Tower</option>
                            </select>
                        </View>


                        <View style={styles.lobbyRules}>
                            <View style={styles.ruleRow}>
                                <Text style={styles.ruleIcon}>🧩</Text>
                                <Text style={styles.ruleText}>Same puzzle, same difficulty</Text>
                            </View>
                            <View style={styles.ruleRow}>
                                <Text style={styles.ruleIcon}>📊</Text>
                                <Text style={styles.ruleText}>Real-time progress tracking</Text>
                            </View>
                            <View style={styles.ruleRow}>
                                <Text style={styles.ruleIcon}>🏆</Text>
                                <Text style={styles.ruleText}>First to solve wins the race</Text>
                            </View>
                            <View style={styles.ruleRow}>
                                <Text style={styles.ruleIcon}>📶</Text>
                                <Text style={styles.ruleText}>Disconnect = automatic forfeit</Text>
                            </View>
                        </View>

                        <NeonButton
                            title={status === 'connecting' ? "Connecting..." : "⚡ Find Match"}
                            variant="primary"
                            onPress={handleFindMatch}
                            loading={status === 'connecting'}
                            style={styles.findMatchBtn}
                        />
                    </View>
                </GlassCard>

                {error && (
                    <GlassCard style={styles.errorCard}>
                        <Text style={styles.errorText}>⚠️ {error}</Text>
                    </GlassCard>
                )}
            </Animated.View>
        );
    }

    // ── QUEUED: Searching for Opponent ──
    if (status === 'queued') {
        return (
            <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <GlassCard style={styles.searchCard}>
                    <PulsingOrb />
                    <Text style={styles.searchTitle}>Searching for Opponent...</Text>
                    <Text style={styles.searchSubtitle}>Waiting for another player to join the arena</Text>
                    <Text style={styles.searchUser}>Playing as: <Text style={styles.searchUsername}>{myUsername}</Text></Text>
                    
                    <View style={styles.searchDots}>
                        <SearchDots />
                    </View>

                    <NeonButton
                        title="Cancel"
                        variant="muted"
                        onPress={handleCancelSearch}
                        style={styles.cancelBtn}
                    />
                </GlassCard>
            </Animated.View>
        );
    }

    // ── PLAYING: Race Mode ──
    if (status === 'playing') {
        return (
            <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {/* VS Header Banner */}
                <GlassCard style={styles.vsCard}>
                    <View style={styles.vsRow}>
                        <View style={styles.vsPlayer}>
                            <View style={[styles.avatar, styles.avatarMe]}>
                                <Text style={styles.avatarText}>{myUsername.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.vsPlayerName} numberOfLines={1}>{myUsername}</Text>
                            <Text style={styles.vsYouBadge}>YOU</Text>
                        </View>

                        <View style={styles.vsCenter}>
                            <Text style={styles.vsText}>VS</Text>
                        </View>

                        <View style={styles.vsPlayer}>
                            <View style={[styles.avatar, styles.avatarOpponent]}>
                                <Text style={styles.avatarText}>{opponent?.username?.charAt(0).toUpperCase() || '?'}</Text>
                            </View>
                            <Text style={styles.vsPlayerName} numberOfLines={1}>{opponent?.username || 'Opponent'}</Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Progress Bars */}
                <GlassCard style={styles.progressCard}>
                    <ProgressBar progress={myProgress} color="#007AFF" label="Your Progress" />
                    <View style={{ height: 12 }} />
                    <ProgressBar progress={opponentProgress} color="#FF3B30" label="Opponent" />
                </GlassCard>

                
                {/* Game Board dynamically rendered */}
                <GlassCard style={styles.gameCard}>
                    {(() => {
                        const GameComp = GameComponents[gameType] || Sudoku;
                        return (
                            <View style={{width: '100%', minHeight: 400}}>
                                <GameComp isMultiplayer={true} multiplayerData={puzzle} onFinishGame={() => {}} />
                            </View>
                        );
                    })()}
                </GlassCard>

            </Animated.View>
        );
    }

    // ── GAME OVER ──
    if (status === 'game_over') {
        return (
            <Animated.View style={[styles.screen, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <GlassCard style={[styles.resultCard, iWon ? styles.resultCardWin : styles.resultCardLose]}>
                    <Text style={styles.resultEmoji}>{iWon ? '🏆' : '😤'}</Text>
                    <Text style={[styles.resultTitle, iWon ? styles.resultTitleWin : styles.resultTitleLose]}>
                        {iWon ? 'VICTORY!' : 'DEFEAT'}
                    </Text>
                    <Text style={styles.resultSubtitle}>
                        {gameOverReason === 'forfeit' 
                            ? (iWon ? 'Your opponent disconnected.' : 'You disconnected from the match.') 
                            : (iWon ? 'You solved the puzzle first!' : `${winner} solved it before you.`)}
                    </Text>

                    <View style={styles.resultStats}>
                        <View style={styles.resultStatItem}>
                            <Text style={styles.resultStatLabel}>Your Progress</Text>
                            <Text style={styles.resultStatVal}>{myProgress}%</Text>
                        </View>
                        <View style={styles.resultStatDivider} />
                        <View style={styles.resultStatItem}>
                            <Text style={styles.resultStatLabel}>Opponent</Text>
                            <Text style={styles.resultStatVal}>{Math.round(opponentProgress)}%</Text>
                        </View>
                    </View>

                    <View style={styles.resultActions}>
                        <NeonButton title="🔄 Play Again" variant="primary" onPress={handlePlayAgain} style={styles.resultBtn} />
                        <NeonButton title="Back to Lobby" variant="muted" onPress={handleBackToLobby} style={styles.resultBtn} />
                    </View>
                </GlassCard>
            </Animated.View>
        );
    }

    return null;
};

// ───── Animated Search Dots ─────
const SearchDots = () => {
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animateDots = () => {
            Animated.loop(
                Animated.stagger(200, [
                    Animated.sequence([
                        Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        animateDots();
    }, []);

    return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
            <Animated.View style={[styles.dot, { opacity: dot1 }]} />
            <Animated.View style={[styles.dot, { opacity: dot2 }]} />
            <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
    );
};

// ───── Styles ─────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 40,
    },
    // Arena Header
    arenaHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    arenaEmoji: {
        fontSize: 48,
        marginBottom: 10,
    },
    arenaTitle: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 3,
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({ web: { textShadow: '0 2px 12px rgba(0, 122, 255, 0.15)' } }),
    },
    arenaSubtitle: {
        fontSize: 15,
        color: '#68686E',
        marginTop: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // Lobby Card
    lobbyCard: {
        width: '100%',
        maxWidth: 520,
        padding: 30,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 122, 255, 0.15)',
    },
    lobbyContent: {
        alignItems: 'center',
    },
    lobbyIcon: {
        fontSize: 56,
        marginBottom: 16,
    },
    lobbyTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    lobbyDesc: {
        fontSize: 14,
        color: '#68686E',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    lobbyRules: {
        width: '100%',
        marginBottom: 28,
        backgroundColor: 'rgba(0, 122, 255, 0.04)',
        borderRadius: 12,
        padding: 16,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    ruleIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    ruleText: {
        fontSize: 14,
        color: '#3C3C43',
        fontWeight: '500',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    findMatchBtn: {
        width: '100%',
        paddingVertical: 16,
    },
    // Error
    errorCard: {
        width: '100%',
        maxWidth: 520,
        marginTop: 16,
        padding: 16,
        borderColor: 'rgba(255, 59, 48, 0.2)',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // Searching
    searchCard: {
        width: '100%',
        maxWidth: 480,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 122, 255, 0.12)',
    },
    searchTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C1C1E',
        marginTop: 24,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    searchSubtitle: {
        fontSize: 14,
        color: '#68686E',
        marginTop: 8,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    searchUser: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 16,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    searchUsername: {
        color: '#007AFF',
        fontWeight: '700',
    },
    searchDots: {
        marginTop: 28,
        marginBottom: 28,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    cancelBtn: {
        width: '100%',
    },
    // Pulsing Orb
    pulsingOrb: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    pulsingOrbIcon: {
        fontSize: 36,
    },
    // VS Card
    vsCard: {
        width: '100%',
        maxWidth: 520,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 122, 255, 0.12)',
    },
    vsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    vsPlayer: {
        flex: 1,
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatarMe: {
        backgroundColor: '#007AFF',
    },
    avatarOpponent: {
        backgroundColor: '#FF3B30',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    vsPlayerName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        maxWidth: 100,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    vsYouBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#007AFF',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        letterSpacing: 1,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    vsCenter: {
        paddingHorizontal: 20,
    },
    vsText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FF9500',
        letterSpacing: 4,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({ web: { textShadow: '0 0 20px rgba(255, 149, 0, 0.3)' } }),
    },
    // Progress Card
    progressCard: {
        width: '100%',
        maxWidth: 520,
        padding: 16,
        marginBottom: 12,
    },
    progressContainer: {
        width: '100%',
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#68686E',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    progressTrack: {
        width: '100%',
        height: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
        ...Platform.select({ web: { transition: 'width 0.3s ease' } }),
    },
    // Game Card (Sudoku Board)
    gameCard: {
        width: '100%',
        maxWidth: 520,
        alignItems: 'center',
        padding: 12,
    },
    boardContainer: {
        alignItems: 'center',
        width: '100%',
    },
    board: {
        borderWidth: 2.5,
        borderColor: '#1C1C1E',
        borderRadius: 4,
        overflow: 'hidden',
    },
    boardRow: {
        flexDirection: 'row',
    },
    cell: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: 'rgba(0, 0, 0, 0.15)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        ...Platform.select({ web: { cursor: 'pointer', transition: 'background-color 0.15s ease' } }),
    },
    cellSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
    },
    cellError: {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
    },
    cellGiven: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    cellText: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cellTextGiven: {
        color: '#1C1C1E',
        fontWeight: '800',
    },
    cellTextUser: {
        color: '#007AFF',
    },
    cellTextError: {
        color: '#FF3B30',
    },
    // Number Pad
    numPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 16,
        gap: 8,
    },
    numBtn: {
        width: 42,
        height: 42,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.15)',
        ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.15s ease' } }),
    },
    numBtnPressed: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        transform: [{ scale: 0.95 }],
    },
    numBtnClear: {
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
        borderColor: 'rgba(255, 59, 48, 0.15)',
    },
    numBtnText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#007AFF',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // Result Card
    resultCard: {
        width: '100%',
        maxWidth: 480,
        padding: 40,
        alignItems: 'center',
        borderWidth: 2,
    },
    resultCardWin: {
        borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    resultCardLose: {
        borderColor: 'rgba(255, 59, 48, 0.2)',
    },
    resultEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 4,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    resultTitleWin: {
        color: '#34C759',
        ...Platform.select({ web: { textShadow: '0 0 20px rgba(52, 199, 89, 0.3)' } }),
    },
    resultTitleLose: {
        color: '#FF3B30',
    },
    resultSubtitle: {
        fontSize: 15,
        color: '#68686E',
        marginTop: 12,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    resultStats: {
        flexDirection: 'row',
        marginTop: 30,
        marginBottom: 30,
        alignItems: 'center',
    },
    resultStatItem: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    resultStatLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    resultStatVal: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    resultStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    resultActions: {
        width: '100%',
        gap: 12,
    },
    resultBtn: {
        width: '100%',
    },
});

export default MultiplayerScreen;
