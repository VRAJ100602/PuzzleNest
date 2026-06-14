/* ── Mambo (Hidato) Game Module ─────────────────────────────────────────── */
window.MamboGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, total, puzzle, solution } = data;
    // state: mirrors puzzle; player fills 0-cells with numbers
    const state = puzzle.map(row => [...row]);
    let selectedR = -1, selectedC = -1;
    let inputBuffer = '';

    container.innerHTML = '';

    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'font-size:13px;color:var(--muted);margin-bottom:12px;text-align:center';
    infoEl.textContent = `Fill in 1–${total} so consecutive numbers are always neighbours (including diagonals)`;

    const gridEl = document.createElement('div');
    gridEl.className = 'mambo-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 70px)`;

    const cells = Array.from({ length: size }, () => []);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'mam-cell';

        if (puzzle[r][c] === -1) {
          cell.classList.add('blocked');
        } else if (puzzle[r][c] > 0) {
          cell.classList.add('given');
          cell.textContent = puzzle[r][c];
        } else {
          cell.classList.add('empty');
          cell.addEventListener('click', () => selectCell(r, c));
        }

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    // Number input pad
    const numPad = document.createElement('div');
    numPad.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:16px;max-width:420px';

    for (let n = 1; n <= Math.min(total, 25); n++) {
      const btn = document.createElement('button');
      btn.className = 'ctrl-btn';
      btn.style.cssText = 'width:42px;height:36px;font-size:13px;padding:0';
      btn.textContent = n;
      btn.addEventListener('click', () => enterNumber(n));
      numPad.appendChild(btn);
    }
    if (total > 25) {
      const moreInfo = document.createElement('div');
      moreInfo.style.cssText = 'font-size:11px;color:var(--muted);width:100%;text-align:center;margin-top:4px';
      moreInfo.textContent = `Use keyboard for numbers > 25`;
      numPad.appendChild(moreInfo);
    }

    const controls = document.createElement('div');
    controls.className = 'game-controls';

    const eraseBtn = document.createElement('button');
    eraseBtn.className = 'ctrl-btn';
    eraseBtn.textContent = '⌫ Erase';
    eraseBtn.addEventListener('click', () => eraseSelected());

    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', checkAll);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '↺ Clear';
    clearBtn.addEventListener('click', () => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (puzzle[r][c] === 0) {
            state[r][c] = 0;
            renderCell(r, c);
          }
        }
      }
      onStatus('Board cleared.', false);
    });

    controls.append(eraseBtn, checkBtn, clearBtn);
    container.append(infoEl, gridEl, numPad, controls);

    // Keyboard handler
    const keyHandler = e => {
      if (selectedR < 0) return;
      if (e.key >= '0' && e.key <= '9') {
        inputBuffer += e.key;
        const n = parseInt(inputBuffer);
        if (n >= 1 && n <= total) {
          enterNumber(n);
        }
        // Clear buffer after short delay
        clearTimeout(keyHandler._t);
        keyHandler._t = setTimeout(() => { inputBuffer = ''; }, 800);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        eraseSelected();
        inputBuffer = '';
      } else if (e.key === 'ArrowUp')    { selectCell(selectedR - 1, selectedC); }
        else if (e.key === 'ArrowDown')  { selectCell(selectedR + 1, selectedC); }
        else if (e.key === 'ArrowLeft')  { selectCell(selectedR, selectedC - 1); }
        else if (e.key === 'ArrowRight') { selectCell(selectedR, selectedC + 1); }
    };
    document.addEventListener('keydown', keyHandler);
    onStatus('Click an empty cell and type a number, or use the pad below.', false);

    // ── Functions ────────────────────────────────────────────────────────
    function selectCell(r, c) {
      if (r < 0 || r >= size || c < 0 || c >= size) return;
      if (puzzle[r][c] === -1 || puzzle[r][c] > 0) return;
      if (selectedR >= 0 && selectedC >= 0) cells[selectedR][selectedC].classList.remove('selected');
      selectedR = r; selectedC = c;
      cells[r][c].classList.add('selected');
      onStatus(`Cell (${r+1},${c+1}) selected — type a number 1–${total}`, false);
    }

    function enterNumber(n) {
      if (selectedR < 0) { onStatus('Select a cell first!', true); return; }
      if (puzzle[selectedR][selectedC] > 0) return;
      if (n < 1 || n > total) { onStatus(`Number must be between 1 and ${total}`, true); return; }
      // Check uniqueness
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (state[r][c] === n && !(r === selectedR && c === selectedC)) {
            onStatus(`⚠ ${n} already placed at (${r+1},${c+1})`, true);
            return;
          }
      state[selectedR][selectedC] = n;
      renderCell(selectedR, selectedC);
      validatePath();
      if (isComplete()) {
        onScore(1000);
        onStatus('🎉 Puzzle complete!', false);
        onComplete(1000);
      }
      // Auto-advance to next empty cell
      let moved = false;
      for (let r = 0; r < size && !moved; r++) {
        for (let c = 0; c < size && !moved; c++) {
          if (puzzle[r][c] === 0 && state[r][c] === 0) {
            selectCell(r, c);
            moved = true;
          }
        }
      }
    }

    function eraseSelected() {
      if (selectedR < 0 || puzzle[selectedR][selectedC] > 0) return;
      state[selectedR][selectedC] = 0;
      renderCell(selectedR, selectedC);
      cells[selectedR][selectedC].classList.add('selected');
      validatePath();
    }

    function renderCell(r, c) {
      const cell = cells[r][c];
      if (puzzle[r][c] === -1 || puzzle[r][c] > 0) return;
      cell.classList.remove('error', 'valid-path', 'selected');
      cell.textContent = state[r][c] > 0 ? state[r][c] : '';
      if (selectedR === r && selectedC === c) cell.classList.add('selected');
    }

    function isAdjacentTo(r1, c1, r2, c2) {
      return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
    }

    function findCell(n) {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (state[r][c] === n) return [r, c];
      return null;
    }

    function validatePath() {
      // Clear all error markers
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (puzzle[r][c] === 0) cells[r][c].classList.remove('error', 'valid-path');

      // Check consecutive pairs that are both filled
      for (let n = 1; n < total; n++) {
        const pos1 = findCell(n);
        const pos2 = findCell(n + 1);
        if (!pos1 || !pos2) continue;
        const adjacent = isAdjacentTo(...pos1, ...pos2);
        if (!adjacent) {
          if (puzzle[pos1[0]][pos1[1]] === 0) cells[pos1[0]][pos1[1]].classList.add('error');
          if (puzzle[pos2[0]][pos2[1]] === 0) cells[pos2[0]][pos2[1]].classList.add('error');
        } else {
          if (puzzle[pos1[0]][pos1[1]] === 0) cells[pos1[0]][pos1[1]].classList.add('valid-path');
          if (puzzle[pos2[0]][pos2[1]] === 0) cells[pos2[0]][pos2[1]].classList.add('valid-path');
        }
      }
      // Restore selected styling
      if (selectedR >= 0) cells[selectedR][selectedC].classList.add('selected');
    }

    function checkAll() {
      let errors = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (state[r][c] === 0 || puzzle[r][c] === -1) continue;
          if (state[r][c] !== solution[r][c]) {
            cells[r][c].classList.add('error');
            errors++;
          }
        }
      }
      onStatus(errors === 0 ? '✓ All filled cells are correct!' : `⚠ ${errors} incorrect cell(s)`, errors > 0);
    }

    function isComplete() {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (puzzle[r][c] === 0 && state[r][c] === 0) return false;
      // Validate path
      for (let n = 1; n < total; n++) {
        const pos1 = findCell(n);
        const pos2 = findCell(n + 1);
        if (!pos1 || !pos2 || !isAdjacentTo(...pos1, ...pos2)) return false;
      }
      return true;
    }

    return {
      hint() {
        // Reveal one empty cell from the solution
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (puzzle[r][c] === 0 && state[r][c] === 0 && solution[r][c] > 0) {
              state[r][c] = solution[r][c];
              renderCell(r, c);
              validatePath();
              onStatus(`💡 Revealed (${r+1},${c+1}) = ${solution[r][c]}`, false);
              return;
            }
          }
        }
      },
      destroy() { document.removeEventListener('keydown', keyHandler); }
    };
  }

  return { init };
})();
