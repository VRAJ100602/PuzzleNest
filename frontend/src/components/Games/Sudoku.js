import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { api } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Sudoku = ({ isDaily = false, onFinishGame , level = null, gameMode = 'classic' }) => {
    const [loading, setLoading] = useState(true);
    const [puzzle, setPuzzle] = useState([]);
    const [solution, setSolution] = useState([]);
    const [puzzleId, setPuzzleId] = useState(null);
    const [initialClues, setInitialClues] = useState([]); // Boolean array tracking clue cells
    const [selectedCell, setSelectedCell] = useState(null); // { r, c }
    const [notes, setNotes] = useState({}); // key: 'r,c', value: Set of numbers
    const [notesMode, setNotesMode] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [gameWon, setGameWon] = useState(false);
    const [gameLost, setGameLost] = useState(false);
    const [coins, setCoins] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [errors, setErrors] = useState({}); // key: 'r,c', value: boolean

    const difficulties = ['easy', 'medium', 'hard', 'expert', 'master', 'extreme'];

    const handleNumberInputRef = useRef(null);
    const handleEraseRef = useRef(null);
    const selectedCellRef = useRef(null);
    const loadingRef = useRef(null);
    const gameWonRef = useRef(null);
    const gameLostRef = useRef(null);

    useEffect(() => {
        handleNumberInputRef.current = handleNumberInput;
        handleEraseRef.current = handleErase;
        selectedCellRef.current = selectedCell;
        loadingRef.current = loading;
        gameWonRef.current = gameWon;
        gameLostRef.current = gameLost;
    });

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleKeyDown = (e) => {
            if (loadingRef.current || gameWonRef.current || gameLostRef.current) return;

            // Toggle notes mode with 'N'
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setNotesMode(prev => !prev);
                return;
            }

            if (!selectedCellRef.current) return;

            // Numbers 1-9
            if (e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                handleNumberInputRef.current(parseInt(e.key, 10));
            }
            // Backspace or Delete to erase
            else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleEraseRef.current();
            }
            // Arrow keys to navigate around the board
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCell(prev => {
                    if (!prev) return { r: 0, c: 0 };
                    return { r: Math.max(0, prev.r - 1), c: prev.c };
                });
            }
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCell(prev => {
                    if (!prev) return { r: 0, c: 0 };
                    return { r: Math.min(8, prev.r + 1), c: prev.c };
                });
            }
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSelectedCell(prev => {
                    if (!prev) return { r: 0, c: 0 };
                    return { r: prev.r, c: Math.max(0, prev.c - 1) };
                });
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSelectedCell(prev => {
                    if (!prev) return { r: 0, c: 0 };
                    return { r: prev.r, c: Math.min(8, prev.c + 1) };
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        loadNewGame(difficulty);
        const fetchUserCoins = async () => {
            try {
                const me = await api.getMe();
                if (me) setCoins(me.coins || 0);
            } catch (e) {
                console.warn(e);
            }
        };
        fetchUserCoins();
    }, []);

    // Timer logic
    useEffect(() => {
        if (loading || gameWon || gameLost) return;
        
        if (gameMode === 'blitz') {
            setElapsedTime(60); // 60s countdown
            const timer = setInterval(() => {
                setElapsedTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameLost(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        } else if (gameMode === 'classic') {
            setStartTime(Date.now());
            const timer = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading, gameWon, gameLost, gameMode]);

    const loadNewGame = async (diff, forceNew = false) => {
        setLoading(true);
        setGameWon(false);
        setGameLost(false);
        setSelectedCell(null);
        setNotes({});
        setErrors({});
        setElapsedTime(gameMode === 'blitz' ? 60 : 0);

        // ── Try to resume saved progress ──
        if (!forceNew && !isDaily && !level) {
            try {
                const saved = await api.loadGameProgress('sudoku');
                if (saved && !saved.isCompleted && saved.puzzle) {
                    setPuzzle(saved.puzzle);
                    setSolution(saved.solution || []);
                    setPuzzleId(saved.puzzleId);
                    setInitialClues(saved.initialClues || saved.puzzle.map(row => row.map(val => val !== 0)));
                    setElapsedTime(saved.elapsedTime || 0);
                    setDifficulty(saved.difficulty || 'medium');
                    setLoading(false);
                    return;
                }
            } catch (e) { console.warn('Resume failed, loading new game', e); }
        }

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let data;
            if (isDaily) data = await api.getDailySudoku(todayStr, diff);
            else if (level) data = await api.getSudokuLevel(level);
            else data = await api.getSudoku(diff);

            setPuzzle(data.puzzle);
            setSolution(data.solution || []);
            setPuzzleId(data.puzzle_id);

            // Map clue cells
            const clues = data.puzzle.map(row => row.map(val => val !== 0));
            setInitialClues(clues);
            setLoading(false);
            // Clear any stale saved progress
            await api.clearGameProgress('sudoku');
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    // ── Auto-save progress on every meaningful change ──
    useEffect(() => {
        if (loading || gameWon || gameLost || !puzzleId) return;
        if (isDaily || level) return; // don't save daily/level games
        const saveTimer = setTimeout(() => {
            api.saveGameProgress('sudoku', {
                puzzle, solution, puzzleId, initialClues, difficulty,
                elapsedTime, isCompleted: false,
            });
        }, 500); // debounce 500ms
        return () => clearTimeout(saveTimer);
    }, [puzzle, elapsedTime]);

    const handleCellSelect = (r, c) => {
        if (gameWon) return;
        setSelectedCell({ r, c });
    };

    const hasSudokuConflict = (board, row, col, val) => {
        if (val === 0) return false;
        for (let x = 0; x < 9; x++) {
            if (x !== col && board[row][x] === val) return true;
            if (x !== row && board[x][col] === val) return true;
        }
        const startRow = row - row % 3;
        const startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const currRow = i + startRow;
                const currCol = j + startCol;
                if ((currRow !== row || currCol !== col) && board[currRow][currCol] === val) {
                    return true;
                }
            }
        }
        return false;
    };

    const handleNumberInput = (num) => {
        if (!selectedCell || gameWon || gameLost) return;
        const { r, c } = selectedCell;
        
        // Cannot modify initial clue cells
        if (initialClues[r][c]) return;

        if (notesMode) {
            // Toggle note
            const key = `${r},${c}`;
            const cellNotes = new Set(notes[key] || []);
            if (cellNotes.has(num)) {
                cellNotes.delete(num);
            } else {
                cellNotes.add(num);
            }
            setNotes(prev => ({ ...prev, [key]: cellNotes }));
            // Clear standard cell value if we are adding notes
            const newPuzzle = [...puzzle.map(row => [...row])];
            newPuzzle[r][c] = 0;
            setPuzzle(newPuzzle);
            
            // Clear error
            const newErrors = { ...errors };
            delete newErrors[key];
            setErrors(newErrors);
        } else {
            // Write number
            const newPuzzle = [...puzzle.map(row => [...row])];
            newPuzzle[r][c] = num;
            setPuzzle(newPuzzle);

            const key = `${r},${c}`;
            
            // Clear notes for this cell
            const newNotes = { ...notes };
            delete newNotes[key];
            setNotes(newNotes);

            // Verify correctness based on solution
            const correctVal = solution[r]?.[c];
            const isCorrect = correctVal === num;
            setErrors(prev => ({ ...prev, [key]: !isCorrect }));

            if (gameMode === 'blitz') {
                if (isCorrect) {
                    setElapsedTime(prev => prev + 3); // correct cell adds +3s
                } else {
                    setElapsedTime(prev => Math.max(0, prev - 10)); // mistake costs -10s
                }
            }

            // Check if board complete and correct
            checkWinCondition(newPuzzle);
        }
    };

    const handleHint = async () => {
        if (gameWon || gameLost) return;
        if (coins < 15) {
            alert("Need 15 coins to buy a hint! Play more games to earn coins.");
            return;
        }
        
        const confirmHint = window.confirm("Spend 15 coins to reveal one correct cell?");
        if (!confirmHint) return;

        try {
            const res = await api.deductCoins(15);
            if (res) {
                setCoins(res.coins);
                
                // Find all empty/incorrect cells
                const targetCells = [];
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (puzzle[r][c] === 0 || errors[`${r},${c}`]) {
                            targetCells.push({ r, c });
                        }
                    }
                }
                
                if (targetCells.length === 0) return;
                
                // Pick a random target cell and fill it with correct solution value
                const randomCell = targetCells[Math.floor(Math.random() * targetCells.length)];
                const { r, c } = randomCell;
                const correctVal = solution[r]?.[c];
                
                if (correctVal) {
                    const newPuzzle = [...puzzle.map(row => [...row])];
                    newPuzzle[r][c] = correctVal;
                    setPuzzle(newPuzzle);
                    
                    const key = `${r},${c}`;
                    const newErrors = { ...errors };
                    delete newErrors[key];
                    setErrors(newErrors);
                    
                    const newNotes = { ...notes };
                    delete newNotes[key];
                    setNotes(newNotes);
                    
                    checkWinCondition(newPuzzle);
                }
            }
        } catch (e) {
            alert(e.message || "Failed to buy hint");
        }
    };

    const handleErase = () => {
        if (!selectedCell || gameWon || gameLost) return;
        const { r, c } = selectedCell;
        if (initialClues[r][c]) return;

        const key = `${r},${c}`;
        const newPuzzle = [...puzzle.map(row => [...row])];
        newPuzzle[r][c] = 0;
        setPuzzle(newPuzzle);

        // Clear notes & errors
        const newNotes = { ...notes };
        delete newNotes[key];
        setNotes(newNotes);

        const newErrors = { ...errors };
        delete newErrors[key];
        setErrors(newErrors);
    };
    const checkWinCondition = async (currentPuzzle) => {
        // Local check: must be fully populated with no conflicts
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (currentPuzzle[r][c] === 0) return;
                if (hasSudokuConflict(currentPuzzle, r, c, currentPuzzle[r][c])) return;
            }
        }
        
        try {
            const res = await api.checkSudoku(puzzleId, currentPuzzle);
            if (res.correct) {
                setGameWon(true);
                // Clear saved progress on win
                api.clearGameProgress('sudoku');

                const todayStr = new Date().toISOString().split('T')[0];
                if (isDaily) {
                    api.setDailyCompleted(todayStr, 'sudoku');
                }

                api.updateStats('sudoku', true, elapsedTime, null, res.solve_token);
                if (onFinishGame) onFinishGame('sudoku', true, elapsedTime);
            }
        } catch (e) {
            console.error(e);
        }
    };
    const formatTime = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCellStyles = (r, c) => {
        const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
        const isClue = initialClues[r]?.[c];
        const hasError = errors[`${r},${c}`];
        const cellValue = puzzle[r]?.[c];
        
        // Highlight active group (row, column, or 3x3 box)
        let isRelated = false;
        if (selectedCell) {
            const sameRow = selectedCell.r === r;
            const sameCol = selectedCell.c === c;
            const sameBox = Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && 
                            Math.floor(selectedCell.c / 3) === Math.floor(c / 3);
            isRelated = sameRow || sameCol || sameBox;
        }

        // Highlight cells with identical values
        const isSameValue = selectedCell && cellValue !== 0 && puzzle[selectedCell.r]?.[selectedCell.c] === cellValue;

        const cellStyles = [styles.cell];
        
        // Thick borders for 3x3 grids
        if (r % 3 === 2 && r < 8) cellStyles.push(styles.borderBottomThick);
        if (c % 3 === 2 && c < 8) cellStyles.push(styles.borderRightThick);
        if (r % 3 === 0 && r > 0) cellStyles.push(styles.borderTopThick);
        if (c % 3 === 0 && c > 0) cellStyles.push(styles.borderLeftThick);

        if (isClue) {
            cellStyles.push(styles.cellClue);
        } else {
            cellStyles.push(styles.cellInput);
        }

        if (isRelated) cellStyles.push(styles.cellRelated);
        if (isSameValue) cellStyles.push(styles.cellSameValue);
        if (isSelected) cellStyles.push(styles.cellSelected);
        if (hasError) cellStyles.push(styles.cellError);

        return cellStyles;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Generating Board...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header: difficulty, timer */}
            <View style={styles.header}>
                <View style={styles.difficultyContainer}>
                    {difficulties.map(diff => (
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
                {gameMode !== 'zen' && (
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                    </View>
                )}
            </View>

            {isDaily && (
                <View style={styles.dailyBadge}>
                    <Text style={styles.dailyBadgeText}>📅 DAILY CHALLENGE ACTIVE</Text>
                </View>
            )}

            {/* Board grid - Max 520px */}
            <View style={styles.board}>
                {puzzle.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => {
                            const isClue = initialClues[r][c];
                            const cellNotes = notes[`${r},${c}`];
                            const hasError = errors[`${r},${c}`];
                            
                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => handleCellSelect(r, c)}
                                    style={getCellStyles(r, c)}
                                >
                                    {val !== 0 ? (
                                        <Text style={[
                                            styles.cellText, 
                                            isClue ? styles.textClue : styles.textInput,
                                            hasError && styles.textError
                                        ]}>
                                            {val}
                                        </Text>
                                    ) : cellNotes && cellNotes.size > 0 ? (
                                        <View style={styles.notesGrid}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                                <Text key={n} style={styles.noteText}>
                                                    {cellNotes.has(n) ? n : ' '}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Controls: Erase, Notes mode toggles */}
            <View style={styles.controlsRow}>
                <NeonButton 
                    title="💡 Hint (15c)" 
                    variant="warning" 
                    onPress={handleHint}
                    style={styles.controlBtn}
                />
                <NeonButton 
                    title="Erase" 
                    variant="danger" 
                    onPress={handleErase}
                    style={styles.controlBtn}
                />
                <NeonButton 
                    title={notesMode ? "Notes: ON" : "Notes: OFF"} 
                    variant={notesMode ? "success" : "muted"} 
                    onPress={() => setNotesMode(!notesMode)}
                    style={styles.controlBtn}
                />
                <NeonButton 
                    title="Reset" 
                    variant="muted" 
                    onPress={() => loadNewGame(difficulty)}
                    style={styles.controlBtn}
                />
            </View>

            {/* Number keypad */}
            <View style={styles.keypad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Pressable
                        key={num}
                        onPress={() => handleNumberInput(num)}
                        style={({ pressed }) => [
                            styles.keypadBtn,
                            pressed && styles.keypadBtnPressed
                        ]}
                    >
                        <Text style={styles.keypadText}>{num}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Instruction manual / description below */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>About Sudoku</Text>
                <Text style={styles.infoText}>
                    Sudoku is a logic-based, combinatoric number-placement puzzle. In classic Sudoku, the objective is to fill a 9×9 grid with digits so that each column, each row, and each of the nine 3×3 subgrids that compose the grid contain all of the digits from 1 to 9.
                </Text>
                
                <Text style={styles.infoSubTitle}>How to Play:</Text>
                <Text style={styles.infoText}>
                    • 1. Tap any cell to select it.{"\n"}
                    • 2. Tap a number from the keypad (1-9) to input that number in the selected cell.{"\n"}
                    • 3. Tap "Notes: OFF" to toggle pencil marks mode. While ON, tapping numbers will add or remove candidate notes in the cell.{"\n"}
                    • 4. Use "Erase" to clear values or notes you have placed in the grid.{"\n"}
                    • 5. Ensure every row, column, and 3x3 block contains the digits 1 through 9 with no repetitions to win!
                </Text>
            </View>

            {/* Victory Modal */}
            {gameWon && (
                <View style={styles.victoryOverlay}>
                    <View style={styles.victoryCard}>
                        <Text style={styles.victoryTitle}>Victory!</Text>
                        <Text style={styles.victoryStats}>
                            Time taken: {formatTime(elapsedTime)}
                        </Text>
                        <Text style={styles.victoryText}>
                            You completed the {difficulty} Sudoku puzzle!
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

            {/* Defeat Modal */}
            {gameLost && (
                <View style={styles.victoryOverlay}>
                    <View style={styles.victoryCard}>
                        <Text style={[styles.victoryTitle, { color: '#FF3B30' }]}>Game Over!</Text>
                        <Text style={styles.victoryText}>
                            You ran out of time!
                        </Text>
                        <NeonButton 
                            title="Try Again" 
                            variant="danger" 
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
        maxWidth: 520, // Grid size expanded to 520px
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5
    },
    difficultyContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        padding: 3,
        flexWrap: 'wrap',
        flex: 1,
        marginRight: 10
    },
    diffBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
        margin: 1
    },
    diffBtnActive: {
        backgroundColor: '#007AFF', // Premium active state
    },
    diffBtnText: {
        color: '#68686E',
        fontSize: 10,
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
        paddingHorizontal: 12
    },
    timerText: {
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
        fontWeight: '700',
        fontSize: 14
    },
    dailyBadge: {
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        borderColor: '#007AFF',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 16,
        marginBottom: 15,
        alignSelf: 'center'
    },
    dailyBadgeText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    board: {
        width: '100%',
        maxWidth: 520, // Grid size expanded to 520px
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
        backgroundColor: 'transparent'
    },
    borderBottomThick: {
        borderBottomWidth: 2.5,
        borderBottomColor: '#1C1C1E'
    },
    borderRightThick: {
        borderRightWidth: 2.5,
        borderRightColor: '#1C1C1E'
    },
    borderTopThick: {
        borderTopWidth: 2.5,
        borderTopColor: '#1C1C1E'
    },
    borderLeftThick: {
        borderLeftWidth: 2.5,
        borderLeftColor: '#1C1C1E'
    },
    cellClue: {
        backgroundColor: '#F2F2F7' // Light grey background for fixed clues
    },
    cellInput: {
        backgroundColor: '#FFFFFF'
    },
    cellRelated: {
        backgroundColor: '#F4F8FD' // Soft blue tint for related fields
    },
    cellSameValue: {
        backgroundColor: '#E6F9FA' // Light teal tint for matching numbers
    },
    cellSelected: {
        backgroundColor: '#E5F1FF',
        borderColor: '#007AFF',
        borderWidth: 1.5
    },
    cellError: {
        backgroundColor: '#FFECEF',
        borderColor: '#FF3B30',
        borderWidth: 1.5
    },
    cellText: {
        fontSize: 22,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    textClue: {
        color: '#1C1C1E'
    },
    textInput: {
        color: '#007AFF'
    },
    textError: {
        color: '#FF3B30'
    },
    notesGrid: {
        width: '90%',
        height: '90%',
        flexWrap: 'wrap',
        flexDirection: 'row'
    },
    noteText: {
        width: '33.3%',
        height: '33.3%',
        fontSize: 9,
        textAlign: 'center',
        lineHeight: 11,
        color: '#8E8E93',
        fontWeight: '600'
    },
    controlsRow: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 520, // Grid size expanded to 520px
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 5
    },
    controlBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 8
    },
    keypad: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 520, // Grid size expanded to 520px
        justifyContent: 'space-between',
        paddingHorizontal: 5
    },
    keypadBtn: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.06)',
        marginHorizontal: 3,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'background-color 0.15s'
            }
        })
    },
    keypadBtnPressed: {
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
        borderColor: '#007AFF'
    },
    keypadText: {
        color: '#1C1C1E',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoSection: {
        marginTop: 30,
        width: '100%',
        maxWidth: 520,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoSubTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1C1C1E',
        marginTop: 12,
        marginBottom: 6,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoText: {
        fontSize: 13,
        color: '#68686E',
        lineHeight: 19,
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

export default Sudoku;
