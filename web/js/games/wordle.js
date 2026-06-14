/* ── Wordle Game Module ──────────────────────────────────────────────────── */
window.WordleGame = (() => {
  const API = '/api/v1';

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { puzzle_id, valid_words } = data;
    const wordLen = 5;
    const maxGuesses = data.max_guesses || 6;
    const validSet = new Set((valid_words || []).map(w => w.toLowerCase()).filter(w => w.length === wordLen));

    const guesses = [];   // [{word, feedback[]}]
    let current = '';
    let isLocked = false; // lock during guess submission

    container.innerHTML = '';

    // Build board: rows of tiles
    const board = document.createElement('div');
    board.className = 'wdl-board';
    const tiles = [];
    for (let r = 0; r < maxGuesses; r++) {
      const row = document.createElement('div');
      row.className = 'wdl-row';
      tiles[r] = [];
      for (let c = 0; c < wordLen; c++) {
        const t = document.createElement('div');
        t.className = 'wdl-tile';
        row.appendChild(t);
        tiles[r][c] = t;
      }
      board.appendChild(row);
    }

    // Build on-screen keyboard
    const kb = document.createElement('div');
    kb.className = 'wdl-kb';
    const rows = ['qwertyuiop', 'asdfghjkl', 'ENTERzxcvbnmBACK'];
    const keyEls = {};
    for (const rk of rows) {
      const row = document.createElement('div');
      row.className = 'wdl-kb-row';
      // Split the third row to extract ENTER/BACK
      if (rk === 'ENTERzxcvbnmBACK') {
        const items = ['ENTER', ...'zxcvbnm', 'BACK'];
        for (const k of items) {
          const btn = document.createElement('button');
          btn.className = 'wdl-key' + (k === 'ENTER' || k === 'BACK' ? ' wide' : '');
          btn.textContent = k === 'BACK' ? '⌫' : k.toUpperCase();
          btn.addEventListener('click', () => handleKey(k));
          keyEls[k.toLowerCase()] = btn;
          row.appendChild(btn);
        }
      } else {
        for (const k of rk) {
          const btn = document.createElement('button');
          btn.className = 'wdl-key';
          btn.textContent = k.toUpperCase();
          btn.addEventListener('click', () => handleKey(k));
          keyEls[k] = btn;
          row.appendChild(btn);
        }
      }
      kb.appendChild(row);
    }

    container.append(board, kb);
    onStatus(`Guess the 5-letter word — ${maxGuesses} attempts.`, false);

    // Keyboard listener
    const keyHandler = (e) => {
      if (isLocked) return;
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('BACK');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
    };
    document.addEventListener('keydown', keyHandler);

    function handleKey(k) {
      if (isLocked) return;
      const row = guesses.length;
      if (k === 'ENTER') submitGuess();
      else if (k === 'BACK') {
        current = current.slice(0, -1);
        renderCurrent(row);
      }
      else if (/^[a-z]$/.test(k) && current.length < wordLen) {
        current += k;
        renderCurrent(row);
        try { window.PNSound?.click?.(); } catch (_) {}
      }
    }

    function renderCurrent(row) {
      for (let c = 0; c < wordLen; c++) {
        const t = tiles[row][c];
        t.textContent = (current[c] || '').toUpperCase();
        t.classList.toggle('typed', !!current[c]);
      }
    }

    async function submitGuess() {
      if (current.length !== wordLen) {
        onStatus('⚠ Word must be 5 letters.', true);
        return;
      }
      if (validSet.size && !validSet.has(current)) {
        onStatus(`⚠ "${current.toUpperCase()}" is not in the word list.`, true);
        shakeRow(guesses.length);
        return;
      }
      isLocked = true;
      try {
        const r = await fetch(`${API}/games/wordle/guess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzle_id, guess: current }),
        });
        if (!r.ok) {
          onStatus('⚠ Could not submit — try again.', true);
          isLocked = false;
          return;
        }
        const data = await r.json();
        applyFeedback(guesses.length, current, data.feedback);
        guesses.push({ word: current, feedback: data.feedback });
        const guessedWord = current;
        current = '';
        if (data.correct) {
          onStatus(`✓ Solved! "${guessedWord.toUpperCase()}" in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}.`, false);
          const score = Math.max(100, Math.round(1000 * (1 - (guesses.length - 1) / maxGuesses)));
          onScore(score);
          onComplete(score);
        } else if (guesses.length >= maxGuesses) {
          onStatus('⚠ Out of guesses — better luck next time!', true);
        }
      } catch (e) {
        onStatus('⚠ Network error.', true);
      } finally {
        if (current === '') isLocked = false;
        else isLocked = false;
      }
    }

    function applyFeedback(row, word, feedback) {
      const order = ['absent', 'present', 'correct'];
      for (let c = 0; c < wordLen; c++) {
        const t = tiles[row][c];
        t.textContent = word[c].toUpperCase();
        t.classList.remove('typed');
        // Animated flip-reveal
        t.style.transitionDelay = (c * 0.12) + 's';
        setTimeout(() => t.classList.add(feedback[c]), c * 120);

        // Update keyboard: only upgrade (correct > present > absent)
        const k = keyEls[word[c]];
        if (k) {
          const have = ['correct', 'present', 'absent'].find(s => k.classList.contains(s));
          const next = feedback[c];
          if (!have || order.indexOf(next) > order.indexOf(have)) {
            if (have) k.classList.remove(have);
            k.classList.add(next);
          }
        }
      }
    }

    function shakeRow(row) {
      const el = tiles[row]?.[0]?.parentElement;
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    }

    return {
      hint() { onStatus('💡 Use a word with lots of vowels and common letters to start.', false); },
      progress() { return Math.min(95, Math.round(guesses.length / maxGuesses * 90)); },
      destroy() { document.removeEventListener('keydown', keyHandler); },
    };
  }

  return { init };
})();
