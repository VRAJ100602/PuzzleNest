/* ── 2048 Game Module ────────────────────────────────────────────────────── */
window["2048Game"] = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const size = data.grid_size || 4;
    const target = data.target_tile || 2048;
    let grid = Array.from({ length: size }, () => Array(size).fill(0));
    let scoreNum = 0;
    let bestScore = parseInt(localStorage.getItem('pn-2048-best') || '0', 10);
    let won = false;
    let dead = false;

    container.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'g2-meta';
    meta.innerHTML = `
      <div class="g2-scorebox"><div class="g2-score-label">Score</div><div class="g2-score-val" id="g2-score">0</div></div>
      <div class="g2-scorebox"><div class="g2-score-label">Best</div><div class="g2-score-val" id="g2-best">${bestScore}</div></div>
      <div class="g2-scorebox"><div class="g2-score-label">Target</div><div class="g2-score-val">${target}</div></div>
    `;
    container.appendChild(meta);

    const board = document.createElement('div');
    board.className = 'g2-board';
    board.style.gridTemplateColumns = `repeat(${size}, 70px)`;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'g2-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        board.appendChild(cell);
      }
    }
    container.appendChild(board);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;text-align:center';
    info.innerHTML = `Use <b>arrow keys</b> or <b>WASD</b> · Touch swipe also works · Reach <b>${target}</b> to win.`;

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const newBtn = document.createElement('button');
    newBtn.className = 'ctrl-btn danger';
    newBtn.textContent = '↺ New Game';
    newBtn.addEventListener('click', () => location.reload());
    controls.append(newBtn);

    container.append(info, controls);

    addRandomTile();
    addRandomTile();
    render();
    onStatus(`Slide tiles to merge them — reach ${target} to win!`, false);

    // Keyboard
    const keyHandler = (e) => {
      if (dead) return;
      let dir = null;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) dir = 'up';
      else if (['ArrowDown', 's', 'S'].includes(e.key)) dir = 'down';
      else if (['ArrowLeft', 'a', 'A'].includes(e.key)) dir = 'left';
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) dir = 'right';
      if (dir) { e.preventDefault(); move(dir); }
    };
    document.addEventListener('keydown', keyHandler);

    // Touch swipe
    let touchStart = null;
    board.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    });
    board.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) > 30) {
        if (ax > ay) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
      }
      touchStart = null;
    });

    function addRandomTile() {
      const empty = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 0) empty.push([r, c]);
      if (!empty.length) return false;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }

    function move(dir) {
      const before = JSON.stringify(grid);
      const merged = Array.from({ length: size }, () => Array(size).fill(false));
      const xForward = (dir === 'right');
      const yForward = (dir === 'down');
      const horizontal = (dir === 'left' || dir === 'right');

      function slide(r, c) {
        let nr = r, nc = c;
        while (true) {
          const tr = horizontal ? nr : (yForward ? nr + 1 : nr - 1);
          const tc = horizontal ? (xForward ? nc + 1 : nc - 1) : nc;
          if (tr < 0 || tr >= size || tc < 0 || tc >= size) break;
          if (grid[tr][tc] === 0) {
            grid[tr][tc] = grid[nr][nc];
            grid[nr][nc] = 0;
            nr = tr; nc = tc;
          } else if (grid[tr][tc] === grid[nr][nc] && !merged[tr][tc] && !merged[nr][nc]) {
            grid[tr][tc] *= 2;
            scoreNum += grid[tr][tc];
            merged[tr][tc] = true;
            grid[nr][nc] = 0;
            if (grid[tr][tc] >= target && !won) {
              won = true;
              onStatus(`✓ Reached ${target}!`, false);
              onScore(scoreNum);
              setTimeout(() => onComplete(scoreNum), 300);
            }
            break;
          } else break;
        }
      }

      // Iterate in correct order based on direction
      const rs = horizontal ? [...Array(size).keys()] : (yForward ? [...Array(size).keys()].reverse() : [...Array(size).keys()]);
      const cs = horizontal ? (xForward ? [...Array(size).keys()].reverse() : [...Array(size).keys()]) : [...Array(size).keys()];
      for (const r of rs) for (const c of cs) if (grid[r][c] !== 0) slide(r, c);

      if (JSON.stringify(grid) !== before) {
        addRandomTile();
        render();
        try { window.PNSound?.click?.(); } catch (_) {}
        if (scoreNum > bestScore) {
          bestScore = scoreNum;
          localStorage.setItem('pn-2048-best', String(bestScore));
        }
        document.getElementById('g2-score').textContent = scoreNum;
        document.getElementById('g2-best').textContent = bestScore;
        if (!canMove()) {
          dead = true;
          onStatus(won ? '✓ No more moves — you reached the target!' : '⚠ Game over — no more moves.', !won);
          if (won) onComplete(scoreNum);
        }
      }
    }

    function canMove() {
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return true;
        if (r + 1 < size && grid[r][c] === grid[r + 1][c]) return true;
        if (c + 1 < size && grid[r][c] === grid[r][c + 1]) return true;
      }
      return false;
    }

    function render() {
      const cells = board.children;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const idx = r * size + c;
          const cell = cells[idx];
          const v = grid[r][c];
          cell.className = 'g2-cell';
          cell.textContent = v ? v : '';
          if (v) {
            const level = Math.min(11, Math.log2(v) | 0);
            cell.classList.add(`g2-t${level}`);
          }
        }
      }
    }

    return {
      hint() { onStatus('💡 Build your highest tile in a corner and don\'t move that direction.', false); },
      progress() {
        let maxTile = 0;
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) maxTile = Math.max(maxTile, grid[r][c]);
        return maxTile >= target ? 100 : Math.round(Math.log2(Math.max(2, maxTile)) / Math.log2(target) * 100);
      },
      destroy() { document.removeEventListener('keydown', keyHandler); },
    };
  }

  return { init };
})();
