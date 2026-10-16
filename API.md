# API Contracts — Urban Gang Tour

All endpoints: JSON in/out. Public POSTs are IP rate-limited (never user-ID for
anonymous traffic). Strict schemas — unknown fields are rejected with
`unexpected_field:<name>`. Production secrets live in Cloudflare Worker secrets only.

Static database schema bootstrap runs as one atomic Neon HTTP transaction,
serialized with a transaction-scoped advisory lock. It does not execute one
external request per DDL statement. Failures roll back and log only a validated
SQLSTATE; existing endpoint error contracts and customer-data rules are unchanged.

Cross-site protection (`lib/server/origin.ts`): public POSTs answer 403
`bad_origin` when a supplied Origin does not exactly match an approved HTTPS
origin. Production permits `https://urbangangtour.co.ke`,
`https://www.urbangangtour.co.ke`, and the explicitly configured HTTPS
`SITE_URL` origin. Request Host/forwarded headers never expand the allowlist;
localhost is permitted only outside production. Missing Origin remains tolerated
for public beacons/native clients. Admin mutations (POST/PUT/PATCH/DELETE),
caption imports and organizer logout REQUIRE a matching Origin outright. Exempt:
`/api/mpesa/callback` and `/api/whatsapp/webhook` (server-to-server; the
WhatsApp webhook is HMAC signature-verified) and `/api/client-error`
(sendBeacon may omit headers; it keeps its own flood guard).

Session envelopes require a bounded base64url HMAC token containing an object
and a safe-integer, future millisecond `exp`. Malformed signatures fail closed
without throwing. Buyer cookies accept email or Kenyan phone identities, never
administrator/booking/organizer claims; organizer tokens retain their separate
HMAC context. Google admin requests resolve current directory permissions and
revocations. Unexpected persisted admin roles never default to owner access;
configured-directory errors during Google admin login return 503 rather than
falling back to elevated environment-owner permissions. The emergency owner
password login remains available. New admin sessions are registered, expire in
one day and can be revoked by the owner at `/api/admin/sessions` (GET/POST).
Mutations require a trusted Origin; only super-admin can list/revoke sessions.
Password changes revoke other password sessions. Registry outages permit only
a verified environment-backup-code recovery session lasting fourteen minutes.
Legacy sessions can be disabled through the owner session controls.

Admin password login, Google admin login and password changes accept at most
8192 streamed body bytes within five seconds and require a JSON object.
400 `invalid_request` · 413 `body_too_large` · 408 `request_timeout`.
Field-specific validation and credential rate limits still apply.

Sensitive admin/account/auth/organizer/order/booking/transaction API responses
carry no-store headers. The Worker independently enforces no-store for private
routes, authenticated requests, mutations and responses setting cookies, even
if a route accidentally supplies public cache headers. Shared Worker counters
now supplement application-local limits using persistent SQLite Durable Objects.
Credential budgets use only trusted CF-Connecting-IP, never device cookies or
forwarded headers. A limiter outage blocks credentials/purchases/writes with
503; public reads retain local guards. Venue traffic has wider aggregate budgets.

### Marketing campaigns

`GET /api/admin/campaigns` and `POST /api/admin/campaigns` require a current admin
with `ops_promos` permission (or owner). POST additionally requires trusted Origin,
bounded 16 KiB JSON and the campaign schema. Updates require id/version; stale
versions return 409. Saves and audit entries are atomic. Draft, live, scheduled
and paused states, owned image URLs, internal CTAs, Nairobi schedules, page
targets, priority, cooldown and popup delay are supported. A published deal
requires an active checkout promotion; campaign copy never changes prices.

`GET /api/campaigns` returns public campaigns only, serverTime and a publication
lease of at most 15 seconds. No internal name/promo ID is exposed. Responses are
no-store; database reads coalesce for five seconds. Failures return 503 with an
empty lease. Browser polls every ten seconds and expires unavailable campaigns;
sensitive payment/account/booking pages do not display or fetch campaigns.
There are no automatically published example campaigns.

Checkout quotes and payment creation read current merchandise and ticket prices
from the database, independently of display caches. Removed items fail closed.

