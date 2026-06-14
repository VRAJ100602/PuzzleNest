/* ── Sudoku Game Module ──────────────────────────────────────────────────── */
window.SudokuGame = (() => {

  // Backtracking solver — used when the API doesn't expose the solution
  // (the backend keeps it server-side for anti-cheat, so we solve locally
  //  to power immediate feedback, hints and win detection).
  function solveSudoku(grid) {
    const board = grid.map(row => [...row]);
    const valid = (r, c, n) => {
      for (let i = 0; i < 9; i++) {
        if (board[r][i] === n || board[i][c] === n) return false;
      }
      const br = r - (r % 3), bc = c - (c % 3);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          if (board[br + i][bc + j] === n) return false;
      return true;
    };
    const fill = () => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            for (let n = 1; n <= 9; n++) {
              if (valid(r, c, n)) {
                board[r][c] = n;
                if (fill()) return true;
                board[r][c] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };
    fill();
    return board;
  }

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { puzzle, difficulty } = data;
    // The sudoku API does not return the solution (anti-cheat). Solve locally.
    const solution = data.solution || solveSudoku(puzzle);
    const state = puzzle.map(r => [...r]);   // player's board (0 = empty)
    let selected = null;
    let pencilMode = false;
    let pencilMarks = Array.from({length:9}, ()=>Array.from({length:9}, ()=>new Set()));
    let mistakes = 0;
    const maxMistakes = 3;

    // ── Build DOM ──────────────────────────────────────────────────────────
    container.innerHTML = '';

    // Number pad
    const numPad = document.createElement('div');
    numPad.className = 'num-pad';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = n;
      btn.dataset.n = n;
      btn.addEventListener('click', () => inputNumber(n));
      numPad.appendChild(btn);
    }

    // Grid
    const grid = document.createElement('div');
    grid.className = 'sudoku-grid';

    const cells = [];
    for (let r = 0; r < 9; r++) {
      cells[r] = [];
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sdk-cell';
        if (puzzle[r][c] !== 0) {
          cell.classList.add('given');
          cell.textContent = puzzle[r][c];
        }
        // Box borders
        if (c === 2 || c === 5) cell.classList.add('box-right');
        if (r === 2 || r === 5) cell.classList.add('box-bottom');

        cell.addEventListener('click', () => selectCell(r, c));
        grid.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    // Controls
    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const pencilBtn = document.createElement('button');
    pencilBtn.className = 'ctrl-btn';
    pencilBtn.textContent = '✏️ Pencil';
    pencilBtn.addEventListener('click', () => {
      pencilMode = !pencilMode;
      pencilBtn.classList.toggle('active', pencilMode);
    });
    const eraseBtn = document.createElement('button');
    eraseBtn.className = 'ctrl-btn';
    eraseBtn.textContent = '⌫ Erase';
    eraseBtn.addEventListener('click', () => eraseCell());
    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', checkBoard);
    const newBtn = document.createElement('button');
    newBtn.className = 'ctrl-btn danger';
    newBtn.textContent = '↺ New';
    newBtn.addEventListener('click', () => location.reload());
    controls.append(pencilBtn, eraseBtn, checkBtn, newBtn);

    container.append(numPad, grid, controls);

    // Keyboard
    const keyHandler = e => {
      if (!selected) return;
      const [r, c] = selected;
      if (puzzle[r][c] !== 0) return;
      if (e.key >= '1' && e.key <= '9') inputNumber(parseInt(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete') eraseCell();
      if (e.key === 'ArrowUp'    && r > 0) selectCell(r-1, c);
      if (e.key === 'ArrowDown'  && r < 8) selectCell(r+1, c);
      if (e.key === 'ArrowLeft'  && c > 0) selectCell(r, c-1);
      if (e.key === 'ArrowRight' && c < 8) selectCell(r, c+1);
    };
    document.addEventListener('keydown', keyHandler);

    onStatus(`${difficulty?.toUpperCase() || 'MEDIUM'} Sudoku — fill in the grid`, false);

    // ── Functions ──────────────────────────────────────────────────────────
    function selectCell(r, c) {
      selected = [r, c];
      renderHighlights();
    }

    function renderHighlights() {
      const [sr, sc] = selected || [-1, -1];
      const selVal = sr >= 0 ? state[sr][sc] : 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = cells[r][c];
          const isSel = r === sr && c === sc;
          const isPeer = r === sr || c === sc || (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3));
          const isSameNum = selVal && state[r][c] === selVal;
          cell.classList.toggle('selected', isSel);
          cell.classList.toggle('peer', !isSel && isPeer);
          cell.classList.toggle('same-num', !isSel && isSameNum);
        }
      }
    }

    function renderCell(r, c) {
      const cell = cells[r][c];
      if (puzzle[r][c] !== 0) return;
      cell.classList.remove('error','correct');
      if (state[r][c] !== 0) {
        cell.innerHTML = state[r][c];
        // Show error immediately
        if (state[r][c] !== solution[r][c]) cell.classList.add('error');
        else cell.classList.add('correct');
      } else if (pencilMarks[r][c].size > 0) {
        const marks = document.createElement('div');
        marks.className = 'sdk-pencil';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = pencilMarks[r][c].has(n) ? n : '';
          marks.appendChild(span);
        }
        cell.innerHTML = '';
        cell.appendChild(marks);
      } else {
        cell.innerHTML = '';
      }
    }

    function inputNumber(n) {
      if (!selected) return;
      const [r, c] = selected;
      if (puzzle[r][c] !== 0) return;
      if (pencilMode) {
        if (pencilMarks[r][c].has(n)) pencilMarks[r][c].delete(n);
        else pencilMarks[r][c].add(n);
        state[r][c] = 0;
      } else {
        state[r][c] = n;
        pencilMarks[r][c].clear();
        if (n !== solution[r][c]) {
          mistakes++;
          onStatus(`❌ Mistake ${mistakes}/${maxMistakes}`, true);
          if (mistakes >= maxMistakes) {
            onStatus('Too many mistakes — puzzle reset!', true);
            setTimeout(() => location.reload(), 1500);
          }
        } else {
          // Auto-erase pencil marks in peers
          for (let i = 0; i < 9; i++) {
            pencilMarks[r][i].delete(n);
            pencilMarks[i][c].delete(n);
          }
          const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
          for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) pencilMarks[br+dr][bc+dc].delete(n);
          for (let ri=0;ri<9;ri++) for (let ci=0;ci<9;ci++) renderCell(ri,ci);
        }
      }
      renderCell(r, c);
      renderHighlights();
      if (isSolved()) {
        const filled = state.flat().filter(Boolean).length;
        const s = Math.max(0, 1000 - mistakes * 100);
        onScore(s);
        onComplete(s);
      }
    }

    function eraseCell() {
      if (!selected) return;
      const [r, c] = selected;
      if (puzzle[r][c] !== 0) return;
      state[r][c] = 0;
      pencilMarks[r][c].clear();
      renderCell(r, c);
    }

    function checkBoard() {
      let allOk = true;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state[r][c] !== 0 && state[r][c] !== solution[r][c]) {
            cells[r][c].classList.add('error');
            allOk = false;
          }
        }
      }
      onStatus(allOk ? '✓ No mistakes so far!' : '⚠ Some cells are incorrect', !allOk);
    }

    function isSolved() {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (state[r][c] !== solution[r][c]) return false;
      return true;
    }

    // ── Smart hint engine — explains the reasoning ──────────────────────────
    function candidatesAt(r, c) {
      const used = new Set();
      for (let i = 0; i < 9; i++) {
        if (state[r][i]) used.add(state[r][i]);
        if (state[i][c]) used.add(state[i][c]);
      }
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) if (state[br+dr][bc+dc]) used.add(state[br+dr][bc+dc]);
      return [1,2,3,4,5,6,7,8,9].filter(n => !used.has(n));
    }

    function findNakedSingle() {
      for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
        if (state[r][c] !== 0) continue;
        const cands = candidatesAt(r,c);
        if (cands.length === 1 && cands[0] === solution[r][c]) {
          // Build explanation listing what's already excluded
          const seen = new Set();
          for (let i = 0; i < 9; i++) { if (state[r][i]) seen.add(state[r][i]); if (state[i][c]) seen.add(state[i][c]); }
          const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
          for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) if (state[br+dr][bc+dc]) seen.add(state[br+dr][bc+dc]);
          const seenList = [...seen].sort((a,b)=>a-b).join(',');
          return {
            cells: [[r,c]],
            value: cands[0],
            technique: 'Naked Single',
            explanation: `(${r+1},${c+1}) sees ${seenList} in its row, column, and box — only ${cands[0]} fits.`,
          };
        }
      }
      return null;
    }

    function findHiddenSingle() {
      // For each unit (row/col/box), check each number 1-9: is there exactly one cell where it can go?
      const units = [];
      for (let r=0;r<9;r++) units.push({type:'row', name:`Row ${r+1}`, cells:[...Array(9)].map((_,c)=>[r,c])});
      for (let c=0;c<9;c++) units.push({type:'col', name:`Column ${c+1}`, cells:[...Array(9)].map((_,r)=>[r,c])});
      for (let b=0;b<9;b++) {
        const br = Math.floor(b/3)*3, bc = (b%3)*3;
        const cs = [];
        for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) cs.push([br+dr, bc+dc]);
        units.push({type:'box', name:`Box ${b+1}`, cells:cs});
      }
      for (const unit of units) {
        // Numbers already placed in unit
        const placed = new Set(unit.cells.map(([r,c])=>state[r][c]).filter(Boolean));
        for (let n = 1; n <= 9; n++) {
          if (placed.has(n)) continue;
          const possible = unit.cells.filter(([r,c]) => state[r][c]===0 && candidatesAt(r,c).includes(n));
          if (possible.length === 1) {
            const [r,c] = possible[0];
            if (solution[r][c] === n) {
              return {
                cells: [[r,c]],
                value: n,
                technique: 'Hidden Single',
                explanation: `${n} can only go in (${r+1},${c+1}) within ${unit.name} — every other empty cell already sees a ${n}.`,
              };
            }
          }
        }
      }
      return null;
    }

    function clearHintHighlights() {
      for (let r=0;r<9;r++) for (let c=0;c<9;c++) cells[r][c].classList.remove('hint-glow');
    }

    function showSmartHint() {
      const result = findNakedSingle() || findHiddenSingle();
      if (!result) {
        // Fall back to plain reveal
        const empties = [];
        for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (puzzle[r][c]===0 && state[r][c]===0) empties.push([r,c]);
        if (!empties.length) { onStatus('✓ Already solved!', false); return; }
        const [r,c] = empties[0];
        onStatus(`💡 Try (${r+1},${c+1}) = ${solution[r][c]} (no simple technique applies here)`, false);
        cells[r][c].classList.add('hint-glow');
        selectCell(r,c);
        setTimeout(() => clearHintHighlights(), 3500);
        return;
      }
      // Highlight, explain, but DON'T fill — let user input it themselves
      clearHintHighlights();
      const [r,c] = result.cells[0];
      cells[r][c].classList.add('hint-glow');
      selectCell(r,c);
      try { window.PNSound?.hint(); } catch (_) {}
      onStatus(`💡 ${result.technique}: ${result.explanation}`, false);
      setTimeout(() => clearHintHighlights(), 6000);
    }

    return {
      hint() {
        // Premium = smart hint with explanation. Free = naked reveal.
        const isPremium = !!window.PN?.premium?.is_premium;
        if (isPremium) {
          showSmartHint();
          return;
        }
        // Free hint: reveal the next correct cell
        const empties = [];
        for (let r=0;r<9;r++) for (let c=0;c<9;c++) if (puzzle[r][c]===0 && state[r][c]===0) empties.push([r,c]);
        if (!empties.length) return;
        const [r,c] = empties[Math.floor(Math.random()*empties.length)];
        state[r][c] = solution[r][c];
        renderCell(r,c);
        selectCell(r,c);
        onStatus(`💡 Revealed (${r+1},${c+1}) = ${solution[r][c]}`, false);
      },
      smartHint: showSmartHint,
      progress() {
        let totalEmpty = 0, correctFilled = 0;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) {
              totalEmpty++;
              if (state[r][c] === solution[r][c]) correctFilled++;
            }
          }
        }
        return totalEmpty > 0 ? Math.round((correctFilled / totalEmpty) * 100) : 0;
      },
      destroy() { document.removeEventListener('keydown', keyHandler); }
    };
  }

  return { init };
})();
