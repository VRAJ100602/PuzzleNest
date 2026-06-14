/* ── Pipes Game Module ──────────────────────────────────────────────────── */
window.PipesGame = (() => {

  // Pipe shapes: connections array [N, E, S, W]
  const SHAPES = {
    straight: { symbol: '━', variants: [[0,1,0,1],[1,0,1,0]] },
    corner:   { symbol: '┗', variants: [[1,1,0,0],[0,1,1,0],[0,0,1,1],[1,0,0,1]] },
    t:        { symbol: '┳', variants: [[0,1,1,1],[1,0,1,1],[1,1,0,1],[1,1,1,0]] },
    cross:    { symbol: '╋', variants: [[1,1,1,1]] },
    source:   { symbol: '◉', variants: [[1,1,1,1]] },
    sink:     { symbol: '◎', variants: [[1,1,1,1]] },
  };

  const PIPE_SVG = {
    straight_0: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="60" height="16" rx="2" fill="currentColor"/></svg>`,
    straight_1: `<svg viewBox="0 0 60 60"><rect x="22" y="0" width="16" height="60" rx="2" fill="currentColor"/></svg>`,
    corner_0: `<svg viewBox="0 0 60 60"><rect x="22" y="0" width="16" height="38" rx="2" fill="currentColor"/><rect x="22" y="22" width="38" height="16" rx="2" fill="currentColor"/></svg>`,
    corner_1: `<svg viewBox="0 0 60 60"><rect x="22" y="22" width="38" height="16" rx="2" fill="currentColor"/><rect x="22" y="22" width="16" height="38" rx="2" fill="currentColor"/></svg>`,
    corner_2: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="38" height="16" rx="2" fill="currentColor"/><rect x="22" y="22" width="16" height="38" rx="2" fill="currentColor"/></svg>`,
    corner_3: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="38" height="16" rx="2" fill="currentColor"/><rect x="22" y="0" width="16" height="38" rx="2" fill="currentColor"/></svg>`,
    t_0: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="60" height="16" rx="2" fill="currentColor"/><rect x="22" y="22" width="16" height="38" rx="2" fill="currentColor"/></svg>`,
    t_1: `<svg viewBox="0 0 60 60"><rect x="22" y="0" width="16" height="60" rx="2" fill="currentColor"/><rect x="22" y="22" width="38" height="16" rx="2" fill="currentColor"/></svg>`,
    t_2: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="60" height="16" rx="2" fill="currentColor"/><rect x="22" y="0" width="16" height="38" rx="2" fill="currentColor"/></svg>`,
    t_3: `<svg viewBox="0 0 60 60"><rect x="22" y="0" width="16" height="60" rx="2" fill="currentColor"/><rect x="0" y="22" width="38" height="16" rx="2" fill="currentColor"/></svg>`,
    cross: `<svg viewBox="0 0 60 60"><rect x="0" y="22" width="60" height="16" rx="2" fill="currentColor"/><rect x="22" y="0" width="16" height="60" rx="2" fill="currentColor"/></svg>`,
    source: `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="14" fill="currentColor"/><circle cx="30" cy="30" r="7" fill="white"/></svg>`,
    sink:   `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="4" fill="none"/><circle cx="30" cy="30" r="7" fill="currentColor"/></svg>`,
  };

  // connections [N,E,S,W] for each shape + rotation index
  function getConnections(shape, rotIdx) {
    if (shape === 'cross' || shape === 'source' || shape === 'sink') return [1,1,1,1];
    const v = SHAPES[shape];
    if (!v) return [0,0,0,0];
    return v.variants[rotIdx % v.variants.length] || [0,0,0,0];
  }

  function getSVG(shape, rotIdx) {
    if (shape === 'source') return PIPE_SVG.source;
    if (shape === 'sink')   return PIPE_SVG.sink;
    if (shape === 'cross')  return PIPE_SVG.cross;
    const key = `${shape}_${rotIdx % SHAPES[shape].variants.length}`;
    return PIPE_SVG[key] || PIPE_SVG.cross;
  }

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { grid: rawGrid, size } = data;
    // Each cell: { shape, rotation }
    const state = rawGrid.map(row => row.map(cell => ({
      shape: cell.shape,
      rot: 0,               // current rotation index
      origRot: 0
    })));

    container.innerHTML = '';

    const gridEl = document.createElement('div');
    gridEl.className = 'pipes-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 60px)`;

    const cellEls = [];
    for (let r = 0; r < size; r++) {
      cellEls[r] = [];
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'pipe-cell';
        const shape = state[r][c].shape;
        if (shape === 'source') cell.classList.add('source');
        if (shape === 'sink')   cell.classList.add('sink');
        cell.addEventListener('click', () => rotateCell(r, c));
        gridEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const solveBtn = document.createElement('button');
    solveBtn.className = 'ctrl-btn success';
    solveBtn.textContent = '✓ Check Flow';
    solveBtn.addEventListener('click', () => { checkFlow(); });
    const newBtn = document.createElement('button');
    newBtn.className = 'ctrl-btn danger';
    newBtn.textContent = '↺ New';
    newBtn.addEventListener('click', () => location.reload());
    controls.append(solveBtn, newBtn);

    container.append(gridEl, controls);
    renderAll();
    onStatus(`Rotate pipes to connect source ◉ to sink ◎`, false);

    function renderAll() {
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          renderCell(r, c);
    }

    function renderCell(r, c, connected = false) {
      const cell = cellEls[r][c];
      const { shape, rot } = state[r][c];
      cell.innerHTML = getSVG(shape, rot);
      cell.style.color = connected ? '#2e7d32' : (shape === 'source' ? '#1e4a32' : shape === 'sink' ? '#c04a2a' : '#888070');
      cell.classList.toggle('connected', connected);
    }

    function rotateCell(r, c) {
      const cell = state[r][c];
      if (cell.shape === 'source' || cell.shape === 'sink') return;
      const maxRot = SHAPES[cell.shape]?.variants.length || 1;
      cell.rot = (cell.rot + 1) % maxRot;
      renderCell(r, c);
      checkFlow();
    }

    function checkFlow() {
      // BFS from source cell
      let sourceR = 0, sourceC = 0;
      for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (state[r][c].shape === 'source') { sourceR=r; sourceC=c; }

      const visited = Array.from({length:size}, ()=>Array(size).fill(false));
      const queue = [[sourceR, sourceC]];
      visited[sourceR][sourceC] = true;
      const dirs = [[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]]; // [dr,dc, myConnIdx, theirConnIdx]

      while (queue.length) {
        const [r,c] = queue.shift();
        const myConn = getConnections(state[r][c].shape, state[r][c].rot);
        for (const [dr,dc,myIdx,theirIdx] of dirs) {
          const nr=r+dr, nc=c+dc;
          if (nr<0||nr>=size||nc<0||nc>=size) continue;
          if (visited[nr][nc]) continue;
          const theirConn = getConnections(state[nr][nc].shape, state[nr][nc].rot);
          if (myConn[myIdx] && theirConn[theirIdx]) {
            visited[nr][nc] = true;
            queue.push([nr,nc]);
          }
        }
      }

      // Render connected cells
      for (let r=0;r<size;r++) for (let c=0;c<size;c++) renderCell(r,c, visited[r][c]);

      // Check if sink is reached and all cells connected
      let sinkR=-1,sinkC=-1;
      for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (state[r][c].shape==='sink') { sinkR=r; sinkC=c; }
      const allConnected = visited.flat().every(Boolean);
      const sinkReached = sinkR>=0 && visited[sinkR][sinkC];

      if (sinkReached && allConnected) {
        onStatus('🎉 All pipes connected!', false);
        onScore(1000);
        onComplete(1000);
      } else if (sinkReached) {
        onStatus('✓ Source→Sink connected! Keep connecting all cells.', false);
      } else {
        const cnt = visited.flat().filter(Boolean).length;
        onStatus(`${cnt}/${size*size} cells connected`, false);
      }
    }

    return {
      hint() {
        // Rotate a random non-source/sink cell
        const cells = [];
        for (let r=0;r<size;r++) for (let c=0;c<size;c++) {
          if (state[r][c].shape !== 'source' && state[r][c].shape !== 'sink') cells.push([r,c]);
        }
        if (!cells.length) return;
        const [r,c] = cells[Math.floor(Math.random()*cells.length)];
        rotateCell(r,c);
        onStatus(`💡 Rotated cell (${r+1},${c+1})`, false);
      }
    };
  }

  return { init };
})();
