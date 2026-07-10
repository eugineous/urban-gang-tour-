# API Contracts — Urban Gang Tour

All endpoints: JSON in/out. Public POSTs are IP rate-limited (never user-ID for
anonymous traffic). Strict schemas — unknown fields are rejected with
`unexpected_field:<name>`. Secrets live in Vercel env vars only.

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

### POST /api/subscribe
Body: `{email}`. Newsletter list. 200 · 400 · 429 (5/min/IP) · 503 no DB.

### POST /api/submissions
Body: `{name, school, title, pitch}` + logged-in session → Newsroom queue.

### GET /api/site-info
Public config only (business WhatsApp number). Never user data. Cached 5 min.

### GET /api/health
Service status: mpesa/email/database configured or awaiting env vars.

### POST /api/track
Page-view counter (path only, no PII, no third-party trackers).

## Admin (require `ugt_admin` signed cookie; 401 otherwise)

- `POST /api/admin/login` `{code}` → session. `DELETE` → logout. Rate-limited.
- `GET /api/admin/data?view=bookings|orders|posts|users|submissions|subscribers|traffic|settings|audit|stats`
- `POST /api/admin/save` `{kind, ...}` — post/status/setting mutations (audited).
- `GET /api/admin/export?kind=…` — CSV.
- `POST /api/admin/setup` — idempotent schema create/repair.
- `POST /api/admin/broadcast` `{subject, body}` — email all subscribers (Resend).
- `GET/POST /api/admin/social` — channel status / post (`META_WA_TOKEN`,
  `META_WA_PHONE_ID`, `META_IG_TOKEN`, `META_IG_USER_ID`; share-links fallback).

## Env vars (server-side only — never client-exposed)
`DATABASE_URL, SESSION_SECRET, ADMIN_ACCESS_CODE, RESEND_API_KEY, BOOKINGS_FROM,
BOOKINGS_TO, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
MPESA_PASSKEY, MPESA_ENV, MPESA_CALLBACK_URL, META_WA_TOKEN, META_WA_PHONE_ID,
META_WA_SELF, META_IG_TOKEN, META_IG_USER_ID`

## Scale notes
In-memory rate limits are per-instance; swap to Upstash Redis
(`UPSTASH_REDIS_REST_URL/TOKEN`) before heavy campaigns. Email sends batch in
50s; move to a queue (e.g. Vercel Queues/cron) beyond ~2k subscribers.
Load-test checkout before big drops.
