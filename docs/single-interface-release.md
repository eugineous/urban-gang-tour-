# Single interface release

Release: `single-interface-20261009-v2`.

Public pages, galleries, store, booking, account, organizer and admin routes now render through the native Next.js application. The Worker no longer switches public URLs to separately exported HTML. React navigation requests receive React responses from the same application that serves direct page requests. A page-content loading boundary isolates public-page hydration from the shared navigation shell; protected and transactional screens retain their direct rendering and redirect behavior.

## Removed

- The separate `public-design` application, build configuration and exported-page Worker interceptor.
- The alternate comic News page and unused preview catalogues and screen registries.
- The template font assets and references, obsolete promotional banner and Instagram wall.
- Old route styles for marketplace, tour history, policies, error states, ticket lists, ticket verification, receipts and Control Room.

The approved component library lives in `ui/`. Owned media and design assets live in the normal `public/media-library` and `public/design-assets` pipeline. Approved downloadable document designs and business records are retained. The release build deletes obsolete output before generating the Worker.

## Cache and routing

HTML, React navigation responses, service-worker code and the release client are served with `no-store`. The service worker deletes previous UGT cache generations, fetches mutable assets from the network, caches only immutable Next bundles first, and excludes APIs, authenticated/transaction pages and React navigation payloads. Deprecated exported pages and template fonts return 404; retired template URLs redirect home.

## Verification

Commands and results are recorded in the release PR. `scripts/single-interface-e2e.mjs` traverses every public route, clicks between Shop, Contact, About, News, Gallery and Events, refreshes each destination, checks back navigation and probes native React responses. `scripts/installed-release-e2e.mjs` seeds an older controlling cache worker, upgrades it, and verifies that the shopping bag survives. `e2e/tests/full-sweep.e2e.ts` uses the requested TesterArmy SDK for public, account, organizer, admin and commerce flows with fictional API fixtures.

Payment, email and organizer/admin browser checks use fixtures. They do not charge a real customer or send a real email. Server-side authorization, settlement, QR verification, inventory and privacy boundaries are tested by Vitest.
