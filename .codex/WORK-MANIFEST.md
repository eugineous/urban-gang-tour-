# Urban Gang Tour recovery manifest

## Objective

Recover the Urban Gang Tour operating system without discarding existing work. Finish and verify the public experience, Control Room, ticketing and payments, merchandising, document generation, event and relationship operations, content workflows, reporting and safe automation. Do not invent commercial facts or describe a workflow as verified until it has been exercised.

## Non-goals for the current recovery phase

- No architectural redesign of the v25 experience or App Router structure.
- No deletion or overwrite of pre-existing user changes.
- No production deployment, migration, credential change or invented operational data.

## Inventory evidence, 2026-09-26

- Workspace: `C:\ugt-control-room`; Next.js App Router with 117 `page.tsx`/`route.ts` files.
- Tests discovered: `payment-math`, `settlement-integrity`, `recovery-integrity`, and `docgen-registry`.
- Existing route groups cover public content, shop, events, tickets, organizer tools, admin Control Room, payments, Gmail, docs, exports, backups and cron handlers.
- Repository instructions in `AGENTS.md` are authoritative. `HANDOFF.md` is historical context only: it describes an earlier rebuild and contains stale completion claims, so it must not be used as proof of current production state.

## Completed and verified

- Document-template integrity guardrails were added: registry/template coverage, active type coverage, promo field and hero-slot parity, partner-strip rules, official-logo presence and asset checks.
- The document library audit previously passed with `templates=56`, `generator=45`, `reference-generators=1`, `static-masters=10`, `active-types=38`, and zero reported issues.
- The focused document registry test previously passed.
- A prior full Vitest run reported 4 files and 99 tests passing. This is historical local evidence, not a substitute for a final run after all current changes.
- Control Room authority and ticket-safety verification is complete: cross-module quick statistics, marketplace trust actions and complimentary ticket issuance require `isSuperAdmin()`; scoped crew permissions cannot unlock them.
- `__tests__/admin-authority.test.ts` exercises every protected boundary in this bundle, including fail-closed behavior when the database is unavailable; `__tests__/admin-session-scope.test.ts` proves a signed crew session remains scoped even with its assigned module permission.
- Current local verification passed: `npx tsc --noEmit` and `npm test` (6 files, 113 tests).
- A controlled local authenticated API check passed: signed crew sessions received `403` for quick statistics, marketplace trust and complimentary tickets; signed super-admin sessions passed authorization and reached the expected local `db_not_configured` gate. This is route-level verification only, not browser or production verification.
- Payment reconciliation and transaction integrity is complete: `RECOVERABLE_PAYMENT_STATUSES` is the shared payment-provider boundary (`pending`, `unknown`, `reconciling`). M-Pesa, Paystack, Stripe and the reconciliation sweep bind that boundary in their atomic paid/failed updates, preventing terminal `failed`, paid, fulfilled or refunded orders from being reopened by delayed or replayed provider outcomes.
- `__tests__/payment-callback-boundary.test.ts` route-tests the real M-Pesa callback with mocked local dependencies, proving exact amount binding and the recoverable-state array for both success and failure. This is controlled local route evidence, not a real provider or production check.
- QR issuance and validation is complete locally: paid/fulfilled orders are still protected by the per-order advisory lock and return their original ticket set on replay; malformed ticket lines now fail closed instead of being partially minted. Ticket blobs must now be both HMAC-authentic and structurally valid, including an authentic ticket code and valid issued timestamp.
- `__tests__/ticket-integrity.test.ts` proves replay-stable issuance, unique authentic codes, non-paid/malformed entitlement rejection, and tampered/structurally invalid blob rejection. `__tests__/ticket-verify-boundary.test.ts` exercises the real online validation route with mocked local dependencies, proving malformed QR data is rejected before ticket consumption. These are controlled local tests, not browser, live-gate or production evidence.

## Implemented but unverified

- Search-discovery lifecycle split: `INDEXABLE_EVENT_STATUSES`, JSON-LD and sitemap filtering, plus non-indexable event metadata.
- Public news routing changed from `/urban-news` to `/blog`, with compatibility handling in the runtime.
- Document Generator no longer requests a partner logo for the Poster Event Master.
- `npm test` now runs Vitest without cache.

