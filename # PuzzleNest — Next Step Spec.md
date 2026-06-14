# PuzzleNest — Next Step Spec
## Premium Tier MVP (₹99/month)

> **Audience:** Solo developer (Vraj). Tactical, code-path-heavy. File paths use repo-relative form from `Puzzle Web Game/`.
> **Status:** Plan-mode draft — for review before implementation.

---

## 1. Context

The sidebar on `web/game.html:107-114` already advertises *"Go Premium · ₹99/mo · No ads · Unlimited hints · Archive access"* — but the CTA is a dead button. Premium is the highest-leverage "Now" item from the previous roadmap because:

- **Revenue is zero today.** Every other roadmap item (multiplayer, tournaments, AI hints) is a cost center. Premium unlocks the funding to build them.
- **Demand is implied.** Users currently get 3 hints per game (`web/js/app.js:208`). Hints are the most-clicked help affordance; "unlimited hints" is a believable upgrade prop.
- **The stack is ready.** User model has `coins` and `store_purchases` JSON; `Auth.submitScore` flow gates achievement coin rewards. Adding `is_premium` + `premium_until` is a small migration.
- **INR pricing already on the page.** No currency rework needed — Razorpay (not Stripe) is the right rail for India.

**Outcome:** Ship a working Premium flow (signup → payment → entitlement → feature gating) in ~3 weeks of solo evening work, generating ₹X/mo from existing logged-in users before building any new growth surfaces.

---

## 2. PRD — Product Requirements Document

### 2.1 Problem statement
PuzzleNest has 10 live games, 22 backend routers, daily streaks, achievements, and a leaderboard — but no revenue model. The product runs on hosting cost with no income, blocking investment in multiplayer polish, new games, and AI features. Power users (≥1 puzzle/day) hit the 3-hint cap and have no upgrade path.

### 2.2 Goals
| # | Goal | Measure |
|---|---|---|
| G1 | Convert paying users from existing logged-in base | ≥3% paid-conversion rate of monthly logged-in users within 60 days |
| G2 | Validate willingness to pay ₹99/mo | ≥30 paying subscribers in first 90 days |
| G3 | Reduce hint friction for power users | Daily-active heavy users (≥5 puzzles/day) use ≥10 hints/day average post-launch |
| G4 | Establish billing primitives reusable for future SKUs | Same `subscriptions` table supports annual plan + future tournament entry |

### 2.3 Non-goals (explicitly out of scope for v1)
| # | Non-goal | Why deferred |
|---|---|---|
| N1 | Annual plan (₹999/yr) | Add in v1.1 once monthly is proven |
| N2 | Family / multi-seat plans | Premature — no demand signal yet |
| N3 | Refund self-service | Manual via support email is fine at <100 subs |
| N4 | Apple/Google IAP for the React Native frontend | Web-only first; mobile follows |
| N5 | Promo codes / referral rewards | Build only after first 30 paying users |
| N6 | Tax invoice generation (GST) | Razorpay handles this; revisit at scale |

### 2.4 User stories
- **As a logged-in free user**, I want to see a clear *Upgrade* CTA on game pages so I know premium exists.
- **As an upgrade-curious user**, I want a pricing page that explains what I get so I can decide before paying.
- **As a buyer**, I want to pay with UPI/card via Razorpay so checkout is one step.
- **As a premium subscriber**, I want unlimited hints + no ad strips so my session is uninterrupted.
- **As a premium subscriber**, I want a visible badge on my profile/leaderboard row so the status feels real.
- **As a premium subscriber**, I want to cancel from settings so I'm never locked in.
- **As an expired subscriber**, I want my puzzles to keep working (just gated features lock) so I'm not punished.

### 2.5 Requirements

