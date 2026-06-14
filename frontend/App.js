import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, ScrollView, Text, Pressable, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { api } from './src/utils/api';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MultiplayerScreen from './src/screens/MultiplayerScreen';
import Sidebar from './src/components/Navigation/Sidebar';
import LevelSelector from './src/components/Common/LevelSelector';
import { AudioProvider } from './src/utils/AudioContext';
import StoreScreen from './src/screens/StoreScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import { SettingsProvider, SettingsContext } from './src/contexts/SettingsContext';
import LofiPlayer from './src/components/Audio/LofiPlayer';
import GlassCard from './src/components/Common/GlassCard';

function AppContent() {
    const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'settings' | 'store' | 'login' | 'register' | 'game' | 'multiplayer' | 'levels'
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [isDaily, setIsDaily] = useState(false);
    const [user, setUser] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [selectedGameMode, setSelectedGameMode] = useState('classic'); // 'classic' | 'zen' | 'blitz'
    const [pendingGameSelection, setPendingGameSelection] = useState(null); // { gameId, level, daily }
    const { isDarkMode, toggleDarkMode } = React.useContext(SettingsContext);

    // ── Daily Reward + Achievement state ────────────────────────────────────
    const [dailyRewardData, setDailyRewardData] = useState(null);   // null = hidden
    const [achievementToast, setAchievementToast] = useState(null); // { name, icon, coins }
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastSlide  = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        if (Platform.OS === 'web') {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);

            // Inject premium animated gradient background & micro-interaction CSS
            const styleEl = document.createElement('style');
            styleEl.id = 'puzzle-hub-premium-css';
            styleEl.textContent = `
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    25% { background-position: 50% 0%; }
                    50% { background-position: 100% 50%; }
                    75% { background-position: 50% 100%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes floatParticle {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
                }

                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                body {
                    background: #EEE9DF;
                    min-height: 100vh;
                    transition: background 0.5s ease;
                }

                /* Scrollbar styling */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.12);
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.22);
                }

                /* Force visible input text colors and handle browser autofill */
                input {
                    color: #1C1C1E !important;
                }
                
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-text-fill-color: #1C1C1E !important;
                    -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
                    box-shadow: 0 0 0px 1000px #ffffff inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                }

                /* Focus glow effects for text inputs */
                input:focus {
                    border-color: #9D00FF !important;
                    box-shadow: 0 0 0 3px rgba(157, 0, 255, 0.15) !important;
                    outline: none !important;
                }
            `;
            document.head.appendChild(styleEl);
        }

        const checkUserSession = async () => {
            try {
                const currentUser = await api.getMe();
                if (currentUser) {
                    setUser(currentUser);
                }
            } catch (e) {
                console.error("Session restore error", e);
            } finally {
                setInitialized(true);
            }
        };
        checkUserSession();
    }, []);

    useEffect(() => {
        if (Platform.OS === 'web') {
            document.body.classList.remove('dark-mode');
        }
    }, []);

    // ── Auto-claim daily reward & check achievements when user logs in ────
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const reward = await api.claimDailyReward();
                if (reward && !reward.already_claimed) {
                    setDailyRewardData(reward);
                }
                // Check achievements (runs after every login / page load)
                const achResult = await api.checkAchievements();
                if (achResult && achResult.newly_unlocked && achResult.newly_unlocked.length > 0) {
                    // Show first newly-unlocked achievement as a toast
                    showAchievementToast(achResult.newly_unlocked[0]);
                }
            } catch (e) {
                console.warn('Daily reward / achievement check failed', e);
            }
        })();
    }, [user]);

    const showAchievementToast = (ach) => {
        setAchievementToast(ach);
        toastOpacity.setValue(0);
        toastSlide.setValue(-60);
        Animated.parallel([
            Animated.timing(toastOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(toastSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        ]).start(() => {
            // Auto-dismiss after 4 seconds
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.timing(toastSlide, { toValue: -60, duration: 400, useNativeDriver: true }),
                ]).start(() => setAchievementToast(null));
            }, 4000);
        });
    };

    const handleSelectGame = (gameId, daily = false) => {
        if (daily) {
            setSelectedGameId(gameId);
            setSelectedLevel(null);
            setIsDaily(true);
            setSelectedGameMode('classic');
            setCurrentScreen('game');
        } else {
            setPendingGameSelection({ gameId, level: null, daily: false });
        }
    };

    const handleSelectLevels = (gameId) => {
        setSelectedGameId(gameId);
        setCurrentScreen('levels');
    };

    const handleSelectSpecificLevel = (level) => {
        setPendingGameSelection({ gameId: selectedGameId, level, daily: false });
    };

    const handleConfirmMode = (mode) => {
        if (!pendingGameSelection) return;
        setSelectedGameId(pendingGameSelection.gameId);
        setSelectedLevel(pendingGameSelection.level);
        setIsDaily(pendingGameSelection.daily);
        setSelectedGameMode(mode);
        setCurrentScreen('game');
        setPendingGameSelection(null);
    };

    const handleNextLevel = () => {
        setSelectedLevel(prev => (prev ? prev + 1 : null));
    };

    const handleGoBack = () => {
        setCurrentScreen('home');
        setSelectedGameId(null);
        setSelectedLevel(null);
        setIsDaily(false);
    };

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setCurrentScreen('home');
    };

    const handleRegisterSuccess = (userData) => {
        setUser(userData);
        setCurrentScreen('home');
    };

    const handleLogout = async () => {
        await api.logout();
        setUser(null);
        setCurrentScreen('home');
    };

    const handleNavigate = (screen) => {
        setCurrentScreen(screen);
    };

    if (!initialized) {
        return <View style={styles.container} />; // blank loading state
    }

    const renderScreen = () => {
        switch (currentScreen) {
            case 'home':
                return (
                    <HomeScreen
                        onSelectGame={handleSelectGame}
                        onSelectLevels={handleSelectLevels}
                        user={user}
                        onNavigate={handleNavigate}
                        isDarkMode={isDarkMode}
                        toggleDarkMode={toggleDarkMode}
                    />
                );
            case 'levels':
                return (
                    <LevelSelector
                        gameId={selectedGameId}
                        onSelectLevel={handleSelectSpecificLevel}
                        onBack={handleGoBack}
                    />
                );
            case 'settings':
                return (
                    <SettingsScreen 
                        user={user}
                        onLogout={handleLogout}
                        onGoBack={handleGoBack}
                    />
                );
            case 'store':
                return (
                    <StoreScreen 
                        onGoBack={handleGoBack}
                    />
                );
            case 'leaderboards':
                return (
                    <LeaderboardScreen 
                        onGoBack={handleGoBack}
                    />
                );
            case 'game':
                return (
                    <GameScreen
                        gameId={selectedGameId}
                        isDaily={isDaily}
                        level={selectedLevel}
                        gameMode={selectedGameMode}
                        onGoBack={handleGoBack}
                        onNextLevel={handleNextLevel}
                    />
                );
            case 'multiplayer':
                return <MultiplayerScreen />;
            case 'login':
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigate={handleNavigate}
                    />
                );
            case 'register':
                return (
                    <RegisterScreen
                        onRegisterSuccess={handleRegisterSuccess}
                        onNavigate={handleNavigate}
                    />
                );
            default:
                return <View />;
        }
    };

    return (
        <AudioProvider>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar style="dark" />
                <View style={styles.mainLayout}>
                    {/* Render Sidebar only if not actively in a game */}
                    {currentScreen !== 'game' && (
                        <Sidebar 
                            currentScreen={currentScreen} 
                            onNavigate={handleNavigate} 
                            user={user}
                            onLogout={handleLogout}
                            isDarkMode={isDarkMode}
                        />
                    )}
                    <ScrollView contentContainerStyle={styles.container}>
                        <View style={styles.content}>
                            {renderScreen()}
                        </View>
                    </ScrollView>
                </View>

                {/* Floating Lofi Audio Player */}
                {currentScreen !== 'game' && <LofiPlayer />}

                {/* ── Daily Login Reward Modal ── */}
                {dailyRewardData && (
                    <View style={styles.modalOverlay}>
                        <GlassCard style={[styles.modalCard, { maxWidth: 420 }]}>
                            <Text style={{ fontSize: 48, marginBottom: 8 }}>🎁</Text>
                            <Text style={styles.modalTitle}>Daily Login Reward!</Text>
                            <Text style={[styles.modalSubtitle, { marginBottom: 16 }]}>
                                Day {dailyRewardData.day_number} of 7
                            </Text>

                            {/* 7-day reward track */}
                            <View style={styles.rewardTrack}>
                                {[10, 15, 20, 25, 30, 40, 50].map((coins, i) => {
                                    const dayNum = i + 1;
                                    const isCurrent = dayNum === dailyRewardData.day_number;
                                    const isPast = dayNum < dailyRewardData.day_number;
                                    return (
                                        <View key={i} style={[
                                            styles.rewardDay,
                                            isCurrent && styles.rewardDayCurrent,
                                            isPast && styles.rewardDayPast,
                                        ]}>
                                            <Text style={[styles.rewardDayLabel, isCurrent && { color: '#FFF' }]}>
                                                D{dayNum}
                                            </Text>
                                            <Text style={[styles.rewardDayCoins, isCurrent && { color: '#FFF' }]}>
                                                {isPast ? '✓' : `🪙${coins}`}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.rewardSummary}>
                                <Text style={styles.rewardBigCoin}>🪙 +{dailyRewardData.coins_earned}</Text>
                                <Text style={{ fontSize: 14, color: '#68686E', marginTop: 4, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' }}>
                                    Streak: {dailyRewardData.login_streak} day{dailyRewardData.login_streak !== 1 ? 's' : ''}
                                </Text>
                            </View>

                            <Pressable
                                style={styles.rewardClaimBtn}
                                onPress={() => setDailyRewardData(null)}
                            >
                                <Text style={styles.rewardClaimText}>Collect!</Text>
                            </Pressable>
                        </GlassCard>
                    </View>
                )}

                {/* ── Achievement Unlocked Toast ── */}
                {achievementToast && (
                    <Animated.View style={[
                        styles.achievementToast,
                        { opacity: toastOpacity, transform: [{ translateY: toastSlide }] },
                    ]}>
                        <Text style={{ fontSize: 28, marginRight: 12 }}>{achievementToast.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toastTitle}>Achievement Unlocked!</Text>
                            <Text style={styles.toastName}>{achievementToast.name}</Text>
                        </View>
                        <Text style={styles.toastCoins}>+{achievementToast.coins} 🪙</Text>
                    </Animated.View>
                )}

                {/* Mode Selection Overlay Modal */}
                {pendingGameSelection && (
                    <View style={styles.modalOverlay}>
                        <GlassCard style={styles.modalCard}>
                            <Text style={styles.modalTitle}>🎮 Select Game Mode</Text>
                            <Text style={styles.modalSubtitle}>Choose your play style</Text>
                            
                            <Pressable style={styles.modeOption} onPress={() => handleConfirmMode('classic')}>
                                <Text style={styles.modeEmoji}>⏱️</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeName}>Classic Mode</Text>
                                    <Text style={styles.modeDesc}>Race the clock & submit speedrun records</Text>
                                </View>
                            </Pressable>

                            <Pressable style={styles.modeOption} onPress={() => handleConfirmMode('zen')}>
                                <Text style={styles.modeEmoji}>🧘</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeName}>Zen Mode</Text>
                                    <Text style={styles.modeDesc}>No timers, no pressure. Pure relaxing logic.</Text>
                                </View>
                            </Pressable>

                            <Pressable style={styles.modeOption} onPress={() => handleConfirmMode('blitz')}>
                                <Text style={styles.modeEmoji}>⚡</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modeName}>Blitz Mode (Survival)</Text>
                                    <Text style={styles.modeDesc}>60s limit. Corrects add +3s. Mistakes lose -10s!</Text>
                                </View>
                            </Pressable>

                            <Pressable style={styles.cancelBtn} onPress={() => setPendingGameSelection(null)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                        </GlassCard>
                    </View>
                )}
            </SafeAreaView>
        </AudioProvider>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    container: {
        flexGrow: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    modalCard: {
        width: '90%',
        maxWidth: 400,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#68686E',
        marginBottom: 24,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 12,
        cursor: 'pointer',
    },
    modeEmoji: {
        fontSize: 28,
        marginRight: 16,
    },
    modeName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 2,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    modeDesc: {
        fontSize: 12,
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cancelBtn: {
        marginTop: 12,
        padding: 10,
        width: '100%',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#FF3B30',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // ── Daily Reward styles ─────────────────────────────────────────────
    rewardTrack: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    rewardDay: {
        width: 48,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    rewardDayCurrent: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
        ...Platform.select({ web: { boxShadow: '0 4px 14px rgba(0,122,255,0.35)' } }),
    },
    rewardDayPast: {
        backgroundColor: 'rgba(52,199,89,0.12)',
        borderColor: 'rgba(52,199,89,0.3)',
    },
    rewardDayLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    rewardDayCoins: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1C1C1E',
        marginTop: 3,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    rewardSummary: {
        alignItems: 'center',
        marginBottom: 20,
    },
    rewardBigCoin: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    rewardClaimBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#34C759',
        alignItems: 'center',
        ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(52,199,89,0.35)', cursor: 'pointer' } }),
    },
    rewardClaimText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // ── Achievement Toast styles ────────────────────────────────────────
    achievementToast: {
        position: 'absolute',
        top: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        maxWidth: 420,
        zIndex: 20000,
        ...Platform.select({ web: { boxShadow: '0 8px 30px rgba(0,0,0,0.25)' } }),
    },
    toastTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    toastName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    toastCoins: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFD700',
        marginLeft: 12,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
});

export default function App() {
    return (
        <SettingsProvider>
            <AppContent />
        </SettingsProvider>
    );
}