Critical alerts (`lib/server/alert.ts`): M-Pesa reconciliation failures, order
ledger write failures and WhatsApp signature-failure bursts email the owner via
Resend (settings key `alert_email`, or the explicitly configured `notify_email`) and always log with
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
Paystack ref / Stripe payment intent) only once paid or fulfilled. NEVER returns
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
Daraja result hook: acknowledges immediately, then queries Daraja for a known
recoverable checkout reference before marking it `paid`, `declined` or `timed_out`.
The unsigned callback body cannot confirm or decline a payment by itself.
Successful transitions also require the expected order amount and a valid receipt;
unavailable or inconsistent results stay `reconciling` for the scheduled sweep.
Unknown/settled references do not trigger a provider query. Always 200-acks.
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
Anonymous requests return 401. Contact email comes only from the signed user
session; a client-provided email never establishes identity or receives replies.

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

- `POST /api/admin/login` `{password}` → session. Checks the owner-selected
  scrypt hash first, then `ADMIN_ACCESS_CODE` as an emergency fallback.
  `DELETE` → logout. Rate-limited.
- `POST /api/admin/google` `{credential}` → verifies the Google ID token and
  requires the email in `ADMIN_GOOGLE_EMAILS` or `admin_google_emails`.
- `GET /api/admin/security` → password/Google/Gmail readiness (super admin).
  `POST` `{password}` sets the owner-selected Control Room password as a salted
  scrypt hash; plaintext is never stored.
- `GET /api/admin/gmail` → Gmail connection status. `DELETE` disconnects
  (super admin). Refresh tokens are AES-256-GCM encrypted with a key derived
  from `SESSION_SECRET` before storage.
- `POST /api/admin/gmail/connect` `{code}` → exchanges a Google Identity
  Services popup authorisation code server-side and stores the encrypted
  refresh token. Requires same Origin + `X-Requested-With: XmlHttpRequest`.
- `GET /api/admin/gmail/messages?q=` → recent Gmail inbox messages. `POST`
  sends an RFC 2822 reply through Gmail and keeps the original thread id,
  `In-Reply-To`, and `References` headers.
- `GET /api/admin/bookings/reply?id=B-...` → booking reply trail. `POST`
  `{id,subject,body}` sends from the connected Gmail account, records the
  reply, audit-logs it, and advances a new/review booking to `replied`.
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

## Public gallery feed

`GET /api/site-data/gallery` is a public, rate-limited read. Returns
`{ ok: true, source: 'published', photos }` from published Gallery desk rows.
Only when no database is configured, it returns `source: 'archive'` and the
repository's neutral archive photos. An empty configured gallery or a database
failure remains empty; unpublished images never become a fallback. Photos expose
`id`, `url`, `caption`, `category`, `altText`, and `sortOrder` only.

## Uploaded media

Uploads use the native `UGT_MEDIA` Workers KV binding, without S3 keys or a
public bucket URL. Existing upload endpoints keep their request formats,
limits, permission checks and `{url}` responses. Returned URLs are immutable
same-origin `/media/<scope>/<content-hash>/<filename>` paths. Bundled media
continues through `public/assets`, `public/uploads` and the ASSETS binding.

`GET/HEAD /media/[...path]`: published gallery and organizer event images
are public. Gallery drafts require gallery-admin permission; organizer drafts
require their owning approved organizer or marketplace-admin permission.
Documents require documents-admin permission and return `private, no-store`.
Promotion artwork is public. Invalid paths return 404; missing storage returns
503. ETags and MIME headers are enforced without exposing executable uploads.

`GET /api/health/media`: rate-limited, coalesced operational aggregate counts
and binding readiness. Never returns saved URLs, customer data, document
payloads or credentials. Unavailable inventory returns 503, never a false zero.

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
50s; move to a queue (for example Cloudflare Queues) beyond ~2k subscribers.
Load-test checkout before big drops.

### New public account eligibility
`POST /api/auth` with `action: "signup"` requires `adultConfirmed: true` and `termsAccepted: true`. Missing/false confirmation returns 400 (`age_confirmation_required` or `terms_required`) before any account write. New self-managed accounts are 18+; no date of birth or identity document is collected. Existing login and guest checkout remain unchanged. This is an attestation, not verified age identity.

Public organizer applications (`POST /api/organizer/signup`) also require boolean `adultConfirmed: true` and `termsAccepted: true`; these attest adult business authority and policy acceptance before an application is written.

