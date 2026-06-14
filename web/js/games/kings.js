/* ── Kings (Non-Attacking Kings) Game Module ────────────────────────────── */
window.KingsGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, required_kings, grid: initial, solution } = data;
    // state: 0=empty, 1=king(player-placed), -1=blocked, 2=given(pre-placed)
    const state = initial.map(row => [...row]);
    // Pre-placed kings count as given
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (state[r][c] === 1) state[r][c] = 2;

    let placedCount = state.flat().filter(v => v === 1 || v === 2).length;

    container.innerHTML = '';

    const info = document.createElement('div');
    info.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;text-align:center';
    info.textContent = `Place ${required_kings} non-attacking kings on the board`;

    const counter = document.createElement('div');
    counter.style.cssText = 'font-family:"Playfair Display",serif;font-size:24px;font-weight:700;color:var(--gold);margin-bottom:16px;text-align:center';
    function updateCounter() {
      const placed = state.flat().filter(v => v === 1 || v === 2).length;
      counter.textContent = `♛ ${placed} / ${required_kings}`;
    }
    updateCounter();

    const gridEl = document.createElement('div');
    gridEl.className = 'kings-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 70px)`;

    const cells = Array.from({ length: size }, () => []);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        // Chess-board colouring
        cell.className = 'king-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

        if (state[r][c] === -1) {
          cell.classList.add('blocked');
        } else if (state[r][c] === 2) {
          cell.classList.add('given');
          cell.textContent = '♛';
          cell.style.color = 'var(--forest)';
        } else {
          cell.addEventListener('click', () => toggleKing(r, c));
        }

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', () => {
      const result = validate();
      onStatus(result.ok ? '✓ Valid! No kings attack each other.' : `⚠ ${result.msg}`, !result.ok);
      if (result.ok && result.count === required_kings) { onScore(1000); onComplete(1000); }
    });
    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '↺ Clear';
    clearBtn.addEventListener('click', () => {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (state[r][c] === 1) { state[r][c] = 0; renderCell(r, c); }
      updateCounter();
      clearAttacks();
    });
    controls.append(checkBtn, clearBtn);

    container.append(info, counter, gridEl, controls);
    renderAll();
    onStatus(`Click cells to place kings. Kings cannot attack each other (8 directions).`, false);

    // ── Functions ────────────────────────────────────────────────────────
    function toggleKing(r, c) {
      if (state[r][c] === -1 || state[r][c] === 2) return;
      if (state[r][c] === 1) {
        state[r][c] = 0;
      } else {
        state[r][c] = 1;
      }
      renderCell(r, c);
      updateCounter();
      highlightAttacks();
      // Auto-check if count met
      const placed = state.flat().filter(v => v === 1 || v === 2).length;
      if (placed === required_kings) {
        const result = validate();
        if (result.ok) {
          onStatus('🎉 Puzzle solved! All kings placed safely.', false);
          onScore(1000);
          setTimeout(() => onComplete(1000), 300);
        } else {
          onStatus(`⚠ ${result.msg}`, true);
        }
      } else {
        onStatus(`${placed}/${required_kings} kings placed`, false);
      }
    }

    function renderCell(r, c) {
      const cell = cells[r][c];
      if (state[r][c] === -1) return;
      cell.classList.remove('attack');
      if (state[r][c] === 1) {
        cell.textContent = '♛';
        cell.style.color = 'var(--ink)';
      } else if (state[r][c] === 2) {
        cell.textContent = '♛';
        cell.style.color = 'var(--forest)';
      } else {
        cell.textContent = '';
      }
    }

    function renderAll() {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          renderCell(r, c);
    }

    function clearAttacks() {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          cells[r][c].classList.remove('attack');
    }

    function highlightAttacks() {
      clearAttacks();
      const kings = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (state[r][c] === 1 || state[r][c] === 2) kings.push([r, c]);

      for (let i = 0; i < kings.length; i++) {
        for (let j = i + 1; j < kings.length; j++) {
          const [r1, c1] = kings[i];
          const [r2, c2] = kings[j];
          if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) {
            cells[r1][c1].classList.add('attack');
            cells[r2][c2].classList.add('attack');
          }
        }
      }
    }

    function validate() {
      const kings = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (state[r][c] === 1 || state[r][c] === 2) kings.push([r, c]);

      for (let i = 0; i < kings.length; i++) {
        for (let j = i + 1; j < kings.length; j++) {
          const [r1, c1] = kings[i];
          const [r2, c2] = kings[j];
          if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) {
            return { ok: false, count: kings.length, msg: `Kings at (${r1+1},${c1+1}) and (${r2+1},${c2+1}) attack each other!` };
          }
        }
      }
      return { ok: true, count: kings.length };
    }

    return {
      hint() {
        if (!solution) return;
        // Place one king from solution that isn't yet placed
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (solution[r][c] === 1 && state[r][c] === 0) {
              state[r][c] = 1;
              renderCell(r, c);
              updateCounter();
              highlightAttacks();
              onStatus(`💡 Placed king at (${r+1},${c+1})`, false);
              return;
            }
          }
        }
      }
    };
  }

  return { init };
})();
