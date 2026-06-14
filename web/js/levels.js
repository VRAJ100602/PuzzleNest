/* =========================================================
   PuzzleNest — levels.js
   Level selector modal — 50 levels per game.
   Tracks completed/unlocked levels in localStorage.
   ========================================================= */

const Levels = (() => {
  const MAX_LEVELS = 50;

  function _key(gameType) { return `pn-levels-${gameType}`; }

  function getProgress(gameType) {
    try { return JSON.parse(localStorage.getItem(_key(gameType)) || '{}'); }
    catch(_) { return {}; }
  }

  function markComplete(gameType, level, score, timeSec) {
    const p = getProgress(gameType);
    if (!p[level] || score > (p[level].score || 0)) {
      p[level] = { score, time: timeSec, done: true, date: new Date().toISOString() };
      localStorage.setItem(_key(gameType), JSON.stringify(p));
    }
  }

  function isUnlocked(gameType, level) {
    if (level <= 1) return true;
    const p = getProgress(gameType);
    return !!p[level - 1]?.done;
  }

  function highestUnlocked(gameType) {
    const p = getProgress(gameType);
    let h = 1;
    for (let l = 1; l <= MAX_LEVELS; l++) {
      if (p[l]?.done) h = Math.min(l + 1, MAX_LEVELS);
      else break;
    }
    return h;
  }

  function showModal(gameType, onSelect) {
    let modal = document.getElementById('levels-modal');
    if (!modal) { modal = buildModal(); document.body.appendChild(modal); }
    modal.style.display = 'flex';
    renderGrid(modal, gameType, onSelect);
  }

  function buildModal() {
    const ov = document.createElement('div');
    ov.id = 'levels-modal';
    ov.className = 'levels-overlay';
    ov.innerHTML = `
      <div class="levels-card">
        <div class="levels-header">
          <div class="levels-title">Choose Level</div>
          <button class="auth-close" onclick="document.getElementById('levels-modal').style.display='none'">✕</button>
        </div>
        <div class="levels-grid" id="levels-grid"></div>
      </div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; });
    return ov;
  }

  function renderGrid(modal, gameType, onSelect) {
    const grid = modal.querySelector('#levels-grid');
    const prog = getProgress(gameType);
    grid.innerHTML = '';

    for (let l = 1; l <= MAX_LEVELS; l++) {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      const done = !!prog[l]?.done;
      const unlocked = isUnlocked(gameType, l);
      if (done)     btn.classList.add('done');
      if (!unlocked) btn.classList.add('locked');

      const diffLabel = l <= 10 ? 'E' : l <= 25 ? 'M' : l <= 40 ? 'H' : 'X';
      btn.innerHTML = `<span class="lvl-num">${l}</span><span class="lvl-diff">${diffLabel}</span>${done ? '<span class="lvl-star">★</span>' : ''}`;
      btn.title = !unlocked ? 'Complete previous level to unlock' : (done ? `Best: ${prog[l].score} pts · ${Math.floor((prog[l].time||0)/60)}:${String(Math.round((prog[l].time||0)%60)).padStart(2,'0')}` : `Level ${l}`);

      if (unlocked) {
        btn.addEventListener('click', () => {
          modal.style.display = 'none';
          onSelect(l);
        });
      } else {
        btn.addEventListener('click', () => {
          btn.style.animation = 'shake .3s';
          setTimeout(() => btn.style.animation = '', 300);
        });
      }
      grid.appendChild(btn);
    }
  }

  return { getProgress, markComplete, isUnlocked, highestUnlocked, showModal, MAX_LEVELS };
})();