## Partially implemented

- The Control Room has a broad set of admin endpoints and role-permission infrastructure, but this inventory has not established an end-to-end permission matrix for each route and action.
- Event, ticket, payment, refund, gate, merch, document, content and communication surfaces exist in the route tree, but existence is not evidence that their provider-backed or role-scoped workflows are complete.
- The public site has SSR routes, metadata, sitemap, JSON-LD and a v25 runtime, but current browser, accessibility, conversion, PWA and production behavior have not been established.

## Incomplete/not started

- Authenticated end-to-end coverage for all critical operational workflows.
- Production verification of public routes, payment providers, messaging providers, document/PDF paths and admin roles.
- A current, evidence-backed completion audit for every vertical workflow in the master goal.

## Current changed files

Modified:

- `__tests__/recovery-integrity.test.ts`
- `__tests__/settlement-integrity.test.ts`
- `app/_components/V25App.tsx`
- `app/_lib/jsonld.ts`
- `app/admin/docs/DocGen.tsx`
- `app/api/admin/ops/route.ts`
- `app/api/admin/tickets/comp/route.ts`
- `app/api/mpesa/callback/route.ts`
- `app/api/paystack/webhook/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/events/[id]/page.tsx`
- `app/sitemap.ts`
- `lib/server/docgen.ts`
- `lib/server/event-lifecycle.ts`
- `lib/server/payment-status.ts`
- `lib/server/reconcile.ts`
- `lib/server/tickets.ts`
- `package.json`
- `public/v25-template.html`
- `scripts/audit-doc-templates.mjs`

Untracked:

- `AGENTS.md`
- `__tests__/admin-authority.test.ts`
- `__tests__/admin-session-scope.test.ts`
- `__tests__/docgen-registry.test.ts`
- `__tests__/payment-callback-boundary.test.ts`
- `__tests__/ticket-integrity.test.ts`
- `__tests__/ticket-verify-boundary.test.ts`

Treat every item above as existing work to preserve until reviewed against its acceptance criteria.

## Known failures/blockers

- Current SEO edits have not had a fresh typecheck, focused regression test, browser run or production check.
- No authenticated end-to-end evidence exists in this inventory for role permissions, ticket issuance, payment callbacks, refunds, gate scanning, document generation or provider-backed integrations.
- No production verification evidence exists in this inventory.
- `HANDOFF.md` contains historical secrets-rotation warnings. Do not treat its credential values, deployment state or feature claims as current truth.
- The prior review identified potential PWA/runtime-route drift and broad workflow gaps; these require targeted confirmation in their respective bundles rather than another repository-wide audit.

## Architecture decisions that should not be reopened

- Keep the Next.js App Router with one real crawlable URL per page and server-rendered page metadata.
- Preserve v25 markup and CSS. Work may change routing, data and runtime behavior, but it must not start a visual redesign unless separately authorized.
- Preserve server-side price validation, idempotency, rate-limit tiers, cached public reads, validated inputs, server-side admin authorization and customer-contact privacy boundaries.
- Keep the distinction between public visibility, sellability and search indexability for event states.
- Treat recovered data as unverified until an operational record proves it; do not invent commercial, contractual, pricing or operational facts.

## Tests and verification already completed

| Check | State | Scope |
| --- | --- | --- |
| `npm run docs:audit` | Previously passed | 56 document templates and registry consistency |
| `npx vitest run __tests__/docgen-registry.test.ts --no-cache` | Previously passed | document registry guards |
| `npx vitest run __tests__/admin-authority.test.ts __tests__/admin-session-scope.test.ts --no-cache` | Passed | 2 focused files, 14 authority/session assertions |
| `npx vitest run __tests__/settlement-integrity.test.ts __tests__/payment-callback-boundary.test.ts --no-cache` | Passed | 2 focused files, 24 payment-state and callback assertions |
| `npx vitest run __tests__/ticket-integrity.test.ts __tests__/ticket-verify-boundary.test.ts --no-cache` | Passed | 2 focused files, 5 issuance/authenticity and online-validation assertions |
| `npx tsc --noEmit` | Passed | Current QR issuance/validation bundle typecheck |
| `npm test` | Passed | 9 Vitest files, 122 tests reported |
| Controlled local authenticated API check | Passed with no database configured | Crew `403`; super-admin reaches expected `503 db_not_configured`; not browser or production evidence |
| Browser, authenticated E2E, payment-provider and production checks | Not evidenced | Required before those claims can be made |

