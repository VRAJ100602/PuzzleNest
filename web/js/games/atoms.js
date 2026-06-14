/* ── Atoms (Chain Reaction) Game Module ─────────────────────────────────── */
window.AtomsGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { board: initial, size } = data;
    // 2-player hot-seat: player 1 = blue, player 2 = red
    // Each cell: { count: number, owner: 0 (none) | 1 | 2 }
    const state = initial.map((row, r) =>
      row.map((v, c) => ({ count: v, owner: v > 0 ? 1 : 0 }))
    );
    let currentPlayer = 1;
    let gameOver = false;
    let moveCount = 0;

    function criticalMass(r, c) {
      let n = 0;
      if (r > 0)      n++;
      if (r < size-1) n++;
      if (c > 0)      n++;
      if (c < size-1) n++;
      return n;
    }

    container.innerHTML = '';

    const turnBadge = document.createElement('div');
    turnBadge.className = 'atoms-turn-badge';

    const gridEl = document.createElement('div');
    gridEl.className = 'atoms-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 80px)`;

    const cells = Array.from({length:size}, ()=>[]);

    for (let r=0;r<size;r++) {
      for (let c=0;c<size;c++) {
        const cell = document.createElement('div');
        cell.className = 'atom-cell';
        cell.addEventListener('click', () => handleClick(r, c));
        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'ctrl-btn danger';
    resetBtn.textContent = '↺ Reset';
    resetBtn.addEventListener('click', () => location.reload());
    controls.append(resetBtn);

    container.append(turnBadge, gridEl, controls);
    renderAll();
    updateTurnBadge();
    onStatus('Players alternate placing atoms. Overflow = chain explosion!', false);

    function renderCell(r, c) {
      const cell = cells[r][c];
      const { count, owner } = state[r][c];
      cell.className = 'atom-cell';
      if (owner === 1) cell.classList.add('player-1');
      if (owner === 2) cell.classList.add('player-2');
      const cm = criticalMass(r, c);
      if (count >= cm - 1 && count > 0) cell.classList.add('atom-critical');

      const countEl = document.createElement('div');
      countEl.className = 'atom-count';
      countEl.textContent = count > 0 ? count : '';

      const dotsEl = document.createElement('div');
      dotsEl.className = 'atom-dots';
      for (let i=0;i<Math.min(count,4);i++) {
        const d = document.createElement('div');
        d.className = 'atom-dot';
        dotsEl.appendChild(d);
      }

      cell.innerHTML = '';
      if (count > 0) { cell.appendChild(countEl); cell.appendChild(dotsEl); }
    }

    function renderAll() {
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) renderCell(r,c);
    }

    function updateTurnBadge() {
      turnBadge.textContent = `Player ${currentPlayer}'s Turn — ${currentPlayer===1?'🔵 Blue':'🔴 Red'}`;
      turnBadge.style.background = currentPlayer===1 ? '#1565c0' : '#c62828';
    }

    async function handleClick(r, c) {
      if (gameOver) return;
      const cell = state[r][c];
      // Can only play on own cell or empty cell
      if (cell.owner !== 0 && cell.owner !== currentPlayer) {
        onStatus(`⚠ That's Player ${cell.owner}'s atom!`, true);
        return;
      }
      cell.count++;
      cell.owner = currentPlayer;
      moveCount++;
      renderCell(r, c);
      await explodeIfNeeded(r, c);
      if (!gameOver) {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateTurnBadge();
        checkWin();
      }
    }

    async function explodeIfNeeded(r, c) {
      const cell = state[r][c];
      const cm = criticalMass(r, c);
      if (cell.count < cm) return;
      const owner = cell.owner;
      cell.count -= cm;
      if (cell.count === 0) cell.owner = 0;
      cells[r][c].classList.add('exploding');
      await delay(150);
      cells[r][c].classList.remove('exploding');
      renderCell(r, c);

      const neighbours = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc])=>nr>=0&&nr<size&&nc>=0&&nc<size);
      for (const [nr,nc] of neighbours) {
        state[nr][nc].count++;
        state[nr][nc].owner = owner;
        renderCell(nr, nc);
        await delay(80);
        await explodeIfNeeded(nr, nc);
        if (gameOver) return;
      }
    }

    function checkWin() {
      if (moveCount < 2) return; // need at least one move per player
      const owners = new Set();
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(state[r][c].count>0) owners.add(state[r][c].owner);
      if (owners.size === 1) {
        const winner = [...owners][0];
        gameOver = true;
        turnBadge.textContent = `🏆 Player ${winner} Wins!`;
        turnBadge.style.background = 'var(--forest)';
        const s = 1000 - moveCount * 5;
        onScore(Math.max(s, 100));
        onComplete(Math.max(s, 100));
      }
    }

    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    return {
      hint() {
        // Flash critical-mass cells
        for(let r=0;r<size;r++) {
          for(let c=0;c<size;c++) {
            if(state[r][c].owner===currentPlayer && state[r][c].count===criticalMass(r,c)-1) {
              cells[r][c].classList.add('exploding');
              setTimeout(()=>cells[r][c].classList.remove('exploding'),500);
            }
          }
        }
        onStatus(`💡 Blue-highlighted cells are about to explode!`, false);
      }
    };
  }

  return { init };
})();
