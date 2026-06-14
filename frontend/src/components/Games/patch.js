const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.js') && f !== 'patch.js');

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    const original = content;

    // 1. Update component signature to include level=null
    content = content.replace(/const \w+ = \(\{\s*([^}]*)\s*\}\) => \{/, (match, args) => {
        if (!args.includes('level')) {
            if (args.trim() === '') {
                args = 'level = null';
            } else {
                args += ', level = null';
            }
        }
        return match.replace(/\{.*\}/, `{ ${args} }`);
    });

    let game_api = f.replace('.js', '');
    if (game_api === 'Game2048') game_api = '2048';
    if (game_api === 'MemoryMatch') game_api = 'Memory';
    if (game_api === 'SlidingPuzzle') game_api = 'Sliding';

    // 2. Update api fetching logic
    const patternDaily = /(const data = isDaily\s*\n?\s*\?\s*await api\.getDaily\w+\(([^)]+)\)\s*\n?\s*:\s*await api\.get\w+\(([^)]+)\);)/;
    content = content.replace(patternDaily, (match, p1, daily_args, norm_args) => {
        return `let data;
            if (isDaily) data = await api.getDaily${game_api}(${daily_args});
            else if (level) data = await api.get${game_api}Level(level);
            else data = await api.get${game_api}(${norm_args});`;
    });

    const patternNorm = /(const data = await api\.get\w+\(([^)]+)\);)/;
    if (!content.includes('getCompletedLevels')) {
        content = content.replace(patternNorm, (match, p1, norm_args) => {
            return `let data;
            if (level) data = await api.get${game_api}Level(level);
            else data = await api.get${game_api}(${norm_args});`;
        });
    }

    // 3. Update win tracking
    const game_id = game_api.toLowerCase();
    const patternWin = /(await api\.updateGuestStatsLocal\([^;]+;(\s*if\s*\(isDaily\)\s*await api\.setDailyCompleted[^;]+;)?)/;
    content = content.replace(patternWin, (match) => {
        return `if (level) { await api.markLevelComplete('${game_id}', level); } else { ${match} }`;
    });

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf-8');
        console.log('Updated', f);
    }
});
