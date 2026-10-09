# AGENTS.md — Urban Gang Tour engineering rules

## Private review publication
- On 9 October 2026, the owner requested that every review change be published to the existing owner-private ChatGPT Site. Keep internal navigation inside that review origin. This does not authorize deployment to the public Cloudflare Worker or a main-branch merge.

## Explicit release authorization (9 October 2026)
- The owner subsequently instructed deployment of this experience refinement to the public urbangangtour.co.ke Cloudflare Worker. Publish this tested release through the feature branch and PR; future unrelated changes remain review-gated.

## Owner review gate
- On 9 October 2026 (Nairobi), the owner explicitly requested DEPLOY for the secure document suite. This authorizes this reviewed release to the production Cloudflare Worker after tests and build. Future unrelated changes remain review-gated.

## Prior owner review gate (8 October 2026)
- Keep new changes local and available for review. Do not merge to `main`, deploy to Cloudflare, or update the production website without a new explicit user instruction.
- Building, testing and showing previews is authorized. The owner explicitly authorizes publishing the existing private ChatGPT Sites review, including all pages and review documents. This does not authorize the public Cloudflare Worker or main website. Earlier automatic-production-deployment permission is superseded by this gate.

Apply these by default in every session. See `HANDOFF.md` for the full roadmap.

## Architecture (don't break)
- Next.js App Router. **One folder per page**, one real crawlable URL each. No `onClick`
  state-swap as the primary navigation — real `<a href>` between routes.
- Every route server-renders unique metadata (title, description, canonical, OG). **No two
  pages share a canonical.**
- The owner retired V25 on 9 October 2026. Use the approved new interface from `public-design` and real backend-backed transaction screens. Do not restore the template, captured HTML, dual React runtime, bottom navigation or boot veil.
- Preserve business data and owned media. Remove old frontends after connecting and testing their replacements.

## Security (non-negotiable)
- **No hardcoded secrets** anywhere. Env vars, server-side only, never exposed client-side.
  Rotate any exposed key. Prefer short-lived credentials.
- **Rate limit** every public endpoint. Unauthenticated traffic → IP/fingerprint limiting
  (not user-ID). Priority: login, signup, bookings, orders.
  **Two tiers, and picking the wrong one breaks something real** (`lib/server/ratelimit.ts`):

  | Call | Behaviour | Use for |
  |---|---|---|
  | `rateLimit(key, n, win)` | strict: `n` per IP | credential endpoints — `/api/auth`, `/api/admin/login`, `/api/admin/google`, `/api/organizer/login`, `/api/organizer/signup` |
  | `rateLimit(key, n, win, req)` | `n` per device, wide IP backstop | anything a crowd touches — orders, checkouts, status polling, the four per-page-load reads |

  Never pass `req` to a credential endpoint: the device cookie is client-set, so
  an attacker would rotate it for a fresh budget on every login attempt. Always
  pass it to a public endpoint: 1000 people at a school share one NAT (and
  Safaricom uses CGNAT), so per-IP limits reject the venue. Measured 2026-09-09
  before the fix: **94% of a 1000-person hall got 429s** on a normal page load.
  Size the network backstop from the real peak — `PUBLIC_READ_NETWORK_LIMIT` for
  cached reads and status polling, `PURCHASE_NETWORK_LIMIT` for a ticket drop.
- **`clientIp()` reads `CF-Connecting-IP`**, not `X-Forwarded-For`. Cloudflare
  appends to XFF rather than replacing it, so its first entry is a value the
  *client* chose — the old code let anyone forge the rate-limit key, verified
  against production by triggering a 429 on a made-up IP.
- **Public reads go through `cached()`** (`lib/server/microcache.ts`), which
  coalesces concurrent callers so a cache miss under load is one query, not a
  thousand. Use `hasDb()`, never `db()`, to test whether a database is
  configured — `db()` constructs a Pool.
- **Input validation**: schema-based on every input. Type checks, length limits, reject
  unexpected fields (don't silently drop them).
- **Never trust the browser** for prices/amounts — validate server-side on every payment.
- **Idempotency** on order creation so retries don't double-charge.
- **Real auth** for `/admin` (server session), not a client-side password check.
- **Row Level Security** (or equivalent) on every table so users only see their own data.

## Access control matrix
Define expected behaviour explicitly per role (most AI-coding security bugs are missing
context on expected behaviour, not bad code):

| Role | Can read | Can write | Notes |
|---|---|---|---|
| Public (anon) | Public pages, catalog, events, blog | Create booking, create order (rate-limited) | No admin routes. No price trust. |
| Buyer (optional) | Own orders/tickets | Own profile | Only own data (RLS). |
| Crew admin | Assigned modules (per `perms`) | Assigned modules only | Scoped by `lib/server/session.ts`'s `hasPerm()` (signed cookie perms array; module keys defined in `lib/server/admin-accounts.ts`'s `MODULE_KEYS`). Managed at `/admin` &rarr; Admins (`app/admin/ops/AdminAccounts.tsx`, `app/api/admin/accounts/route.ts`), super-admin only. |
| Super admin | All admin modules | All, incl. managing admins | Full access; gated by `isSuperAdmin()` in `lib/server/session.ts`. Actions logged to audit log. The access-code login (`/api/admin/login`) always mints super_admin - it is the owner's backup key and is never scope-limited. |

Any new endpoint must state which roles may call it and enforce it server-side.

## Git workflow
- No direct pushes to `main`. Feature branch → tested Cloudflare build → review → merge → Cloudflare deployment. Never use Vercel.
- A broken build must never reach `main` (CI typecheck + lint + tests gate).

## Scale & ops
- Cache repeated reads (Redis). Move heavy work (email, AI, PDF) to async jobs, not the request path.
- Document API contracts next to their routes. Load-test before launch.

## Data privacy rules (non-negotiable)
- Customer emails/phones are visible ONLY in the admin console (`isAdmin()` gate).
  No public endpoint may ever return another user's contact info. `/api/site-info`
  exposes only intentionally-public business config.
- Guest checkout is supported: orders require phone (M-Pesa), email optional.
- Newsletter list is opt-in single field; export/broadcast is admin-only.
- See API.md for the full endpoint contract — keep it updated with every route change.

| Surface | Public (anon) | Logged-in user | Admin |
|---|---|---|---|
| /api/auth | signup/login (rate-limited) | own profile only | — |
| /api/orders | create w/ phone only | same + tied to account | full ledger, status, receipts |
| /api/bookings | create | create | inbox, status, contact actions |
| /api/subscribe | join | join | list, CSV, broadcast |
| /api/submissions | — | pitch stories | approve/reject |
| Contact info (email/phone) | never visible | own only | all, incl. mailto/wa.me actions |
| /api/admin/* | 401 | 401 | full for super_admin; crew_admin scoped per-route to their assigned module perms (401/403 outside them) - see the access control matrix above |
