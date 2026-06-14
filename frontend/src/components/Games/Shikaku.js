import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Shikaku = ({ isDaily = false, onFinishGame , level = null, gameMode = 'classic', onNextLevel }) => {
    const [loading, setLoading] = useState(true);
    const [puzzleId, setPuzzleId] = useState(null);
    const [width, setWidth] = useState(8);
    const [height, setHeight] = useState(8);
    const [clues, setClues] = useState([]);
    const [rectangles, setRectangles] = useState([]); // User drawn: Array of {id, x1, y1, x2, y2, w, h, area, isValid, errors[]}
    const [startCell, setStartCell] = useState(null); // {r, c}
    const [difficulty, setDifficulty] = useState('medium');
    const [gameWon, setGameWon] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    useEffect(() => {
        loadNewGame(difficulty);
    }, [level]);

    // Timer logic
    useEffect(() => {
        if (!timerActive || gameWon) return;
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timerActive, gameWon]);

    const loadNewGame = async (diff, forceNew = false) => {
        setLoading(true);
        setGameWon(false);
        setStartCell(null);
        setRectangles([]);
        setElapsedTime(0);
        setTimerActive(false);

        // Try to resume saved progress
        if (!forceNew && !isDaily && !level) {
            try {
                const saved = await api.loadGameProgress('shikaku');
                if (saved && !saved.isCompleted && saved.clues) {
                    setWidth(saved.width);
                    setHeight(saved.height);
                    setClues(saved.clues);
                    setPuzzleId(saved.puzzleId);
                    setRectangles(saved.rectangles || []);
                    setElapsedTime(saved.elapsedTime || 0);
                    setDifficulty(saved.difficulty || 'medium');
                    setLoading(false);
                    setTimerActive(true);
                    return;
                }
            } catch (e) { console.warn(e); }
        }

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let data;
            if (isDaily) data = await api.getDailyShikaku(todayStr, diff);
            else if (level) data = await api.getShikakuLevel(level);
            else data = await api.getShikaku(diff);
            setWidth(data.width);
            setHeight(data.height);
            setClues(data.clues);
            setPuzzleId(data.puzzle_id);

            setLoading(false);
            setTimerActive(true);
            api.clearGameProgress('shikaku');
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    // Auto-save on rectangle/time change
    useEffect(() => {
        if (loading || gameWon || isDaily || level || !puzzleId) return;
        const t = setTimeout(() => {
            api.saveGameProgress('shikaku', {
                width, height, clues, puzzleId, rectangles, difficulty,
                elapsedTime, isCompleted: false,
            });
        }, 500);
        return () => clearTimeout(t);
    }, [rectangles, elapsedTime]);

    const handleCellPress = (r, c) => {
        if (gameWon) return;

        if (!startCell) {
            // First cell selected
            setStartCell({ r, c });
        } else {
            // Second cell selected: create a rectangle spanning from start to current
            const x1 = Math.min(startCell.c, c);
            const x2 = Math.max(startCell.c, c);
            const y1 = Math.min(startCell.r, r);
            const y2 = Math.max(startCell.r, r);
            
            const w = x2 - x1 + 1;
            const h = y2 - y1 + 1;
            const area = w * h;
            
            // Check validation rules
            const { isValid, errors } = validateRectangle(x1, y1, x2, y2, area);
            
            // Remove any overlapping user rectangles
            const filteredRectangles = rectangles.filter(rect => {
                const overlapX = Math.max(rect.x1, x1) <= Math.min(rect.x2, x2);
                const overlapY = Math.max(rect.y1, y1) <= Math.min(rect.y2, y2);
                return !(overlapX && overlapY);
            });

            const newRect = {
                id: Date.now().toString(),
                x1, y1, x2, y2, w, h, area, isValid, errors
            };

            const updatedRects = [...filteredRectangles, newRect];
            setRectangles(updatedRects);
            setStartCell(null);

            checkWinCondition(updatedRects);
        }
    };

    const validateRectangle = (x1, y1, x2, y2, area) => {
        const foundClues = [];
        // Scan the rectangle area to locate clues inside it
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                if (clues[y] && clues[y][x] > 0) {
                    foundClues.push({ val: clues[y][x], x, y });
                }
            }
        }

        const errors = [];
        if (foundClues.length === 0) {
            errors.push("no_clue");
        } else if (foundClues.length > 1) {
            errors.push("multiple_clues");
        } else if (foundClues[0].val !== area) {
            errors.push("wrong_area");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const deleteRectangle = (rectId) => {
        const updated = rectangles.filter(r => r.id !== rectId);
        setRectangles(updated);
    };
    const checkWinCondition = async (currentRects) => {
        // All user-drawn rectangles must be valid
        const allValid = currentRects.length > 0 && currentRects.every(r => r.isValid);
        if (!allValid) return;

        // Total area of drawn rectangles must equal total grid area
        const totalArea = currentRects.reduce((acc, r) => acc + r.area, 0);
        const gridArea = width * height;
        
        if (totalArea === gridArea) {
            try {
                const submitted = currentRects.map(r => ({
                    x: r.x1,
                    y: r.y1,
                    w: r.w,
                    h: r.h
                }));
                const res = await api.checkShikaku(puzzleId, submitted);
                if (res.correct) {
                    setGameWon(true);
                    setTimerActive(false);
                    api.clearGameProgress('shikaku');

                    const todayStr = new Date().toISOString().split('T')[0];
                    if (isDaily) {
                        api.setDailyCompleted(todayStr, 'shikaku');
                    }
                    
                    api.updateStats('shikaku', true, elapsedTime, null, res.solve_token);
                    if (level) {
                        await api.markLevelComplete('shikaku', level);
                    }
                    if (!level && onFinishGame) {
                        onFinishGame('shikaku', true, elapsedTime);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const isStartCell = (r, c) => {
        return startCell && startCell.r === r && startCell.c === c;
    };

    const getRectangleAt = (r, c) => {
        return rectangles.find(rect => c >= rect.x1 && c <= rect.x2 && r >= rect.y1 && r <= rect.y2);
    };

    const formatTime = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#9D00FF" />
                <Text style={styles.loadingText}>Generating Board...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.difficultyContainer}>
                    {['easy', 'medium', 'hard'].map(diff => (
                        <Pressable 
                            key={diff} 
                            onPress={() => { setDifficulty(diff); loadNewGame(diff); }}
                            style={[styles.diffBtn, difficulty === diff && styles.diffBtnActive]}
                        >
                            <Text style={[styles.diffBtnText, difficulty === diff && styles.diffBtnTextActive]}>
                                {diff}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                </View>
            </View>

            {isDaily && (
                <View style={styles.dailyBadge}>
                    <Text style={styles.dailyBadgeText}>📅 DAILY CHALLENGE ACTIVE</Text>
                </View>
            )}

            <Text style={styles.instructionText}>
                {startCell 
                    ? "Click ending cell to complete the rectangle" 
                    : "Click a starting cell, then click another to form a rectangle"}
            </Text>

            {/* Grid Board */}
            <View style={[styles.board, { maxWidth: width * 50 }]}>
                {clues.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => {
                            const rect = getRectangleAt(r, c);
                            const start = isStartCell(r, c);
                            
                            const isTopBound = rect && rect.y1 === r;
                            const isBottomBound = rect && rect.y2 === r;
                            const isLeftBound = rect && rect.x1 === c;
                            const isRightBound = rect && rect.x2 === c;

                            const cellStyle = [styles.cell];
                            if (start) cellStyle.push(styles.cellStart);
                            
                            if (rect) {
                                if (rect.isValid) {
                                    cellStyle.push(styles.cellInValidRect);
                                    if (isTopBound) cellStyle.push(styles.borderTopValid);
                                    if (isBottomBound) cellStyle.push(styles.borderBottomValid);
                                    if (isLeftBound) cellStyle.push(styles.borderLeftValid);
                                    if (isRightBound) cellStyle.push(styles.borderRightValid);
                                } else {
                                    cellStyle.push(styles.cellInErrorRect);
                                    if (isTopBound) cellStyle.push(styles.borderTopError);
                                    if (isBottomBound) cellStyle.push(styles.borderBottomError);
                                    if (isLeftBound) cellStyle.push(styles.borderLeftError);
                                    if (isRightBound) cellStyle.push(styles.borderRightError);
                                }
                            }

                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => handleCellPress(r, c)}
                                    style={cellStyle}
                                >
                                    {val > 0 ? (
                                        <Text style={[styles.clueText, rect && styles.clueTextInRect]}>
                                            {val}
                                        </Text>
                                    ) : rect && rect.x1 === c && rect.y1 === r ? (
                                        <Pressable 
                                            onPress={(e) => { e.stopPropagation(); deleteRectangle(rect.id); }}
                                            style={styles.deleteIndicator}
                                        >
                                            <Text style={styles.deleteIndicatorText}>×</Text>
                                        </Pressable>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            <View style={styles.actionsContainer}>
                <NeonButton 
                    title="Clear All" 
                    variant="danger" 
                    onPress={() => setRectangles([])}
                    style={styles.clearBtn}
                />
                <NeonButton 
                    title="Reset Board" 
                    variant="muted" 
                    onPress={() => loadNewGame(difficulty)}
                    style={styles.clearBtn}
                />
            </View>

            {gameWon && level && (
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 15 }}>
                    <NeonButton 
                        title="Submit & Next Level →" 
                        variant="success" 
                        onPress={onNextLevel}
                        style={{ width: '100%', maxWidth: 350 }}
                    />
                </View>
            )}

            {/* Instruction manual below */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>About Shikaku</Text>
                <Text style={styles.infoText}>
                    Shikaku (Japanese: "rectangle") is a popular Nikoli grid-partitioning logic puzzle. The objective is to divide the grid into rectangular and square cells so that each piece contains exactly one number.
                </Text>
                <Text style={styles.infoSubTitle}>How to Play:</Text>
                <Text style={styles.infoText}>
                    • 1. Tap any cell to start drawing a rectangle or square.{"\n"}
                    • 2. Tap another cell to set the opposite corner. The rectangle will automatically be drawn.{"\n"}
                    • 3. The area of each rectangle (number of cells inside) must equal the value of the clue it contains.{"\n"}
                    • 4. No rectangle can contain more than one numbered clue.{"\n"}
                    • 5. Draw rectangles covering the entire grid without overlapping to solve the board.{"\n"}
                    • 6. Tap the small "×" indicator in the top-left of any rectangle to remove it.
                </Text>
            </View>

            {/* Victory Overlay */}
            {gameWon && !level && (
                <View style={styles.victoryOverlay}>
                    <View style={styles.victoryCard}>
                        <Text style={styles.victoryTitle}>Solved!</Text>
                        <Text style={styles.victoryStats}>
                            Time taken: {formatTime(elapsedTime)}
                        </Text>
                        <Text style={styles.victoryText}>
                            Fantastic! You partitioned the Shikaku grid perfectly!
                        </Text>
                        <NeonButton 
                            title="Play Again" 
                            variant="success" 
                            onPress={() => loadNewGame(difficulty)}
                            style={styles.victoryBtn}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        width: '100%'
    },
    centerContainer: {
        height: 350,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: '#68686E',
        marginTop: 15,
        fontSize: 16,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    header: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 400,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5
    },
    difficultyContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        padding: 3
    },
    diffBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6
    },
    diffBtnActive: {
        backgroundColor: '#9D00FF', // Purple theme accent
    },
    diffBtnText: {
        color: '#68686E',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    diffBtnTextActive: {
        color: '#FFFFFF'
    },
    timerContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 16
    },
    timerText: {
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
        fontWeight: '700',
        fontSize: 15
    },
    dailyBadge: {
        backgroundColor: 'rgba(157, 0, 255, 0.08)',
        borderColor: '#9D00FF',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 16,
        marginBottom: 15,
        alignSelf: 'center'
    },
    dailyBadgeText: {
        color: '#9D00FF',
        fontSize: 12,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    instructionText: {
        color: '#68686E',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 350,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    board: {
        width: '90%',
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#1C1C1E',
        overflow: 'hidden',
        marginBottom: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    },
    row: {
        flex: 1,
        flexDirection: 'row'
    },
    cell: {
        flex: 1,
        aspectRatio: 1,
        borderWidth: 0.5,
        borderColor: '#E5E5EA',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        position: 'relative'
    },
    cellStart: {
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
        borderColor: '#007AFF',
        borderWidth: 1
    },
    cellInValidRect: {
        backgroundColor: 'rgba(52, 199, 89, 0.06)'
    },
    cellInErrorRect: {
        backgroundColor: 'rgba(255, 59, 48, 0.06)'
    },
    borderTopValid: { borderTopWidth: 2, borderTopColor: '#34C759' },
    borderBottomValid: { borderBottomWidth: 2, borderBottomColor: '#34C759' },
    borderLeftValid: { borderLeftWidth: 2, borderLeftColor: '#34C759' },
    borderRightValid: { borderRightWidth: 2, borderRightColor: '#34C759' },
    borderTopError: { borderTopWidth: 2, borderTopColor: '#FF3B30' },
    borderBottomError: { borderBottomWidth: 2, borderBottomColor: '#FF3B30' },
    borderLeftError: { borderLeftWidth: 2, borderLeftColor: '#FF3B30' },
    borderRightError: { borderRightWidth: 2, borderRightColor: '#FF3B30' },
    clueText: {
        color: '#1C1C1E',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    clueTextInRect: {
        color: '#007AFF'
    },
    deleteIndicator: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    deleteIndicatorText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: 'bold',
        lineHeight: 12
    },
    actionsContainer: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 400,
        justifyContent: 'center',
        paddingHorizontal: 10
    },
    clearBtn: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 10
    },
    infoSection: {
        marginTop: 30,
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoSubTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C1C1E',
        marginTop: 12,
        marginBottom: 6,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoText: {
        fontSize: 12,
        color: '#68686E',
        lineHeight: 18,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8
    },
    victoryCard: {
        width: '85%',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#34C759',
        boxShadow: '0 8px 32px rgba(52, 199, 89, 0.15)'
    },
    victoryTitle: {
        color: '#34C759',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryStats: {
        color: '#1C1C1E',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryText: {
        color: '#68686E',
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryBtn: {
        width: '100%',
        paddingVertical: 14
    }
});

export default Shikaku;