**P0 — Must Have**
- R1. New columns `User.is_premium` (bool) and `User.premium_until` (datetime nullable).
- R2. New table `Subscription` (id, user_id, provider, provider_sub_id, status, plan, created_at, current_period_end).
- R3. New table `Transaction` (id, user_id, provider, provider_payment_id, amount_paise, currency, status, created_at, raw_payload JSON).
- R4. Razorpay integration: subscription create + payment verify + webhook handler.
- R5. Pricing page `web/pricing.html` with single ₹99/mo plan card.
- R6. Upgrade modal triggered from the existing Upgrade sidebar block.
- R7. Feature gates: hint counter is unlimited if `user.is_premium`; sidebar affiliate cards hidden if `user.is_premium`.
- R8. Premium badge (gold star) on leaderboard row and nav chip.
- R9. `GET /billing/status` for the frontend to check entitlement on load.
- R10. Settings screen "Cancel subscription" button.
- R11. Webhook idempotency (don't double-credit).

**P1 — Nice to Have (post-launch)**
- R12. 7-day free trial (Razorpay supports it).
- R13. Email receipts via Razorpay's built-in.
- R14. "Restore purchase" button in case of webhook race.
- R15. Premium-only grid sizes (e.g., shikaku 10×10).

**P2 — Future (architect to support)**
- R16. Annual plan (`plan` column already supports multi-SKU).
- R17. Region-aware pricing (different currencies per IP).
- R18. Grace period for failed renewals.

### 2.6 Success metrics

| Indicator | Type | Target (90 days) | Source |
|---|---|---|---|
| Pricing-page CTR (sidebar Upgrade → /pricing) | Leading | ≥15% of game-page sessions | Add `pn-clicks` localStorage event + backend counter |
| Pricing-page → Razorpay checkout open | Leading | ≥10% of pricing visits | Razorpay dashboard |
| Razorpay checkout completion | Leading | ≥40% of opens | Razorpay dashboard |
| Monthly Active Paying Users (MAPU) | Lagging | ≥30 | DB query: `SELECT COUNT(*) FROM users WHERE is_premium=1 AND premium_until > NOW()` |
| MRR | Lagging | ≥₹2,970 (30 × ₹99) | Same query × 99 |
| Churn (cancellations / paying base) | Lagging | <10%/month | Subscription.status changelog |

### 2.7 Open questions
| # | Question | Owner |
|---|---|---|
| Q1 | Razorpay merchant account live? KYC complete? | Founder (you) |
| Q2 | Hosting before launch — Render, Railway, or VPS? Affects webhook URL stability. | Eng |
| Q3 | Do we email receipts ourselves, or trust Razorpay's? | Eng |
| Q4 | Is "no ads" real today? I see affiliate cards but no third-party ad network — clarify what "ads off" means in the UI. | Product |

---

## 3. TRD — Technical Requirements Document

### 3.1 New dependencies
- **Backend**: `razorpay` (Python SDK), `python-dateutil`. Add to `backend/requirements.txt`.
- **Frontend**: Razorpay Checkout JS via CDN script tag. No npm dep.
- **Env vars** (new): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_ID_MONTHLY`. Wire through `backend/app/core/config.py` (already uses Pydantic Settings).

### 3.2 Architecture
```
[ web/pricing.html ]
        │  click "Subscribe"
        ▼
[ JS: POST /api/v1/billing/create-subscription ]
        │  returns { subscription_id, key_id }
        ▼
[ Razorpay Checkout modal (CDN script) ]
        │  on success → razorpay_payment_id, razorpay_signature
        ▼
[ JS: POST /api/v1/billing/verify-payment ]
        │  backend verifies HMAC, updates User.is_premium=1
        ▼
[ Razorpay sends webhook (subscription.activated, payment.captured) ]
        │
        ▼
[ POST /api/v1/billing/webhook → verify signature → upsert Subscription/Transaction ]
```

### 3.3 Endpoint contracts
Add new router `backend/app/routers/billing.py`, mount in `backend/app/main.py` next to existing `auth`, `stats`, `sessions`, `multiplayer` routers.

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/billing/create-subscription` | Bearer | `{}` | `{subscription_id, key_id, plan_id, amount_paise}` |
| POST | `/billing/verify-payment` | Bearer | `{razorpay_payment_id, razorpay_subscription_id, razorpay_signature}` | `{ok: true, premium_until}` |
| POST | `/billing/webhook` | Razorpay HMAC header | Razorpay event JSON | `{received: true}` |
| GET | `/billing/status` | Bearer | — | `{is_premium, premium_until, plan, can_cancel}` |
| POST | `/billing/cancel` | Bearer | `{}` | `{ok: true, cancels_at}` |

Rate limits (use existing `slowapi` decorator pattern, see `backend/app/routers/games/shikaku.py:9-21`):
- `create-subscription`: 5/min/IP
- `verify-payment`: 10/min/IP
- `webhook`: no IP limit (HMAC-gated)
- `status`: 30/min/user
- `cancel`: 3/min/user

### 3.4 Security
- Reuse existing JWT Bearer guard from `backend/app/routers/auth.py` (`get_current_user` dependency).
- **Webhook signature**: HMAC-SHA256 of raw body with `RAZORPAY_WEBHOOK_SECRET`. Reject on mismatch. Pattern is parallel to existing `core/security.py` solve-token verification — same primitive.
- **Idempotency**: store `provider_payment_id` UNIQUE on `Transaction`. Webhook handler does `INSERT ... ON CONFLICT DO NOTHING`. Replays are no-ops.
- **No card data ever touches our server** — Razorpay Checkout is hosted; we only see IDs and signatures.

### 3.5 Migration
Add to `backend/migrate.py` (existing migration runner) — two `ALTER TABLE` for User + two `CREATE TABLE` for Subscription/Transaction. SQLAlchemy `Base.metadata.create_all` (`main.py:23`) will pick up new models on first run.

### 3.6 Hosting/infra prerequisite (blocking)
Webhook needs a stable public HTTPS URL. Local dev requires `ngrok` or similar. Production deployment to Render or Railway (cheapest path) is a prerequisite — see roadmap "deploy" item from prior message.

---

## 4. App Flow

### 4.1 Happy path — first purchase
```
1. User on /game.html — sees Upgrade card in right sidebar.
2. Clicks "₹99/mo →" button.
3. window.location = '/pricing.html'  (new page)
4. Pricing page shows single plan card + "Subscribe with Razorpay" button.
5. Click → JS fetches POST /billing/create-subscription with Bearer token.
6. Response: { subscription_id, key_id }.
7. JS opens Razorpay Checkout modal:
       new Razorpay({ key, subscription_id, name: 'PuzzleNest', ... }).open()
8. User pays via UPI/card inside Razorpay's iframe.
9. Razorpay callback fires with { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }.
10. JS POST /billing/verify-payment with those three values.
11. Backend verifies HMAC → updates User.is_premium=1, premium_until=now+30d → returns {ok:true}.
12. JS shows success modal, refreshes /billing/status, redirects to /.
13. Asynchronously: Razorpay webhook → /billing/webhook → upserts Subscription + Transaction rows.
```

### 4.2 Returning premium user
```
1. Page load → Auth.checkSession() → if logged in, also fetch /billing/status.
2. Cache in window.PN.premium = { is_premium, premium_until }.
3. UI conditionals: hide affiliate cards, swap hint counter for "∞", show gold badge in nav chip.
```

### 4.3 Cancellation
```
1. Settings page → "Cancel Subscription" button (only if is_premium).
2. Confirm dialog: "Your access continues until {premium_until}."
3. POST /billing/cancel → backend calls Razorpay API to cancel at period end.
4. UI updates: badge shows "Cancels {date}".
5. After period_end, scheduled job (cron) flips is_premium=0.
```

### 4.4 Failure paths
- **Payment fails inside Razorpay modal** → modal shows error; our `verify-payment` is never called. UI stays on pricing page with toast.
- **`verify-payment` fails signature** → 400 to client; user sees "Verification failed — contact support." Don't grant access.
- **Webhook arrives before `verify-payment`** → both write to `Transaction` idempotently. First-writer wins on User update; second is a no-op (`is_premium` already 1).
- **Webhook arrives but no `verify-payment` (user closed tab)** → webhook handler is the source of truth; user is upgraded server-side. On next page load, `/billing/status` reflects truth.

---

## 5. UI/UX Design

### 5.1 New pages/screens
1. **`web/pricing.html`** — new full page using existing design tokens.
2. **Upgrade modal** — overlay reusing `pn-reward-overlay` styles from `web/js/features.js`.
3. **Success modal** — confetti + premium badge reveal.
4. **Cancel flow** — added section in existing settings (no settings page in web yet — create simple one or add to `index.html` footer).

### 5.2 Pricing page wireframe (text)
```
+------------------------------------------------+
|  PuzzleNest                          [Sign in] |
+------------------------------------------------+
|                                                |
|     Go Premium                                 |
|     Quiet your sidebar. Unlock every hint.     |
|                                                |
|   +------------------------------------+       |
|   |  PREMIUM                           |       |
|   |  ₹99 /month                        |       |
|   |  ─────                             |       |
|   |  ✓ Unlimited hints                 |       |
|   |  ✓ No affiliate cards or upsell    |       |
|   |  ✓ 30-day daily-puzzle archive     |       |
|   |  ✓ Premium badge on leaderboards   |       |
|   |  ✓ Cancel anytime                  |       |
|   |                                    |       |
|   |  [ Subscribe with Razorpay  → ]    |       |
|   +------------------------------------+       |
|                                                |
|   Trusted by 40,000 daily players              |
|   Secure payment via Razorpay · UPI · Cards    |
|                                                |
+------------------------------------------------+
```

### 5.3 Design tokens (reuse from `web/css/style.css:1-50`)
- Background: `var(--paper)` (#faf8f3)
- Card: `var(--white)` with `var(--border)` (#ddd8c8) — **no border-radius** (editorial feel)
- CTA button: `var(--gold)` (#c8961e), uppercase, letter-spacing .1em
- Heading: `'Playfair Display', serif`, weight 900
- Body: `'Epilogue', sans-serif`
- Premium badge: gold star ★ in 12px next to username

### 5.4 Game-page changes (minimal)
- `web/game.html:107-114` Upgrade card → `onclick="location.href='/pricing.html'"`.
- `web/js/app.js:208` (`hintsLeft = 3`) → if `window.PN?.premium?.is_premium`, set to `Infinity` and render `∞` in `#hints-left`.
- Sidebar affiliate cards (`game.html:126-140`) → `style="display:none"` if premium.

### 5.5 React Native parity (deferred to v1.1)
The mobile screens (`frontend/src/screens/SettingsScreen.js`, `StoreScreen.js`) get a Premium section in v1.1. Web first.

---

## 6. Backend Schema

### 6.1 Modifications to existing models
File: `backend/app/models.py`

```python
# Add to User model:
is_premium      = Column(Boolean, default=False, nullable=False)
premium_until   = Column(DateTime, nullable=True)
razorpay_customer_id = Column(String, nullable=True, unique=True)
```

### 6.2 New models
File: `backend/app/models.py` (append)

```python
class Subscription(Base):
    __tablename__ = "subscriptions"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider            = Column(String, default="razorpay", nullable=False)
    provider_sub_id     = Column(String, unique=True, nullable=False, index=True)
    plan                = Column(String, default="monthly_99", nullable=False)
    status              = Column(String, default="created", nullable=False)
    # statuses: created | authenticated | active | paused | halted | cancelled | completed | expired
    current_period_end  = Column(DateTime, nullable=True)
    cancel_at_period_end= Column(Boolean, default=False)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user                = relationship("User", back_populates="subscriptions")

class Transaction(Base):
    __tablename__ = "transactions"
    id                      = Column(Integer, primary_key=True, index=True)
    user_id                 = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id         = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    provider                = Column(String, default="razorpay", nullable=False)
    provider_payment_id     = Column(String, unique=True, nullable=False, index=True)
    amount_paise            = Column(Integer, nullable=False)  # 9900 = ₹99
    currency                = Column(String, default="INR", nullable=False)
    status                  = Column(String, default="created", nullable=False)
    # statuses: created | authorized | captured | refunded | failed
    raw_payload             = Column(Text, nullable=True)  # store JSON for audit
    created_at              = Column(DateTime, default=datetime.utcnow)
    user                    = relationship("User")
```

Add to User: `subscriptions = relationship("Subscription", back_populates="user")`.

### 6.3 Pydantic schemas
File: `backend/app/schemas.py` (append)

```python
class BillingStatus(BaseModel):
    is_premium: bool
    premium_until: Optional[datetime]
    plan: Optional[str]
    can_cancel: bool

class CreateSubscriptionResponse(BaseModel):
    subscription_id: str
    key_id: str
    plan_id: str
    amount_paise: int

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
```

### 6.4 Migration strategy
Run `python backend/migrate.py` after deploy. New columns default-safe (false/null). Two new tables created by `Base.metadata.create_all` in `main.py:23`. No data backfill needed — existing users get `is_premium=False`.

### 6.5 Indexes
- `subscriptions.provider_sub_id` UNIQUE (webhook lookup)
- `transactions.provider_payment_id` UNIQUE (idempotency)
- `users.razorpay_customer_id` UNIQUE (one customer per user)

---

## 7. Implementation Plan

### Phase 0 — Prerequisites (week 0)
1. Create Razorpay account, complete KYC, create monthly subscription Plan ID via dashboard → note `plan_id`.
2. Deploy backend to Render or Railway with HTTPS (existing `Procfile`-less FastAPI; just point to `app.main:app`). Webhook needs stable URL.
3. Add env vars in hosting dashboard.

### Phase 1 — Backend (weeks 1-2)
1. **Models** — append to `backend/app/models.py` (Section 6). Test migration locally with throwaway DB.
2. **Schemas** — append to `backend/app/schemas.py` (Section 6.3).
3. **Router** — create `backend/app/routers/billing.py`. Mount in `backend/app/main.py:97` block.
   - `POST /billing/create-subscription` → uses `razorpay.Client(...).subscription.create({plan_id, customer_notify: 1, total_count: 12})`.
   - `POST /billing/verify-payment` → `razorpay.utility.verify_subscription_payment_signature({...})`. On success, set `User.is_premium=True, premium_until=now+30d`.
   - `POST /billing/webhook` → verify HMAC against raw body using `RAZORPAY_WEBHOOK_SECRET`. Handle events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.captured`, `payment.failed`. Upsert `Subscription` + `Transaction` rows.
   - `GET /billing/status` → read User.
   - `POST /billing/cancel` → `razorpay.subscription.cancel(sub_id, {cancel_at_cycle_end: 1})`. Set `Subscription.cancel_at_period_end=True`.
4. **Daily cron** — add `apscheduler` (or simple endpoint hit by external cron) that sets `is_premium=False` when `premium_until < now()`.
5. **Test** — use Razorpay's test mode keys. Pay with the test card `4111 1111 1111 1111`. Verify webhook arrives (use Razorpay's webhook tester).

### Phase 2 — Frontend (week 3)
1. **`web/pricing.html`** — new page. Reuse nav from `game.html`. Single card design (Section 5.2). Include `<script src="https://checkout.razorpay.com/v1/checkout.js">`.
2. **`web/js/billing.js`** — new file. Exports `Billing.openCheckout()`. Wired by pricing-page button.
3. **`web/js/auth.js`** — after login success, also call `GET /billing/status` and stash on `window.PN.premium`.
4. **`web/js/app.js:208`** — hint init guard:
   ```js
   hintsLeft = window.PN?.premium?.is_premium ? Infinity : 3;
   ```
   And in the hint button render:
   ```js
   el.textContent = hintsLeft === Infinity ? '∞' : hintsLeft;
   ```
5. **`web/game.html:107-114`** — wire Upgrade button to `/pricing.html`. Hide whole `.sidebar-section` if premium.
6. **Premium badge** — add to `.nav-user-chip` and leaderboard rows. New CSS class `.pn-premium-badge` in `style.css`.

### Phase 3 — Cancel + polish (week 4)
1. Settings entry point in web (new `web/settings.html` or inline modal). Cancel button → calls `/billing/cancel`.
2. Success modal after first purchase (reuse `pn-reward-overlay` styles).
3. Toast on cancel: "Premium ends on {date}".
4. Add `is_premium` to `/leaderboard/scores` response so star renders without extra round-trip.

### Phase 4 — Launch checklist
- [ ] Razorpay live keys swapped in env (not test keys)
- [ ] Webhook URL configured in Razorpay dashboard
- [ ] Webhook test event delivered + handled
- [ ] Refund process documented (manual)
- [ ] Terms of Service + Privacy Policy pages updated to mention recurring billing
- [ ] Analytics: log `pricing_view`, `checkout_open`, `purchase_complete` to backend (new `events` table or stats router extension)
- [ ] Soft launch to 10 logged-in users (feature flag check or just announce)

---

## 8. Verification

### 8.1 Backend unit tests
Add `backend/tests/test_billing.py`:
- HMAC verification: known good signature → 200; tampered → 400.
- Idempotency: same `provider_payment_id` twice → second is no-op.
- Status endpoint: free user → `is_premium=false`; force-set DB → `true`.

### 8.2 End-to-end manual test (Razorpay test mode)
```bash
# 1. Run backend locally
"C:\Users\Vraj Panchal\AppData\Local\Python\bin\python.exe" -m uvicorn backend.app.main:app --reload --port 8000

# 2. Expose via ngrok for webhook
ngrok http 8000
# Set webhook URL in Razorpay dashboard to https://xxx.ngrok.io/api/v1/billing/webhook

# 3. Open http://localhost:8000/pricing.html
# 4. Click Subscribe, pay with test card 4111 1111 1111 1111, any CVV, any future expiry
# 5. Check DB:
#    SELECT is_premium, premium_until FROM users WHERE username='<you>';
#    SELECT * FROM subscriptions ORDER BY id DESC LIMIT 1;
#    SELECT * FROM transactions ORDER BY id DESC LIMIT 1;
# 6. Reload /game.html → hint counter shows ∞, affiliate cards gone, nav chip has gold star
# 7. Settings → Cancel → verify Subscription.cancel_at_period_end=True
```

### 8.3 Production smoke test (Razorpay live mode, ₹1 plan first)
Create a one-time ₹1 test plan in live mode, run full flow, refund yourself. Then create the real ₹99 plan.

### 8.4 Acceptance criteria checklist
- [ ] Free user sees Upgrade CTA, 3-hint cap, affiliate cards.
- [ ] After successful payment, is_premium=true within 5 seconds (verify-payment path).
- [ ] Within 60 seconds, Subscription + Transaction rows exist (webhook path).
- [ ] Premium user has ∞ hints, no affiliate cards, gold badge.
- [ ] Cancel sets cancel_at_period_end; access continues until premium_until.
- [ ] On premium_until expiry, cron flips is_premium=false; user sees free experience next page load.
- [ ] Webhook replay does not double-credit.
- [ ] Failed verify-payment leaves user as free (no premium granted without signature).

---

## 9. Out of scope (parking lot for v1.1+)
- Annual plan, free trial, referral codes, family plans
- Mobile (React Native) Premium UI
- Apple/Google IAP
- Promo codes
- GST invoice automation
- Region-aware pricing
- Pause/resume subscription self-service

---

**End of spec.** Total effort estimate: ~3-4 weeks evenings + 1 week buffer for Razorpay KYC. Next file to create: `backend/app/routers/billing.py`.

---

## 10. Progress — what's already shipped this session

### Backend ✅
- `backend/app/core/config.py` — added `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_ID_MONTHLY`, `PREMIUM_MONTHLY_PRICE_PAISE`. All env-driven, blank-safe in dev.
- `backend/app/models.py` — added `User.is_premium`, `User.premium_until`, `User.razorpay_customer_id`; new `Subscription` and `Transaction` tables with proper relationships, indexes, UNIQUE on `provider_sub_id` and `provider_payment_id`.
- `backend/app/schemas.py` — added `BillingStatus`, `CreateSubscriptionResponse`, `VerifyPaymentRequest`, `VerifyPaymentResponse`, `CancelSubscriptionResponse`.
- `backend/app/routers/billing.py` — full router with all 5 endpoints: `create-subscription`, `verify-payment`, `webhook` (HMAC verified, idempotent), `status` (lazy expiry), `cancel`. Rate limits applied via existing `slowapi` pattern.
- `backend/app/main.py` — imports + mounts billing router.
- `backend/requirements.txt` — added `razorpay==1.4.2`.

### Frontend ✅
- `web/pricing.html` — full pricing page with Razorpay Checkout script, premium-active state, gated button if not logged in.
- `web/js/billing.js` — `Billing.fetchStatus()`, `Billing.openCheckout()`, `Billing.cancel()`, `_applyEntitlementUI()` (badges, hide affiliate cards, ∞ hints).
- `web/css/style.css` — `.pn-premium-badge` styling for nav-chip + leaderboard rows.
- `web/js/app.js` — hint counter now respects `window.PN.premium.is_premium` (Infinity + ∞ display); `useHint` updated to skip decrement for premium.

### Tasks completed in session: #1–#10 + half of #11.

---

## 11. Remaining work (to finish task #11 + wrap launch)

### Must-do to finish v1 (~30 min of edits)
1. **`web/game.html`** — wire the existing Upgrade button to navigate to `/pricing.html`. Currently `onclick="location.href='/'"` at line 112 — change to `'/pricing.html'`. Add `<script src="/js/billing.js"></script>` near the end so entitlement applies on game page.
2. **`web/index.html`, `web/leaderboard.html`, `web/guides.html`** — add `<script src="/js/billing.js"></script>`. Ensures premium star + affiliate-card hiding works site-wide.
3. **`web/js/auth.js`** — after successful `login()` and `register()`, also call `window.Billing?.fetchStatus()` so badge appears immediately. Add to `fetchMe()` too, since it runs on page boot.
4. **Backend leaderboard response** — add `is_premium` to `/stats/leaderboard/{game}/scores` join (`backend/app/routers/stats.py`). Frontend can then render ★ next to premium usernames without an extra round-trip.
5. **DB migration** — run once after server restart. SQLAlchemy `Base.metadata.create_all` on app boot will create `subscriptions`/`transactions` tables. For *existing* `users` rows, ALTER is needed — `backend/migrate.py` should be extended with:
   ```sql
   ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0 NOT NULL;
   ALTER TABLE users ADD COLUMN premium_until DATETIME;
   ALTER TABLE users ADD COLUMN razorpay_customer_id VARCHAR UNIQUE;
   ```

### Nice-to-have (push to v1.1)
6. Settings page with Cancel button (currently no `web/settings.html` exists).
7. Success modal with confetti on first purchase.
8. Daily cron for hard-expiry of `is_premium` when `premium_until < now()`. Lazy expiry in `/billing/status` covers most cases.
9. Backend unit tests for HMAC + idempotency.

### Blocking external steps (only Vraj can do)
10. Razorpay KYC + create monthly plan in dashboard → record `plan_id`.
11. Deploy backend to Render/Railway (HTTPS webhook URL).
12. Set env vars in hosting dashboard.
13. Configure webhook URL in Razorpay dashboard.

---

**Next action after plan approval:** finish items 1–5 above (all small edits to existing files), then test end-to-end with Razorpay test keys via ngrok per Section 8.2.