const fs = require('fs');

let content = fs.readFileSync('HomeScreen.js', 'utf-8');

// 1. Add states
content = content.replace(
    /const \[onlineCount, setOnlineCount\] = useState\(0\);/,
    `const [onlineCount, setOnlineCount] = useState(0);\n    const [searchQuery, setSearchQuery] = useState('');\n    const [selectedCategory, setSelectedCategory] = useState('All');`
);

// 2. Add categories to games
content = content.replace(/id: 'sudoku'.*/, "id: 'sudoku', title: 'Sudoku', category: 'Numbers', emoji: '🔢', description: 'Classic number-placement grid logic puzzle.', accentColor: '#007AFF', variant: 'primary' },");
content = content.replace(/id: '2048'.*/, "id: '2048', title: '2048', category: 'Numbers', emoji: '🎲', description: 'Slide tiles and merge values to reach 2048.', accentColor: '#FF9500', variant: 'orange' },");
content = content.replace(/id: 'shikaku'.*/, "id: 'shikaku', title: 'Shikaku', category: 'Logic', emoji: '📐', description: 'Divide the grid into rectangular regions.', accentColor: '#9D00FF', variant: 'purple' },");
content = content.replace(/id: 'wordle'.*/, "id: 'wordle', title: 'Wordle', category: 'Words', emoji: '📝', description: 'Guess the 5-letter word in 6 attempts.', accentColor: '#34C759', variant: 'success' },");
content = content.replace(/id: 'nonogram'.*/, "id: 'nonogram', title: 'Nonogram', category: 'Logic', emoji: '🎨', description: 'Color cells to reveal a hidden picture.', accentColor: '#FF2D55', variant: 'danger' },");
content = content.replace(/id: 'pipes'.*/, "id: 'pipes', title: 'Pipes', category: 'Logic', emoji: '🔧', description: 'Rotate pipes to connect the flow.', accentColor: '#5AC8FA', variant: 'primary' },");
content = content.replace(/id: 'tower'.*/, "id: 'tower', title: 'Towers', category: 'Logic', emoji: '🏙️', description: 'Place heights satisfying sight-line clues.', accentColor: '#AF52DE', variant: 'purple' },");
content = content.replace(/id: 'minesweeper'.*/, "id: 'minesweeper', title: 'Minesweeper', category: 'Logic', emoji: '💣', description: 'Clear the board without detonating any hidden mines.', accentColor: '#FF6B6B', variant: 'danger' },");
content = content.replace(/id: 'memory'.*/, "id: 'memory', title: 'Memory Match', category: 'Casual', emoji: '🎴', description: 'Flip cards and find the matching pairs.', accentColor: '#4ECDC4', variant: 'success' },");
content = content.replace(/id: 'sliding'.*/, "id: 'sliding', title: 'Sliding Puzzle', category: 'Casual', emoji: '🧩', description: 'Slide tiles into order.', accentColor: '#E17055', variant: 'orange' },");
content = content.replace(/id: 'lightsout'.*/, "id: 'lightsout', title: 'Lights Out', category: 'Logic', emoji: '💡', description: 'Toggle lights to turn them all off.', accentColor: '#FDCB6E', variant: 'primary' },");
content = content.replace(/id: 'colorflood'.*/, "id: 'colorflood', title: 'Color Flood', category: 'Casual', emoji: '🌊', description: 'Fill the board with one color in limited moves.', accentColor: '#45B7D1', variant: 'purple' },");

// 3. Filter games
content = content.replace(
    /const allDailiesDone = dailyCompleted.sudoku && dailyCompleted.wordle && dailyCompleted.shikaku;/,
    `const categories = ['All', 'Numbers', 'Logic', 'Words', 'Casual'];
    const filteredGames = games.filter(g => 
        (selectedCategory === 'All' || g.category === selectedCategory) &&
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const allDailiesDone = dailyCompleted.sudoku && dailyCompleted.wordle && dailyCompleted.shikaku;`
);

// 4. Update the map loop to use filteredGames
content = content.replace(/\{games\.map\(\(game, index\) => \{/g, "{filteredGames.map((game, index) => {");

// 5. Add Quick Match button, Search Bar & Category Pills to Header area
const uiInjection = `
            {/* ── Main Header Section ── */}
            <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
                <Text style={styles.title}>PUZZLE <Text style={styles.titleGradient}>HUB</Text></Text>
                <Text style={styles.subtitle}>Premium logic puzzle collection for matching minds</Text>
                
                {/* Live Activity Feed */}
                <Text style={styles.activityFeedText}>🔔 {recentActivity}</Text>

                <View style={styles.onlineBadge}>
                    <PulsingDot />
                    <Text style={styles.onlineText}>{onlineCount} Players Online</Text>
                </View>

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
                        <Pressable 
                            key={cat} 
                            style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </Animated.View>
`;
content = content.replace(/\{\/\* ── Main Header Section ── \*\/\}([\s\S]*?)<\/Animated\.View>/, uiInjection);

// 6. Streak Rewards Tracker
const streakInjection = `
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
`;
content = content.replace(/<View style=\{styles\.streakDays\}>([\s\S]*?)<\/View>\s*<\/View>\s*<\/GlassCard>/, streakInjection + '\n                </GlassCard>');

// 7. Add Styles
const stylesInjection = `
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
        gap: 10,
    },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    categoryPillActive: {
        backgroundColor: '#007AFF',
    },
    categoryPillText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#68686E',
    },
    categoryPillTextActive: {
        color: '#FFF',
    },
    // ── Header ──
`;
content = content.replace(/\/\/ ── Header ──/g, stylesInjection);

fs.writeFileSync('HomeScreen.js', content);
console.log("HomeScreen patched successfully.");
