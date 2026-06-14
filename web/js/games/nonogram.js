/* ── Nonogram (Picross) Game Module ──────────────────────────────────────── */
window.NonogramGame = (() => {
  const API = '/api/v1';

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, puzzle_id, row_clues, col_clues } = data;
    // 0=empty, 1=filled, 2=marked X (definitely empty)
    const state = Array.from({ length: size }, () => Array(size).fill(0));
    let dragMode = null;        // tracks click-drag fill/erase
    let rightClick = false;

    container.innerHTML = '';

    // Build the table: top-left empty corner, then col clues, then rows
    const table = document.createElement('table');
    table.className = 'ng-table';

    // Max clue depth for spacing
    const maxColDepth = Math.max(...col_clues.map(c => c.length));
    const maxRowDepth = Math.max(...row_clues.map(r => r.length));

    // ── Header row(s): column clues stacked vertically ────────────────────
    for (let depth = 0; depth < maxColDepth; depth++) {
      const tr = document.createElement('tr');
      for (let i = 0; i < maxRowDepth; i++) tr.appendChild(document.createElement('td')); // empty corner
      for (let c = 0; c < size; c++) {
        const td = document.createElement('td');
        td.className = 'ng-col-clue';
        const clues = col_clues[c];
        const offset = maxColDepth - clues.length;
        if (depth >= offset && clues[depth - offset] !== 0) {
          td.textContent = clues[depth - offset];
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    const cells = [];
    for (let r = 0; r < size; r++) {
      const tr = document.createElement('tr');
      cells[r] = [];
      // Row clues
      const clues = row_clues[r];
      const offset = maxRowDepth - clues.length;
      for (let i = 0; i < maxRowDepth; i++) {
        const td = document.createElement('td');
        td.className = 'ng-row-clue';
        if (i >= offset && clues[i - offset] !== 0) td.textContent = clues[i - offset];
        tr.appendChild(td);
      }
      // Cells
      for (let c = 0; c < size; c++) {
        const td = document.createElement('td');
        td.className = 'ng-cell';
        if (c % 5 === 0 && c !== 0) td.classList.add('ng-thick-left');
        if (r % 5 === 0 && r !== 0) td.classList.add('ng-thick-top');
        td.addEventListener('mousedown', (e) => {
          e.preventDefault();
          rightClick = (e.button === 2);
          dragMode = rightClick ? 'x' : (state[r][c] === 1 ? 0 : 1);
          paint(r, c, dragMode);
        });
        td.addEventListener('mouseenter', () => { if (dragMode !== null) paint(r, c, dragMode); });
        td.addEventListener('contextmenu', (e) => e.preventDefault());
        tr.appendChild(td);
        cells[r][c] = td;
      }
      table.appendChild(tr);
    }

    document.addEventListener('mouseup', () => { dragMode = null; rightClick = false; });

    container.append(table);

    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;text-align:center;max-width:480px';
    info.textContent = 'Left-click to fill · Right-click to mark · Match the clues for every row and column.';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', checkSubmit);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '↺ Clear';
    clearBtn.addEventListener('click', () => {
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) { state[r][c] = 0; render(r, c); }
    });
    controls.append(checkBtn, clearBtn);

    container.append(info, controls);
    onStatus(`${size}×${size} Nonogram — fill cells to match the clues.`, false);

    function paint(r, c, mode) {
      // mode 0 = empty, 1 = filled, 'x' = marked
      if (mode === 'x') state[r][c] = state[r][c] === 2 ? 0 : 2;
      else state[r][c] = mode;
      render(r, c);
      try { window.PNSound?.click?.(); } catch (_) {}
    }

    function render(r, c) {
      const td = cells[r][c];
      td.classList.remove('filled', 'marked', 'error');
      if (state[r][c] === 1) td.classList.add('filled');
      else if (state[r][c] === 2) td.classList.add('marked');
    }

    async function checkSubmit() {
      // Backend expects 0/1 grid
      const submitted = state.map(row => row.map(v => v === 1 ? 1 : 0));
      try {
        const r = await fetch(`${API}/games/nonogram/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzle_id, submitted }),
        });
        if (!r.ok) {
          onStatus('⚠ Could not verify — try again.', true);
          return;
        }
        const data = await r.json();
        if (data.correct) {
          onStatus('✓ Puzzle solved!', false);
          onScore(1000);
          onComplete(1000);
        } else {
          onStatus('⚠ Not solved yet — some cells are wrong.', true);
        }
      } catch (e) {
        onStatus('⚠ Network error during check.', true);
      }
    }

    return {
      hint() {
        // No client-side solution — give a generic tip
        onStatus('💡 Try the rows or columns with the largest clues first.', false);
      },
      progress() {
        let filled = 0, target = 0;
        // Estimate target from clues (sum of all column clues = total filled cells)
        for (const cc of col_clues) for (const n of cc) target += n;
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (state[r][c] === 1) filled++;
        return target > 0 ? Math.min(100, Math.round((filled / target) * 100)) : 0;
      },
    };
  }

  return { init };
})();