## Compact document suite (9 October 2026)
- `GET /verify/ticket/:code`: public, noindex current admission status; no holder contacts and no check-in mutation.
- `GET /verify/order/:id`: public, noindex order status only; no customer contacts or purchased items.
- `GET /api/admin/tickets/:code/holder`: verified admin plus `gate_scanner` permission; 30 requests/minute/IP, audited contact lookup, `private, no-store`. Anonymous 401, unauthorized role 403.
- `PUT /api/organizer/events/:id/design`: approved organizer, same-origin, rate-limited; ownership enforced in UPDATE. Allowed `design`, `name`, `accent`, optional PNG/JPEG data URI `logo`, `photo`. Unexpected fields rejected, request bounded to 750 KB; missing/foreign event 404. Cannot modify price/status. Static templates live in `/organizer/dashboard/designs`; admin sample studio `/admin/docs/designs` requires `documents` permission.
- Personalized PDF endpoints use private no-store headers. New download retains issued ID. Payment receipt delivery accepts only paid/fulfilled orders and uses provider idempotency; manual resend is separately keyed.

## Approved transaction interface (9 October 2026)

`/shop`, `/cart`, `/checkout` and `/book` use native Next/React components and the existing authenticated/server-validated APIs. No captured template or separate React runtime is loaded. Product and ticket prices are display hints only; order creation resolves prices and inventory server-side. Payment confirmation polls the recorded order status. The browser migrates older `ugt_cart` entries to `ugt-live-cart-v1` and removes a paid merchandise cart only when it matches the saved checkout snapshot. Booking and order retries preserve the request ID while the submitted details are unchanged.

### Checkout fulfillment and customer progress

- `GET /api/checkout/fulfillment`: public, device/IP rate limited; returns configured pickup location, zero pickup fee, and delivery fee only when `MERCH_DELIVERY_FEE_KES` is a valid non-negative integer. Delivery is disabled otherwise. `MERCH_PICKUP_LOCATION` supplies the real collection instruction. No provider is invented.
- Order creation accepts `fulfillment: {method: "pickup" | "delivery", address?: {line1, city, postalCode?}}` for merchandise. Server validation determines the fee. Delivery addresses remain private in `order_delivery_preferences`.
- `GET /api/orders/tracking?id=ORD-…`: public bearer capability limited to order references containing 24 random hexadecimal characters. Returns recorded payment and fulfillment state, handover method and reference; excludes names, contacts, addresses and internal notes. `no-store` response. `/orders/track?ref=…` presents the same record without implying an unrecorded delivery.
- `POST /api/bookings`: a newly inserted enquiry additionally returns a signed `statusToken` when the signing secret is configured. Retry acknowledgements do not mint new follow-up credentials. Booking drafts remain in tab-scoped session storage until successful submission.
- `GET /api/bookings/status?token=…`: signed, expiring 30-day capability; returns only enquiry reference, category, recorded status, preferred date and creation date. Predictable booking IDs and invalid/expired tokens are rejected. `/book/status?token=…` displays the enquiry progress. Both progress pages exclude indexing and send a no-referrer policy.

### Engagement additions
- `GET/POST /api/affiliates`: validated buyer's own application, configured programme terms and refund-adjusted earnings. New applications remain pending review. Attribution activates only for approved applicants who accept the configured current terms.
- `GET/PATCH /api/admin/affiliates`: verified admin with `people` permission; review applications. Optional `?id=24hex` returns the selected affiliate ledger. `/admin/affiliates` applies the same server permission guard.
- `GET/PUT /api/admin/affiliates/program`: `people` permission; configure explicit commission basis points, versioned terms and eligible published owned ticket events. Enabled incomplete programmes are rejected; changed conditions require a new terms version.
- `POST /api/affiliates/terms`: validated buyer accepts the current version for their own approved application. Stale versions return 409.
- `GET /api/affiliates/referral?code=24hex`: anonymous, rate-limited, coalesced read; returns only active-code validity and terms version, no affiliate contact or earnings. The browser captures only validated codes in tab-scoped session storage for up to 24 hours with a visible remove control.
- `POST /api/admin/affiliates/payouts`: `ops_payouts` permission; records an already-made external payment by unique reference. A transaction locks the affiliate ledger, validates payout against refund-adjusted earned balance and logs the actor. This endpoint never transfers money.
- `GET/PUT /api/account/preferences`: authenticated buyer's own optional marketing email consent and supported event interests. Defaults are opt-out. Saving consent synchronizes the account newsletter subscription; opt-outs override newsletter rows. Owner newsletter broadcasts select only consented recipients and optionally filter by a supported `interest`. Transactional email is unaffected. No SMS/push delivery is implied.
- `POST /api/captions`: verified admin with `gallery` permission imports reviewed WebVTT/transcript text. `GET /api/captions?asset=ID` returns only public caption text.

