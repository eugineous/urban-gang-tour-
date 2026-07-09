# CLAUDE.md — Urban Gang Tour engineering rules

Apply these by default in every session. See `HANDOFF.md` for the full roadmap.

## Architecture (don't break)
- Next.js App Router. **One folder per page**, one real crawlable URL each. No `onClick`
  state-swap as the primary navigation — real `<a href>` between routes.
- Every route server-renders unique metadata (title, description, canonical, OG). **No two
  pages share a canonical.**
- Keep v25's markup + CSS verbatim. Engine/routing/data changes only — never a visual redesign.
- The live v25 experience is restored by booting the dc-runtime (`app/_components/V25App.tsx`)
  over an SEO shell. If you change v25's markup, re-run `scratchpad/cap/capture.mjs` and
  `scratchpad/cap/build-runtime.py`.

## Security (non-negotiable)
- **No hardcoded secrets** anywhere. Env vars, server-side only, never exposed client-side.
  Rotate any exposed key. Prefer short-lived credentials.
- **Rate limit** every public endpoint. Unauthenticated traffic → IP/fingerprint limiting
  (not user-ID). Priority: login, signup, bookings, orders.
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
| Crew admin | Assigned modules (per `perms`) | Assigned modules only | Scoped by `lib/ugt-admin-auth.ts` permissions. |
| Super admin | All admin modules | All, incl. managing admins | Full access; actions logged to audit log. |

Any new endpoint must state which roles may call it and enforce it server-side.

## Git workflow
- No direct pushes to `main`. Feature branch per change → Vercel preview → review → merge.
- A broken build must never reach `main` (CI typecheck + lint + tests gate).

## Scale & ops
- Cache repeated reads (Redis). Move heavy work (email, AI, PDF) to async jobs, not the request path.
- Document API contracts next to their routes. Load-test before launch.
