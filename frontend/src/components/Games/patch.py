import os
import glob
import re

files = glob.glob('*.js')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original = content
    
    # 1. Update component signature to include level=null
    # e.g. const Sudoku = ({ isDaily = false, onFinishGame }) => {
    # e.g. const MemoryMatch = ({ isDaily = false, onFinishGame }) => {
    # Note: Nonogram, Pipes, Tower might not have isDaily or onFinishGame?
    # Actually GameScreen passes onFinishGame to all of them now (as of my previous edit).
    if re.search(r'const \w+ = \(\{\s*([^}]*)\s*\}\) => \{', content):
        def sig_repl(m):
            args = m.group(1)
            if 'level' not in args:
                if args.strip() == '':
                    args = 'level = null'
                else:
                    args += ', level = null'
            return f"const {m.group(0).split('=')[0].split(' ')[1]} = ({{ {args} }}) => {{"
        content = re.sub(r'const \w+ = \(\{\s*([^}]*)\s*\}\) => \{', sig_repl, content, count=1)
    
    # 2. Update api fetching logic. Look for await api.getXXX
    # Most have: await api.getDailySudoku(todayStr, diff) : await api.getSudoku(diff)
    # We want to insert `else if (level) data = await api.get{Game}Level(level);`
    
    # Instead of complex regex, let's just find the `await api.get...` block and replace it carefully.
    game_name = f.replace('.js', '')
    if game_name == 'Game2048': game_api = '2048'
    elif game_name == 'MemoryMatch': game_api = 'Memory'
    elif game_name == 'SlidingPuzzle': game_api = 'Sliding'
    else: game_api = game_name
    
    # For games with isDaily
    pattern_daily = r'(const data = isDaily\s*\n\s*\?\s*await api\.getDaily\w+\(([^)]+)\)\s*\n\s*:\s*await api\.get\w+\(([^)]+)\);)'
    if re.search(pattern_daily, content):
        def api_repl(m):
            daily_args = m.group(2)
            norm_args = m.group(3)
            return f"let data;\n            if (isDaily) data = await api.getDaily{game_api}({daily_args});\n            else if (level) data = await api.get{game_api}Level(level);\n            else data = await api.get{game_api}({norm_args});"
        content = re.sub(pattern_daily, api_repl, content)
    else:
        # Games without isDaily (maybe?)
        pattern_norm = r'(const data = await api\.get\w+\(([^)]+)\);)'
        if re.search(pattern_norm, content) and 'getCompletedLevels' not in content:
            def api_repl2(m):
                norm_args = m.group(2)
                return f"let data;\n            if (level) data = await api.get{game_api}Level(level);\n            else data = await api.get{game_api}({norm_args});"
            content = re.sub(pattern_norm, api_repl2, content)

    # 3. Update win tracking. Look for api.updateGuestStatsLocal
    # We want to wrap it: if (level) { await api.markLevelComplete(gameId, level); } else { ... }
    
    game_id = game_api.lower()
    
    pattern_win = r'(await api\.updateGuestStatsLocal\([^;]+;(\s*if\s*\(isDaily\)\s*await api\.setDailyCompleted[^;]+;)?)'
    if re.search(pattern_win, content):
        def win_repl(m):
            return f"if (level) {{ await api.markLevelComplete('{game_id}', level); }} else {{ {m.group(0)} }}"
        content = re.sub(pattern_win, win_repl, content)

    if content != original:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {f}")