## Customer, commerce and operations additions (10 October 2026)

These contracts describe implemented routes. Provider configuration and recorded
business data determine availability; a ready UI does not establish successful
payment settlement, inbox delivery or third-party account connection.

### GET /api/account and GET /api/account?download=1

Buyer session required. The signed account ID is checked against the current
persisted user and session version before any customer records are returned.
Missing/revoked sessions return 401; unavailable account storage returns 503.
Rate limit: 30 requests/minute/device with a shared-network backstop.

Response: `{profile, orders, tickets, requests}`. Profile contains the buyer's
own `id`, `name`, `email`, `phone` and `created_at`. Orders are scoped by
`orders.user_id`; the ordinary view returns up to 100 orders and 300 tickets.
Tickets are limited to the buyer's paid/fulfilled orders. Privacy requests expose
only the buyer's request reference, kind, status and creation time.

`download=1` returns the same categories without the order/ticket display limits
as a downloadable `urban-gang-account.json`. Both modes send
`Cache-Control: private, no-store`. Guest purchases are not claimed by matching
an email address; ownership is established server-side when purchasing while
signed in. Existing receipt/ticket download capabilities remain separate from
this authenticated account export.

### POST /api/account/recovery

Public credential endpoint with a required trusted Origin and a strict
5 requests/minute/IP limit. Unexpected fields are rejected.

- `{action: "forgot", email}`: valid email required (maximum 254 characters).
  Database and `RESEND_API_KEY` must be configured; unavailable delivery returns
  503 before checking account existence. Known and unknown accounts receive the
  same `{ok: true, message}` immediately. The actual lookup and email run after
  the response. A successful API acknowledgement does not prove email delivery.
- `{action: "reset", token, password}`: the reset token must be a 43-character
  base64url value; password length is 8–100 characters. Links expire after one
  hour. Only the SHA-256 token hash is stored, with one active link per account.
  Token consumption and password replacement are atomic; invalid, expired or
  previously used links return 400. Success increments the stored buyer session
  version and clears `ugt_user`. APIs validating the current buyer reject older
  session versions.

Reset messages use Resend and `BOOKINGS_FROM`; this route does not connect Gmail
or add a Gmail inbox integration.

### POST /api/account/privacy

Authenticated current buyer, trusted Origin and 3 requests/minute/device.
Body: `{confirmation: "DELETE MY ACCOUNT"}` only. Creates a deletion request
for the signed buyer; an existing `received`/`reviewing` request is returned
rather than duplicated. Response: `{ok: true, request: {id, status, created_at}}`,
with no-store caching. This is a review request, not immediate account deletion,
anonymization or destruction of required financial records. The authenticated
account screen shows the request's recorded status.

### GET/PATCH /api/admin/privacy

Verified super-admin only, never a general buyer or unscoped staff member.
GET returns up to 200 privacy requests with the buyer name/email, recorded
status and resolution to the private Control Room. It sends
`Cache-Control: private, no-store`; limit is 30 reads/minute/device.

PATCH requires a trusted Origin and strict 20 writes/minute/IP. Body:
`{id, status: "reviewing" | "closed", resolution}`. Unknown fields are rejected;
resolution is at most 2,000 characters and requires at least 10 non-whitespace
characters when closing. Missing requests return 404. Updates are audited as
`privacy.request.review`. Closing records the administrator's review outcome;
it does not perform an automatic deletion of accounts or financial ledgers.

### POST /api/checkout/quote

Public same-origin preview, 20 requests/minute/device with the purchase network
backstop. Body: `{items: [{id, qty, variant?, printableName?}], promoCode?, fulfillment?}`.
Limits: 1–30 lines, integer quantities 1–20, product ID up to 80 characters,
variant up to 100, promo code up to 60. Unexpected fields are rejected.