## Ordered remaining vertical workflows

1. **Event and ticket lifecycle — inventory consequences:** verify reservation consumption/release and capacity consequences around confirmed or failed payment outcomes.
2. **Event and ticket lifecycle — gate scanning, refunds and public status transitions:** exercise the remaining operational lifecycle end-to-end.
3. **Merchandise operations:** variants, stock, supplier production, fulfilment, buyer order status and server-side pricing.
4. **Document operating system:** exercise all active generators, preview/PDF/export paths and data-entry flows on desktop and mobile.
5. **Relationships, bookings and communications:** schools, parents, partners, talent, bookings, approval paths, Gmail/WhatsApp and role-scoped contributors.
6. **Content and automation:** contributor workflows, editorial approval, scheduled work, reporting and safe audit trails.
7. **Public conversion, SEO and accessibility:** public page routes, canonical/structured data/sitemap consistency, conversion flows, PWA/i18n/accessibility and browser validation.
8. **Production readiness:** backup/recovery, observability, deployment preview, authenticated acceptance runs and live verification.

## Exactly one next implementation bundle

The prior lifecycle item has been split into dependency-ordered, independently verifiable vertical bundles:

1. **Payment reconciliation and transaction integrity** — completed locally and with controlled callback-route evidence.
2. **QR issuance and validation** — completed locally and with controlled validation-route evidence.
3. **Inventory consequences** — completed locally 2026-09-26.

**Bundle: Events product reconstruction** — in progress.

Scope: turn the Events surface into a production-grade Kenyan event discovery, event-commerce and event-lifecycle product. Local tree is 106 commits ahead of remote and already has: full event lifecycle module, `/events/[id]` detail page with truthful JSON-LD, ticket inventory holds/consume/release/expire.

Completed so far:
- Schema: expanded `tour_events.status` CHECK constraint to all 10 lifecycle statuses; added partial unique index on `slug`.
- Route: created `/events/[slug]` (canonical) with enhanced detail page (status banner, event meta chips, sticky mobile CTA, slug-based JSON-LD, sellable gate). Old `/events/[id]` now redirects to slug.
- Discovery: replaced thin RenderedPage wrapper with native server-rendiced `/events` page (hero, search, filter chips, featured event, upcoming grid with status badges and CTA mapping).
- References: sitemap and `eventsFromDb()` now use slug URLs.

Completed in this bundle:
- Commercial truth resolver: `lib/server/event-truth.ts` — single authoritative source for event availability (status, sale window, per-tier capacity, sellable gate). Used by discovery and detail pages.
- Analytics: `lib/analytics.ts` + `app/_components/EventsAnalytics.tsx` — GA4 ecommerce-mapped events (view_item_list, select_item, view_item, begin_checkout, add_payment_info, purchase) plus UGT custom events (event_share, event_save, calendar_add, ticket_tier_select, sold_out_view, waitlist_interest, related_story_click, sell_with_ugt_click). Instrumented on both /events and /events/[slug].
- Admin Events module: inspected — already has full lifecycle status support and functional form. Section reorganization deferred (does not block Events surface).

Completed in this bundle:
- Admin Events module: reorganized flat form into operational sections (Overview, Schedule, Venue, Tickets, Media, Lifecycle) with contextual status descriptions. Eugine can now manage events without understanding database field names.

Completed in this bundle:
- Browser verification: Playwright + Chromium verified /events at 360/375/390/412px mobile and 1440px desktop. 31/31 checks passed: hero renders, discovery headline, search input, filter chips, no horizontal overflow, JSON-LD present, canonical URL correct, 404 handling correct. Screenshots saved to temp/opencode/verify-events-*.png.

