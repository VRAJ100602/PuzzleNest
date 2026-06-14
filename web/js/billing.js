/* =========================================================
   PuzzleNest — billing.js
   Razorpay Checkout integration + premium entitlement cache.
   Exposes window.Billing.
   ========================================================= */

window.Billing = (() => {
  const API = '/api/v1';

  function _authHeaders() {
    const token = localStorage.getItem('pn-token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }

  function _toast(msg, isErr) {
    const old = document.querySelector('.pn-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'pn-toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  /** Fetch /billing/status and cache on window.PN.premium. */
  async function fetchStatus() {
    window.PN = window.PN || {};
    if (!localStorage.getItem('pn-token')) {
      window.PN.premium = { is_premium: false };
      return window.PN.premium;
    }
    try {
      const r = await fetch(`${API}/billing/status`, { headers: _authHeaders() });
      if (!r.ok) {
        window.PN.premium = { is_premium: false };
        return window.PN.premium;
      }
      const data = await r.json();
      window.PN.premium = data;
      _applyEntitlementUI(data);
      return data;
    } catch (_) {
      window.PN.premium = { is_premium: false };
      return window.PN.premium;
    }
  }

  /** Open Razorpay Checkout for a new subscription. */
  async function openCheckout() {
    if (!localStorage.getItem('pn-token')) {
      if (window.Auth) Auth.showModal();
      return;
    }
    const btn = document.getElementById('subscribe-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

    let payload;
    try {
      const r = await fetch(`${API}/billing/create-subscription`, {
        method: 'POST', headers: _authHeaders(), body: '{}'
      });
      payload = await r.json();
      if (!r.ok) throw new Error(payload.detail || 'Could not start checkout');
    } catch (e) {
      _toast(e.message, true);
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe with Razorpay →'; }
      return;
    }

    if (typeof Razorpay === 'undefined') {
      _toast('Razorpay script not loaded. Refresh the page.', true);
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe with Razorpay →'; }
      return;
    }

    const rzp = new Razorpay({
      key: payload.key_id,
      subscription_id: payload.subscription_id,
      name: 'PuzzleNest',
      description: 'Premium — ₹99/month',
      theme: { color: '#c8961e' },
      handler: async (resp) => {
        // resp: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
        try {
          const v = await fetch(`${API}/billing/verify-payment`, {
            method: 'POST',
            headers: _authHeaders(),
            body: JSON.stringify(resp),
          });
          const vd = await v.json();
          if (!v.ok || !vd.ok) throw new Error(vd.detail || 'Verification failed');
          window.PN = window.PN || {};
          window.PN.premium = { is_premium: true, premium_until: vd.premium_until };
          _showSuccessModal(vd.premium_until);
        } catch (e) {
          _toast(e.message || 'Verification failed — please contact support', true);
        }
      },
      modal: {
        ondismiss: () => {
          if (btn) { btn.disabled = false; btn.textContent = 'Subscribe with Razorpay →'; }
        }
      }
    });
    rzp.on('payment.failed', (resp) => {
      _toast(`Payment failed: ${resp.error?.description || 'Unknown error'}`, true);
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe with Razorpay →'; }
    });
    rzp.open();
  }

  /** Cancel the active subscription (settings UI). */
  async function cancel() {
    if (!confirm('Cancel your Premium subscription? Access continues until period end.')) return;
    try {
      const r = await fetch(`${API}/billing/cancel`, {
        method: 'POST', headers: _authHeaders(), body: '{}'
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.detail || 'Cancel failed');
      _toast(d.cancels_at
        ? `Premium ends on ${new Date(d.cancels_at).toLocaleDateString()}`
        : 'Cancellation scheduled', false);
      await fetchStatus();
    } catch (e) {
      _toast(e.message, true);
    }
  }

  /** Apply DOM gates based on entitlement. Idempotent. */
  function _applyEntitlementUI(status) {
    const premium = !!status?.is_premium;

    // Premium badge in nav chip
    document.querySelectorAll('.nav-user-chip').forEach(chip => {
      const existing = chip.querySelector('.pn-premium-badge');
      if (premium && !existing) {
        const star = document.createElement('span');
        star.className = 'pn-premium-badge';
        star.textContent = '★';
        star.title = 'Premium';
        chip.appendChild(star);
      } else if (!premium && existing) {
        existing.remove();
      }
    });

    // Hide affiliate / upsell cards on game page
    if (premium) {
      document.querySelectorAll('.aff-sidebar-card').forEach(el => el.style.display = 'none');
      // Hide the Upgrade card whose first child has text "✨ Upgrade"
      document.querySelectorAll('.game-sidebar-r .sidebar-section').forEach(sec => {
        const title = sec.querySelector('.ss-title');
        if (title && title.textContent.includes('Upgrade')) sec.style.display = 'none';
      });
    }

    // Update hint counter on game page
    const hintsEl = document.getElementById('hints-left');
    if (premium && hintsEl) hintsEl.textContent = '∞';
  }

  function _showSuccessModal(premiumUntil) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(15,14,12,.85);animation:pnFadeIn .3s ease-out';
    const until = premiumUntil ? new Date(premiumUntil).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}) : '';
    ov.innerHTML = `
      <div style="background:var(--white,#fff);border:1px solid var(--border,#ddd8c8);padding:48px 40px;text-align:center;max-width:420px;width:90%;position:relative;overflow:hidden">
        <div class="pn-confetti-wrap" style="position:absolute;inset:0;pointer-events:none;overflow:hidden"></div>
        <div style="font-size:56px;margin-bottom:12px">★</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--ink,#0f0e0c);margin:0 0 8px">You're Premium</h2>
        <p style="color:var(--muted,#888070);font-size:14px;margin:0 0 8px">Unlimited hints, no ads, leaderboard badge — it's all yours.</p>
        ${until ? `<p style="color:var(--muted,#888070);font-size:12px;margin:0 0 24px">Access until ${until}</p>` : ''}
        <button onclick="this.closest('div[style]').parentElement.remove();location.href='/'" style="background:var(--gold,#c8961e);color:var(--ink,#0f0e0c);font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:13px 32px;border:none;cursor:pointer">Go Play →</button>
      </div>`;
    document.body.appendChild(ov);
    // Confetti dots
    const wrap = ov.querySelector('.pn-confetti-wrap');
    const colors = ['#c8961e','#e8b830','#c04a2a','#1e4a32','#2e7d32','#ff6f00'];
    for (let i = 0; i < 40; i++) {
      const dot = document.createElement('div');
      const sz = 6 + Math.random() * 8;
      dot.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};top:-20px;left:${Math.random()*100}%;opacity:.9;animation:pnDrop ${1.2+Math.random()*1.8}s ease-out ${Math.random()*.6}s forwards`;
      wrap.appendChild(dot);
    }
    if (!document.getElementById('pn-confetti-style')) {
      const s = document.createElement('style');
      s.id = 'pn-confetti-style';
      s.textContent = `@keyframes pnFadeIn{from{opacity:0}to{opacity:1}}@keyframes pnDrop{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(${window.innerHeight||700}px) rotate(${360+Math.random()*360}deg);opacity:0}}`;
      document.head.appendChild(s);
    }
  }

  // Auto-fetch on script load if logged in
  if (localStorage.getItem('pn-token')) {
    document.addEventListener('DOMContentLoaded', () => fetchStatus());
  }

  return { fetchStatus, openCheckout, cancel, _toast, _applyEntitlementUI };
})();
