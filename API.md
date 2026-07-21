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

Routine notifications (`lib/server/notify.ts`): separate, opt-in owner emails so
routine traffic never floods the critical-alerts inbox above. Settings key
`notify_email` (falls back to the same owner address) plus one boolean toggle
per event, all default OFF, all enabled from the admin Comms tab ("Owner
Notifications" card): `notify_on_new_order`, `notify_on_new_booking`,
`notify_on_new_signup`, `notify_on_admin_login`, `notify_on_failed_admin_login`,
`notify_on_post_published` (fires when a post — including a scheduled one —
actually goes live, not on save/schedule), `notify_on_new_submission`,
`notify_on_payment_success` / `notify_on_payment_failure` (M-Pesa, Paystack and
Stripe all route through these two), `notify_on_ticket_scan` (gate check-in
only, not invalid/already-used scans), `notify_on_whatsapp_message`.
Fire-and-forget via `after()`, never throws, always logs a `[notify]` line.
No "comments" or "likes" notifications exist because neither feature exists on
the site.

## Public

### POST /api/auth
Body: `{action:'signup'|'login'|'logout', email?, phone?, password?, name?}`
— email **or** Kenyan phone accepted. Passwords scrypt-hashed. Sets `ugt_user`
signed cookie (30d). 200 `{ok,user}` · 400 invalid · 401 bad credentials ·
409 exists · 429 rate-limited (5/min/IP).
GET → `{user}` for the current session (own data only — no other users').

### POST /api/bookings
Body: `{name, email, type, org?, phone?, message?}` (`type` from fixed list).
Persists to `bookings`; fires the opt-in `notifyNewBooking` owner email (see
Routine notifications above) fire-and-forget on a successful insert.
200 `{ok,id}` · 400 · 429 (5/min/IP).

### POST /api/orders
Body: `{items:[{id,qty}], name, phone, email?, idempotencyKey?}` (merch) OR
`{ticket:{eventId,tier,qty}, name, phone, email?, idempotencyKey?}` (event
tickets; tier index into `TICKET_TIERS`, qty 1-20, stored as one
`ticket:<eventId>:<tier>` item line) - **email optional** (guest checkout;
M-Pesa needs phone only). Prices computed server-side from
`lib/server/catalog.ts` (`PRICES` / `TICKET_TIERS`) - client prices are never
trusted.
Idempotent within 10 min per key. Ledger row inserted; STK push if `MPESA_*`
env set. Fires the opt-in `notifyNewOrder` owner email (see Routine
notifications above) fire-and-forget on a successful insert - on creation
(checkout start), not on payment confirmation, so the owner also hears about
STK pushes that never complete. 200 `{ok,id,total,stk}` · 503 payment not
configured · 429 (8/min/IP).

### GET /api/orders/status?id=ORD-...
Public poll for the checkout STK-waiting panel. Id format-validated
(`^ORD-[A-Z0-9-]{4,40}$`); the unguessable id is the bearer. Returns
`{status, total, receipt, method, created_at}` - `receipt` (M-Pesa receipt /
Paystack ref / Stripe payment intent) only once paid. NEVER returns
name/email/phone. 200 - 400 - 404 unknown - 429 (30/min/IP) - 503 no DB.

### GET /receipt/[id]
Server-rendered printable receipt page (force-dynamic, robots noindex).
PAID / PENDING / NOT COMPLETED banner, itemized lines, business identity
block. No PII beyond buyer name + masked phone. 404 for unknown ids.

### GET /tickets/[orderId]
Server-rendered list of an order's e-tickets (force-dynamic, robots noindex).
The unguessable ORD- id is the bearer, same model as /receipt/[id]. Lazy-mints
tickets for a paid ticket order that missed webhook minting
(`lib/server/tickets.ts ensureTickets`, advisory-locked + idempotent).
404 unknown ids. Shows pending notice while unpaid.

### GET /t/[code]
The digital ticket page - one QR ticket per admission (force-dynamic, robots
noindex). Code format `TKT-<10 chars>-<4-char HMAC tag>` (unambiguous
alphabet, tag keyed with SESSION_SECRET) is verified BEFORE any DB read, so
forged codes 404 offline-cheap. Card states: valid, ADMITTED stamp
(`used_at`), pending-payment blur while the order is unpaid. QR encodes
`https://urbangangtour.co.ke/t/<code>`. Shows holder name + event data only -
no contact info.

### GET /api/tickets/[code]/pdf
Downloadable PDF twin of `/t/[code]`. Same bearer model: the TKT- code's
HMAC tag is format-checked BEFORE any DB read, so a garbage/forged code never
touches the database. 200 PDF attachment `UGT-Ticket-<code>.pdf` · 404
invalid/unknown code · 429 (20/min/IP) · 503 no DB. Embeds the real signed QR
plus a second small QR carrying an HMAC-SHA256-signed data blob (code, order
id, event, tier, issued-at - same `SESSION_SECRET`, `lib/server/tickets.ts`
`signedTicketBlob`/`verifyTicketBlob`) so an offline gate device could
re-derive and check that the printed facts were not edited after issuance.
This is a redundant hardening layer, not a replacement for the live gate scan
(`/api/tickets/verify`), which is what actually catches reuse/refunds - it
checks the code against the current database state, something no signature
embedded in a PDF can ever do offline.

### GET /api/receipts/[id]/pdf
Downloadable PDF twin of `/receipt/[id]`. Same bearer model as the web page
(unguessable ORD- id). Status banner (PAID green / PENDING amber / NOT
COMPLETED red; PAID - COMPLIMENTARY for comp orders), itemized lines, payment
reference, business identity block, per-ticket list when the order has
tickets. 200 PDF attachment `UGT-Receipt-<id>.pdf` · 404 unknown id · 429
(20/min/IP) · 503 no DB.

### POST /api/mpesa/callback
Daraja result hook: marks order `paid` (+receipt) or `failed`. Always 200-acks.
On paid, mints e-tickets (`ensureTickets`) then fires the branded Resend
receipt email (fire-and-forget via `after()`) when the order row has an email
- same on the Paystack and Stripe webhooks (`lib/server/receipt-email.ts`
includes per-ticket links for paid ticket orders).

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
- `GET /api/admin/data?view=bookings|orders|posts|users|submissions|subscribers|traffic|settings|audit|stats|tickets`
- `POST /api/tickets/verify` `{code}` — gate check-in (admin session +
  strict Origin, 120/min/IP). Validates the code's HMAC tag, then atomically
  flips `used_at` once (`WHERE used_at IS NULL AND order paid`). Returns
  `{result: valid|used|invalid, ticket?, usedAt?, reason?}`; every scan is
  audit-logged. UI: `/admin/gate` (on-device jsQR camera scanner + manual
  entry; same `ugt_admin` session as the Control Room).
- `POST /api/admin/save` `{kind, ...}` — post/status/setting mutations (audited).
- `POST /api/admin/tickets/comp` `{eventId, tier, qty, holderName, holderEmail?,
  holderPhone?, reason}` — admin-only complimentary tickets. Validates
  eventId/tier/qty against `TICKET_TIERS` exactly like `/api/orders`; `reason`
  required (min 4 chars, audit-logged with actor + qty). Creates a synthetic
  order (`total=0`, `status='paid'`, `pay_method='comp'`) with the same item
  shape as a real purchase, then mints real signed tickets via `ensureTickets`
  - indistinguishable from a paid ticket at the gate. Sends the branded
  receipt email (visibly "COMPLIMENTARY - KES 0", never a fake price) when
  `holderEmail` is given. 200 `{ok,id,receiptUrl,ticketsUrl,tickets}` · 400 ·
  401 · 403 bad origin · 429 (20/min/IP) · 503 no DB.
  `GET /api/admin/data?view=eventTiers` returns the event/tier list for the
  Control Room's "Issue Free Ticket" form (Orders tab); the comp route
  re-validates independently and is the actual source of truth.
- `GET /api/admin/export?kind=…` — unified CSV export. `kind` one of
  `orders|bookings|subscribers|tickets|invoices|payments|contacts|expenses|payouts`.
  Every kind stays within what its equivalent admin list already shows (no
  extra fields). Control Room Dashboard tab has one "Export" panel linking
  every kind so nothing requires hunting through individual ops tabs.
- `GET /api/admin/backup` — full-database disaster-recovery backup, distinct
  from the per-kind export above. Introspects `information_schema.tables`
  (never a hardcoded table list, so new tables are covered automatically),
  dumps every table with `SELECT *` into one CSV per table, and returns a
  single ZIP (`ugt-backup-<date>.zip`, hand-rolled ZIP writer, no new
  dependency). Password-hash columns (`pass_hash`, `password_hash`, any
  `*_hash`/`*_salt` match) are replaced with `[REDACTED]` before the CSV is
  written. Rate limited to 2/min/IP (heavy query, meant for a deliberate
  manual click, not routine use). Every download is written to `audit_log`
  (actor, table count, approximate row count). Exposed as "Download Full
  Backup" in the Control Room Dashboard's Export panel, visually distinct
  from the per-kind buttons.
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
