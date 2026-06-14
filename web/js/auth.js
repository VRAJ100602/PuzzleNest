/* =========================================================
   PuzzleNest — auth.js
   JWT auth against the FastAPI backend.
   Provides: login, register, logout, getToken, getUser,
             submitScore (posts stats when logged in).
   ========================================================= */

/* Escape user-controlled strings before inserting into innerHTML.
   Defense-in-depth: usernames are already validated alphanumeric+underscore
   server-side, but anything rendered via template literals is escaped too. */
window.escapeHtml = function (s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const Auth = (() => {
  const API = '/api/v1';
  const TOKEN_KEY = 'pn-token';
  const USER_KEY  = 'pn-user';

  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function getUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(_){ return null; } }
  function isLoggedIn(){ return !!getToken(); }

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
  }

  async function register(username, password, email) {
    const body = { username, password };
    if (email) body.email = email;
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Registration failed');
    localStorage.setItem(TOKEN_KEY, data.access_token);
    await fetchMe();
    triggerPostAuthHooks();
    return data;
  }

  async function forgotPassword(usernameOrEmail) {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username_or_email: usernameOrEmail })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  }

  async function login(username, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.access_token);
    await fetchMe();
    triggerPostAuthHooks();
    return data;
  }

  // ── Post-auth hooks (daily reward + achievements showcase refresh) ──
  function triggerPostAuthHooks() {
    // Refresh premium entitlement so badge appears immediately
    try { window.Billing?.fetchStatus(); } catch (_) {}
    if (typeof window.Features === 'undefined') return;
    try {
      window.Features.DailyReward.checkAndShow();
      window.Features.Achievements.check().then(() => {
        const sec = document.getElementById('pn-achievements-section');
        if (sec) window.Features.Achievements.renderShowcase(sec);
      });
    } catch (e) { console.warn('post-auth hooks failed', e); }
  }

  async function fetchMe() {
    if (!getToken()) return null;
    try {
      const res = await fetch(`${API}/auth/me`, { headers: authHeaders() });
      if (!res.ok) { logout(); return null; }
      const user = await res.json();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      updateNavUI(user);
      // Premium status — refresh entitlement cache for UI gating
      try { window.Billing?.fetchStatus(); } catch (_) {}
      return user;
    } catch(_) { return null; }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateNavUI(null);
  }

  async function submitScore({ gameType, won, score, timeTaken, solveToken }) {
    if (!getToken()) return null;
    try {
      const res = await fetch(`${API}/stats/update`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          game_type: gameType, won,
          score: score || 0,
          time_taken: timeTaken || 0,
          solve_token: solveToken || null
        })
      });
      if (res.ok) return res.json();
    } catch(_) {}
    return null;
  }

  function updateNavUI(user) {
    const signBtns = document.querySelectorAll('.nav-sign, .nav-sign-in');
    const userChips = document.querySelectorAll('.nav-user-chip');
    if (user) {
      signBtns.forEach(b => { b.textContent = 'Sign out'; b.onclick = logout; });
      userChips.forEach(c => { c.textContent = `👤 ${user.username}`; c.style.display = 'flex'; });
    } else {
      signBtns.forEach(b => { b.textContent = 'Sign in'; b.onclick = () => showModal(); });
      userChips.forEach(c => { c.style.display = 'none'; });
    }
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(mode = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) { modal = buildModal(); document.body.appendChild(modal); }
    modal.style.display = 'flex';
    setModalMode(modal, mode);
  }

  function buildModal() {
    const ov = document.createElement('div');
    ov.id = 'auth-modal';
    ov.className = 'auth-overlay';
    ov.innerHTML = `
      <div class="auth-card">
        <button class="auth-close" onclick="document.getElementById('auth-modal').style.display='none'">✕</button>
        <div class="auth-logo">Puzzle<span>Nest</span></div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login"  onclick="Auth._setMode('login')">Sign In</button>
          <button class="auth-tab"        id="tab-register" onclick="Auth._setMode('register')">Register</button>
        </div>
        <div id="auth-error" class="auth-error" style="display:none"></div>
        <input class="auth-input" id="auth-username" type="text" placeholder="Username" autocomplete="username"/>
        <input class="auth-input" id="auth-email" type="email" placeholder="Email (optional — for password recovery)" autocomplete="email" style="display:none"/>
        <input class="auth-input" id="auth-password" type="password" placeholder="Password (min 8 chars, 1 upper, 1 digit)" autocomplete="current-password"/>
        <button class="auth-submit" id="auth-submit-btn" onclick="Auth._submit()">Sign In</button>
        <div class="auth-hint" id="auth-forgot" style="text-align:center;margin-top:8px"><a onclick="Auth._setMode('forgot')" style="cursor:pointer;color:var(--muted);font-size:12px;text-decoration:underline">Forgot password?</a></div>
        <div class="auth-hint" id="auth-hint">Don't have an account? <a onclick="Auth._setMode('register')" style="cursor:pointer;color:var(--gold)">Register free</a></div>
      </div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; });
    return ov;
  }

  const MODE_LABELS = { login: 'Sign In', register: 'Create Account', forgot: 'Send Reset Link' };

  function setModalMode(modal, mode) {
    const isLogin    = mode === 'login';
    const isRegister = mode === 'register';
    const isForgot   = mode === 'forgot';
    document.getElementById('tab-login')?.classList.toggle('active', isLogin || isForgot);
    document.getElementById('tab-register')?.classList.toggle('active', isRegister);

    const emailEl = document.getElementById('auth-email');
    if (emailEl) emailEl.style.display = isRegister ? 'block' : 'none';
    const passEl = document.getElementById('auth-password');
    if (passEl) passEl.style.display = isForgot ? 'none' : 'block';
    const userEl = document.getElementById('auth-username');
    if (userEl) userEl.placeholder = isForgot ? 'Username or email' : 'Username';
    const forgotEl = document.getElementById('auth-forgot');
    if (forgotEl) forgotEl.style.display = isLogin ? 'block' : 'none';

    const btn = document.getElementById('auth-submit-btn');
    if (btn) btn.textContent = MODE_LABELS[mode] || 'Sign In';

    const hint = document.getElementById('auth-hint');
    if (hint) {
      if (isLogin) hint.innerHTML = `Don't have an account? <a onclick="Auth._setMode('register')" style="cursor:pointer;color:var(--gold)">Register free</a>`;
      else if (isRegister) hint.innerHTML = `Already have an account? <a onclick="Auth._setMode('login')" style="cursor:pointer;color:var(--gold)">Sign in</a>`;
      else hint.innerHTML = `Remembered it? <a onclick="Auth._setMode('login')" style="cursor:pointer;color:var(--gold)">Back to sign in</a>`;
    }
    modal.dataset.mode = mode;
  }

  async function _submit() {
    const modal = document.getElementById('auth-modal');
    const mode  = modal?.dataset.mode || 'login';
    const user  = document.getElementById('auth-username')?.value.trim();
    const pass  = document.getElementById('auth-password')?.value;
    const email = document.getElementById('auth-email')?.value.trim();

    if (mode === 'forgot') {
      if (!user) { showError('Enter your username or email'); return; }
    } else if (!user || !pass) { showError('Please fill in all fields'); return; }

    const btn = document.getElementById('auth-submit-btn');
    btn.textContent = '…'; btn.disabled = true;
    try {
      if (mode === 'login') { await login(user, pass); modal.style.display = 'none'; }
      else if (mode === 'register') { await register(user, pass, email); modal.style.display = 'none'; }
      else {
        const d = await forgotPassword(user);
        showError(d.message || 'If that account has an email, a reset link was sent.', false);
      }
    } catch(e) {
      showError(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = MODE_LABELS[mode] || 'Sign In';
    }
  }

  function showError(msg, isErr = true) {
    const el = document.getElementById('auth-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      el.style.background = isErr ? '' : 'var(--forest)';
      el.style.color = isErr ? '' : 'var(--paper)';
    }
  }

  // Boot — restore session
  if (getToken()) fetchMe();

  return { login, register, logout, getToken, getUser, isLoggedIn, fetchMe, submitScore,
           showModal, _setMode: (m) => { const modal = document.getElementById('auth-modal'); if(modal) setModalMode(modal,m); else showModal(m); },
           _submit };
})();