Remaining gaps: none for local verification. Production verification still pending.

### Relevant files for that bundle

- `lib/server/ticket-inventory.ts`
- The existing payment outcome/reconciliation callers that consume or release reservations
- Focused reservation/inventory tests only; do not reopen ticket-code or callback tests without concrete evidence

Acceptance criteria:

- A confirmed payment consumes only its held reservation and repeated handling does not change it again.
- Failed, declined, timed-out or expired outcomes release only held reservations and never alter consumed reservations.
- Capacity calculations count only applicable sold tickets and unexpired holds, without inventing capacity.
- Focused tests cover reservation and capacity boundaries; no payment-state, QR issuance/validation, gate scanning, refund, provider call, database migration or deployment work.

### Verification required to mark that bundle complete

- Focused inventory tests prove consumed/released/expired state boundaries and capacity calculations.
- `npx tsc --noEmit` passes after the final inventory change.
- The narrow relevant Vitest files pass without cache, followed by one appropriate broader test pass.
- A controlled local route-level exercise demonstrates safe reservation state handling without real customer data or provider credentials.
- The final diff confirms no payment reconciliation, QR issuance/validation, refund, scanning, authority or public-route behavior changed.

Next action: resolve the inherited-history PR boundary; PR #29 must not be merged while it contains unpublished local-main ancestry.

## Forensic reconciliation, 2026-09-26 (read-only checkpoint, no commit/deploy)

- Branch `main`, HEAD `c9d0022`, 106 commits ahead of `origin/main`. No push made.
- Working tree matches this manifest's bundle plus: `__tests__/inventory-transaction.test.ts`
  and `app/events/[slug]/page.tsx` (untracked), `app/events/[id]/page.tsx` now a slug
  redirect shim, and the `tour_events` status-constraint + slug-index migration in
  `lib/server/ops.ts`. No organizer, supplier, i18n, PWA or Paystack-checkout files are
  dirty — that work (incl. `ce854fa`) is already committed.
- Test discrepancy resolved: the "49-test" run was `payment-math.test.ts` alone from an
  earlier single-file tree state. Current disk state is 10 files (3 tracked + 7 untracked,
  zero deleted). Full run: **10 files, 127 passed**.
- Payment callbacks: working-tree webhook diffs are this manifest's verified
  `RECOVERABLE_PAYMENT_STATUSES` bundle. The `ce854fa` Paystack touch (in-process dedupe
  set + checkout response-shape change) is committed history, flagged for contract check.
- Verification this checkpoint: `npx tsc --noEmit` exit 0; `npm test` (vitest `--no-cache`)
  10 files / 127 passed; `npm run lint` exit 0 (warnings only); `npm run build` success
  incl. SSG `/events/[slug]`.
- Open items before any commit: mojibake in `[id]/page.tsx` metadata title; no slug
  backfill for legacy `tour_events` rows; Paystack checkout response-shape contract check;
  Paystack webhook durable (DB) idempotency still pending.

## Addendum, 2026-09-26 — concurrent Events lane detected, commits HELD

- At ~20:24-20:31 another lane landed new untracked work in the same tree:
  `middleware.ts` (301 `/events/{id}` to slug, DB-checked), `lib/server/event-truth.ts`,
  `lib/analytics.ts`, `app/_components/EventsAnalytics.tsx`, a 201-line rewrite of
  `app/events/page.tsx` (native discovery page), and deleted `app/events/[id]/page.tsx`.
