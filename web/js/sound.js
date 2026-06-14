/* PuzzleNest — sound.js
   Procedural sound effects via Web Audio API. No audio files.
   Public API: PNSound.click() / .solve() / .error() / .hint() / .tick() / .toggle() / .mute() */
(function () {
  const KEY = 'pn_sound';
  let ctx = null;
  let muted = localStorage.getItem(KEY) === 'off';

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, dur = 0.08, type = 'sine', volume = 0.12, attack = 0.005, decay = 0.06, slide = 0 } = {}) {
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function chord(freqs, opts = {}) {
    freqs.forEach((f, i) => setTimeout(() => tone({ ...opts, freq: f }), i * (opts.stagger || 70)));
  }

  const SFX = {
    click:  () => tone({ freq: 720, dur: 0.04, type: 'square', volume: 0.06 }),
    place:  () => tone({ freq: 560, dur: 0.06, type: 'triangle', volume: 0.08 }),
    error:  () => tone({ freq: 180, dur: 0.18, type: 'sawtooth', volume: 0.09, slide: -60 }),
    hint:   () => chord([523, 659, 784], { dur: 0.12, type: 'sine', volume: 0.07, stagger: 60 }),
    solve:  () => chord([523, 659, 784, 1047], { dur: 0.22, type: 'triangle', volume: 0.1, stagger: 90 }),
    tick:   () => tone({ freq: 880, dur: 0.03, type: 'square', volume: 0.04 }),
    warn:   () => chord([330, 330], { dur: 0.1, type: 'sawtooth', volume: 0.08, stagger: 130 }),
  };

  function setMuted(val) {
    muted = !!val;
    localStorage.setItem(KEY, muted ? 'off' : 'on');
    document.documentElement.setAttribute('data-sound', muted ? 'off' : 'on');
  }

  document.documentElement.setAttribute('data-sound', muted ? 'off' : 'on');

  window.PNSound = {
    ...SFX,
    toggle: () => setMuted(!muted),
    mute: () => setMuted(true),
    unmute: () => setMuted(false),
    isMuted: () => muted,
  };
})();