Prices, variant adjustments, promo eligibility, stock and configured delivery
fees are resolved server-side. Success returns
`{total, promoApplied, savings, deliveryFee}` in integer KES with no-store
caching. `savings` reflects the validated base-price reductions. Invalid or
unavailable quotes return 400; a disallowed Origin returns 403.
A quote creates no order, reserves no stock and redeems no promo use. The
subsequent checkout independently validates price and availability again.
Fulfillment rules are the same as `/api/checkout/fulfillment` and order creation;
no carrier integration or delivery fee is inferred from client input.

### GET/POST /api/reviews and moderation

GET `?product=ID` is public and limited to a real catalogue product. Returns
`{ok, reviews, aggregate}` from approved reviews only (up to 50 newest reviews).
The aggregate is calculated from those returned approved records; no fabricated
ratings are inserted into product pages or structured data.

POST requires a validated current buyer and trusted Origin. Body:
`{product_id, author, rating, body}` only. Author length: 2–60; integer rating:
1–5; review text: 5–1,000 characters. Rate limit: 5/minute/device.
The server requires a paid/fulfilled order linked to that buyer's account that
contains the product. Matching email, a browser-supplied order or a self-declared
purchase does not authorize a review. A non-purchaser receives 403
`verified_purchase_required`; anonymous visitors receive 401. Accepted reviews
return `{ok: true, pending: true}` and remain unpublished until moderation.

`GET/POST /api/admin/reviews` retains verified admin and `reviews` permission
checks. POST additionally requires a trusted Origin; `{id, action}` supports
`approve`, `reject` (unpublish without deleting) or `delete`. Public reviews and
product rating schema follow recorded approval, never pending submissions.

### Product photographs, size guides and availability

`POST /api/admin/ops` with `{kind: "product.save", data: {...}}` uses the existing `products`
admin permission and audit trail. Its `data` fields additionally accept
`photos: string[]` and `sizeGuide: string` alongside the established product
fields. Photos are deduplicated and limited to 12 same-origin image paths or
HTTPS URLs without embedded credentials. Size guidance is limited to 4,000
characters. Main product images follow the same URL validation. Unknown product
fields return 400. `GET /api/admin/ops?view=products` returns these persisted
fields to the authorized product editor.

The server-rendered `/shop/:id` detail page reads actual saved photographs and
size guidance. It does not synthesize measurements or product photographs.
`GET /api/site-data/products` remains a public coalesced catalogue read of active
products. It reads the existing schema first, without unrelated admin migrations
on the public request path. Only SQLSTATE `42P01`/`42703` triggers the existing
schema initialisation and one retry; other failures return 503 `catalog_unavailable`
with `no-store`. Diagnostics log only a validated SQLSTATE, never driver messages.
The response contract remains unchanged for active
products: `{ok, products}` includes total stock and per-variant stock, where
`null` means inventory is not tracked and zero means unavailable. A catalogue
outage returns 503 `catalog_unavailable` with no-store caching, rather than a
successful empty shop. Historical orders continue to resolve retired products.

### Free merchandise name printing

Product administrators can explicitly enable `nameOnBackEnabled: boolean` in
`POST /api/admin/ops` `product.save`. The existing products permission and audit
trail apply. The additive `products.name_on_back_enabled` column defaults to
false for all products; product names and categories never imply eligibility.
Omitting the setting preserves it on edits and leaves new products disabled.
`GET /api/site-data/products` exposes `name_on_back_enabled: boolean` publicly.

Cart, quote, M-Pesa orders, Paystack checkout and Stripe checkout items accept
optional `printableName`. Names are trimmed, normalized to NFC and repeated
spaces are collapsed; the result must be 1–24 Unicode characters, begin with a
letter or number, and contain only letters, combining marks, numbers, spaces,
apostrophes, dots or hyphens. Controls, newlines and unsupported characters
return `invalid_printable_name`. Checkout verifies the product is currently
active and explicitly eligible in the database; ineligible products return
`personalization_not_available`. Catalog failure fails closed.

Printing adds no fee and changes no promo, variant, delivery or stock pricing.
Distinct names remain distinct cart/order lines for production, while the
inventory ledger combines quantities for the same physical product/variant.
The normalized name is stored as `printableName` in the order's existing items
JSONB and appears in merchandise production details in the admin orders view
and on customer receipts. No live product is automatically opted in.

