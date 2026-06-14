/* ── Mosaic (Fill-a-Pix) Game Module ────────────────────────────────────── */
window.MosaicGame = (() => {

  function init(container, data, { onComplete, onScore, onStatus }) {
    const { size, clues, solution } = data;
    const state = Array.from({length:size}, () => Array(size).fill(0)); // 0=empty,1=filled,2=dot(marked empty)

    container.innerHTML = '';

    const gridEl = document.createElement('div');
    gridEl.className = 'mosaic-grid';
    gridEl.style.gridTemplateColumns = `repeat(${size}, 48px)`;

    const cells = Array.from({length:size}, ()=>[]);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'mos-cell';
        cell.textContent = clues[r][c] !== null ? clues[r][c] : '';
        cell.dataset.clue = clues[r][c];

        cell.addEventListener('click', e => {
          if (e.shiftKey || e.ctrlKey) {
            // Mark as dot (known empty)
            state[r][c] = state[r][c] === 2 ? 0 : 2;
          } else {
            // Toggle fill
            state[r][c] = state[r][c] === 1 ? 0 : 1;
          }
          render(r, c);
          checkSatisfied(r, c);
          if (isComplete()) { onScore(1000); onComplete(1000); }
        });

        cell.addEventListener('contextmenu', e => {
          e.preventDefault();
          state[r][c] = state[r][c] === 2 ? 0 : 2;
          render(r, c);
        });

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    const legend = document.createElement('div');
    legend.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;text-align:center';
    legend.textContent = 'Click = fill · Right-click / Shift+click = mark empty';

    const controls = document.createElement('div');
    controls.className = 'game-controls';
    const checkBtn = document.createElement('button');
    checkBtn.className = 'ctrl-btn success';
    checkBtn.textContent = '✓ Check';
    checkBtn.addEventListener('click', checkAll);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'ctrl-btn danger';
    clearBtn.textContent = '↺ Clear';
    clearBtn.addEventListener('click', () => {
      for (let r=0;r<size;r++) for (let c=0;c<size;c++) { state[r][c]=0; render(r,c); }
    });
    controls.append(checkBtn, clearBtn);

    container.append(gridEl, legend, controls);
    onStatus('Fill cells so every clue equals its 3×3 neighbourhood count.', false);

    function render(r, c) {
      const cell = cells[r][c];
      cell.classList.remove('filled','dot');
      if (state[r][c] === 1) cell.classList.add('filled');
      if (state[r][c] === 2) cell.classList.add('dot');
    }

    function neighbourCount(r, c) {
      let n = 0;
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<size&&nc>=0&&nc<size) n += (state[nr][nc]===1 ? 1 : 0);
      }
      return n;
    }

    function checkSatisfied(cr, cc) {
      // Re-check all cells in 3×3 area around changed cell
      for (let dr=-1;dr<=1;dr++) {
        for (let dc=-1;dc<=1;dc++) {
          const r=cr+dr, c=cc+dc;
          if (r<0||r>=size||c<0||c>=size) continue;
          const clue = clues[r][c];
          if (clue === null || clue === undefined) continue;
          const count = neighbourCount(r, c);
          cells[r][c].classList.toggle('sat', count === clue);
        }
      }
    }

    function checkAll() {
      let correct = 0, wrong = 0;
      for (let r=0;r<size;r++) {
        for (let c=0;c<size;c++) {
          const actual = state[r][c] === 1 ? 1 : 0;
          if (actual === solution[r][c]) correct++;
          else wrong++;
        }
      }
      onStatus(`${correct} correct, ${wrong} wrong`, wrong > 0);
    }

    function isComplete() {
      for (let r=0;r<size;r++)
        for (let c=0;c<size;c++)
          if ((state[r][c]===1?1:0) !== solution[r][c]) return false;
      return true;
    }

    return {
      hint() {
        // Reveal a cell that matches solution
        for (let r=0;r<size;r++) {
          for (let c=0;c<size;c++) {
            if ((state[r][c]===1?1:0) !== solution[r][c]) {
              state[r][c] = solution[r][c] === 1 ? 1 : 2;
              render(r,c);
              checkSatisfied(r,c);
              onStatus(`💡 Revealed (${r+1},${c+1})`, false);
              return;
            }
          }
        }
      }
    };
  }

  return { init };
})();
