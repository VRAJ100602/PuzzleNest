import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Animated, Easing } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import NeonButton from '../components/Common/NeonButton';
import { api } from '../utils/api';

// ───── Animated Counter ─────
const AnimatedNumber = ({ value, color = '#1C1C1E', size = 15 }) => {
    const animVal = useRef(new Animated.Value(0)).current;
    const [displayVal, setDisplayVal] = useState(value);

    useEffect(() => {
        animVal.setValue(0);
        Animated.timing(animVal, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
        setDisplayVal(value);
    }, [value]);

    return (
        <Animated.Text style={{
            color,
            fontSize: size,
            fontWeight: '700',
            fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
            opacity: animVal,
            transform: [{ translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}>
            {displayVal}
        </Animated.Text>
    );
};

// ───── Pulsing Online Dot ─────
const PulsingDot = ({ color = '#34C759' }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={{ position: 'relative', width: 12, height: 12, marginRight: 8 }}>
            <Animated.View style={{
                position: 'absolute',
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: color,
                opacity: 0.3,
                transform: [{ scale: pulseAnim }],
            }} />
            <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: color,
            }} />
        </View>
    );
};

// ───── Live Player Card ─────
const LivePlayerItem = ({ player, index, delay }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: delay, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, [player.username]);

    const statusColors = {
        'playing': '#34C759',
        'in_lobby': '#007AFF',
        'in_queue': '#FF9500',
    };

    const statusLabels = {
        'playing': '🎮 Playing',
        'in_lobby': '🏠 In Lobby',
        'in_queue': '⚔️ Matchmaking',
    };

    return (
        <Animated.View style={[styles.livePlayerRow, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            <View style={[styles.livePlayerAvatar, { backgroundColor: player.color }]}>
                <Text style={styles.livePlayerAvatarText}>{player.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.livePlayerInfo}>
                <Text style={styles.livePlayerName} numberOfLines={1}>{player.username}</Text>
                <Text style={[styles.livePlayerGame, { color: statusColors[player.status] || '#68686E' }]}>
                    {statusLabels[player.status] || player.status} {player.game ? `• ${player.game}` : ''}
                </Text>
            </View>
            <View style={[styles.liveStatusDot, { backgroundColor: statusColors[player.status] || '#68686E' }]} />
        </Animated.View>
    );
};
// ───── Animated Background ─────
const AnimatedBackground = () => {
    if (Platform.OS !== 'web') return null;
    
    const blobs = [
        { width: 300, height: 300, top: '10%', left: '5%', bg: 'rgba(0, 122, 255, 0.1)', delay: '0s', duration: '12s' },
        { width: 400, height: 400, top: '40%', right: '10%', bg: 'rgba(255, 45, 85, 0.08)', delay: '2s', duration: '15s' },
        { width: 250, height: 250, bottom: '15%', left: '20%', bg: 'rgba(52, 199, 89, 0.08)', delay: '4s', duration: '10s' },
        { width: 350, height: 350, top: '20%', right: '25%', bg: 'rgba(157, 0, 255, 0.08)', delay: '1s', duration: '18s' },
    ];

    const icons = [
        { content: '⭐', size: 60, top: '15%', left: '15%', delay: '1s', duration: '14s', opacity: 0.4 },
        { content: '🎮', size: 80, top: '65%', right: '18%', delay: '3s', duration: '17s', opacity: 0.3 },
        { content: '🔢', size: 70, bottom: '25%', left: '10%', delay: '5s', duration: '13s', opacity: 0.3 },
        { content: '✨', size: 50, top: '45%', left: '30%', delay: '2s', duration: '11s', opacity: 0.5 },
        { content: '🎯', size: 65, top: '25%', right: '35%', delay: '4s', duration: '16s', opacity: 0.3 },
        { content: '🧩', size: 90, bottom: '15%', right: '15%', delay: '0s', duration: '19s', opacity: 0.3 },
        { content: '▶️', size: 55, top: '10%', right: '45%', delay: '6s', duration: '15s', opacity: 0.3 },
    ];

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {blobs.map((b, i) => (
                <View 
                    key={`blob-${i}`} 
                    style={{
                        position: 'absolute',
                        width: b.width,
                        height: b.height,
                        borderRadius: b.width / 2,
                        backgroundColor: b.bg,
                        top: b.top,
                        left: b.left,
                        right: b.right,
                        bottom: b.bottom,
                        filter: 'blur(60px)',
                        animation: `floatParticle ${b.duration} ease-in-out infinite alternate ${b.delay}`,
                        zIndex: -1
                    }} 
                />
            ))}
            {icons.map((ic, i) => (
                <View
                    key={`icon-${i}`}
                    style={{
                        position: 'absolute',
                        top: ic.top,
                        left: ic.left,
                        right: ic.right,
                        bottom: ic.bottom,
                        opacity: ic.opacity,
                        animation: `floatParticle ${ic.duration} ease-in-out infinite alternate ${ic.delay}`,
                        zIndex: 0
                    }}
                >
                    <Text style={{ fontSize: ic.size }}>{ic.content}</Text>
                </View>
            ))}
        </View>
    );
};

// ───── Category Tab Button ─────
const CategoryTab = ({ label, active, onPress }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={({ pressed }) => {
                const isPressed = pressed;
                
                // Inactive styles
                let bg = isHovered ? '#E5E5EA' : '#F2F2F7';
                let borderColor = '#D1D1D6';
                let borderBottomColor = '#AEAEB2';
                let shadow = isPressed
                    ? '0 1px 0 #AEAEB2, 0 2px 4px rgba(0,0,0,0.05)'
                    : isHovered
                    ? '0 4.5px 0 #AEAEB2, 0 6px 10px rgba(0,0,0,0.08)'
                    : '0 3px 0 #AEAEB2, 0 4px 6px rgba(0,0,0,0.06)';
                
                // Active styles
                if (active) {
                    bg = isHovered ? '#222F3E' : '#2C3B4D';
                    borderColor = '#2C3B4D';
                    borderBottomColor = '#1A2532';
                    shadow = isPressed
                        ? '0 1.5px 0 #1A2532, 0 2px 4px rgba(0,0,0,0.1)'
                        : isHovered
                        ? '0 6.5px 0 #1A2532, 0 8px 14px rgba(0,0,0,0.2)'
                        : '0 5px 0 #1A2532, 0 6px 10px rgba(0,0,0,0.15)';
                }

                return [
                    styles.categoryPill,
                    {
                        backgroundColor: bg,
                        borderColor: borderColor,
                        borderBottomColor: borderBottomColor,
                        borderBottomWidth: active 
                            ? (isPressed ? 1.5 : 5) 
                            : (isPressed ? 1.5 : 3),
                        transform: [
                            { translateY: isPressed ? (active ? 3.5 : 1.5) : isHovered ? -1.5 : 0 }
                        ]
                    },
                    Platform.select({
                        web: {
                            boxShadow: shadow,
                            cursor: 'pointer'
                        }
                    })
                ];
            }}
        >
            <Text style={[styles.categoryPillText, { color: active ? '#FFFFFF' : '#68686E' }]}>
                {label}
            </Text>
        </Pressable>
    );
};

