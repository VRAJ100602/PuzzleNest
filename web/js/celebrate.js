/* PuzzleNest — celebrate.js
   Confetti burst + solve celebration modal with stats + share-to-clipboard.
   Public API: PNCelebrate.solve({game, time, score, hints, difficulty, level}) */
(function () {

  function spawnConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const COLORS = ['#c8961e', '#e8b830', '#c04a2a', '#1e4a32', '#0f0e0c', '#f0ece0'];
    const N = 140;
    const particles = Array.from({ length: N }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height / 2 + 60,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 18 - 6,
      g: 0.45 + Math.random() * 0.2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
      life: 1,
    }));
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / 3200);
        if (p.life <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0 && elapsed < 3500) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function showSolveModal(opts) {
    const { game = 'Puzzle', time = 0, score = 0, hints = 0, difficulty = '', level = '' } = opts;
    const today = new Date().toISOString().slice(0, 10);
    const shareText =
      `PuzzleNest · ${game}\n` +
      `${today}\n` +
      `${'⬛'.repeat(Math.max(1, 5 - hints))}${'·'.repeat(hints)} · ${fmtTime(time)}\n` +
      `Score ${score}` + (difficulty ? ` · ${difficulty}` : '') + '\n' +
      `puzzlenest.app`;

    const ov = document.createElement('div');
    ov.className = 'pn-solve-overlay';
    ov.innerHTML = `
      <div class="pn-solve-card">
        <div class="pn-solve-label">SOLVED</div>
        <h2 class="pn-solve-title">${game}</h2>
        ${difficulty ? `<div class="pn-solve-sub">${difficulty}${level ? ` · Level ${level}` : ''}</div>` : ''}
        <div class="pn-solve-stats">
          <div class="pn-solve-stat"><div class="n">${fmtTime(time)}</div><div class="l">Time</div></div>
          <div class="pn-solve-stat"><div class="n">${score}</div><div class="l">Score</div></div>
          <div class="pn-solve-stat"><div class="n">${hints}</div><div class="l">Hints</div></div>
        </div>
        <div class="pn-solve-buttons">
          <button class="pn-solve-share">Share Result</button>
          <button class="pn-solve-again">Next Puzzle →</button>
        </div>
        <button class="pn-solve-close" aria-label="Close">×</button>
      </div>
    `;
    document.body.appendChild(ov);

    setTimeout(() => ov.classList.add('open'), 20);

    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); };
    ov.querySelector('.pn-solve-close').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

    ov.querySelector('.pn-solve-share').addEventListener('click', async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: 'PuzzleNest', text: shareText });
        } else {
          await navigator.clipboard.writeText(shareText);
          const btn = ov.querySelector('.pn-solve-share');
          btn.textContent = '✓ Copied';
          setTimeout(() => { btn.textContent = 'Share Result'; }, 1800); }
      } catch (_) {}
    });

    ov.querySelector('.pn-solve-again').addEventListener('click', () => {
      close();
      // Trigger next puzzle if App.next exists
      if (window.App && typeof window.App.nextPuzzle === 'function') window.App.nextPuzzle();
      else location.reload();
    });
  }

  // Inject styles
  const css = document.createElement('style');
  css.textContent = `
    .pn-solve-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity .25s}
    .pn-solve-overlay.open{opacity:1}
    .pn-solve-card{position:relative;background:var(--white,#fff);border:1px solid var(--border,#ddd);padding:42px 48px 36px;max-width:420px;width:90%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.3);transform:scale(.92);transition:transform .3s cubic-bezier(.2,1.2,.4,1);font-family:'Epilogue',sans-serif;color:var(--ink,#0f0e0c)}
    .pn-solve-overlay.open .pn-solve-card{transform:scale(1)}
    .pn-solve-label{font-size:11px;font-weight:700;letter-spacing:.3em;color:var(--gold,#c8961e);margin-bottom:10px}
    .pn-solve-title{font-family:'Playfair Display',serif;font-size:38px;font-weight:900;color:var(--ink,#0f0e0c);letter-spacing:-.02em;margin:0 0 6px;line-height:1.1}
    .pn-solve-sub{font-size:12px;color:var(--muted,#888);letter-spacing:.08em;text-transform:uppercase;margin-bottom:24px}
    .pn-solve-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0 28px;padding:20px 0;border-top:1px solid var(--border,#ddd);border-bottom:1px solid var(--border,#ddd)}
    .pn-solve-stat .n{font-family:'Playfair Display',serif;font-size:24px;font-weight:900;color:var(--ink,#0f0e0c)}
    .pn-solve-stat .l{font-size:10px;color:var(--muted,#888);letter-spacing:.12em;text-transform:uppercase;margin-top:4px}
    .pn-solve-buttons{display:flex;gap:10px;flex-direction:column}
    .pn-solve-share,.pn-solve-again{font-family:'Epilogue',sans-serif;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:13px 24px;border:none;cursor:pointer;transition:background .15s}
    .pn-solve-share{background:transparent;color:var(--ink,#0f0e0c);border:1px solid var(--border,#ddd)}
    .pn-solve-share:hover{background:var(--cream,#f0ece0)}
    .pn-solve-again{background:var(--gold,#c8961e);color:var(--ink,#0f0e0c)}
    .pn-solve-again:hover{background:var(--gold-light,#e8b830)}
    .pn-solve-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:24px;color:var(--muted,#888);cursor:pointer;line-height:1;padding:4px 8px}
    .pn-solve-close:hover{color:var(--ink,#0f0e0c)}
  `;
  document.head.appendChild(css);

  window.PNCelebrate = {
    solve(opts) {
      try { window.PNSound?.solve(); } catch (_) {}
      spawnConfetti();
      setTimeout(() => showSolveModal(opts || {}), 350);
    },
    confetti: spawnConfetti,
  };
})();