### Reviewed captions and transcripts

`GET /api/captions?asset=ID&format=json` is a public, coalesced read for an owned,
non-adult video from the approved media library. Unknown IDs, photographs and
adult commercial video IDs return 400 before querying storage. Rate limit:
120/minute/device. A video without an imported track returns
`{available: false, asset}` with HTTP 200. Available records return
`{available: true, asset, language, transcript, track}`. `track` is a same-origin
VTT endpoint with an update revision; no personal customer data is exposed.

`GET /api/captions?asset=ID` returns `text/vtt; charset=utf-8` for the stored
reviewed WebVTT. Missing tracks return 404; missing/unavailable storage returns
503. Both successful public modes cache for 30 seconds and send nosniff headers.
Gallery film modals and Reels request metadata for the selected/playing video
and add a caption track and expandable transcript only when one actually exists.
They do not request broken VTT files for every hidden gallery item.

POST requires a verified admin with `gallery` permission and trusted Origin.
Body: `{asset_id, vtt, transcript, language}` only. The asset must be an existing
owned video; WebVTT must begin `WEBVTT` and contain a timed cue. VTT and transcript
are each limited to 100,000 characters; transcript must be non-empty. Language
is a two-letter code with optional uppercase region, for example `en` or `en-KE`.
Success returns `{ok, track}`, audits the import and invalidates the caption
cache. Captions are reviewed imports from recordings; the service does not
invent dialogue or automatically transcribe recordings.

### Durable receipt email and operator recovery

Paid/fulfilled orders with a valid email create a database-backed receipt job.
The job ID is deterministic for the order and delivery purpose; the exact
Resend payload and provider idempotency key are retained across retries.
Claims use expiring leases to prevent concurrent sends. Temporary provider
failures retry with bounded backoff, up to eight attempts. Uncertain sends older
than 20 hours require manual review, before the provider idempotency window
expires. No new ticket ID is minted merely by downloading or retrying an email.

`GET /api/admin/email-delivery`: verified super-admin, 60 reads/minute/device,
private no-store. Returns `{configured, jobs}` with up to 100 job summaries:
order reference, state, attempts, provider reference, bounded error and timing.
Recipient addresses, receipt payloads and credentials are not returned.
States include `queued`, `processing`, `blocked`, `accepted` and `failed`.
`accepted` means the email provider accepted the request; it does not establish
inbox delivery, opening or reading. Unconfigured/unavailable delivery returns 503.

`POST /api/admin/email-delivery`: same super-admin role, trusted Origin,
10 attempts/minute/device. Body: `{id: "receipt-<40 lowercase hexadecimal>"}`
only. Retains the original payload and safe idempotency window. A job requiring
manual review returns 409 `manual_review_required`; missing provider config
returns 503. This is a receipt recovery tool, not an arbitrary email composer.

`POST /api/internal/cron/email-delivery`: internal scheduler only, protected by
constant-time comparison of `x-ugt-cron` against server-only `UGT_CRON_SECRET`.
Missing secret: 503; incorrect secret: 401; strict rate limit: 20/minute/IP.
Processes up to five due jobs and returns `{ok, outcomes}` privately. The Worker
scheduled handler calls this endpoint through its existing self-reference
binding. It uses the existing configured cron; deployment does not create a new
schedule. Automation requires the self-reference binding, secret, database and
Resend configuration. This does not enable Gmail, SMS or push delivery.

### POST/GET /api/performance

POST accepts anonymous bounded Web Vitals samples on the same origin, limited
to 30/minute/device. Body: `{name, value, path}` only; `name` is
`CLS | INP | LCP | FCP | TTFB`. Values must be finite and non-negative;
CLS is bounded to 10, other metrics to 120,000 milliseconds. Path is a public
pathname of at most 250 characters, without query parameters or fragments.
Account, checkout, orders, receipt/ticket, verification, organizer, admin, API
and booking-status paths are rejected. Success: 204; invalid samples: 400;
unavailable monitoring storage: 503.

The browser collector sends only after recorded optional analytics consent.
The sample table stores metric, value, public path and timestamp; it does not
store visitor identity, email, IP, location or a device fingerprint. GET requires
a verified super-admin and returns `{rows}` containing sample counts and p75
values grouped by metric for the last 28 days, with private no-store caching.
This is a reporting window, not a promise that older stored rows are deleted.

