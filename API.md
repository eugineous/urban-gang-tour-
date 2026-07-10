# API Contracts — Urban Gang Tour

All endpoints: JSON in/out. Public POSTs are IP rate-limited (never user-ID for
anonymous traffic). Strict schemas — unknown fields are rejected with
`unexpected_field:<name>`. Secrets live in Vercel env vars only.

Cross-site protection (`lib/server/origin.ts`): public POSTs answer 403
`bad_origin` when the browser sends an Origin header that is not
urbangangtour.co.ke, the current Vercel deployment host, or localhost (a
missing Origin is tolerated for beacons/native apps). Admin mutations
(`/api/admin/*` POST) REQUIRE a matching Origin outright. Exempt:
`/api/mpesa/callback` and `/api/whatsapp/webhook` (server-to-server; the
WhatsApp webhook is HMAC signature-verified) and `/api/client-error`
(sendBeacon may omit headers; it keeps its own flood guard).

Critical alerts (`lib/server/alert.ts`): M-Pesa reconciliation failures, order
ledger write failures and WhatsApp signature-failure bursts email the owner via
Resend (settings key `alert_email`, fallback owner address) and always log with
an `[ALERT]` prefix.

## Public

### POST /api/auth
Body: `{action:'signup'|'login'|'logout', email?, phone?, password?, name?}`
— email **or** Kenyan phone accepted. Passwords scrypt-hashed. Sets `ugt_user`
signed cookie (30d). 200 `{ok,user}` · 400 invalid · 401 bad credentials ·
409 exists · 429 rate-limited (5/min/IP).
GET → `{user}` for the current session (own data only — no other users').

### POST /api/bookings
Body: `{name, email, type, org?, phone?, message?}` (`type` from fixed list).
Persists to `bookings`; notifies via Resend if `RESEND_API_KEY`.
200 `{ok,id}` · 400 · 429 (5/min/IP).

### POST /api/orders
Body: `{items:[{id,qty}], name, phone, email?, idempotencyKey?}` — **email
optional** (guest checkout; M-Pesa needs phone only). Prices computed
server-side from `lib/server/catalog.ts` — client prices are never trusted.
Idempotent within 10 min per key. Ledger row inserted; STK push if `MPESA_*`
env set. 200 `{ok,id,total,stk}` · 503 payment not configured · 429 (8/min/IP).

### POST /api/mpesa/callback
Daraja result hook: marks order `paid` (+receipt) or `failed`. Always 200-acks.

### POST /api/stripe/checkout
Body: `{items:[{id,qty}], email?}` — strict: item objects may carry ONLY
`id`+`qty` (qty 1–20, ≤30 lines, ids must exist in `lib/server/catalog.ts`).
Prices computed server-side; client prices are never trusted. Writes a
`pending` ledger row (`pay_method='card'`, `stripe_session`) BEFORE creating
the Stripe Checkout Session (mode `payment`, currency `kes`,
`metadata.order_id`, idempotency key derived from the order id so retries
reuse one session). 200 `{ok,id,total,url}` (redirect the browser to `url`) ·
400 · 429 (8/min/IP) · 500 ledger write failed (alerts owner) ·
502 Stripe error · 503 `card_not_configured` / `db_not_configured`.
Success returns to `/pay/success?session_id=…`, cancel returns to `/shop`.

### POST /api/stripe/webhook
Stripe server-to-server hook (Origin-exempt; verified via
`stripe-signature` + `STRIPE_WEBHOOK_SECRET`, 400 on bad signature, 503 when
unconfigured). Dashboard-registered events: `checkout.session.completed`
(marks the `metadata.order_id` row `paid`, stores `stripe_payment_intent`,
audit-logs; alerts owner when reconciliation fails),
`payment_intent.payment_failed` (marks a still-`pending` order `failed`),
`payment_intent.succeeded` (acknowledged; session completion is the source of
truth). Always 200-acks handled/ignored events.

### POST /api/subscribe
Body: `{email}`. Newsletter list. 200 · 400 · 429 (5/min/IP) · 503 no DB.

### POST /api/submissions
Body: `{name, school, title, pitch}` + logged-in session → Newsroom queue.

### GET /api/site-info
Public config only (business WhatsApp number). Never user data. Cached 5 min.

### GET /api/social-wall
`{urls}` — the admin-curated Instagram post URLs for the /blog "From the Gram"
wall (settings key `ig_wall`, max 12, validated post/reel URLs only). No PII.
429 (30/min/IP). Cached `s-maxage=300`. Returns `{urls: []}` when DB is unset.

### GET /api/health
Service status: mpesa/email/database configured or awaiting env vars.
429 (30/min/IP).

### POST /api/track
Page-view counter (path only, no PII, no third-party trackers). 429 (60/min/IP).

## Admin (require `ugt_admin` signed cookie; 401 otherwise)

- `POST /api/admin/login` `{code}` → session. `DELETE` → logout. Rate-limited.
- `GET /api/admin/data?view=bookings|orders|posts|users|submissions|subscribers|traffic|settings|audit|stats`
- `POST /api/admin/save` `{kind, ...}` — post/status/setting mutations (audited).
- `GET /api/admin/export?kind=…` — CSV.
- `POST /api/admin/setup` — idempotent schema create/repair.
- `POST /api/admin/broadcast` `{subject, body}` — email all subscribers (Resend).
- `GET/POST /api/admin/social` — channel status + curated `ig_wall` list.
  POST `{text, imageUrl?}` posts the composer text to the Facebook Page
  (`META_FB_PAGE_ID`+`META_FB_PAGE_TOKEN`), WhatsApp self-draft (`META_WA_*`),
  and Instagram when `imageUrl` given (`META_IG_TOKEN`+`META_IG_USER_ID`).
  POST `{kind:'wall.save', urls}` saves the /blog Instagram wall (max 12,
  instagram.com/p|reel URLs only; audited).
- Publishing an article via `/api/admin/save` `{kind:'post'}` auto-posts it
  ONCE to connected Facebook/Instagram (first publish only, tracked by
  `posts.social_posted_at`; fire-and-forget via `after()`, logged `[social]`).

## Env vars (server-side only — never client-exposed)
`DATABASE_URL, SESSION_SECRET, ADMIN_ACCESS_CODE, RESEND_API_KEY, BOOKINGS_FROM,
BOOKINGS_TO, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
MPESA_PASSKEY, MPESA_ENV, MPESA_CALLBACK_URL, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, META_WA_TOKEN, META_WA_PHONE_ID,
META_WA_SELF, META_IG_TOKEN, META_IG_USER_ID, META_FB_PAGE_ID, META_FB_PAGE_TOKEN`
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the one intentionally client-safe key.)

## Scale notes
In-memory rate limits are per-instance; swap to Upstash Redis
(`UPSTASH_REDIS_REST_URL/TOKEN`) before heavy campaigns. Email sends batch in
50s; move to a queue (e.g. Vercel Queues/cron) beyond ~2k subscribers.
Load-test checkout before big drops.
