/* =========================================================
   PuzzleNest — features.js
   Three new features:
     1. Daily Login Rewards
     2. Achievements
     3. Continue Where You Left Off
   Self-contained: injects its own CSS + UI.
   ========================================================= */

(() => {
  const API = '/api/v1';
  const GAME_META = {
    sudoku:    { icon:'/icons/sudoku.svg',    name:'Sudoku'    },
    crossword: { icon:'/icons/crossword.svg', name:'Crossword' },
    pipes:     { icon:'/icons/pipes.svg',     name:'Pipes'     },
    mosaic:    { icon:'/icons/mosaic.svg',    name:'Mosaic'    },
    shikaku:   { icon:'/icons/shikaku.svg',   name:'Shikaku'   },
    lits:      { icon:'/icons/lits.svg',      name:'LITS'      },
    snap:      { icon:'/icons/snap.svg',      name:'Snap'      },
    atoms:     { icon:'/icons/atoms.svg',     name:'Atoms'     },
    kings:     { icon:'/icons/kings.svg',     name:'Kings'     },
    mambo:     { icon:'/icons/mambo.svg',     name:'Mambo'     },
    nonogram:  { icon:'/icons/nonogram.svg',  name:'Nonogram'  },
    wordle:    { icon:'/icons/wordle.svg',    name:'Wordle'    },
    minesweeper:{ icon:'/icons/minesweeper.svg',name:'Minesweeper'},
    "2048":    { icon:'/icons/2048.svg',      name:'2048'      },
  };

  // ── CSS injection ────────────────────────────────────────────────────
  const css = `
  /* Daily Reward Modal */
  .pn-reward-overlay {
    position: fixed; inset: 0; background: rgba(15,14,12,0.7);
    display: none; align-items: center; justify-content: center; z-index: 9000;
    font-family: 'Epilogue', sans-serif;
  }
  .pn-reward-overlay.show { display: flex; animation: pnFadeIn .25s ease-out; }
  .pn-reward-card {
    background: var(--paper, #faf8f3); padding: 36px 32px;
    max-width: 480px; width: 90%; text-align: center;
    border: 1px solid var(--border, #ddd8c8);
    box-shadow: 0 24px 60px rgba(0,0,0,.4);
    animation: pnRise .35s cubic-bezier(.2,.9,.3,1);
  }
  .pn-reward-emoji { font-size: 56px; margin-bottom: 8px; }
  .pn-reward-title {
    font-family: 'Playfair Display', serif; font-size: 28px;
    font-weight: 900; color: var(--ink, #0f0e0c); margin-bottom: 6px;
  }
  .pn-reward-sub {
    font-size: 13px; color: var(--muted, #888070); margin-bottom: 24px;
    text-transform: uppercase; letter-spacing: .12em;
  }
  .pn-reward-track {
    display: grid; grid-template-columns: repeat(7, 1fr);
    gap: 6px; margin-bottom: 24px;
  }
  .pn-reward-day {
    padding: 10px 4px; text-align: center;
    background: var(--cream, #f0ece0); border: 1px solid var(--border, #ddd8c8);
    transition: all .2s;
  }
  .pn-reward-day.past {
    background: rgba(46,125,50,0.12); border-color: var(--success, #2e7d32);
  }
  .pn-reward-day.current {
    background: var(--gold, #c8961e); border-color: var(--gold, #c8961e);
    transform: translateY(-3px); box-shadow: 0 6px 16px rgba(200,150,30,.3);
  }
  .pn-reward-day-num {
    font-size: 11px; font-weight: 700; color: var(--muted, #888070);
    text-transform: uppercase; letter-spacing: .08em;
  }
  .pn-reward-day.current .pn-reward-day-num { color: var(--ink, #0f0e0c); }
  .pn-reward-day-coin {
    font-size: 13px; font-weight: 700; margin-top: 4px;
    color: var(--ink, #0f0e0c);
  }
  .pn-reward-day.past .pn-reward-day-coin { color: var(--success, #2e7d32); }
  .pn-reward-summary {
    font-family: 'Playfair Display', serif; font-size: 36px;
    font-weight: 900; color: var(--gold, #c8961e); margin-bottom: 4px;
  }
  .pn-reward-streak {
    font-size: 13px; color: var(--muted, #888070); margin-bottom: 24px;
  }
  .pn-reward-btn {
    background: var(--ink, #0f0e0c); color: var(--paper, #faf8f3);
    font-size: 13px; font-weight: 600; letter-spacing: .12em;
    text-transform: uppercase; padding: 14px 32px;
    border: none; cursor: pointer; transition: background .2s;
    width: 100%;
  }
  .pn-reward-btn:hover { background: var(--forest, #1e4a32); }

  /* Achievement Toast */
  .pn-ach-toast {
    position: fixed; top: 80px; right: 32px;
    background: var(--ink, #0f0e0c); color: var(--paper, #faf8f3);
    padding: 14px 20px; display: flex; align-items: center; gap: 14px;
    min-width: 280px; max-width: 380px;
    box-shadow: 0 12px 36px rgba(0,0,0,.35);
    transform: translateX(420px); transition: transform .4s cubic-bezier(.2,.9,.3,1);
    z-index: 9100; font-family: 'Epilogue', sans-serif;
  }
  .pn-ach-toast.show { transform: translateX(0); }
  .pn-ach-toast-icon { font-size: 32px; }
  .pn-ach-toast-info { flex: 1; }
  .pn-ach-toast-tag {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--gold-light, #e8b830);
  }
  .pn-ach-toast-name {
    font-family: 'Playfair Display', serif; font-size: 16px;
    font-weight: 700; margin-top: 2px;
  }
  .pn-ach-toast-coins {
    font-size: 14px; font-weight: 700; color: var(--gold-light, #e8b830);
  }

  /* Home page sections */
  .pn-section { padding: 60px 48px; max-width: 1200px; margin: 0 auto; }
  .pn-section-label {
    font-size: 11px; font-weight: 600; letter-spacing: .2em;
    text-transform: uppercase; color: var(--gold, #c8961e); margin-bottom: 8px;
  }
  .pn-section-title {
    font-family: 'Playfair Display', serif; font-size: 36px;
    font-weight: 900; color: var(--ink, #0f0e0c); margin-bottom: 32px;
    letter-spacing: -.02em;
  }

  /* Continue list */
  .pn-continue-list {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .pn-continue-card {
    background: var(--cream, #f0ece0); border: 1px solid var(--border, #ddd8c8);
    padding: 18px 20px; display: flex; align-items: center; gap: 14px;
    transition: all .2s;
  }
  .pn-continue-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,.08);
    border-color: var(--gold, #c8961e);
  }
  .pn-continue-icon { font-size: 32px; }
  .pn-continue-info { flex: 1; min-width: 0; }
  .pn-continue-name {
    font-family: 'Playfair Display', serif; font-size: 18px;
    font-weight: 700; color: var(--ink, #0f0e0c);
  }
  .pn-continue-meta {
    font-size: 11px; color: var(--muted, #888070); margin-top: 2px;
    text-transform: uppercase; letter-spacing: .06em;
  }
  .pn-continue-resume {
    background: var(--ink, #0f0e0c); color: var(--paper, #faf8f3);
    font-size: 11px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; padding: 8px 14px;
    border: none; cursor: pointer; transition: background .2s;
  }
  .pn-continue-resume:hover { background: var(--gold, #c8961e); color: var(--ink, #0f0e0c); }
  .pn-continue-discard {
    background: transparent; border: 1px solid var(--border, #ddd8c8);
    color: var(--muted, #888070); width: 28px; height: 28px;
    cursor: pointer; font-size: 14px; transition: all .2s;
  }
  .pn-continue-discard:hover {
    color: var(--rust, #c04a2a); border-color: var(--rust, #c04a2a);
  }

  /* Achievements grid */
  .pn-ach-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 24px;
  }
  .pn-ach-count {
    font-family: 'Playfair Display', serif; font-size: 20px;
    font-weight: 700; color: var(--gold, #c8961e);
  }
  .pn-ach-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }
  .pn-ach-badge {
    background: var(--cream, #f0ece0); border: 1px solid var(--border, #ddd8c8);
    padding: 18px 14px; text-align: center; transition: all .2s;
    position: relative;
  }
  .pn-ach-badge.unlocked {
    border-color: var(--gold, #c8961e);
    background: linear-gradient(180deg, rgba(232,184,48,.1), var(--cream, #f0ece0));
  }
  .pn-ach-badge.locked { opacity: .55; }
  .pn-ach-badge:hover { transform: translateY(-2px); }
  .pn-ach-icon { font-size: 36px; margin-bottom: 8px; }
  .pn-ach-name {
    font-family: 'Playfair Display', serif; font-size: 13px;
    font-weight: 700; color: var(--ink, #0f0e0c); margin-bottom: 4px;
  }
  .pn-ach-desc {
    font-size: 10px; color: var(--muted, #888070);
    line-height: 1.4; margin-bottom: 8px;
  }
  .pn-ach-reward {
    display: inline-block; background: var(--gold, #c8961e); color: var(--ink, #0f0e0c);
    font-size: 9px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; padding: 3px 8px;
  }

  /* Animations */
  @keyframes pnFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pnRise   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── 1. Daily Login Reward ───────────────────────────────────────────
  const DailyReward = {
    REWARDS: [10, 15, 20, 25, 30, 40, 50],

    async checkAndShow() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      try {
        const res = await fetch(`${API}/auth/daily-reward`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Auth.getToken()}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.already_claimed) {
          this.show(data);
          // Update cached user coins
          const u = Auth.getUser();
          if (u) {
            u.coins = data.total_coins;
            u.login_streak = data.login_streak;
            localStorage.setItem('pn-user', JSON.stringify(u));
          }
        }
      } catch (e) { console.warn('Daily reward check failed', e); }
    },

    show(data) {
      let modal = document.getElementById('pn-reward-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pn-reward-modal';
        modal.className = 'pn-reward-overlay';
        document.body.appendChild(modal);
      }
      const trackHTML = this.REWARDS.map((coins, i) => {
        const d = i + 1;
        let cls = 'pn-reward-day';
        if (d < data.day_number) cls += ' past';
        if (d === data.day_number) cls += ' current';
        const label = d < data.day_number ? '✓' : `🪙${coins}`;
        return `<div class="${cls}">
          <div class="pn-reward-day-num">D${d}</div>
          <div class="pn-reward-day-coin">${label}</div>
        </div>`;
      }).join('');
      modal.innerHTML = `
        <div class="pn-reward-card">
          <div class="pn-reward-emoji">🎁</div>
          <div class="pn-reward-title">Daily Login Reward</div>
          <div class="pn-reward-sub">Day ${data.day_number} of 7</div>
          <div class="pn-reward-track">${trackHTML}</div>
          <div class="pn-reward-summary">+${data.coins_earned} 🪙</div>
          <div class="pn-reward-streak">
            Streak: ${data.login_streak} day${data.login_streak !== 1 ? 's' : ''} · Total: ${data.total_coins} coins
          </div>
          <button class="pn-reward-btn" onclick="document.getElementById('pn-reward-modal').classList.remove('show')">
            Collect!
          </button>
        </div>`;
      modal.classList.add('show');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
      });
    },
  };

  // ── 2. Achievements ──────────────────────────────────────────────────
  const Achievements = {
    _all: [],

    async check() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return null;
      try {
        const res = await fetch(`${API}/stats/check-achievements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Auth.getToken()}`,
          },
        });
        if (!res.ok) return null;
        const data = await res.json();
        this._all = data.all_achievements || [];

        // Show toasts for newly-unlocked ones (one at a time, queued)
        if (data.newly_unlocked && data.newly_unlocked.length > 0) {
          this._queueToasts(data.newly_unlocked);
        }
        return data;
      } catch (e) {
        console.warn('Achievements check failed', e);
        return null;
      }
    },

    _queueToasts(achs) {
      let i = 0;
      const showNext = () => {
        if (i >= achs.length) return;
        this.showToast(achs[i]);
        i++;
        setTimeout(showNext, 4500);
      };
      showNext();
    },

    showToast(ach) {
      const t = document.createElement('div');
      t.className = 'pn-ach-toast';
      t.innerHTML = `
        <div class="pn-ach-toast-icon">${ach.icon}</div>
        <div class="pn-ach-toast-info">
          <div class="pn-ach-toast-tag">Achievement Unlocked</div>
          <div class="pn-ach-toast-name">${ach.name}</div>
        </div>
        <div class="pn-ach-toast-coins">+${ach.coins} 🪙</div>
      `;
      document.body.appendChild(t);
      // Trigger slide-in
      requestAnimationFrame(() => t.classList.add('show'));
      // Auto-dismiss
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 500);
      }, 4000);
    },

    renderShowcase(container) {
      if (!container) return;
      if (this._all.length === 0) {
        container.style.display = 'none';
        return;
      }
      const unlockedCount = this._all.filter(a => a.unlocked).length;
      const badgesHTML = this._all.map(a => `
        <div class="pn-ach-badge ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="pn-ach-icon">${a.unlocked ? a.icon : '🔒'}</div>
          <div class="pn-ach-name">${a.name}</div>
          <div class="pn-ach-desc">${a.description}</div>
          ${a.unlocked ? `<div class="pn-ach-reward">🪙 ${a.coins}</div>` : ''}
        </div>
      `).join('');
      container.style.display = '';
      container.innerHTML = `
        <div class="pn-section-label">Your Trophy Wall</div>
        <div class="pn-ach-header">
          <div class="pn-section-title" style="margin-bottom:0">🏅 Achievements</div>
          <div class="pn-ach-count">${unlockedCount} / ${this._all.length}</div>
        </div>
        <div class="pn-ach-grid">${badgesHTML}</div>
      `;
    },
  };

  // ── 3. Continue Where You Left Off ───────────────────────────────────
  const ContinueGames = {
    KEY: 'pn-continue',

    _all() {
      try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
      catch (_) { return {}; }
    },

    save(gameType, opts) {
      const all = this._all();
      all[gameType] = {
        gameType,
        level: opts.level || 1,
        difficulty: opts.difficulty || 'medium',
        size: opts.size || null,
        startedAt: all[gameType]?.startedAt || new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        timeSec: opts.timeSec || 0,
        isDaily: opts.isDaily || false,
      };
      localStorage.setItem(this.KEY, JSON.stringify(all));
    },

    updateTime(gameType, timeSec) {
      const all = this._all();
      if (all[gameType]) {
        all[gameType].timeSec = timeSec;
        all[gameType].lastPlayedAt = new Date().toISOString();
        localStorage.setItem(this.KEY, JSON.stringify(all));
      }
    },

    clear(gameType) {
      const all = this._all();
      delete all[gameType];
      localStorage.setItem(this.KEY, JSON.stringify(all));
    },

    list() {
      const all = this._all();
      return Object.values(all).sort((a, b) =>
        new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
      );
    },

    _timeAgo(iso) {
      if (!iso) return '';
      const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    },

    renderSection(container) {
      if (!container) return;
      const games = this.list();
      if (games.length === 0) {
        container.style.display = 'none';
        return;
      }
      const cardsHTML = games.map(g => {
        const meta = GAME_META[g.gameType] || { icon: '/icons/favicon.svg', name: g.gameType };
        const ago = this._timeAgo(g.lastPlayedAt);
        let url = g.isDaily
          ? `/game.html?type=${g.gameType}&daily=1`
          : `/game.html?type=${g.gameType}&level=${g.level}&diff=${g.difficulty}`;
        if (g.size) url += `&size=${g.size}`;
        return `
          <div class="pn-continue-card">
            <div class="pn-continue-icon"><img src="${meta.icon}" alt="${meta.name || meta.title}" width="28" height="28"></div>
            <div class="pn-continue-info">
              <div class="pn-continue-name">${meta.name}</div>
              <div class="pn-continue-meta">
                ${g.isDaily ? 'Daily' : (g.size ? `${g.size}×${g.size}` : `Level ${g.level}`)} · ${ago}
              </div>
            </div>
            <button class="pn-continue-resume" data-url="${url}">Resume →</button>
            <button class="pn-continue-discard" data-game="${g.gameType}" title="Discard">✕</button>
          </div>
        `;
      }).join('');
      container.style.display = '';
      container.innerHTML = `
        <div class="pn-section-label">Pick Up Where You Left Off</div>
        <div class="pn-section-title">🕹️ Continue Playing</div>
        <div class="pn-continue-list">${cardsHTML}</div>
      `;
      // Wire up handlers
      container.querySelectorAll('.pn-continue-resume').forEach(btn => {
        btn.addEventListener('click', () => { location.href = btn.dataset.url; });
      });
      container.querySelectorAll('.pn-continue-discard').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clear(btn.dataset.game);
          this.renderSection(container);
        });
      });
    },
  };

  // ── Public API ──────────────────────────────────────────────────────
  window.Features = { DailyReward, Achievements, ContinueGames };

  // ── Auto-boot: when DOM is ready, run hooks ─────────────────────────
  function boot() {
    // If we're on the home page, inject the two sections
    const gamesSection = document.getElementById('games');
    if (gamesSection) {
      // Insert Continue section BEFORE games
      let continueSection = document.getElementById('pn-continue-section');
      if (!continueSection) {
        continueSection = document.createElement('div');
        continueSection.id = 'pn-continue-section';
        continueSection.className = 'pn-section';
        gamesSection.parentNode.insertBefore(continueSection, gamesSection);
      }
      ContinueGames.renderSection(continueSection);

      // Insert Achievements section AFTER games
      let achSection = document.getElementById('pn-achievements-section');
      if (!achSection) {
        achSection = document.createElement('div');
        achSection.id = 'pn-achievements-section';
        achSection.className = 'pn-section';
        achSection.style.display = 'none';
        // Insert right after the games section
        gamesSection.parentNode.insertBefore(achSection, gamesSection.nextSibling);
      }
    }

    // If logged in, claim daily reward + load achievements
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      DailyReward.checkAndShow();
      Achievements.check().then(() => {
        const achSection = document.getElementById('pn-achievements-section');
        if (achSection) Achievements.renderShowcase(achSection);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
