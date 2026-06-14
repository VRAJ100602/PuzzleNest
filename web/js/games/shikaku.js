/* ── Shikaku Game Module ─────────────────────────────────────────────────── */
window.ShikakuGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    // Normalise API response — existing backend uses width/height, new uses size
    const size    = data.size || data.width || data.height || 7;
    const clues   = data.clues;
    const solution = data.regions || null;   // may be absent from existing API
    // Player draws rectangles; we store: regionId per cell (-1 = unassigned)
    const state = Array.from({length:size}, () => Array(size).fill(-1));
    let nextRegion = 0;
    let drawStart = null;  // [r, c]
    let dragging  = false;
    const COLORS = ['region-0','region-1','region-2','region-3','region-4','region-5','region-6','region-7','region-8','region-9'];

    container.innerHTML = '';

    const gridEl = document.createElement('div');
    gridEl.className = 'shikaku-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 56px)`;
    gridEl.style.userSelect = 'none';

    const cells = Array.from({length:size}, ()=>[]);

    for (let r=0;r<size;r++) {
      for (let c=0;c<size;c++) {
        const cell = document.createElement('div');
        cell.className = 'shk-cell';
        if (clues[r][c] && clues[r][c] > 0) {
          cell.textContent = clues[r][c];
          cell.classList.add('clue');
        }

        cell.addEventListener('mousedown', e => { e.preventDefault(); drawStart=[r,c]; dragging=true; clearPreview(); });
        cell.addEventListener('mouseover', () => { if (dragging && drawStart) showPreview(r,c); });
        cell.addEventListener('mouseup', () => { if (dragging && drawStart) { commitRect(r,c); dragging=false; drawStart=null; } });
        cell.addEventListener('contextmenu', e => { e.preventDefault(); clearCell(r,c); });

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    document.addEventListener('mouseup', () => { dragging = false; drawStart = null; clearPreview(); });

    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;text-align:center';
    info.textContent = 'Drag to draw rectangles · Right-click to erase';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', checkAll);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '↺ Clear All';
    clearBtn.addEventListener('click', () => { for(let r=0;r<size;r++) for(let c=0;c<size;c++) removeRegion(r,c); nextRegion=0; });
    controls.append(checkBtn, clearBtn);

    container.append(gridEl, info, controls);
    onStatus('Draw rectangles. Each number shows that rectangle\'s area.', false);

    function clearPreview() {
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) cells[r][c].style.outline = '';
    }

    function showPreview(r2,c2) {
      clearPreview();
      if (!drawStart) return;
      const [r1,c1]=drawStart;
      const rMin=Math.min(r1,r2),rMax=Math.max(r1,r2),cMin=Math.min(c1,c2),cMax=Math.max(c1,c2);
      for(let r=rMin;r<=rMax;r++) for(let c=cMin;c<=cMax;c++) cells[r][c].style.outline='2px dashed var(--gold)';
    }

    function commitRect(r2, c2) {
      if (!drawStart) return;
      const [r1,c1]=drawStart;
      const rMin=Math.min(r1,r2),rMax=Math.max(r1,r2),cMin=Math.min(c1,c2),cMax=Math.max(c1,c2);
      // Check that these cells are free
      for(let r=rMin;r<=rMax;r++) for(let c=cMin;c<=cMax;c++) if(state[r][c]!==-1) { onStatus('⚠ Cells overlap. Clear first.', true); clearPreview(); return; }
      const rid = nextRegion++;
      for(let r=rMin;r<=rMax;r++) {
        for(let c=cMin;c<=cMax;c++) {
          state[r][c]=rid;
          cells[r][c].classList.add(COLORS[rid % COLORS.length]);
          cells[r][c].style.outline='';
        }
      }
      // Check if any clue inside = area
      const area = (rMax-rMin+1)*(cMax-cMin+1);
      let hasClue = false;
      for(let r=rMin;r<=rMax;r++) for(let c=cMin;c<=cMax;c++) if(clues[r][c]) hasClue=true;
      if (hasClue) {
        // Validate
        let clueMatch = false;
        for(let r=rMin;r<=rMax;r++) for(let c=cMin;c<=cMax;c++) if(clues[r][c]===area) clueMatch=true;
        if (!clueMatch) cells[rMin][cMin].classList.add('error');
      }
      if (isComplete()) { onScore(1000); onComplete(1000); }
    }

    function clearCell(r, c) {
      const rid = state[r][c];
      if (rid === -1) return;
      removeRegion(r, c);
    }

    function removeRegion(r, c) {
      const rid = state[r][c];
      if (rid === -1) return;
      for(let rr=0;rr<size;rr++) for(let cc=0;cc<size;cc++) {
        if(state[rr][cc]===rid) {
          state[rr][cc]=-1;
          cells[rr][cc].className='shk-cell';
          if(clues[rr][cc]) { cells[rr][cc].textContent=clues[rr][cc]; cells[rr][cc].classList.add('clue'); }
        }
      }
    }

    function checkAll() {
      // Compare player regions to solution regions
      let correct = 0, total = 0;
      const clueCount = clues.flat().filter(v=>v>0).length;
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) {
        if(!clues[r][c]) continue;
        total++;
        // Find player region at (r,c)
        const rid=state[r][c];
        if(rid===-1) continue;
        const area=(()=>{ let n=0; for(let rr=0;rr<size;rr++) for(let cc=0;cc<size;cc++) if(state[rr][cc]===rid) n++; return n; })();
        if(area===clues[r][c]) { correct++; cells[r][c].classList.add('correct'); }
        else cells[r][c].classList.add('error');
      }
      onStatus(`${correct}/${total} rectangles correct`, correct < total);
    }

    function isComplete() {
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(state[r][c]===-1) return false;
      // All cells assigned; verify clues
      for(let r=0;r<size;r++) {
        for(let c=0;c<size;c++) {
          if(!clues[r][c]) continue;
          const rid=state[r][c]; if(rid===-1) return false;
          let area=0; for(let rr=0;rr<size;rr++) for(let cc=0;cc<size;cc++) if(state[rr][cc]===rid) area++;
          if(area!==clues[r][c]) return false;
        }
      }
      return true;
    }

    return {
      hint() {
        // Find a clue cell that's unassigned and place the correct rectangle
        if (!solution) return;
        for(let r=0;r<size;r++) {
          for(let c=0;c<size;c++) {
            if(clues[r][c] && state[r][c]===-1) {
              // Find solution region at (r,c)
              const solRid = solution[r][c];
              const solCells = [];
              for(let rr=0;rr<size;rr++) for(let cc=0;cc<size;cc++) if(solution[rr][cc]===solRid) solCells.push([rr,cc]);
              const rMin=Math.min(...solCells.map(([rr])=>rr));
              const rMax=Math.max(...solCells.map(([rr])=>rr));
              const cMin=Math.min(...solCells.map(([,cc])=>cc));
              const cMax=Math.max(...solCells.map(([,cc])=>cc));
              drawStart=[rMin,cMin];
              commitRect(rMax,cMax);
              drawStart=null;
              onStatus(`💡 Placed rectangle at (${rMin+1},${cMin+1})`, false);
              return;
            }
          }
        }
      }
    };
  }

  return { init };
})();