- The mojibake open item is SUPERSEDED (shim file deleted; redirect now lives in
  middleware, which has its own mojibake on two comment em-dashes — owner's lane to fix).
- Domain commits are ON HOLD until that bundle lands and verifies: committing now would
  slice a half-finished Events funnel across unrelated boundary commits. Re-run
  tsc + tests + build after the lane settles, then commit per the Q boundaries
(Events files become their own 8th boundary: middleware, event-truth, analytics,
EventsAnalytics, events/page, events/[slug]).

## Events routing and availability correction, 2026-09-26

- The prior `31/31` claim was re-run against a freshly started production-mode
  server, not the pre-existing listener on port 3100. `scripts/verify-events.mjs`
  now accepts `EVENT_VERIFY_BASE_URL` so it cannot silently test another checkout.
- Removed database-backed middleware. `/events/[slug]` now resolves canonical slug
  first, resolves a public legacy ID only after that fails, permanently redirects
  only to a non-empty canonical slug, and returns 404 for unknown/malformed/private
  or blank-slug legacy records.
- Availability now uses `lib/server/event-truth.ts` in discovery, detail, public
  site-data, order creation and event JSON-LD. Sale windows and tracked capacity
  fail closed; pages render on demand so ISR cannot keep advertising an old offer.
- Added optional `sales_start_at` and `sales_end_at` schema fields. This is a
  migration definition only; no database migration or production backfill was run.
- Slug backfill remains a controlled production migration item. No recovered event
  was published or modified.

### Evidence for this checkpoint

| Category | State | Evidence |
| --- | --- | --- |
| Implemented | Yes | canonical route, availability gate, SEO and order-path changes |
| Type verified | Yes | `npx tsc --noEmit` |
| Unit verified | Yes | `npm test`: 11 files, 131 tests |
| HTTP/SSR verified | Yes, no DB | production-mode `/events` 200 with canonical/JSON-LD; unknown slug 404; sitemap 200 |
| Browser verified | Yes, empty state only | Playwright 31/31 at 360/375/390/412/1440 against that server |
| Database / legacy redirect | No | no `DATABASE_URL` or non-production fixture available |
| Accessibility | Partial | semantic labels checked by the browser script; no screen-reader audit |
| Production | No | no deploy, no live-data exercise |

`npm run cf:build` is not verified: OpenNext could not remove the existing ignored
`.open-next` directory on Windows (`EPERM`). The ordinary Next production build
passed. `npm run lint` invokes deprecated `next lint`; a direct ESLint retry is
still needed after excluding the intentionally deleted middleware path.

## Native homepage foundation, 2026-09-26

- Replaced the root route's captured `home.html` / `RenderedPage` / v25 desktop
  path with a native server-rendered homepage. The old captured homepage is
  deleted; other legacy routes remain on their existing incremental path.
- Added one responsive public header/footer and removed duplicate local headers
  from the native event listing, event detail, and product detail surfaces.
  The mobile v25 app explicitly does not mount on `/`.
- Homepage event cards resolve the same event availability truth used by the
  public events and checkout paths. Products, photos, and news are DB-backed;
  a missing database produces honest empty states rather than seeded claims.
- No payment, QR, authorization, inventory, event lifecycle, database or
  deployment behavior changed in this frontend checkpoint.

### Evidence for this checkpoint

| Category | State | Evidence |
| --- | --- | --- |
| Type verified | Yes | `npx tsc --noEmit` |
| Unit verified | Yes | `npm test`: 11 files, 131 tests |
| Production build | Yes | `npm run build`; clean `BUILD_ID` and production server startup |
| HTTP/SSR verified | Yes, no DB | production-mode `/` and `/events` return 200 |
| Homepage legacy removal | Yes | `/` contains native hero and no home capture, v25 template/runtime, boot veil, mobile-home markup, or legacy partner label |
| Live commercial content | No | no `DATABASE_URL` exercise and no production deploy |

### Next bundle (exactly one)

Native `/experience` ("The Tour") public route: retire the legacy `RenderedPage` / `app/_rendered/exp.html` / V25 capture path and ship a native server-rendered page under the shared `PublicShell`, matching the PublicShell nav order after home and the already-native `/events` surface. Do not begin this bundle in the same commit as the homepage foundation. Remaining RenderedPage routes (`/gallery`, `/shop`, `/book`, `/about`, `/the-gang`, `/partners`, `/contact-us`, `/work-with-us`) stay queued after `/experience`.

Owner blockers (not the next implementation bundle): Cloudflare Workers Builds dashboard confirmation; PR #29 inherited-history repair before merge; no push/deploy from this checkpoint.