// ───── Main HomeScreen ─────
const HomeScreen = ({ onSelectGame, onSelectLevels, user, onNavigate, onLogout, isDarkMode }) => {
    const [stats, setStats] = useState([]);
    const [playDates, setPlayDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dailyCompleted, setDailyCompleted] = useState({ sudoku: false, wordle: false, shikaku: false });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [savedGames, setSavedGames] = useState([]);
    const [achievements, setAchievements] = useState([]);

    // Animation refs
    const headerFade = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-30)).current;
    const dashFade = useRef(new Animated.Value(0)).current;
    const dashSlide = useRef(new Animated.Value(40)).current;
    const cardAnims = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current;
    const cardSlideAnims = useRef(Array.from({ length: 12 }, () => new Animated.Value(30))).current;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const displayDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    // Simulated current players (would be replaced with WebSocket live data)
    const gameNames = ['Sudoku', '2048', 'Shikaku', 'Wordle', 'Nonogram', 'Pipes', 'Towers', 'Minesweeper', 'Memory Match', 'Sliding Puzzle', 'Lights Out', 'Color Flood'];
    const avatarColors = ['#007AFF', '#FF9500', '#9D00FF', '#34C759', '#FF2D55', '#5AC8FA', '#AF52DE', '#FF6B6B', '#4ECDC4', '#45B7D1'];

    const generatePlayers = () => {
        const names = ['Alex42', 'PuzzleKing', 'SarahJ', 'MikeT', 'EmmaW', 'Guest_3812', 'Guest_7291', 
                       'BrainTeaser', 'LogicPro', 'NumberNinja', 'GridMaster', 'TileWiz', 'Guest_1455',
                       'SudokuSam', 'WordSmith', 'PipeLayer', 'TowerBuilder', 'Guest_9022'];
        const statuses = ['playing', 'playing', 'playing', 'in_lobby', 'in_queue', 'playing', 'in_lobby'];
        const count = Math.floor(Math.random() * 5) + 6; // 6-10 players
        const players = [];
        const usedNames = new Set();
        for (let i = 0; i < count; i++) {
            let name;
            do {
                name = names[Math.floor(Math.random() * names.length)];
            } while (usedNames.has(name));
            usedNames.add(name);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            players.push({
                username: name,
                status,
                game: status === 'playing' ? gameNames[Math.floor(Math.random() * gameNames.length)] : null,
                color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
            });
        }
        return players;
    };

    useEffect(() => {
        loadStats();
        checkDailyCompletion();
        loadSavedGames();
        loadAchievements();

        // Entrance animations
        Animated.parallel([
            Animated.timing(headerFade, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(headerSlide, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, []);

    // Staggered card entrance animation
    useEffect(() => {
        if (!loading) {
            // Dashboard sections fade in
            Animated.parallel([
                Animated.timing(dashFade, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
                Animated.timing(dashSlide, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();

            // Staggered game cards
            const cardAnimations = cardAnims.map((anim, i) =>
                Animated.parallel([
                    Animated.timing(anim, { toValue: 1, duration: 500, delay: 400 + i * 80, useNativeDriver: true }),
                    Animated.timing(cardSlideAnims[i], { toValue: 0, duration: 500, delay: 400 + i * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                ])
            );
            Animated.parallel(cardAnimations).start();
        }
    }, [loading]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await api.getStats();
            setStats(data);
            const pDates = await api.getPlayDates();
            setPlayDates(pDates);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const checkDailyCompletion = async () => {
        try {
            const sudokuDone = await api.getDailyCompleted(todayStr, 'sudoku');
            const wordleDone = await api.getDailyCompleted(todayStr, 'wordle');
            const shikakuDone = await api.getDailyCompleted(todayStr, 'shikaku');
            setDailyCompleted({ sudoku: sudokuDone, wordle: wordleDone, shikaku: shikakuDone });
        } catch (e) {
            console.error(e);
        }
    };

    const loadSavedGames = async () => {
        try {
            const saved = await api.getAllSavedGames();
            setSavedGames(saved);
        } catch (e) { console.error(e); }
    };

    const loadAchievements = async () => {
        try {
            const result = await api.checkAchievements();
            if (result && result.all_achievements) {
                setAchievements(result.all_achievements);
            }
        } catch (e) { console.error(e); }
    };

    const handleResumeSavedGame = async (saved) => {
        // Launch game – the game component will pick up the saved state via api.loadGameProgress
        onSelectGame(saved.gameType);
    };

    const handleDiscardSavedGame = async (gameType) => {
        await api.clearGameProgress(gameType);
        setSavedGames(prev => prev.filter(s => s.gameType !== gameType));
    };

    // ── Game emoji/title lookup ──────────────────────────────────────────
    const gameMetaMap = {
        sudoku: { emoji: '🔢', title: 'Sudoku' },
        '2048': { emoji: '🎲', title: '2048' },
        shikaku: { emoji: '📐', title: 'Shikaku' },
        wordle: { emoji: '📝', title: 'Wordle' },
        nonogram: { emoji: '🎨', title: 'Nonogram' },
        pipes: { emoji: '🔧', title: 'Pipes' },
        tower: { emoji: '🏙️', title: 'Towers' },
        minesweeper: { emoji: '💣', title: 'Minesweeper' },
        memory: { emoji: '🎴', title: 'Memory Match' },
        sliding: { emoji: '🧩', title: 'Sliding Puzzle' },
        lightsout: { emoji: '💡', title: 'Lights Out' },
        colorflood: { emoji: '🌊', title: 'Color Flood' },
        pacman: { emoji: '🕹️', title: 'Pacman' },
    };

    const games = [
        { id: 'sudoku', title: 'Sudoku', category: 'Numbers', emoji: '🔢', description: 'Classic number-placement grid logic puzzle.', accentColor: '#007AFF', variant: 'primary' },
        { id: '2048', title: '2048', category: 'Numbers', emoji: '🎲', description: 'Slide tiles and merge values to reach 2048.', accentColor: '#FF9500', variant: 'orange' },
        { id: 'shikaku', title: 'Shikaku', category: 'Logic', emoji: '📐', description: 'Divide the grid into rectangular regions.', accentColor: '#9D00FF', variant: 'purple' },
        { id: 'wordle', title: 'Wordle', category: 'Words', emoji: '📝', description: 'Guess the 5-letter word in 6 attempts.', accentColor: '#34C759', variant: 'success' },
        { id: 'nonogram', title: 'Nonogram', category: 'Logic', emoji: '🎨', description: 'Color cells to reveal a hidden picture.', accentColor: '#FF2D55', variant: 'danger' },
        { id: 'pipes', title: 'Pipes', category: 'Logic', emoji: '🔧', description: 'Rotate pipes to connect the flow.', accentColor: '#5AC8FA', variant: 'primary' },
        { id: 'tower', title: 'Towers', category: 'Logic', emoji: '🏙️', description: 'Place heights satisfying sight-line clues.', accentColor: '#AF52DE', variant: 'purple' },
        { id: 'minesweeper', title: 'Minesweeper', category: 'Logic', emoji: '💣', description: 'Clear the board without detonating any hidden mines.', accentColor: '#FF6B6B', variant: 'danger' },
        { id: 'memory', title: 'Memory Match', category: 'Casual', emoji: '🎴', description: 'Flip cards and find the matching pairs.', accentColor: '#4ECDC4', variant: 'success' },
        { id: 'sliding', title: 'Sliding Puzzle', category: 'Casual', emoji: '🧩', description: 'Slide tiles into order.', accentColor: '#E17055', variant: 'orange' },
        { id: 'lightsout', title: 'Lights Out', category: 'Logic', emoji: '💡', description: 'Toggle lights to turn them all off.', accentColor: '#FDCB6E', variant: 'primary' },
        { id: 'colorflood', title: 'Color Flood', category: 'Casual', emoji: '🌊', description: 'Fill the board with one color in limited moves.', accentColor: '#45B7D1', variant: 'purple' },
        { id: 'pacman', title: 'Pacman', category: 'Casual', emoji: '🕹️', description: 'Classic arcade chase. Avoid ghosts and eat all dots!', accentColor: '#FFD700', variant: 'orange' },
    ];

    const categories = ['All', 'Numbers', 'Logic', 'Words', 'Casual'];
    const filteredGames = games.filter(g => 
        (selectedCategory === 'All' || g.category === selectedCategory) &&
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const allDailiesDone = dailyCompleted.sudoku && dailyCompleted.wordle && dailyCompleted.shikaku;
    
    // Generate real 7-day streak
    const streakDays = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = i === 0;
        streakDays.push({
            day: ['S','M','T','W','T','F','S'][d.getDay()],
            done: playDates.includes(dateStr),
            isToday
        });
    }

    // Generate real 30-day calendar
    const calendarDays = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        calendarDays.push({
            done: playDates.includes(dateStr),
            isToday: i === 0
        });
    }

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
            <AnimatedBackground />
            
            
            {/* ── Main Header Section ── */}
            <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
                <Text style={[styles.title, isDarkMode && { color: '#FFFFFF' }]}>PUZZLE <Text style={styles.titleGradient}>HUB</Text></Text>
                <Text style={[styles.subtitle, isDarkMode && { color: '#EBEBF5' }]}>Premium logic puzzle collection for matching minds</Text>

                {/* Quick Match Multiplayer Button */}
                <View style={{ marginTop: 24, width: '100%', maxWidth: 300 }}>
                    <NeonButton 
                        title="⚡ Quick Match Multiplayer" 
                        variant="orange" 
                        onPress={() => onNavigate('multiplayer')} 
                    />
                </View>
            </Animated.View>

            {/* Search & Filter Section */}
            <Animated.View style={[styles.searchSection, { opacity: dashFade, transform: [{ translateY: dashSlide }] }]}>
                <View style={styles.searchBar}>
                    <Text style={{fontSize: 18, marginRight: 10}}>🔍</Text>
                    <input 
                        type="text" 
                        placeholder="Search games..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1, border: 'none', background: 'transparent', outline: 'none',
                            fontSize: 16, fontFamily: 'Outfit, sans-serif', color: '#1C1C1E'
                        }}
                    />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
                    {categories.map(cat => (
                        <CategoryTab
                            key={cat}
                            label={cat}
                            active={selectedCategory === cat}
                            onPress={() => setSelectedCategory(cat)}
                        />
                    ))}
                </ScrollView>
            </Animated.View>


            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <Animated.View style={[styles.mainContent, { opacity: dashFade, transform: [{ translateY: dashSlide }] }]}>
                    {/* ── Dashboard Top Row ── */}
                    <View style={styles.topDashboardRow}>
                        {/* Daily Challenges */}
                        <GlassCard style={styles.dailyCard}>
                            <View style={styles.dailyHeader}>
                                <Text style={styles.dailyTitle}>📅 Daily Challenges</Text>
                                <Text style={styles.dailyDate}>{displayDate}</Text>
                            </View>
                            <View style={styles.dailyList}>
                                {[
                                    { name: 'Sudoku Daily', key: 'sudoku', variant: 'primary' },
                                    { name: 'Wordle Daily', key: 'wordle', variant: 'success' },
                                    { name: 'Shikaku Daily', key: 'shikaku', variant: 'purple' },
                                ].map((daily, idx) => (
                                    <View key={daily.key} style={[styles.dailyRow, idx > 0 && styles.dailyRowDivider]}>
                                        <Text style={styles.dailyGameName}>{daily.name}</Text>
                                        {dailyCompleted[daily.key] ? (
                                            <Text style={styles.dailyChecked}>✓ Completed</Text>
                                        ) : (
                                            <NeonButton
                                                title="Play"
                                                variant={daily.variant}
                                                onPress={() => onSelectGame(daily.key, true)}
                                                style={styles.dailyPlayBtn}
                                            />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </GlassCard>

                        {/* Daily Quests */}
                        <GlassCard style={styles.questsCard}>
                            <View style={styles.dailyHeader}>
                                <Text style={styles.dailyTitle}>📜 Daily Quests</Text>
                                <Text style={styles.dailyDate}>Resets in 12h</Text>
                            </View>
                            <View style={styles.dailyList}>
                                {[
                                    { title: 'Play 3 Games', progress: '1/3', done: false },
                                    { title: 'Win a game under 2m', progress: '0/1', done: false },
                                    { title: 'Earn 50 Coins', progress: '50/50', done: true },
                                ].map((quest, idx) => (
                                    <View key={idx} style={[styles.dailyRow, idx > 0 && styles.dailyRowDivider]}>
                                        <View>
                                            <Text style={styles.dailyGameName}>{quest.title}</Text>
                                            <Text style={{ fontSize: 12, color: '#68686E' }}>Reward: 🪙 10</Text>
                                        </View>
                                        {quest.done ? (
                                            <Text style={styles.dailyChecked}>✓ Done</Text>
                                        ) : (
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#007AFF' }}>{quest.progress}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </GlassCard>

                        {/* Streak Calendar */}
                        <GlassCard style={styles.streakCard}>
                            <Text style={styles.streakTitle}>🔥 7-Day Streak</Text>
                            
                    <View style={styles.streakDays}>
                        {streakDays.map((d, i) => (
                            <View key={i} style={styles.streakDayCol}>
                                <Text style={[styles.streakDayLabel, d.isToday && styles.streakDayLabelToday]}>{d.day}</Text>
                                <View style={[styles.streakCircle, d.done ? styles.streakCircleDone : styles.streakCircleMissed, d.isToday && styles.streakCircleToday]}>
                                    <Text style={[styles.streakCheck, d.done && styles.streakCheckDone]}>{d.done ? '✓' : ''}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    
                    {/* Monthly Calendar Row */}
                    <View style={{ width: '100%', marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 15 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10, fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System' }}>📅 30-Day Activity</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' }}>
                            {calendarDays.map((calDay, i) => (
                                <View key={i} style={{
                                    width: 14, height: 14, borderRadius: 3,
                                    backgroundColor: calDay.done ? '#34C759' : 'rgba(0,0,0,0.05)',
                                    opacity: calDay.done ? 1 : 0.7,
                                    borderWidth: calDay.isToday ? 2 : 0,
                                    borderColor: '#007AFF'
                                }} />
                            ))}
                        </View>
                    </View>
                    {/* Rewards Tracker */}
                    <View style={{ width: '100%', marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#68686E' }}>WEEKLY REWARD</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#007AFF' }}>3/7 Days</Text>
                        </View>
                        <View style={{ width: '100%', height: 8, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{ width: '42%', height: '100%', backgroundColor: '#007AFF', borderRadius: 4 }} />
                        </View>
                        <Text style={{ fontSize: 11, color: '#8E8E93', marginTop: 6, textAlign: 'center' }}>4 days left until Golden Puzzle Theme!</Text>
                    </View>

                </GlassCard>
                </View>

                {/* ── Continue Where You Left Off ── */}
                {savedGames.length > 0 && (
                    <GlassCard style={styles.continueCard}>
                        <Text style={styles.continueTitle}>🕹️ Continue Where You Left Off</Text>
                        <View style={styles.continueList}>
                            {savedGames.map((saved, idx) => {
                                const meta = gameMetaMap[saved.gameType] || { emoji: '🎮', title: saved.gameType };
                                const savedDate = saved.savedAt ? new Date(saved.savedAt) : null;
                                const timeAgo = savedDate
                                    ? (() => {
                                        const mins = Math.floor((Date.now() - savedDate.getTime()) / 60000);
                                        if (mins < 60) return `${mins}m ago`;
                                        const hrs = Math.floor(mins / 60);
                                        if (hrs < 24) return `${hrs}h ago`;
                                        return `${Math.floor(hrs / 24)}d ago`;
                                    })()
                                    : '';
                                return (
                                    <View key={saved.gameType} style={[styles.continueRow, idx > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12, marginTop: 8 }]}>
                                        <Text style={{ fontSize: 28, marginRight: 12 }}>{meta.emoji}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.continueGameName}>{meta.title}</Text>
                                            <Text style={styles.continueTimeAgo}>
                                                {saved.elapsedTime ? `${Math.floor(saved.elapsedTime)}s played` : ''}
                                                {timeAgo ? ` · ${timeAgo}` : ''}
                                            </Text>
                                        </View>
                                        <Pressable
                                            style={styles.continueResumeBtn}
                                            onPress={() => handleResumeSavedGame(saved)}
                                        >
                                            <Text style={styles.continueResumeBtnText}>Resume</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.continueDiscardBtn}
                                            onPress={() => handleDiscardSavedGame(saved.gameType)}
                                        >
                                            <Text style={styles.continueDiscardBtnText}>✕</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    </GlassCard>
                )}

                {/* ── Achievements Showcase ── */}
                {achievements.length > 0 && (
                    <GlassCard style={styles.achievementsCard}>
                        <View style={styles.achievementsHeader}>
                            <Text style={styles.achievementsTitle}>🏅 Achievements</Text>
                            <Text style={styles.achievementsCount}>
                                {achievements.filter(a => a.unlocked).length}/{achievements.length}
                            </Text>
                        </View>
                        <View style={styles.achievementsGrid}>
                            {achievements.map((ach) => (
                                <View key={ach.id} style={[
                                    styles.achievementBadge,
                                    !ach.unlocked && styles.achievementBadgeLocked,
                                ]}>
                                    <Text style={{ fontSize: 24 }}>{ach.unlocked ? ach.icon : '🔒'}</Text>
                                    <Text style={[styles.achievementName, !ach.unlocked && { color: '#AEAEB2' }]} numberOfLines={1}>
                                        {ach.name}
                                    </Text>
                                    <Text style={styles.achievementDesc} numberOfLines={2}>{ach.description}</Text>
                                    {ach.unlocked && (
                                        <Text style={styles.achievementCoins}>🪙 {ach.coins}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </GlassCard>
                )}

                {/* ── Game Grid ── */}
                <View style={styles.grid}>
                    {filteredGames.map((game, index) => {
                        return (
                            <GlassCard key={game.id} style={styles.card} isHoverable>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.cardEmoji}>{game.emoji}</Text>
                                    <Text style={styles.cardTitle}>{game.title}</Text>
                                </View>
                                <Text style={styles.cardDesc}>{game.description}</Text>
                                
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>PLAYED</Text>
                                        <Text style={{fontWeight: 'bold', fontSize: 16, color: '#1C1C1E'}}>{stats[game.id]?.played || 0}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>WINS</Text>
                                        <Text style={{fontWeight: 'bold', fontSize: 16, color: game.accentColor || '#007AFF'}}>{stats[game.id]?.wins || 0}</Text>
                                    </View>
                                </View>

                                <NeonButton
                                    title="Play Game"
                                    variant="primary"
                                    onPress={() => onSelectGame(game.id)}
                                    style={styles.playBtn}
                                />
                                {onSelectLevels && (
                                    <NeonButton
                                        title="🏆 Levels"
                                        variant="muted"
                                        onPress={() => onSelectLevels(game.id)}
                                        style={{marginTop: 8}}
                                    />
                                )}
                            </GlassCard>
                        );
                    })}
                </View>
                </Animated.View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent'
    },
    container: {
        paddingTop: 40,
        paddingHorizontal: 20,
        paddingBottom: 50,
        alignItems: 'center',
        width: '100%',
        minHeight: '100%'
    },
    
    searchSection: {
        width: '100%',
        maxWidth: 960,
        marginBottom: 30,
        alignItems: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        width: '100%',
        maxWidth: 500,
        marginBottom: 16,
        ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' } })
    },
    categoryPills: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingBottom: 10,
        paddingTop: 4,
    },
    categoryPill: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                transition: 'transform 0.1s ease, border-bottom-width 0.1s ease, box-shadow 0.1s ease, background-color 0.2s ease',
            }
        })
    },
    categoryPillText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        letterSpacing: 0.5,
    },
    // ── Header ──

    header: {
        alignItems: 'center',
        marginVertical: 30,
        textAlign: 'center'
    },
    title: {
        color: '#1C1C1E',
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: 3,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({
            web: { textShadow: '0 4px 20px rgba(0, 122, 255, 0.12)' }
        })
    },
    titleGradient: {
        color: '#007AFF'
    },
    subtitle: {
        color: '#68686E',
        fontSize: 16,
        marginTop: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 199, 89, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.15)',
    },
    onlineText: {
        color: '#34C759',
        fontWeight: '700',
        fontSize: 14,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    activityFeedText: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 12,
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({ web: { transition: 'opacity 0.5s ease-in-out' } })
    },
    loaderContainer: {
        height: 300,
        justifyContent: 'center'
    },
    mainContent: {
        width: '100%',
        maxWidth: 960,
        alignItems: 'center'
    },
    // ── Dashboard Top Row ──
    topDashboardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    dailyCard: {
        flex: 1,
        minWidth: 300,
        padding: 20,
    },
    questsCard: {
        flex: 1,
        minWidth: 300,
        padding: 20,
    },
    streakCard: {
        flex: 1,
        minWidth: 300,
        padding: 20,
    },
    dailyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 10
    },
    dailyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    dailyDate: {
        fontSize: 14,
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    dailyList: { width: '100%' },
    dailyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8
    },
    dailyRowDivider: {
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,0,0,0.05)',
        marginTop: 4,
        paddingTop: 12
    },
    dailyGameName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    dailyPlayBtn: {
        paddingVertical: 6,
        paddingHorizontal: 20
    },
    dailyChecked: {
        color: '#34C759',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // ── Streak ──
    streakCard: {
        flex: 1,
        minWidth: 300,
        marginLeft: Platform.OS === 'web' && window.innerWidth > 800 ? 20 : 0,
        padding: 24,
        marginBottom: 20,
        alignItems: 'center'
    },
    streakTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 15,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    streakDays: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15
    },
    streakDayCol: { alignItems: 'center' },
    streakDayLabel: {
        fontSize: 12,
        color: '#8E8E93',
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    streakDayLabelToday: { color: '#007AFF', fontWeight: 'bold' },
    streakCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2
    },
    streakDone: { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: '#34C759' },
    streakMissed: { backgroundColor: 'rgba(0, 0, 0, 0.05)', borderColor: 'rgba(0, 0, 0, 0.1)' },
    streakToday: { borderColor: '#007AFF' },
    streakCheck: { color: '#34C759', fontWeight: 'bold', fontSize: 14 },
    streakDesc: {
        fontSize: 12,
        color: '#68686E',
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // ── Continue Where You Left Off ──
    continueCard: {
        width: '100%',
        maxWidth: 960,
        padding: 20,
        marginBottom: 24,
    },
    continueTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
        marginBottom: 16,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    continueList: { width: '100%' },
    continueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    continueGameName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    continueTimeAgo: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    continueResumeBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    continueResumeBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    continueDiscardBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,59,48,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({ web: { cursor: 'pointer' } }),
    },
    continueDiscardBtnText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '800',
    },
    // ── Achievements ──
    achievementsCard: {
        width: '100%',
        maxWidth: 960,
        padding: 20,
        marginBottom: 24,
    },
    achievementsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 10,
    },
    achievementsTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    achievementsCount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#007AFF',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    achievementBadge: {
        width: 100,
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    achievementBadgeLocked: {
        opacity: 0.5,
    },
    achievementName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1C1C1E',
        textAlign: 'center',
        marginTop: 4,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    achievementDesc: {
        fontSize: 9,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 2,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    achievementCoins: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FF9500',
        marginTop: 4,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    // ── Grid ──
    grid: {
        width: '100%',
        maxWidth: 1200,
        gap: 20,
        ...Platform.select({
            web: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
            },
            default: {
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
            }
        })
    },
    card: {
        width: '100%',
        padding: 24,
        alignItems: 'center',
        ...Platform.select({
            web: { transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease' }
        })
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardEmoji: {
        fontSize: 28,
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: '900',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    cardDesc: {
        color: '#68686E',
        fontSize: 13,
        lineHeight: 19,
        marginVertical: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
        paddingTop: 12,
        marginBottom: 12
    },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: {
        color: '#8E8E93',
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: 3,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    playBtn: {
        width: '100%',
        paddingVertical: 10
    },
    levelsBtn: {
        width: '100%',
        marginTop: 10
    },
    // ── Live Players Card ──
    livePlayersCard: {
        width: '100%',
        maxWidth: 960,
        padding: 24,
        marginTop: 24,
        marginBottom: 40,
        borderWidth: 1.5,
        borderColor: 'rgba(52, 199, 89, 0.12)',
    },
    livePlayersHeader: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 16,
    },
    livePlayersTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    livePlayersTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    liveCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 199, 89, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.12)',
    },
    liveCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#34C759',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    liveEmpty: {
        textAlign: 'center',
        color: '#68686E',
        padding: 20,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    livePlayersList: {
        width: '100%',
    },
    livePlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
        borderRadius: 8,
        marginBottom: 2,
        ...Platform.select({ web: { transition: 'background-color 0.2s ease' } }),
    },
    livePlayerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    livePlayerAvatarText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    livePlayerInfo: {
        flex: 1,
    },
    livePlayerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    livePlayerGame: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    liveStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    liveLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#68686E',
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
});

export default HomeScreen;