### Event tier availability and staff editing

`POST /api/admin/media/upload?purpose=events|stories|campaigns` requires a current
admin with the matching `events`, `content` or `ops_promos` permission and a
trusted Origin. Accepts raw JPG/PNG/WebP, maximum 8 MiB of actual streamed bytes,
with a thirty-second read deadline and MIME/signature checks. Twenty uploads
per minute/IP. Server generates the storage key under its purpose prefix; client
filenames/pathnames cannot select arbitrary storage. Success returns `{url}`
with no-store; 401/403 access, 400 invalid media, 413 size, 408 timeout, 503 storage
failure. Uploads alone do not publish an event/story/campaign. Raw media URLs
are publicly retrievable; this endpoint is not for private customer documents.

`POST /api/admin/ops`, kind `tourEvent.status`, requires Events permission and
trusted Origin. Data is exactly `{id,status,expectedStatus,updatedAt}`. Version
is the exact server-provided timestamp (preserve microseconds). A stale state
or timestamp returns 409 `event_conflict`. Status and audit are atomic and do
not replace schedule, artwork, ticket prices or inventory. Public transitions
require relevant event details; recovered records need explicit editor review.
The canonical lifecycle includes `ongoing`: visible as Happening now, but not
sellable. Schema bootstrap expands the existing CHECK constraint accordingly.
Status changes invalidate event, home and school-tour caches. They do not send
messages, issue refunds or cancel already-issued tickets.

The public event feed coalesces database reads for five seconds and returns
no-store. Cached fallbacks expire fifteen seconds after a successful read;
unavailable/expired snapshots return 503 `{ok:false,events:[],error}`. Discovery
refreshes owned events every twenty seconds while visible, independently of
external-listing refreshes. Its first successful load establishes the change
notification baseline; stale cards are removed on an unavailable response.

Public `/api/site-data/events` includes authoritative per-tier availability,
remaining capacity and per-order minimum/maximum where available. Unknown
capacity is not treated as unlimited. A tier must satisfy its minimum order
size before it is advertised as sellable; overall event availability follows
the actual sellable tiers. Checkout reservations still validate server-side.

The existing events-permission-gated `/api/admin/ops` event save validates and
preserves tier `capacity`, `per_order_min` and `per_order_max` instead of dropping
them. Capacity is a non-negative integer; blank capacity leaves sales closed.
Order limits default to 1–20. Until immutable tier identities are implemented,
staff must not rename or reorder tiers after purchases; this is an operating
restriction, not a server-enforced guarantee.

### Contracted / partner event listings (15 October 2026)

Admin Events also accepts ChatGPT briefs through **Paste from ChatGPT**. Parsing
is local to the browser (no AI service or new endpoint): labelled plain text,
Markdown/code blocks and JSON objects/arrays, up to 60,000 characters / 20 events.
Choose one event, review the preview, then use it as a new private draft. Import
never saves, publishes, overwrites records, imports image URLs or ticket prices.
Normal Save event uses the existing authenticated route and permission checks.
Unknown placeholders become blanks; invalid dates/URLs are flagged, not invented.
Optional `partnerDetails.posterCaption` (300 characters) persists accessible
primary-poster text and remains backward-compatible with existing metadata.

### Admin workflow reliability batch (16 October 2026)

`/api/admin/media/upload?purpose=products` uses Products permission and server-owned
admin-products storage keys, with the existing image-size/signature/Origin and
timeout checks. Product editing can create a category by saving a new category
name; the live shop already derives its category filters from published products.

Gallery multi-file selection uses the existing individual authenticated upload
and metadata routes. Client batches are serial and bounded to twenty photos;
errors remain retryable, and successful items are not resent. Metadata INSERT
uses the existing unique URL index for idempotent retries without overwriting
caption/category/publication state. It does not create folders or publish photos.
The public page and public API now share `publishedGallery()`, which reads only
published rows, whitelists fields, coalesces for five seconds and expires stale
fallback snapshots after fifteen seconds. Admin mutations invalidate it. Public
gallery API is no-store; gallery HTML is excluded from the Worker page cache.

