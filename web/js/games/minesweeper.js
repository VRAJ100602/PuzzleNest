/* ── Minesweeper Game Module ─────────────────────────────────────────────── */
window.MinesweeperGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { rows, cols, mines, board } = data;
    // state per cell: 'hidden' | 'revealed' | 'flagged'
    const state = Array.from({ length: rows }, () => Array(cols).fill('hidden'));
    let isOver = false;
    let revealedCount = 0;
    let flagsLeft = mines;

    container.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'ms-meta';
    meta.innerHTML = `<span class="ms-meta-item"><b id="ms-flags">${flagsLeft}</b> flags</span><span class="ms-meta-item">${rows}×${cols} · ${mines} mines</span>`;
    container.appendChild(meta);

    const grid = document.createElement('div');
    grid.className = 'ms-grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, ${cols > 12 ? 24 : 30}px)`;

    const cells = [];
    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'ms-cell hidden';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', () => reveal(r, c));
        cell.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFlag(r, c); });
        grid.appendChild(cell);
        cells[r][c] = cell;
      }
    }
    container.appendChild(grid);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;text-align:center';
    info.textContent = 'Left-click to reveal · Right-click to flag · Avoid the mines.';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const newBtn = document.createElement('button');
    newBtn.className = 'ctrl-btn danger';
    newBtn.textContent = '↺ New Game';
    newBtn.addEventListener('click', () => location.reload());
    controls.append(newBtn);

    container.append(info, controls);
    onStatus(`${rows}×${cols} Minesweeper — careful where you click.`, false);

    function reveal(r, c) {
      if (isOver) return;
      if (state[r][c] !== 'hidden') return;
      if (board[r][c] === -1) {
        revealMine(r, c);
        gameOver(false);
        return;
      }
      // Flood fill on zeros
      const stack = [[r, c]];
      while (stack.length) {
        const [rr, cc] = stack.pop();
        if (state[rr][cc] !== 'hidden') continue;
        state[rr][cc] = 'revealed';
        revealedCount++;
        renderCell(rr, cc);
        if (board[rr][cc] === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = rr + dr, nc = cc + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && state[nr][nc] === 'hidden') stack.push([nr, nc]);
            }
          }
        }
      }
      try { window.PNSound?.click?.(); } catch (_) {}
      checkWin();
    }

    function revealMine(r, c) {
      // Reveal ALL mines on loss
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (board[i][j] === -1) {
            state[i][j] = 'revealed';
            renderCell(i, j, i === r && j === c);
          }
        }
      }
    }

    function toggleFlag(r, c) {
      if (isOver) return;
      if (state[r][c] === 'revealed') return;
      if (state[r][c] === 'flagged') {
        state[r][c] = 'hidden';
        flagsLeft++;
      } else {
        if (flagsLeft <= 0) return;
        state[r][c] = 'flagged';
        flagsLeft--;
      }
      document.getElementById('ms-flags').textContent = flagsLeft;
      renderCell(r, c);
      try { window.PNSound?.click?.(); } catch (_) {}
    }

    function renderCell(r, c, isExplodedMine) {
      const cell = cells[r][c];
      cell.className = 'ms-cell';
      cell.textContent = '';
      if (state[r][c] === 'hidden') { cell.classList.add('hidden'); return; }
      if (state[r][c] === 'flagged') { cell.classList.add('flagged'); cell.textContent = '⚑'; return; }
      // revealed
      cell.classList.add('revealed');
      if (board[r][c] === -1) {
        cell.classList.add('mine');
        if (isExplodedMine) cell.classList.add('exploded');
        cell.textContent = '✱';
      } else if (board[r][c] > 0) {
        cell.textContent = board[r][c];
        cell.classList.add(`n${board[r][c]}`);
      }
    }

    function checkWin() {
      // Win: every non-mine cell is revealed
      const total = rows * cols - mines;
      if (revealedCount >= total) gameOver(true);
    }

    function gameOver(win) {
      isOver = true;
      if (win) {
        onStatus('✓ Cleared the board!', false);
        // Score: bigger board + fewer flags-used-perfectly = more
        const score = 500 + (rows * cols) * 2;
        onScore(score);
        onComplete(score);
      } else {
        onStatus('💥 Boom — try again.', true);
      }
    }

    return {
      hint() {
        // Reveal one safe hidden cell that's adjacent to a revealed numbered cell
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (state[r][c] !== 'hidden') continue;
            if (board[r][c] === -1) continue;
            // Has any revealed neighbor?
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && state[nr][nc] === 'revealed') {
                  reveal(r, c);
                  onStatus(`💡 Safe cell revealed at (${r + 1},${c + 1})`, false);
                  return;
                }
              }
            }
          }
        }
        onStatus('💡 Try starting from a corner.', false);
      },
      progress() {
        const total = rows * cols - mines;
        return total > 0 ? Math.round((revealedCount / total) * 100) : 0;
      },
    };
  }

  return { init };
})();
