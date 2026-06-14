/* =========================================================
   PuzzleNest — app.js  v1.1.0
   Shared utilities, timer, API helper, game loader,
   level progression, auth score submission.
   ========================================================= */

const API         = '/api/v1';
const APP_VERSION = '1.1.0';   // bump to bust cached game modules

// ── Tiny helpers ─────────────────────────────────────────────────────────
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const fmtTime = sec => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

// ── API wrapper ──────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ── App namespace (game page) ────────────────────────────────────────────
const App = (() => {
  const GAME_META = {
    sudoku:    { title:'Sudoku',     sub:'Classic 9×9',   icon:'/icons/sudoku.svg',    hint:'Start with rows/columns/boxes that have the most givens.' },
    crossword: { title:'Crossword',  sub:'7×7 Grid',      icon:'/icons/crossword.svg', hint:'Find the shortest words first — they constrain more squares.' },
    pipes:     { title:'Pipes',      sub:'Rotation',      icon:'/icons/pipes.svg',     hint:'Start from the source or sink and work outward.' },
    mosaic:    { title:'Mosaic',     sub:'Fill-a-Pix',    icon:'/icons/mosaic.svg',    hint:'Cells with clue 0 must be empty; max-clue cells must be full.' },
    shikaku:   { title:'Shikaku',    sub:'Rectangles',    icon:'/icons/shikaku.svg',   hint:'Prime-number clues (2,3,5,7) have limited rectangle shapes.' },
    lits:      { title:'LITS',       sub:'Tetrominoes',   icon:'/icons/lits.svg',      hint:'Every region needs exactly one L/I/T/S tetromino.' },
    snap:      { title:'Snap',       sub:'Memory Match',  icon:'/icons/snap.svg',      hint:'Remember card positions — flip two at a time.' },
    atoms:     { title:'Atoms',      sub:'Chain React',   icon:'/icons/atoms.svg',     hint:'Build atoms near corners first — they explode with fewer.' },
    kings:     { title:'Kings',      sub:'Non-Attack',    icon:'/icons/kings.svg',     hint:'Kings on alternate rows/columns are always safe.' },
    mambo:     { title:'Mambo',      sub:'Hidato Path',   icon:'/icons/mambo.svg',     hint:'Find given numbers and trace the path between them.' },
    nonogram:  { title:'Nonogram',   sub:'Picross Grid',  icon:'/icons/nonogram.svg',  hint:'Largest clues first — they constrain rows and columns the most.' },
    wordle:    { title:'Wordle',     sub:'5-Letter Word', icon:'/icons/wordle.svg',    hint:'Start with words rich in vowels and common letters.' },
    minesweeper:{ title:'Minesweeper',sub:'Mine Field',   icon:'/icons/minesweeper.svg',hint:'Corners are safer to start with — fewer adjacent cells to worry about.' },
    "2048":    { title:'2048',       sub:'Slide & Merge', icon:'/icons/2048.svg',      hint:'Keep your highest tile in a corner. Never move it.' },
  };

  let currentType  = null;
  let currentLevel = 1;
  let difficulty   = 'medium';
  let currentSize  = null;   // explicit grid size (shikaku/crossword/mosaic)
  let timerSec     = 0;
  let timerInterval= null;
  let hintsLeft    = 3;
  let score        = 0;
  let activeGame   = null;

  // Selectable grid sizes per game type
  const SIZE_OPTIONS = {
    shikaku:   [5, 6, 7, 8, 9],
    crossword: [7, 8, 9],
    mosaic:    [6, 7, 8],
  };

  // ── Multiplayer iframe bridge ───────────────────────────────────────────
  // When game is loaded inside the multiplayer page (iframe), respond to
  // 'pn-mp-poll' messages from the parent with current progress percentage.
  function setupMPBridge() {
    const params = new URLSearchParams(location.search);
    if (params.get('mp') !== '1') return;
    window.addEventListener('message', (ev) => {
      if (ev.data?.type === 'pn-mp-poll' && window.parent) {
        let pct = 0;
        try {
          if (activeGame?.progress) pct = activeGame.progress();
          else if (timerSec > 0) pct = Math.min(95, Math.floor(timerSec / 180 * 100)); // time fallback
        } catch (_) {}
        try { window.parent.postMessage({ type: 'pn-mp-progress', pct }, '*'); } catch (_) {}
      }
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function init() {
    if (!$('#game-container')) return;   // not on game page
    setupMPBridge();

    const params = new URLSearchParams(location.search);
    currentType  = params.get('type')  || 'sudoku';
    currentLevel = parseInt(params.get('level') || '1', 10) || 1;
    const isDaily= params.get('daily') === '1';

    // Persisted stats
    const stored = JSON.parse(localStorage.getItem('pn-stats') || '{}');
    const solvedEl = $('#stat-solved-count');
    const streakEl = $('#stat-streak-count');
    if (solvedEl) solvedEl.textContent = stored.solved || 0;
    if (streakEl) streakEl.textContent = '🔥' + (stored.streak || 0);

    // Header meta
    const meta = GAME_META[currentType] || {};
    const titleEl = $('#game-title');
    const subEl   = $('#game-sub');
    if (titleEl) titleEl.textContent = meta.title || currentType;
    if (subEl)   subEl.textContent   = meta.sub   || '';
    document.title = `PuzzleNest — ${meta.title || currentType}`;

    // Hint text
    const hintBox = $('#hint-box');
    if (hintBox) hintBox.textContent = meta.hint || 'Play the puzzle to get contextual hints.';
    const hintBtn = $('#hint-btn');
    if (hintBtn) hintBtn.addEventListener('click', useHint);

    // Difficulty selector
    difficulty = params.get('diff') || localStorage.getItem('pn-difficulty') || 'medium';
    $$('#diff-selector .ctrl-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === difficulty));

    // Grid-size selector (only for games that support it)
    const sizeParam = parseInt(params.get('size') || '', 10);
    if (SIZE_OPTIONS[currentType] && SIZE_OPTIONS[currentType].includes(sizeParam)) {
      currentSize = sizeParam;
    }
    buildSizeSelector();

    // Level badge
    updateLevelBadge();

    buildGameSwitcher();
    loadSidebarLeaderboard();

    loadGameScript(currentType, () => {
      isDaily ? fetchAndStartDaily() : fetchAndStart(currentLevel);
    });
  }

  // ── Level badge ──────────────────────────────────────────────────────────
  function updateLevelBadge() {
    const numEl = $('#level-num');
    if (numEl) numEl.textContent = currentLevel;
  }

  // ── Load a specific level ────────────────────────────────────────────────
  function loadLevel(level) {
    currentLevel = level;
    updateLevelBadge();
    fetchAndStart(level);
  }

  // ── Dynamic script loader ─────────────────────────────────────────────────
  function loadGameScript(type, cb) {
    if (document.querySelector(`script[data-game="${type}"]`)) { cb(); return; }
    const s = document.createElement('script');
    s.src = `/js/games/${type}.js?v=${APP_VERSION}`;
    s.dataset.game = type;
    s.onload  = cb;
    s.onerror = () => setStatus(`Failed to load game script: ${type}`, true);
    document.body.appendChild(s);
  }

  // ── Fetch puzzle (level or difficulty) ───────────────────────────────────
  async function fetchAndStart(level = 1) {
    setStatus('Loading puzzle…', false);
    try {
      let url = `/games/${currentType}/new?difficulty=${difficulty}&level=${level}`;
      if (currentSize) url += `&size=${currentSize}`;
      const data = await apiFetch(url);
      startGame(data);
    } catch (e) {
      setStatus('Could not load puzzle. Is the backend running?', true);
      console.error(e);
    }
  }

  async function fetchAndStartDaily() {
    setStatus('Loading daily puzzle…', false);
    const today = new Date().toISOString().slice(0, 10);

    // Archive support: ?date=YYYY-MM-DD replays a past daily (premium only)
    let date = today;
    const requested = new URLSearchParams(location.search).get('date');
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested !== today) {
      const status = await (window.Billing?.fetchStatus?.() || Promise.resolve(null));
      if (!status?.is_premium) {
        setStatus('The daily archive is a Premium feature.', true);
        setTimeout(() => location.href = '/pricing.html', 1500);
        return;
      }
      date = requested;
    }

    try {
      let url = `/games/${currentType}/daily?date=${date}&difficulty=${difficulty}`;
      if (currentSize) url += `&size=${currentSize}`;
      const data = await apiFetch(url);
      startGame(data);
      if (date !== today) {
        const subEl = $('#game-sub');
        if (subEl) subEl.textContent = `Archive — daily puzzle from ${date}`;
      }
    } catch (e) {
      setStatus('Could not load daily puzzle.', true);
      console.error(e);
    }
  }

  // ── Grid-size selector ─────────────────────────────────────────────────────
  function buildSizeSelector() {
    const sizes = SIZE_OPTIONS[currentType];
    if (!sizes) return;   // game doesn't support size selection

    // If no explicit size yet, default to the game's smallest offered size
    if (!currentSize) currentSize = sizes[0];

    // Build a sidebar section (insert before the difficulty section)
    const diffSection = $('#diff-selector')?.closest('.sidebar-section');
    if (!diffSection) return;

    let section = $('#size-selector-section');
    if (!section) {
      section = document.createElement('div');
      section.className = 'sidebar-section';
      section.id = 'size-selector-section';
      section.innerHTML = `
        <div class="ss-title">📏 Grid Size</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="size-selector"></div>`;
      diffSection.parentNode.insertBefore(section, diffSection);
    }

    const wrap = $('#size-selector', section);
    wrap.innerHTML = '';
    sizes.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'ctrl-btn' + (s === currentSize ? ' active' : '');
      btn.dataset.size = s;
      btn.textContent = `${s}×${s}`;
      btn.style.flex = '1 0 28%';
      btn.onclick = () => setSize(s, btn);
      wrap.appendChild(btn);
    });
  }

  function setSize(size, btn) {
    currentSize = size;
    $$('#size-selector .ctrl-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchAndStart(currentLevel);
  }

  // ── Start game ───────────────────────────────────────────────────────────
  function startGame(data) {
    stopTimer();
    timerSec  = 0;
    score     = 0;
    const isPremium = !!window.PN?.premium?.is_premium;
    hintsLeft = isPremium ? Infinity : 3;
    const hintsEl = $('#hints-left');
    if (hintsEl) hintsEl.textContent = isPremium ? '∞' : hintsLeft;
    updateScoreDisplay();

    const container = $('#game-container');
    if (!container) return;
    container.innerHTML = '';

    const GameModule = window[capitalize(currentType) + 'Game'];
    if (!GameModule) { setStatus(`Game module not found: ${currentType}`, true); return; }

    activeGame = GameModule.init(container, data, {
      onComplete: handleComplete,
      onScore:    s => { score = s; updateScoreDisplay(); },
      onStatus:   (msg, err) => setStatus(msg, err),
    });

    setStatus('Puzzle loaded — good luck!', false);
    startTimer();

    // Save "Continue Where You Left Off" entry
    if (window.Features && window.Features.ContinueGames) {
      const params = new URLSearchParams(location.search);
      window.Features.ContinueGames.save(currentType, {
        level: currentLevel,
        difficulty: difficulty,
        size: currentSize,
        isDaily: params.get('daily') === '1',
        timeSec: 0,
      });
    }
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  function startTimer() {
    timerInterval = setInterval(() => {
      timerSec++;
      const el = $('#timer-display');
      if (el) el.textContent = fmtTime(timerSec);
      // Keep Continue entry fresh every 10s while playing
      if (timerSec % 10 === 0 && window.Features && window.Features.ContinueGames) {
        window.Features.ContinueGames.updateTime(currentType, timerSec);
      }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

  // ── Win handler ──────────────────────────────────────────────────────────
  async function handleComplete(finalScore) {
    stopTimer();
    if (finalScore !== undefined) score = finalScore;

    // Multiplayer iframe: notify parent of solve
    const _mpParams = new URLSearchParams(location.search);
    if (_mpParams.get('mp') === '1' && window.parent) {
      try { window.parent.postMessage({ type: 'pn-mp-solve' }, '*'); } catch (_) {}
    }

    // Update local streak/solved
    const streak = (parseInt(localStorage.getItem('pn-streak') || '0')) + 1;
    const solved = (parseInt(localStorage.getItem('pn-solved') || '0')) + 1;
    localStorage.setItem('pn-streak', streak);
    localStorage.setItem('pn-solved', solved);
    localStorage.setItem('pn-stats', JSON.stringify({ streak, solved }));

    // Mark level complete
    if (typeof Levels !== 'undefined') {
      Levels.markComplete(currentType, currentLevel, score, timerSec);
    }

    // Tournament submission — if URL has ?tournament=N, send score to backend
    const _params = new URLSearchParams(location.search);
    const _tid = _params.get('tournament');
    if (_tid && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      try {
        const r = await fetch(`${API}/tournaments/${_tid}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
          body: JSON.stringify({ score: score, time_taken: timerSec }),
        });
        const data = await r.json();
        if (r.ok && data.improved) {
          setStatus(`🏆 New tournament best: ${score} · ${fmtTime(timerSec)}`, false);
        }
      } catch (_) {}
    }

    if (_params.get('daily') === '1') {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const key = 'pn-daily-' + currentType;
        const prev = JSON.parse(localStorage.getItem(key) || '{}');
        if (prev.lastDate !== today) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          const yISO = yesterday.toISOString().slice(0,10);
          const newStreak = (prev.lastDate === yISO ? (prev.streak || 0) : 0) + 1;
          localStorage.setItem(key, JSON.stringify({ done: true, lastDate: today, streak: newStreak }));
        }
      } catch (_) {}
    }

    // Submit score to backend if logged in, then evaluate achievements
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      await Auth.submitScore({
        gameType: currentType, won: true,
        score, timeTaken: timerSec
      });
      if (window.Features && window.Features.Achievements) {
        window.Features.Achievements.check();
      }
    }

    // Clear "Continue Where You Left Off" entry — puzzle done
    if (window.Features && window.Features.ContinueGames) {
      window.Features.ContinueGames.clear(currentType);
    }

    // Trigger confetti + solve modal celebration
    if (window.PNCelebrate) {
      const hintsUsed = (hintsLeft === Infinity) ? 0 : Math.max(0, 3 - hintsLeft);
      window.PNCelebrate.solve({
        game: (GAME_META[currentType]?.title || currentType),
        time: timerSec,
        score: score,
        hints: hintsUsed,
        difficulty: difficulty,
        level: currentLevel,
      });
    }

    // Show win overlay
    const overlay = $('#win-overlay');
    if (overlay) {
      const winTimeEl  = $('#win-time');
      const winScoreEl = $('#win-score');
      const winStreak  = $('#win-streak');
      const winSub     = $('#win-sub');
      if (winTimeEl)  winTimeEl.textContent  = fmtTime(timerSec);
      if (winScoreEl) winScoreEl.textContent = score;
      if (winStreak)  winStreak.textContent  = '🔥' + streak;
      if (winSub)     winSub.textContent     = timerSec < 60 ? 'Lightning fast! ⚡' : timerSec < 180 ? 'Outstanding work! 🎉' : 'Well done! 👏';
      overlay.style.display = 'flex';

      // Next level button
      const nextLevel = Math.min(currentLevel + 1, typeof Levels !== 'undefined' ? Levels.MAX_LEVELS : 50);
      $('#win-new').onclick = () => {
        overlay.style.display = 'none';
        loadLevel(nextLevel);
      };
      // Add "Next Level" text
      const winNewBtn = $('#win-new');
      if (winNewBtn) winNewBtn.textContent = currentLevel < 50 ? `Level ${nextLevel} →` : 'New Puzzle →';
    }
  }

  // ── Hint ──────────────────────────────────────────────────────────────────
  function useHint() {
    if (hintsLeft <= 0) return;
    if (activeGame?.hint) {
      try { window.PNSound?.hint(); } catch (_) {}
      activeGame.hint();
      if (hintsLeft !== Infinity) hintsLeft--;
      const el = $('#hints-left');
      if (el) el.textContent = hintsLeft === Infinity ? '∞' : hintsLeft;
    }
  }

  function nextPuzzle() {
    const nextLevel = Math.min(currentLevel + 1, typeof Levels !== 'undefined' ? Levels.MAX_LEVELS : 50);
    loadLevel(nextLevel);
  }

  // ── Difficulty change ────────────────────────────────────────────────────
  function setDifficulty(diff, btn) {
    difficulty = diff;
    localStorage.setItem('pn-difficulty', diff);
    $$('#diff-selector .ctrl-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchAndStart(currentLevel);
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  let _lastStatusErr = false;
  function setStatus(msg, isError) {
    const dot  = $('#status-dot');
    const text = $('#status-text');
    if (dot)  dot.className  = 'status-dot' + (isError ? ' err' : ' ok');
    if (text) text.textContent = msg;
    // Play error sound only on edge transitions to avoid spam
    if (isError && !_lastStatusErr) { try { window.PNSound?.error(); } catch (_) {} }
    _lastStatusErr = !!isError;
  }

  function updateScoreDisplay() {
    const el = $('#score-display');
    if (el) el.textContent = score;
  }

  // ── Sidebar leaderboard (static mock, real is on /leaderboard.html) ───────
  async function loadSidebarLeaderboard() {
    const list = $('#leaderboard-list');
    if (!list) return;
    const emptyState = `
      <div style="font-size:12px;color:var(--muted);padding:8px 0;line-height:1.7">
        No scores yet for this game.<br>
        <strong style="color:var(--ink)">Be the first on the board →</strong>
      </div>`;
    try {
      const data = await fetch(`${API}/stats/leaderboard/${currentType}/scores`)
        .then(r => r.ok ? r.json() : []);
      if (!data.length) { list.innerHTML = emptyState; return; }
      list.innerHTML = data.slice(0,5).map((r,i) => `
        <div class="leaderboard-row">
          <div class="lb-rank ${i===0?'gold':''}">${i+1}</div>
          <div class="lb-name">${(window.escapeHtml||(s=>s))(r.username)}${r.is_premium ? ' <span class="pn-premium-badge" title="Premium">★</span>' : ''}</div>
          <div class="lb-time">${r.high_score}</div>
        </div>`).join('');
    } catch(_) {
      list.innerHTML = emptyState;
    }
  }

  // ── Game switcher ─────────────────────────────────────────────────────────
  function buildGameSwitcher() {
    const sw = $('#game-switcher');
    if (!sw) return;
    const iconPaths = {sudoku:'/icons/sudoku.svg',crossword:'/icons/crossword.svg',pipes:'/icons/pipes.svg',mosaic:'/icons/mosaic.svg',shikaku:'/icons/shikaku.svg',lits:'/icons/lits.svg',snap:'/icons/snap.svg',atoms:'/icons/atoms.svg',kings:'/icons/kings.svg',mambo:'/icons/mambo.svg',nonogram:'/icons/nonogram.svg',wordle:'/icons/wordle.svg',minesweeper:'/icons/minesweeper.svg','2048':'/icons/2048.svg'};
    Object.keys(iconPaths).filter(id => id !== currentType).slice(0,6).forEach(id => {
      const btn = document.createElement('button');
      btn.className = 'ctrl-btn';
      btn.style.cssText = 'text-align:left;font-size:11px;padding:6px 10px;display:flex;align-items:center;gap:6px';
      btn.innerHTML = `<img src="${iconPaths[id]}" alt="" width="16" height="16"> ${capitalize(id)}`;
      btn.onclick = () => location.href = `/game.html?type=${id}`;
      sw.appendChild(btn);
    });
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return { setDifficulty, setSize, fetchAndStart, loadLevel, nextPuzzle, fmtTime, currentType: () => currentType };
})();