Gmail uses bounded requests, per-mailbox/message in-memory reply drafts and
finally-unlocked loading/sending states. Delivery uncertainty never claims sent.
Contacts offer validated WhatsApp links and mail-app/Gmail compose choices, not
automatic sends. No new public contact-data endpoint is introduced. Open editors
are retained across admin module navigation and cleared on logout; this is not
server autosave or refresh-proof draft recovery.

`tourEvent.save` accepts `kind: "partner"` with `partnerDetails` containing
exactly `{organizer,client,role,admission,ticketUrl,institutions,posters,newsSlug}`.
Admission is `external`, `free`, `invitation` or `unconfirmed`. Institutions
are at most 12 names; posters are at most eight additional `{url,caption}`
objects. HTTPS external seller links reject credentials, local/private IP
hosts and Urban Gang checkout. Links are never fetched server-side.

Drafts can be incomplete. Public partner transitions require the organiser,
contracting company, credited role, original artwork, venue and confirmed date
(except postponed dates). Active external-ticket listings also require the
official seller URL. These checks apply to both full saves and narrow status
changes. Existing event kinds cannot be changed, preserving ticket ownership.
Validation failures from both operations now include `fields`, an array of
`{field,label,message}` describing only the missing publication requirements.
Entered values are never echoed in these errors. Private drafts remain allowed.
`tourEvent.save` accepts optional `updatedAt` (the exact loaded `updated_at`
timestamp, preserving microseconds). An outdated version returns 409
`event_conflict` without overwriting the event. Omission preserves the legacy
client contract; the current Events editor sends it for existing records.
Successful saves/status changes return `{ok:true,row}`. The editor requires
the confirmed row before clearing entries, retains errors until corrected,
and disables editing while a save is pending. Network timeouts leave the
outcome unconfirmed, not labelled as definitely failed or successful.
Partner tiers are always empty and `sellable` is always false: listing another
company’s event never enables local payment collection or marketplace splits.

Public `GET /api/site-data/events?kind=partner` returns `partnerDetails` and
canonical `/events/[slug]` links. Event pages show the original poster gallery,
presenter/client/team credits, admission and the external seller when active;
past, paused, postponed and sold-out records never show a buy link. Completed
partner pages remain indexable portfolio work (CreativeWork), not live offers.
Upcoming Event schema credits the actual organiser and does not invent seller
stock. Published matching news slugs provide bidirectional event/story links.
Portfolio and sitemap include public partner records; drafts remain private.

Admin Events and Content include five owner-supplied editable brief templates.
Starting a template does not persist or publish it. Saving uses the existing
authenticated, module-permission-gated admin routes. Missing original artwork,
Freshers Bash’s year, and unconfirmed new-event roles are not fabricated.

### Additional server configuration

The batch uses existing `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY` and
`BOOKINGS_FROM`, plus server-owned `UGT_CRON_SECRET` for receipt automation.
`MERCH_PICKUP_LOCATION` provides actual collection instructions;
`MERCH_DELIVERY_FEE_KES` enables delivery only when it contains a non-negative
integer fee. No new R2 binding, public storage credential, browser fingerprint
or unconfigured email/carrier integration is required or implied.
## Story copies and recovery (16 October 2026, review branch)

`GET/POST /api/admin/story-workspace` is content-permission scoped, verifies the
current session, requires strict Origin on writes, and returns `private, no-store`.
GET lists the current actor's copies and permitted removed stories. `?id=<UUID>`
reads an owned copy plus revision metadata; `&revision=<integer>` reads an older
snapshot. POST `saveDraft` accepts `{action,id,revision,content}` and uses an
atomic compare-and-swap plus immutable revision; identical interrupted retries
reconcile, other stale writes return 409. POST `restoreStory` accepts `{action,slug}`
and restores only as unpublished, never overwriting a reused slug. Unexpected
fields/invalid dates/IDs/revisions are rejected; request body limit is 170,000 bytes.
Editable content: slug, headline, section, image, dek, body, date, published,
submitForReview, expectedVersion. Private copies do not mutate public stories.

Story writes through `/api/admin/save` require `expectedVersion`: null for a new
record, exact list `version` for edits/removal. Unversioned writes fail 400; stale
writes fail 409. `deletePost` now means recoverable removal, not a permanent delete.
Restore never republishes or restarts article announcements. See
`docs/admin-story-recovery-20261016.md` for retention, role and verification limits.
