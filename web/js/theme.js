/* PuzzleNest — theme.js
   Dark/light mode toggle. Persists to localStorage, respects prefers-color-scheme on first visit. */
(function () {
  const KEY = 'pn_theme';

  function detect() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    // Update meta theme-color for mobile browser chrome
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme === 'dark' ? '#13110d' : '#faf8f3';
  }

  function toggle() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    apply(cur === 'dark' ? 'light' : 'dark');
  }

  // Apply immediately to avoid FOUC
  apply(detect());

  function injectToggle() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight || navRight.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.title = 'Toggle theme';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.innerHTML = `
      <svg class="moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke-linecap="round"/></svg>
    `;
    btn.addEventListener('click', toggle);
    navRight.insertBefore(btn, navRight.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }

  window.PNTheme = { apply, toggle, current: () => document.documentElement.getAttribute('data-theme') };
})();
