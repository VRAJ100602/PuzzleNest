const fs = require('fs');

// PATCH API.JS
let apiContent = fs.readFileSync('src/utils/api.js', 'utf-8');

// Add multiplayer intercept fields
if (!apiContent.includes('_multiplayerData:')) {
    apiContent = apiContent.replace(
        /export const api = \{/,
        `export const api = {
    _multiplayerData: null,
    setMultiplayerData: (data) => { api._multiplayerData = data; },
    _multiplayerWinCallback: null,
    setMultiplayerWinCallback: (cb) => { api._multiplayerWinCallback = cb; },`
    );

    // Intercept game fetching methods
    const games = ['Sudoku', 'Wordle', 'Shikaku', 'Nonogram', '2048', 'Pipes', 'Tower', 'Minesweeper', 'Memory', 'Sliding', 'LightsOut', 'ColorFlood'];
    games.forEach(g => {
        const regex = new RegExp(`(get${g}: async \\(.*?\\) => \\{)`);
        apiContent = apiContent.replace(regex, `$1\n        if (api._multiplayerData) return api._multiplayerData;`);
        const regexLevel = new RegExp(`(get${g}Level: async \\(.*?\\) => \\{)`);
        apiContent = apiContent.replace(regexLevel, `$1\n        if (api._multiplayerData) return api._multiplayerData;`);
    });
    // Add getGame2048, etc
    apiContent = apiContent.replace(/getGame2048: async \(.*?\) => \{/, "getGame2048: async () => {\n        if (api._multiplayerData) return api._multiplayerData;");

    // Intercept updateStats
    apiContent = apiContent.replace(
        /updateStats: async \(gameType, won, timeTaken, score\) => \{/,
        `updateStats: async (gameType, won, timeTaken, score) => {
        if (api._multiplayerData && won && api._multiplayerWinCallback) {
            api._multiplayerWinCallback();
        }`
    );

    fs.writeFileSync('src/utils/api.js', apiContent);
    console.log("api.js patched.");
}

// PATCH MULTIPLAYERSCREEN.JS
let mpContent = fs.readFileSync('src/screens/MultiplayerScreen.js', 'utf-8');

// Imports
if (!mpContent.includes('import Sudoku from')) {
    const imports = `import Sudoku from '../components/Games/Sudoku';
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
};`;
    mpContent = mpContent.replace(/import \{ useMultiplayer \} from '\.\.\/utils\/useMultiplayer';/, "import { useMultiplayer } from '../utils/useMultiplayer';\nimport { api } from '../utils/api';\n" + imports);
}

// Add state for game picker and update hook
mpContent = mpContent.replace(
    /const \{([\s\S]*?)\} = useMultiplayer\(\);/,
    `const {\n$1\n    } = useMultiplayer();\n    const [selectedGameToQueue, setSelectedGameToQueue] = useState('random');`
);

// Intercept logic in useEffect
const useEffectStr = `
    useEffect(() => {
        if (status === 'playing' && puzzle_data) {
            api.setMultiplayerData(puzzle_data);
            api.setMultiplayerWinCallback(() => {
                sendSolve();
            });
        } else {
            api.setMultiplayerData(null);
            api.setMultiplayerWinCallback(null);
        }
        return () => {
            api.setMultiplayerData(null);
            api.setMultiplayerWinCallback(null);
        };
    }, [status, puzzle_data]);
`;
// Wait, we need to make sure we replace `puzzle` with `puzzle_data` since useMultiplayer exports puzzle.
mpContent = mpContent.replace(
    /useEffect\(\(\) => \{\s*Animated\.parallel\(/,
    `useEffect(() => {
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
        Animated.parallel(`
);

// Update Idle state UI to include Game Picker
const lobbyUI = `
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
`;
mpContent = mpContent.replace(/<Text style=\{styles\.lobbyDesc\}>[\s\S]*?<\/Text>/, lobbyUI);
mpContent = mpContent.replace(/joinQueue\(\);/, "joinQueue(selectedGameToQueue);");

// Update Playing state UI
const playingUI = `
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
`;
mpContent = mpContent.replace(/\{\/\* Sudoku Board \*\/\}([\s\S]*?)<\/GlassCard>/, playingUI);
mpContent = mpContent.replace(/const \{ gameType \} = useMultiplayer\(\);/, ""); // just to be safe
mpContent = mpContent.replace(/status, myUsername, opponent, puzzle, solution,/, "status, myUsername, opponent, puzzle, solution, gameType,");

fs.writeFileSync('src/screens/MultiplayerScreen.js', mpContent);
console.log("MultiplayerScreen.js patched.");
