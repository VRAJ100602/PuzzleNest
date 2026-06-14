/* =========================================================
   PuzzleNest — music.js
   Ambient generative background music using Web Audio API.
   No external files needed.
   ========================================================= */

const Music = (() => {
  let ctx = null, masterGain = null, running = false;
  let nodes = [];

  // Pentatonic scale frequencies (C4 pentatonic: C D E G A)
  const NOTES = [261.63, 293.66, 329.63, 392.00, 440.00,
                 523.25, 587.33, 659.25, 784.00, 880.00];

  const VOLUME_KEY = 'pn-music-vol';
  let volume = parseFloat(localStorage.getItem(VOLUME_KEY) || '0.18');

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function makePad(freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.18, startTime + duration * 0.2);
    env.gain.linearRampToValueAtTime(0.18, startTime + duration * 0.7);
    env.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    nodes.push(osc);
    return osc;
  }

  function makeBass(freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq / 2, startTime);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(0.08, startTime + 0.3);
    env.gain.linearRampToValueAtTime(0.08, startTime + duration - 0.3);
    env.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    nodes.push(osc);
  }

  function scheduleLoop(startTime) {
    if (!running) return;
    const beat = 1.8;     // slow, relaxed
    const bars = 8;

    for (let b = 0; b < bars; b++) {
      const t = startTime + b * beat;
      // Pick two notes from pentatonic
      const n1 = NOTES[Math.floor(Math.random() * NOTES.length)];
      const n2 = NOTES[Math.floor(Math.random() * NOTES.length)];
      makePad(n1, t, beat * 0.9);
      if (b % 2 === 0) makePad(n2, t + beat * 0.5, beat * 0.8);
      if (b % 4 === 0) makeBass(NOTES[0], t, beat * 4);
    }

    // Schedule next loop
    setTimeout(() => scheduleLoop(startTime + bars * beat - 0.5), (bars * beat - 1) * 1000);
  }

  function start() {
    if (running) return;
    ensureCtx();
    running = true;
    scheduleLoop(ctx.currentTime + 0.1);
    updateUI(true);
  }

  function stop() {
    running = false;
    nodes.forEach(n => { try { n.stop(); } catch(_) {} });
    nodes = [];
    updateUI(false);
  }

  function toggle() {
    if (running) stop(); else start();
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOLUME_KEY, volume);
    if (masterGain) masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  }

  function updateUI(isPlaying) {
    const btns = document.querySelectorAll('.music-toggle-btn');
    btns.forEach(b => {
      b.textContent = isPlaying ? '🔊' : '🔇';
      b.title = isPlaying ? 'Mute music' : 'Play music';
      b.classList.toggle('active', isPlaying);
    });
  }

  // Auto-start on first user interaction if preference stored
  const autoplay = localStorage.getItem('pn-music') === '1';
  document.addEventListener('click', function firstClick() {
    if (autoplay && !running) start();
    document.removeEventListener('click', firstClick);
  }, { once: true });

  return { start, stop, toggle, setVolume, isPlaying: () => running };
})();
