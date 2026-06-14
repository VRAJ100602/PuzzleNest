/* ── Snap (Memory Match) Game Module ────────────────────────────────────── */
window.SnapGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { cards, rows, cols, pairs } = data;
    const state = cards.map((v, i) => ({ id: i, value: v, flipped: false, matched: false }));
    let firstFlip = null;
    let lockBoard = false;
    let moves = 0;
    let matchedPairs = 0;

    container.innerHTML = '';

    const gridEl = document.createElement('div');
    gridEl.className = 'snap-grid';
    gridEl.style.gridTemplateColumns = `repeat(${cols || 4}, 80px)`;

    const FLIP_DIRS = ['', 'dir-left', 'dir-up', 'dir-down'];

    const cardEls = state.map((card, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'snap-card';
      // Cycle directions so every adjacent card flips a different way (right, left, up, down…)
      const dir = FLIP_DIRS[i % FLIP_DIRS.length];
      if (dir) wrap.classList.add(dir);

      const inner = document.createElement('div');
      inner.className = 'snap-card-inner';

      const back = document.createElement('div');
      back.className = 'snap-back';

      const front = document.createElement('div');
      front.className = 'snap-front';
      front.textContent = card.value;

      inner.append(back, front);
      wrap.appendChild(inner);

      wrap.addEventListener('click', () => flipCard(i));
      gridEl.appendChild(wrap);
      return wrap;
    });

    const movesEl = document.createElement('div');
    movesEl.style.cssText = 'font-size:13px;color:var(--muted);margin-top:12px;text-align:center';
    movesEl.textContent = `Moves: 0 — Pairs: 0/${pairs}`;

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const newBtn = document.createElement('button');
    newBtn.className = 'ctrl-btn danger';
    newBtn.textContent = '↺ New Game';
    newBtn.addEventListener('click', () => location.reload());
    controls.append(newBtn);

    container.append(gridEl, movesEl, controls);
    onStatus(`Find all ${pairs} matching pairs!`, false);

    function flipCard(i) {
      if (lockBoard || state[i].flipped || state[i].matched) return;
      state[i].flipped = true;
      cardEls[i].classList.add('flipped');

      if (!firstFlip) {
        firstFlip = i;
        return;
      }

      moves++;
      movesEl.textContent = `Moves: ${moves} — Pairs: ${matchedPairs}/${pairs}`;

      if (state[firstFlip].value === state[i].value && firstFlip !== i) {
        // Match!
        state[firstFlip].matched = true;
        state[i].matched = true;
        cardEls[firstFlip].querySelector('.snap-front').classList.add('matched');
        cardEls[i].querySelector('.snap-front').classList.add('matched');
        cardEls[firstFlip].classList.add('matched');
        cardEls[i].classList.add('matched');
        matchedPairs++;
        movesEl.textContent = `Moves: ${moves} — Pairs: ${matchedPairs}/${pairs}`;
        firstFlip = null;
        onStatus(`✓ Match! ${matchedPairs}/${pairs} pairs found`, false);
        const s = Math.max(100, 1000 - (moves - pairs) * 20);
        onScore(s);
        if (matchedPairs === pairs) { setTimeout(() => onComplete(s), 300); }
      } else {
        // No match — flip back
        lockBoard = true;
        const f = firstFlip;
        firstFlip = null;
        setTimeout(() => {
          state[f].flipped = false;
          state[i].flipped = false;
          cardEls[f].classList.remove('flipped');
          cardEls[i].classList.remove('flipped');
          lockBoard = false;
        }, 900);
        onStatus(`✗ No match — keep trying (${moves} moves)`, true);
      }
    }

    return {
      hint() {
        // Reveal an unmatched pair briefly
        const unmatched = state.filter(c => !c.matched && !c.flipped);
        if (unmatched.length < 2) return;
        const val = unmatched[0].value;
        const pair = state.filter(c => !c.matched && c.value === val);
        pair.forEach(c => cardEls[c.id].classList.add('flipped'));
        setTimeout(() => pair.forEach(c => { if(!c.matched) cardEls[c.id].classList.remove('flipped'); }), 1500);
        onStatus(`💡 Revealed a pair briefly`, false);
      }
    };
  }

  return { init };
})();
