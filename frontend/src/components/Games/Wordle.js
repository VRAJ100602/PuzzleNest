import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { api, base64Decode } from '../../utils/api';
import NeonButton from '../Common/NeonButton';

const Wordle = ({ isDaily = false, onFinishGame , level = null }) => {
    const [loading, setLoading] = useState(true);
    const [puzzleId, setPuzzleId] = useState(null);
    const [decodedWord, setDecodedWord] = useState(''); // Only revealed at the end
    const [guesses, setGuesses] = useState(Array(6).fill('')); // Six guesses
    const [feedbacks, setFeedbacks] = useState(Array(6).fill(null)); // Feedbacks for each guess
    const [currentGuessIndex, setCurrentGuessIndex] = useState(0); // 0 to 5
    const [validWords, setValidWords] = useState([]);
    const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
    const [letterStatuses, setLetterStatuses] = useState({}); // key: letter, value: 'correct'|'present'|'absent'
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    useEffect(() => {
        loadNewGame();
    }, []);

    // Timer logic
    useEffect(() => {
        if (!timerActive || gameStatus !== 'playing') return;
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timerActive, gameStatus]);

    // Keyboard support on Web
    useEffect(() => {
        if (Platform.OS !== 'web' || gameStatus !== 'playing' || loading) return;

        const handleKeyDown = (e) => {
            const char = e.key;
            if (char === 'Enter') {
                handleSubmitGuess();
            } else if (char === 'Backspace') {
                handleDeleteLetter();
            } else if (/^[a-zA-Z]$/.test(char)) {
                handleTypeLetter(char.toUpperCase());
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [guesses, currentGuessIndex, gameStatus, loading, feedbacks]);

    const loadNewGame = async () => {
        setLoading(true);
        setCurrentGuessIndex(0);
        setGameStatus('playing');
        setLetterStatuses({});
        setElapsedTime(0);
        setTimerActive(false);
        setDecodedWord('');
        
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let data;
            let maxGuesses = 6;
            if (isDaily) data = await api.getDailyWordle(todayStr);
            else if (level) {
                data = await api.getWordleLevel(level);
                if (data.max_guesses) maxGuesses = data.max_guesses;
            }
            else data = await api.getWordle();
            
            setGuesses(Array(maxGuesses).fill(''));
            setFeedbacks(Array(maxGuesses).fill(null));
            setPuzzleId(data.puzzle_id);
            setValidWords(data.valid_words || []);
            
            setLoading(false);
            setTimerActive(true);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleTypeLetter = (letter) => {
        if (gameStatus !== 'playing') return;
        const currentGuess = guesses[currentGuessIndex];
        if (currentGuess.length >= 5) return;
        
        const newGuesses = [...guesses];
        newGuesses[currentGuessIndex] = currentGuess + letter;
        setGuesses(newGuesses);
    };

    const handleDeleteLetter = () => {
        if (gameStatus !== 'playing') return;
        const currentGuess = guesses[currentGuessIndex];
        if (currentGuess.length === 0) return;
        
        const newGuesses = [...guesses];
        newGuesses[currentGuessIndex] = currentGuess.slice(0, -1);
        setGuesses(newGuesses);
    };

    const handleSubmitGuess = async () => {
        if (gameStatus !== 'playing') return;
        const currentGuess = guesses[currentGuessIndex];
        
        if (currentGuess.length < 5) return;
        
        const guessLower = currentGuess.toLowerCase();
        
        // Validate word against word list
        if (validWords.length > 0 && !validWords.includes(guessLower)) {
            alert("Not in word list!");
            return;
        }

        try {
            setLoading(true);
            const res = await api.guessWordle(puzzleId, currentGuess);
            
            // Save feedback
            const newFeedbacks = [...feedbacks];
            newFeedbacks[currentGuessIndex] = res.feedback;
            setFeedbacks(newFeedbacks);

            // Update on-screen keyboard letter colors
            const newStatuses = { ...letterStatuses };
            for (let i = 0; i < 5; i++) {
                const letter = currentGuess[i];
                const f = res.feedback[i];
                if (f === 'correct') {
                    newStatuses[letter] = 'correct';
                } else if (f === 'present') {
                    if (newStatuses[letter] !== 'correct') {
                        newStatuses[letter] = 'present';
                    }
                } else {
                    if (!newStatuses[letter]) {
                        newStatuses[letter] = 'absent';
                    }
                }
            }
            setLetterStatuses(newStatuses);
            setLoading(false);

            // Check win/lose
            if (res.correct) {
                setGameStatus('won');
                setTimerActive(false);
                
                const todayStr = new Date().toISOString().split('T')[0];
                if (isDaily) {
                    api.setDailyCompleted(todayStr, 'wordle');
                }
                
                // Fetch the solution to show
                const solData = await api.getWordleSolution(puzzleId);
                setDecodedWord(solData.solution);
                
                api.updateStats('wordle', true, elapsedTime, null, res.solve_token);
                if (onFinishGame) onFinishGame('wordle', true, elapsedTime);
            } else if (currentGuessIndex >= guesses.length - 1) {
                setGameStatus('lost');
                setTimerActive(false);
                
                // Fetch the solution to show
                const solData = await api.getWordleSolution(puzzleId);
                setDecodedWord(solData.solution);
                
                api.updateStats('wordle', false);
                if (onFinishGame) onFinishGame('wordle', false);
            } else {
                setCurrentGuessIndex(prev => prev + 1);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const getCellColor = (rowIndex, colIndex) => {
        if (rowIndex >= currentGuessIndex) {
            return styles.cellEmpty; // Not yet submitted
        }
        
        const rowFeedback = feedbacks[rowIndex];
        if (!rowFeedback) return styles.cellEmpty;
        
        const status = rowFeedback[colIndex];
        if (status === 'correct') {
            return styles.cellCorrect;
        } else if (status === 'present') {
            return styles.cellPresent;
        } else {
            return styles.cellAbsent;
        }
    };

    const getKeyStyle = (key) => {
        const status = letterStatuses[key];
        const stylesList = [styles.key];
        
        if (status === 'correct') stylesList.push(styles.keyCorrect);
        else if (status === 'present') stylesList.push(styles.keyPresent);
        else if (status === 'absent') stylesList.push(styles.keyAbsent);
        
        return stylesList;
    };

    const getKeyTextStyle = (key) => {
        const status = letterStatuses[key];
        if (status) {
            return { color: '#FFFFFF' };
        }
        return { color: '#1C1C1E' };
    };

    const formatTime = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderKeypad = () => {
        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
        ];

        return (
            <View style={styles.keyboard}>
                {rows.map((row, i) => (
                    <View key={i} style={styles.keyboardRow}>
                        {row.map(char => {
                            const isActionKey = char === 'ENTER' || char === 'DEL';
                            return (
                                <Pressable
                                    key={char}
                                    onPress={() => {
                                        if (char === 'ENTER') handleSubmitGuess();
                                        else if (char === 'DEL') handleDeleteLetter();
                                        else handleTypeLetter(char);
                                    }}
                                    style={[
                                        getKeyStyle(char),
                                        isActionKey && styles.keyLarge
                                    ]}
                                >
                                    <Text style={[
                                        styles.keyText,
                                        getKeyTextStyle(char),
                                        isActionKey && styles.keyTextLarge
                                    ]}>
                                        {char}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#34C759" />
                <Text style={styles.loadingText}>Fetching Secret Word...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>

            {isDaily && (
                <View style={styles.dailyBadge}>
                    <Text style={styles.dailyBadgeText}>📅 DAILY CHALLENGE ACTIVE</Text>
                </View>
            )}

            {/* Word Grid */}
            <View style={styles.grid}>
                {guesses.map((guess, r) => (
                    <View key={r} style={styles.gridRow}>
                        {[0, 1, 2, 3, 4].map(c => {
                            const letter = guess[c] || '';
                            const isSubmitted = r < currentGuessIndex;
                            return (
                                <View key={c} style={[
                                    styles.cell,
                                    getCellColor(r, c),
                                    letter !== '' && !isSubmitted && styles.cellFilledActive
                                ]}>
                                    <Text style={[
                                        styles.cellText,
                                        isSubmitted ? styles.cellTextSubmitted : styles.cellTextActive
                                    ]}>{letter}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* On-screen virtual Keyboard */}
            {renderKeypad()}

            {/* Game Instructions Section */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>About Wordle</Text>
                <Text style={styles.infoText}>
                    Wordle is a simple word game where you guess a secret five-letter word in six attempts. 
                </Text>
                <Text style={styles.infoSubTitle}>Color Meanings:</Text>
                <View style={styles.colorRow}>
                    <View style={[styles.miniBadge, styles.cellCorrect]}><Text style={styles.miniBadgeText}>G</Text></View>
                    <Text style={styles.infoText}>Green letters are correct and in the right spot.</Text>
                </View>
                <View style={styles.colorRow}>
                    <View style={[styles.miniBadge, styles.cellPresent]}><Text style={styles.miniBadgeText}>Y</Text></View>
                    <Text style={styles.infoText}>Orange/Yellow letters are in the word but in a different spot.</Text>
                </View>
                <View style={styles.colorRow}>
                    <View style={[styles.miniBadge, styles.cellAbsent]}><Text style={styles.miniBadgeText}>X</Text></View>
                    <Text style={styles.infoText}>Gray letters are not in the secret word at all.</Text>
                </View>
            </View>

            {/* End Game Overlay */}
            {gameStatus !== 'playing' && (
                <View style={styles.overlay}>
                    <View style={[styles.victoryCard, gameStatus === 'lost' && styles.defeatCard]}>
                        <Text style={[styles.victoryTitle, gameStatus === 'lost' && styles.defeatTitle]}>
                            {gameStatus === 'won' ? 'CORRECT!' : 'GAME OVER'}
                        </Text>
                        <Text style={styles.answerText}>The word was: {decodedWord}</Text>
                        {gameStatus === 'won' && (
                            <Text style={styles.victoryStats}>
                                Time taken: {formatTime(elapsedTime)}
                            </Text>
                        )}
                        <NeonButton 
                            title="Play Again" 
                            variant={gameStatus === 'won' ? 'success' : 'danger'} 
                            onPress={loadNewGame}
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
        width: '100%',
        maxWidth: 330,
        alignItems: 'flex-end',
        marginBottom: 15,
        paddingHorizontal: 10
    },
    timerText: {
        color: '#1C1C1E',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
        fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
        fontWeight: '700',
        fontSize: 15
    },
    dailyBadge: {
        backgroundColor: 'rgba(52, 199, 89, 0.08)',
        borderColor: '#34C759',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 16,
        marginBottom: 15,
        alignSelf: 'center'
    },
    dailyBadgeText: {
        color: '#34C759',
        fontSize: 12,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    grid: {
        width: '100%',
        maxWidth: 330,
        marginBottom: 20
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 4
    },
    cell: {
        width: 54,
        height: 54,
        borderWidth: 2,
        borderColor: '#C7C7CC',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    },
    cellEmpty: {
        backgroundColor: '#FFFFFF'
    },
    cellFilledActive: {
        borderColor: '#007AFF',
        backgroundColor: 'rgba(0, 122, 255, 0.02)'
    },
    cellCorrect: {
        backgroundColor: '#34C759',
        borderColor: '#34C759'
    },
    cellPresent: {
        backgroundColor: '#FF9500',
        borderColor: '#FF9500'
    },
    cellAbsent: {
        backgroundColor: '#8E8E93',
        borderColor: '#8E8E93'
    },
    cellText: {
        fontSize: 26,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cellTextActive: {
        color: '#1C1C1E'
    },
    cellTextSubmitted: {
        color: '#FFFFFF'
    },
    keyboard: {
        width: '100%',
        maxWidth: 450,
        paddingHorizontal: 5
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 4
    },
    key: {
        flex: 1,
        height: 48,
        backgroundColor: '#E5E5EA',
        borderRadius: 6,
        marginHorizontal: 3,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'background-color 0.1s'
            }
        })
    },
    keyLarge: {
        flex: 1.5
    },
    keyCorrect: {
        backgroundColor: '#34C759'
    },
    keyPresent: {
        backgroundColor: '#FF9500'
    },
    keyAbsent: {
        backgroundColor: '#C7C7CC',
        opacity: 0.6
    },
    keyText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    keyTextLarge: {
        fontSize: 10
    },
    infoSection: {
        marginTop: 30,
        width: '100%',
        maxWidth: 330,
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
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    infoText: {
        fontSize: 12,
        color: '#68686E',
        lineHeight: 18,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        flex: 1
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        width: '100%'
    },
    miniBadge: {
        width: 24,
        height: 24,
        borderRadius: 4,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    miniBadgeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12
    },
    overlay: {
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
    defeatCard: {
        borderColor: '#FF3B30',
        boxShadow: '0 8px 32px rgba(255, 59, 48, 0.15)'
    },
    victoryTitle: {
        color: '#34C759',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    defeatTitle: {
        color: '#FF3B30'
    },
    answerText: {
        color: '#1C1C1E',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryStats: {
        color: '#68686E',
        fontSize: 14,
        marginBottom: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    victoryBtn: {
        width: '100%',
        paddingVertical: 14
    }
});

export default Wordle;
