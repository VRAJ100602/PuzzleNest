/* ── LITS Game Module ────────────────────────────────────────────────────── */
window.LitsGame = (() => {

  const REGION_COLORS = [
    '#f5f0e4','#edf5ea','#e8f2f8','#f8eae4','#f0eaf5',
    '#e4f5f0','#f5f5e4','#f5f8e4','#eaedf5','#f8ece8',
    '#e4f0f8','#eef5e4','#f8f5e0','#eee8f5',
  ];

  // All rotations of each tetromino, cells normalized to min-row=0 min-col=0, sorted
  const SHAPES = {
    L: [
      [[0,0],[1,0],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[0,1],[1,1],[2,1]],
      [[0,2],[1,0],[1,1],[1,2]],
    ],
    // J is also classified as L in LITS
    J: [
      [[0,1],[1,1],[2,0],[2,1]],
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2]],
    ],
    I: [
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
    ],
    T: [
      [[0,0],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[0,2],[1,1]],
      [[0,1],[1,0],[1,1],[2,1]],
      [[0,1],[1,0],[1,1],[1,2]],
    ],
    S: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      // Z (mirror of S — both are "S" in LITS)
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
  };

  function normCells(cells) {
    const minR = Math.min(...cells.map(([r])=>r));
    const minC = Math.min(...cells.map(([,c])=>c));
    return cells.map(([r,c])=>[r-minR, c-minC]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  }

  function matchesType(cells, type) {
    if (cells.length !== 4) return false;
    const key = JSON.stringify(normCells(cells));
    // L in LITS covers both L and J (mirror)
    const candidates = type === 'L' ? [...SHAPES.L, ...SHAPES.J] : (SHAPES[type] || []);
    return candidates.some(s => JSON.stringify(s) === key);
  }

  function bfsConnected(shadedSet) {
    if (!shadedSet.size) return true;
    const first = shadedSet.values().next().value;
    const [r0, c0] = first.split(',').map(Number);
    const visited = new Set([first]);
    const queue = [[r0, c0]];
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const k = `${r+dr},${c+dc}`;
        if (shadedSet.has(k) && !visited.has(k)) { visited.add(k); queue.push([r+dr,c+dc]); }
      }
    }
    return visited.size === shadedSet.size;
  }

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, regions, solution, shapes } = data;
    const state = Array.from({length:size}, ()=>Array(size).fill(0));

    container.innerHTML = '';

    function regionBorders(r, c) {
      const id = regions[r][c];
      return [
        r===0||regions[r-1][c]!==id ? 'N' : null,
        r===size-1||regions[r+1][c]!==id ? 'S' : null,
        c===0||regions[r][c-1]!==id ? 'W' : null,
        c===size-1||regions[r][c+1]!==id ? 'E' : null,
      ].filter(Boolean);
    }

    const gridEl = document.createElement('div');
    gridEl.className = 'lits-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 56px)`;

    const cells = Array.from({length:size}, ()=>[]);
    const regionSets = {};   // rid(num) → [[r,c],...]
    const regionTopLeft = {};// rid(num) → [r,c] — first cell in row-major order

    for (let r=0;r<size;r++) for (let c=0;c<size;c++) {
      const rid = regions[r][c];
      if (!regionSets[rid]) { regionSets[rid] = []; regionTopLeft[rid] = [r,c]; }
      regionSets[rid].push([r,c]);
    }

    for (let r=0;r<size;r++) {
      for (let c=0;c<size;c++) {
        const cell = document.createElement('div');
        cell.className = 'lts-cell';
        const rid = regions[r][c];
        cell.style.background = REGION_COLORS[rid % REGION_COLORS.length];
        regionBorders(r,c).forEach(d => cell.classList.add(`region-border-${d}`));

        const [tlr, tlc] = regionTopLeft[rid];
        if (r===tlr && c===tlc) {
          const lbl = document.createElement('span');
          lbl.className = 'shape-lbl';
          // shapes keys are strings in JSON; rid is a number — check both
          lbl.textContent = shapes?.[String(rid)] ?? shapes?.[rid] ?? '?';
          cell.appendChild(lbl);
        }

        cell.addEventListener('click', () => {
          state[r][c] ^= 1;
          renderCell(r, c);
          if (checkRules()) { onScore(1000); onComplete(1000); }
        });

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    const progressEl = document.createElement('div');
    progressEl.className = 'lits-progress';

    const info = document.createElement('div');
    info.style.cssText='font-size:11px;color:var(--muted);margin-top:4px;text-align:center;max-width:480px';
    info.textContent='Shade exactly one L/I/T/S tetromino per region. Same types cannot touch edge-to-edge. All shaded cells must connect.';

    const controls = document.createElement('div');
    controls.className='game-controls';

    const checkBtn = document.createElement('button');
    checkBtn.className='ctrl-btn success';
    checkBtn.textContent='✓ Check';
    checkBtn.addEventListener('click', ()=>{
      const ok = checkFull();
      onStatus(ok ? '✓ Puzzle solved!' : '⚠ Not solved yet — check all regions form correct tetrominoes.', !ok);
      if (ok) { onScore(1000); onComplete(1000); }
    });

    const clearBtn = document.createElement('button');
    clearBtn.className='ctrl-btn danger';
    clearBtn.textContent='↺ Clear';
    clearBtn.addEventListener('click', ()=>{
      for(let r=0;r<size;r++) for(let c=0;c<size;c++){state[r][c]=0;renderCell(r,c);}
      checkRules();
    });

    controls.append(checkBtn, clearBtn);
    container.append(gridEl, progressEl, info, controls);
    onStatus('Click cells to shade. Each region needs exactly one L/I/T/S tetromino.', false);
    checkRules();

    function renderCell(r, c) {
      const cell = cells[r][c];
      if (state[r][c]) {
        cell.classList.add('shaded');
        cell.classList.remove('error','correct');
        cell.style.background = '';
      } else {
        cell.classList.remove('shaded','error','correct');
        cell.style.background = REGION_COLORS[regions[r][c] % REGION_COLORS.length];
      }
    }

    function checkRules() {
      // Reset visual state
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) cells[r][c].classList.remove('error','correct');

      const shadedSet = new Set();
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(state[r][c]) shadedSet.add(`${r},${c}`);

      let completedRegions = 0;
      const regionType = {};  // rid → detected letter

      // ── Per-region shape check ────────────────────────────────────────────
      for (const [ridStr, rcells] of Object.entries(regionSets)) {
        const rid = Number(ridStr);
        const expectedType = shapes?.[ridStr] ?? shapes?.[rid] ?? null;
        const shaded = rcells.filter(([r,c])=>state[r][c]);

        if (shaded.length === 4) {
          if (expectedType && matchesType(shaded, expectedType)) {
            regionType[rid] = expectedType;
            completedRegions++;
            shaded.forEach(([r,c])=>cells[r][c].classList.add('correct'));
          } else {
            shaded.forEach(([r,c])=>cells[r][c].classList.add('error'));
          }
        } else if (shaded.length > 4) {
          shaded.forEach(([r,c])=>cells[r][c].classList.add('error'));
        }
      }

      // ── Same-type adjacency check ─────────────────────────────────────────
      const rids = Object.keys(regionSets).map(Number);
      for (let i=0;i<rids.length;i++) {
        const a = rids[i]; if (!regionType[a]) continue;
        const shadedA = regionSets[a].filter(([r,c])=>state[r][c]);
        for (let j=i+1;j<rids.length;j++) {
          const b = rids[j]; if (regionType[a] !== regionType[b]) continue;
          const shadedB = regionSets[b].filter(([r,c])=>state[r][c]);
          const setB = new Set(shadedB.map(([r,c])=>`${r},${c}`));
          const touches = shadedA.some(([r,c])=>
            [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc])=>setB.has(`${r+dr},${c+dc}`))
          );
          if (touches) {
            shadedA.forEach(([r,c])=>{cells[r][c].classList.remove('correct');cells[r][c].classList.add('error');});
            shadedB.forEach(([r,c])=>{cells[r][c].classList.remove('correct');cells[r][c].classList.add('error');});
          }
        }
      }

      // ── No 2×2 block ─────────────────────────────────────────────────────
      for(let r=0;r<size-1;r++) for(let c=0;c<size-1;c++) {
        if(state[r][c]&&state[r+1][c]&&state[r][c+1]&&state[r+1][c+1]) {
          [[r,c],[r+1,c],[r,c+1],[r+1,c+1]].forEach(([rr,cc])=>{
            cells[rr][cc].classList.remove('correct'); cells[rr][cc].classList.add('error');
          });
        }
      }

      // ── Connectivity check ────────────────────────────────────────────────
      const connected = bfsConnected(shadedSet);
      if (!connected && shadedSet.size > 1) {
        // Mark disconnected cells with error
        for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(state[r][c]) cells[r][c].classList.add('error');
      }

      // ── Progress display ──────────────────────────────────────────────────
      const total = Object.keys(regionSets).length;
      const msgs = [];
      if (!connected && shadedSet.size>1) msgs.push('shaded cells disconnected');
      const errored = !!document.querySelector('.lts-cell.error');

      progressEl.textContent = `${completedRegions}/${total} regions complete${msgs.length ? ' · ' + msgs.join(' · ') : ''}`;
      progressEl.style.color = completedRegions===total&&connected&&!errored ? 'var(--success)' : 'var(--muted)';

      // Auto-win
      if (completedRegions === total && connected && !errored) {
        if (checkFull()) return true;
      }
      return false;
    }

    function checkFull() {
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(state[r][c]!==solution[r][c]) return false;
      return true;
    }

    return {
      hint() {
        for(let r=0;r<size;r++) {
          for(let c=0;c<size;c++) {
            if(state[r][c]!==solution[r][c]) {
              state[r][c]=solution[r][c];
              renderCell(r,c);
              checkRules();
              onStatus(`💡 Revealed (${r+1},${c+1})`, false);
              return;
            }
          }
        }
        onStatus('✓ Puzzle complete!', false);
      }
    };
  }

  return { init };
})();
