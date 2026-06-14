const API_BASE_URL = "http://localhost:8000/api/v1";

// Helper for local storage (web safe)
const storage = {
    getItem: async (key) => {
        try {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        } catch (e) {
            console.error("Storage error", e);
            return null;
        }
    },
    setItem: async (key, value) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.error("Storage error", e);
        }
    },
    removeItem: async (key) => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (e) {
            console.error("Storage error", e);
        }
    }
};

export const api = {
    _multiplayerData: null,
    setMultiplayerData: (data) => { api._multiplayerData = data; },
    _multiplayerWinCallback: null,
    setMultiplayerWinCallback: (cb) => { api._multiplayerWinCallback = cb; },
    setToken: async (token) => {
        await storage.setItem("token", token);
    },
    getToken: async () => {
        return await storage.getItem("token");
    },
    logout: async () => {
        await storage.removeItem("token");
    },
    
    // Auth APIs
    register: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Registration failed");
        
        await api.setToken(data.access_token);
        // Sync guest stats on register
        await api.syncGuestStats();
        return data;
    },
    
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Login failed");
        
        await api.setToken(data.access_token);
        // Sync guest stats on login
        await api.syncGuestStats();
        return data;
    },
    
    getMe: async () => {
        const token = await api.getToken();
        if (!token) return null;
        
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            await api.logout();
            return null;
        }
        return await response.json();
    },
    
    // Stats APIs
    getStats: async () => {
        const token = await api.getToken();
        if (!token) {
            // Read from guest stats
            const guestStatsStr = await storage.getItem("guest_stats");
            return guestStatsStr ? JSON.parse(guestStatsStr) : getDefaultGuestStats();
        }
        
        const response = await fetch(`${API_BASE_URL}/stats/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) return getDefaultGuestStats();
        return await response.json();
    },
    
    getLeaderboard: async () => {
        const response = await fetch(`${API_BASE_URL}/stats/leaderboard`);
        if (!response.ok) return [];
        return await response.json();
    },
    
    recordPlayDate: async () => {
        const today = new Date().toISOString().split('T')[0];
        const data = await storage.getItem('play_history_dates');
        let dates = data ? JSON.parse(data) : [];
        if (!dates.includes(today)) {
            dates.push(today);
            await storage.setItem('play_history_dates', JSON.stringify(dates));
        }
    },
    
    getPlayDates: async () => {
        const data = await storage.getItem('play_history_dates');
        return data ? JSON.parse(data) : [];
    },
    
    updateStats: async (gameType, won, timeTaken = null, score = null, solveToken = null) => {
        await api.recordPlayDate();
        
        const token = await api.getToken();
        if (!token) {
            // Update local guest stats
            await updateGuestStatsLocal(gameType, won, timeTaken, score, solveToken);
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/stats/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ game_type: gameType, won, time_taken: timeTaken, score, solve_token: solveToken })
        });
        return await response.json();
    },
    
    syncGuestStats: async () => {
        const token = await api.getToken();
        if (!token) return;
        
        const guestStatsUpdatesStr = await storage.getItem("guest_stats_queue");
        if (!guestStatsUpdatesStr) return;
        
        const updates = JSON.parse(guestStatsUpdatesStr);
        if (updates.length === 0) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/stats/bulk-sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            if (response.ok) {
                await storage.removeItem("guest_stats_queue");
                await storage.removeItem("guest_stats");
            }
        } catch (e) {
            console.error("Failed to sync guest stats", e);
        }
    },
    
    // Game Generation APIs
    getSudoku: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/sudoku/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Sudoku");
        return await response.json();
    },
    
    getDailySudoku: async (date, difficulty = "medium") => {
        const response = await fetch(`${API_BASE_URL}/games/sudoku/daily?date=${date}&difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Daily Sudoku");
        return await response.json();
    },
    
    getWordle: async () => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/wordle/new`);
        if (!response.ok) throw new Error("Failed to load Wordle");
        return await response.json();
    },
    
    getDailyWordle: async (date) => {
        const response = await fetch(`${API_BASE_URL}/games/wordle/daily?date=${date}`);
        if (!response.ok) throw new Error("Failed to load Daily Wordle");
        return await response.json();
    },
    
    getShikaku: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/shikaku/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Shikaku");
        return await response.json();
    },
    
    getDailyShikaku: async (date, difficulty = "medium") => {
        const response = await fetch(`${API_BASE_URL}/games/shikaku/daily?date=${date}&difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Daily Shikaku");
        return await response.json();
    },

    getNonogram: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/nonogram/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Nonogram");
        return await response.json();
    },
    
    getDailyNonogram: async (date, difficulty = "medium") => {
        const response = await fetch(`${API_BASE_URL}/games/nonogram/daily?date=${date}&difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Daily Nonogram");
        return await response.json();
    },

    getPipes: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/pipes/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Pipes");
        return await response.json();
    },
    
    getDailyPipes: async (date, difficulty = "medium") => {
        const response = await fetch(`${API_BASE_URL}/games/pipes/daily?date=${date}&difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Daily Pipes");
        return await response.json();
    },

    getTower: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/tower/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Tower");
        return await response.json();
    },
    
    getDailyTower: async (date, difficulty = "medium") => {
        const response = await fetch(`${API_BASE_URL}/games/tower/daily?date=${date}&difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Daily Tower");
        return await response.json();
    },

    getMinesweeper: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/minesweeper/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Minesweeper");
        return await response.json();
    },

    getMemory: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/memory/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Memory");
        return await response.json();
    },

    getSliding: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/sliding/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load Sliding");
        return await response.json();
    },

    getLightsOut: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/lightsout/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load LightsOut");
        return await response.json();
    },

    getColorFlood: async (difficulty) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/colorflood/new?difficulty=${difficulty}`);
        if (!response.ok) throw new Error("Failed to load ColorFlood");
        return await response.json();
    },
    checkSudoku: async (puzzleId, submitted) => {
        const response = await fetch(`${API_BASE_URL}/games/sudoku/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, submitted })
        });
        if (!response.ok) throw new Error("Failed to check Sudoku");
        return await response.json();
    },
    checkShikaku: async (puzzleId, submitted) => {
        const response = await fetch(`${API_BASE_URL}/games/shikaku/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, submitted })
        });
        if (!response.ok) throw new Error("Failed to check Shikaku");
        return await response.json();
    },
    checkNonogram: async (puzzleId, submitted) => {
        const response = await fetch(`${API_BASE_URL}/games/nonogram/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, submitted })
        });
        if (!response.ok) throw new Error("Failed to check Nonogram");
        return await response.json();
    },
    checkTower: async (puzzleId, submitted) => {
        const response = await fetch(`${API_BASE_URL}/games/tower/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, submitted })
        });
        if (!response.ok) throw new Error("Failed to check Tower");
        return await response.json();
    },
    guessWordle: async (puzzleId, guess) => {
        const response = await fetch(`${API_BASE_URL}/games/wordle/guess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, guess })
        });
        if (!response.ok) throw new Error("Failed to submit Wordle guess");
        return await response.json();
    },
    getWordleSolution: async (puzzleId) => {
        const response = await fetch(`${API_BASE_URL}/games/wordle/solution?puzzle_id=${puzzleId}`);
        if (!response.ok) throw new Error("Failed to fetch Wordle solution");
        return await response.json();
    },
    revealMinesweeperCell: async (puzzleId, row, col) => {
        const response = await fetch(`${API_BASE_URL}/games/minesweeper/reveal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, row, col })
        });
        if (!response.ok) throw new Error("Failed to reveal Minesweeper cell");
        return await response.json();
    },
    checkMinesweeper: async (puzzleId, revealed) => {
        const response = await fetch(`${API_BASE_URL}/games/minesweeper/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzle_id: puzzleId, revealed })
        });
        if (!response.ok) throw new Error("Failed to check Minesweeper");
        return await response.json();
    },
    getMinesweeperSolution: async (puzzleId) => {
        const response = await fetch(`${API_BASE_URL}/games/minesweeper/solution?puzzle_id=${puzzleId}`);
        if (!response.ok) throw new Error("Failed to fetch Minesweeper solution");
        return await response.json();
    },
    setDailyCompleted: async (date, gameType) => {
        const completedStr = await storage.getItem("daily_completed") || "{}";
        const completed = JSON.parse(completedStr);
        if (!completed[date]) completed[date] = {};
        completed[date][gameType] = true;
        await storage.setItem("daily_completed", JSON.stringify(completed));
    },
    
    getDailyCompleted: async (date, gameType) => {
        const completedStr = await storage.getItem("daily_completed") || "{}";
        const completed = JSON.parse(completedStr);
        return !!(completed[date] && completed[date][gameType]);
    },

    // Level completion tracking
    getCompletedLevels: async (gameId) => {
        const key = `levels_completed_${gameId}`;
        const data = await storage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    markLevelComplete: async (gameId, level) => {
        const key = `levels_completed_${gameId}`;
        const data = await storage.getItem(key);
        const completed = data ? JSON.parse(data) : [];
        if (!completed.includes(level)) {
            completed.push(level);
            await storage.setItem(key, JSON.stringify(completed));
        }
        return completed;
    },

    // Level-based game fetching
    getSudokuLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/sudoku/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Sudoku level');
        return await response.json();
    },
    getShikakuLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/shikaku/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Shikaku level');
        return await response.json();
    },
    getNonogramLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/nonogram/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Nonogram level');
        return await response.json();
    },
    getPipesLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/pipes/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Pipes level');
        return await response.json();
    },
    getTowerLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/tower/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Tower level');
        return await response.json();
    },
    getWordleLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/wordle/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Wordle level');
        return await response.json();
    },
    get2048Level: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/2048/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load 2048 level');
        return await response.json();
    },
    getMinesweeperLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/minesweeper/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Minesweeper level');
        return await response.json();
    },
    getMemoryLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/memory/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Memory level');
        return await response.json();
    },
    getSlidingLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/sliding/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Sliding level');
        return await response.json();
    },
    getLightsOutLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/lightsout/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load LightsOut level');
        return await response.json();
    },
    getColorFloodLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/colorflood/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load ColorFlood level');
        return await response.json();
    },
    getPacman: async () => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/pacman/new`);
        if (!response.ok) throw new Error('Failed to load Pacman');
        return await response.json();
    },
    getPacmanLevel: async (level) => {
        if (api._multiplayerData) return api._multiplayerData;
        const response = await fetch(`${API_BASE_URL}/games/pacman/new?level=${level}`);
        if (!response.ok) throw new Error('Failed to load Pacman level');
        return await response.json();
    },
    deductCoins: async (amount) => {
        const token = await api.getToken();
        if (!token) return null;
        const response = await fetch(`${API_BASE_URL}/stats/deduct-coins`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ amount })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to deduct coins");
        }
        return await response.json();
    },
    purchaseItem: async (itemId, price) => {
        const token = await api.getToken();
        if (!token) return null;
        const response = await fetch(`${API_BASE_URL}/stats/purchase-item`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ item_id: itemId, price })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Purchase failed");
        }
        return await response.json();
    },

    // ── Daily Login Reward ──────────────────────────────────────────────────
    claimDailyReward: async () => {
        const token = await api.getToken();
        if (!token) return null;
        const response = await fetch(`${API_BASE_URL}/auth/daily-reward`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) return null;
        return await response.json();
    },

    // ── Achievements ────────────────────────────────────────────────────────
    checkAchievements: async () => {
        const token = await api.getToken();
        if (!token) return null;
        const response = await fetch(`${API_BASE_URL}/stats/check-achievements`, {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) return null;
        return await response.json();
    },

    // ── Continue Where You Left Off (local storage) ─────────────────────────
    saveGameProgress: async (gameType, progressData) => {
        const key = `game_progress_${gameType}`;
        await storage.setItem(key, JSON.stringify({
            ...progressData,
            savedAt: new Date().toISOString(),
        }));
    },

    loadGameProgress: async (gameType) => {
        const key = `game_progress_${gameType}`;
        const data = await storage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    clearGameProgress: async (gameType) => {
        const key = `game_progress_${gameType}`;
        await storage.removeItem(key);
    },

    getAllSavedGames: async () => {
        const gameTypes = [
            'sudoku', '2048', 'shikaku', 'wordle', 'nonogram', 'pipes',
            'tower', 'minesweeper', 'memory', 'sliding', 'lightsout',
            'colorflood', 'pacman',
        ];
        const saved = [];
        for (const g of gameTypes) {
            const data = await api.loadGameProgress(g);
            if (data && !data.isCompleted) {
                saved.push({ gameType: g, ...data });
            }
        }
        return saved;
    },
};

// Local storage helper functions
function getDefaultGuestStats() {
    const games = ["sudoku", "2048", "shikaku", "wordle", "nonogram", "pipes", "tower", "minesweeper", "memory", "sliding", "lightsout", "colorflood", "pacman"];
    return games.map(g => ({
        game_type: g,
        games_played: 0,
        games_won: 0,
        fast_time: null,
        high_score: 0
    }));
}

async function updateGuestStatsLocal(gameType, won, timeTaken, score, solveToken = null) {
    // 1. Update total running stats
    let guestStats = getDefaultGuestStats();
    const guestStatsStr = await storage.getItem("guest_stats");
    if (guestStatsStr) {
        guestStats = JSON.parse(guestStatsStr);
    }
    
    const record = guestStats.find(r => r.game_type === gameType);
    if (record) {
        record.games_played += 1;
        if (won) {
            record.games_won += 1;
            if (timeTaken !== null) {
                if (record.fast_time === null || timeTaken < record.fast_time) {
                    record.fast_time = timeTaken;
                }
            }
        }
        if (score !== null && score > record.high_score) {
            record.high_score = score;
        }
    }
    await storage.setItem("guest_stats", JSON.stringify(guestStats));
    
    // 2. Queue for future backend sync
    let queue = [];
    const queueStr = await storage.getItem("guest_stats_queue");
    if (queueStr) {
        queue = JSON.parse(queueStr);
    }
    queue.push({ game_type: gameType, won, time_taken: timeTaken, score, solve_token: solveToken });
    await storage.setItem("guest_stats_queue", JSON.stringify(queue));
}

// Decode helper
export function base64Decode(str) {
    if (typeof window !== 'undefined' && window.atob) {
        return window.atob(str);
    }
    // Fallback simple base64 decoder if window is undefined
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    str = String(str).replace(/[=]+$/, '');
    if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}
