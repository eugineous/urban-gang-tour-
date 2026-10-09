# Urban Gang Tour handoff

Production: https://urbangangtour.co.ke/. Hosting: Cloudflare Worker `urban-gang-tour`.
The owner explicitly retired V25 on 9 October 2026. The working branch uses the approved new design; See `docs/single-interface-release.md` for the current cleanup and release verification.

## Working architecture

- Next.js App Router provides real routes, server metadata and authenticated APIs.
- All pages render through the native Next.js application. `ui/` contains the approved public component library; `public/media-library` and `public/design-assets` are authoritative static assets. The separate static export and its Worker interceptor have been deleted.
- `AppShell` provides the approved header and footer around transaction routes. No bottom navigation or boot veil.
- `LiveCommerce` uses the actual products/events APIs, one browser cart, server-authoritative prices, and idempotent order requests. `/cart` and `/checkout` are real routes. Older `ugt_cart` contents migrate to the new bag.
- `BookingForm` persists bookings through `/api/bookings`, keeps details after failures, and reuses request IDs on retry. A request does not confirm an event.
- Payment confirmation checks recorded settlement. Redirects never imply payment. Confirmed merchandise orders clear only the matching checkout bag.
- Existing admin, organizer, receipt, ticket, stock and payment APIs remain authoritative. Customer contacts remain protected.
- The team is Eugine Micah and Lucy Ogunde. Do not invent events, crew members, endorsements, metrics or live products.
- `scripts/sync-assets.mjs` copies owned media and approved design assets into the standard public pipeline.

## Verification and review

Run `npm test`, `npx tsc --noEmit --incremental false`, `npm run cf:build`, then freeze the Worker with `scripts/prepare-flow-runtime.mjs` and serve it with `scripts/serve-flow-runtime.mjs`.
Run `scripts/live-commerce-regression.mjs`, the existing admin/auth/organizer/public/reels regressions, WebKit checks, and TesterArmy SDK checks under `e2e/`. Payment and authenticated positive browser paths use fictional intercepted fixtures; do not charge or email customers during tests.

Owner review gate: update the existing private ChatGPT Site for review. Do not merge main or deploy the public Cloudflare Worker without a new explicit instruction. No Vercel and no R2 subscription.

## Verification limits

Mocked purchase tests verify UI flow, not provider settlement or inbox delivery. Buyer password recovery and data export/deletion use documented email request paths; do not advertise them as automated. Never claim physical iOS device verification, capacity, SEO rank or Lighthouse scores without measurements.
