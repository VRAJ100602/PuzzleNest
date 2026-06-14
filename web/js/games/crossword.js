/* ── Crossword Game Module ──────────────────────────────────────────────── */
window.CrosswordGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, grid, solution, clues } = data;
    const state = Array.from({length: size}, () => Array(size).fill(''));
    let selectedR = -1, selectedC = -1, direction = 'across';
    let correctCount = 0;
    const totalWhite = grid.flat().filter(v => v === 1).length;

    container.innerHTML = '';

    // Build grid
    const xword = document.createElement('div');
    xword.className = 'xword';
    xword.style.gridTemplateColumns = `repeat(${size}, 50px)`;

    // Number clues
    const numberedCells = {};
    let clueNum = 1;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) continue;
        const startsAcross = (c === 0 || grid[r][c-1] === 0) && c+1 < size && grid[r][c+1] === 1;
        const startsDown   = (r === 0 || grid[r-1][c] === 0) && r+1 < size && grid[r+1][c] === 1;
        if (startsAcross || startsDown) {
          numberedCells[`${r}-${c}`] = clueNum++;
        }
      }
    }

    const cells = [];
    for (let r = 0; r < size; r++) {
      cells[r] = [];
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = grid[r][c] === 0 ? 'xc black' : 'xc';
        if (numberedCells[`${r}-${c}`]) {
          const num = document.createElement('span');
          num.className = 'num';
          num.textContent = numberedCells[`${r}-${c}`];
          cell.appendChild(num);
        }
        if (grid[r][c] === 1) {
          cell.addEventListener('click', () => handleCellClick(r, c));
        }
        xword.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    // Clue panel
    const clueSection = document.createElement('div');
    clueSection.className = 'clue-section';
    clueSection.style.width = '100%';

    const clueTabs = document.createElement('div');
    clueTabs.className = 'clue-tabs';
    const acrossTab = document.createElement('div');
    acrossTab.className = 'clue-tab active';
    acrossTab.textContent = 'Across';
    const downTab = document.createElement('div');
    downTab.className = 'clue-tab';
    downTab.textContent = 'Down';
    acrossTab.onclick = () => { direction = 'across'; acrossTab.classList.add('active'); downTab.classList.remove('active'); renderClues(); };
    downTab.onclick   = () => { direction = 'down';   downTab.classList.add('active'); acrossTab.classList.remove('active'); renderClues(); };
    clueTabs.append(acrossTab, downTab);

    const clueList = document.createElement('div');
    clueList.className = 'clue-list';

    clueSection.append(clueTabs, clueList);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const revealBtn = document.createElement('button');
    revealBtn.className = 'ctrl-btn success';
    revealBtn.textContent = '✓ Check';
    revealBtn.addEventListener('click', checkAll);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '✕ Clear';
    clearBtn.addEventListener('click', () => {
      for (let r=0;r<size;r++) for (let c=0;c<size;c++) { state[r][c]=''; renderCell(r,c); }
      correctCount = 0;
    });
    controls.append(revealBtn, clearBtn);

    container.append(xword, clueSection, controls);

    // Keyboard
    const keyHandler = e => {
      if (selectedR < 0) return;
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const letter = e.key.toUpperCase();
        state[selectedR][selectedC] = letter;
        renderCell(selectedR, selectedC);
        advance();
        checkWin();
      } else if (e.key === 'Backspace') {
        if (state[selectedR][selectedC]) {
          state[selectedR][selectedC] = '';
          renderCell(selectedR, selectedC);
        } else retreat();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        direction = direction === 'across' ? 'down' : 'across';
        acrossTab.classList.toggle('active', direction === 'across');
        downTab.classList.toggle('active', direction === 'down');
        renderClues();
      } else if (e.key === 'ArrowRight') { selectCell(selectedR, selectedC+1); }
        else if (e.key === 'ArrowLeft')  { selectCell(selectedR, selectedC-1); }
        else if (e.key === 'ArrowDown')  { selectCell(selectedR+1, selectedC); }
        else if (e.key === 'ArrowUp')    { selectCell(selectedR-1, selectedC); }
    };
    document.addEventListener('keydown', keyHandler);
    renderClues();
    onStatus('Click a cell and type to fill. Tab toggles direction.', false);

    // ── Functions ──────────────────────────────────────────────────────────
    function handleCellClick(r, c) {
      if (selectedR === r && selectedC === c) {
        direction = direction === 'across' ? 'down' : 'across';
        acrossTab.classList.toggle('active', direction === 'across');
        downTab.classList.toggle('active', direction === 'down');
        renderClues();
      }
      selectCell(r, c);
    }

    function selectCell(r, c) {
      if (r < 0 || r >= size || c < 0 || c >= size || grid[r][c] === 0) return;
      selectedR = r; selectedC = c;
      renderHighlights();
    }

    function renderHighlights() {
      for (let r=0;r<size;r++) {
        for (let c=0;c<size;c++) {
          if (grid[r][c]===0) continue;
          cells[r][c].classList.remove('selected','word-hl');
        }
      }
      cells[selectedR][selectedC].classList.add('selected');
      // Highlight whole word
      if (direction === 'across') {
        let s = selectedC; while (s > 0 && grid[selectedR][s-1]===1) s--;
        let e = selectedC; while (e < size-1 && grid[selectedR][e+1]===1) e++;
        for (let c=s;c<=e;c++) if (c !== selectedC) cells[selectedR][c].classList.add('word-hl');
      } else {
        let s = selectedR; while (s > 0 && grid[s-1][selectedC]===1) s--;
        let e = selectedR; while (e < size-1 && grid[e+1][selectedC]===1) e++;
        for (let r=s;r<=e;r++) if (r !== selectedR) cells[r][selectedC].classList.add('word-hl');
      }
    }

    function renderCell(r, c) {
      const cell = cells[r][c];
      if (grid[r][c] === 0) return;
      // Remove old letter text (keep .num span)
      const numSpan = cell.querySelector('.num');
      cell.textContent = state[r][c] || '';
      if (numSpan) cell.insertBefore(numSpan, cell.firstChild);
      cell.classList.remove('filled-ok','filled-err');
    }

    function advance() {
      if (direction === 'across') {
        let nc = selectedC + 1;
        while (nc < size && grid[selectedR][nc] === 0) nc++;
        if (nc < size) selectCell(selectedR, nc);
      } else {
        let nr = selectedR + 1;
        while (nr < size && grid[nr][selectedC] === 0) nr++;
        if (nr < size) selectCell(nr, selectedC);
      }
    }
    function retreat() {
      if (direction === 'across') {
        let nc = selectedC - 1;
        while (nc >= 0 && grid[selectedR][nc] === 0) nc--;
        if (nc >= 0) selectCell(selectedR, nc);
      } else {
        let nr = selectedR - 1;
        while (nr >= 0 && grid[nr][selectedC] === 0) nr--;
        if (nr >= 0) selectCell(nr, selectedC);
      }
    }

    function checkAll() {
      let correct = 0, wrong = 0;
      for (let r=0;r<size;r++) {
        for (let c=0;c<size;c++) {
          if (grid[r][c] === 0) continue;
          if (!state[r][c]) continue;
          const cell = cells[r][c];
          cell.classList.remove('filled-ok','filled-err');
          if (state[r][c] === solution[r][c]) { cell.classList.add('filled-ok'); correct++; }
          else { cell.classList.add('filled-err'); wrong++; }
        }
      }
      onStatus(`✓ ${correct} correct, ✗ ${wrong} wrong`, wrong > 0);
    }

    function checkWin() {
      for (let r=0;r<size;r++)
        for (let c=0;c<size;c++)
          if (grid[r][c]===1 && state[r][c] !== solution[r][c]) return;
      const s = 1000;
      onScore(s);
      onComplete(s);
    }

    function renderClues() {
      clueList.innerHTML = '';
      const list = direction === 'across' ? clues.across : clues.down;
      (list || []).forEach(cl => {
        const item = document.createElement('div');
        item.className = 'clue-item';
        item.innerHTML = `<span class="clue-num">${cl.num}${direction[0].toUpperCase()}</span>${cl.clue} (${cl.len})`;
        item.addEventListener('click', () => {
          selectCell(cl.row, cl.col);
          renderHighlights();
        });
        clueList.appendChild(item);
      });
    }

    return {
      hint() {
        for (let r=0;r<size;r++) {
          for (let c=0;c<size;c++) {
            if (grid[r][c]===1 && !state[r][c]) {
              state[r][c] = solution[r][c];
              renderCell(r, c);
              selectCell(r, c);
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
