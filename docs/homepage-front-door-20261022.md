# Homepage front door — 22 October 2026

## Visitor journeys

The homepage now leads with upcoming events and official merchandise, then
services, documented work/collaborators, Eugine and Lucy, film, published stories
and five native booking questions. Events, shopping and booking are direct hero
links. Completed work remains separate from upcoming promotion. The duplicate
below-page event-placement strip is omitted only on the homepage.

Merchandise comes from the existing active public catalogue, not proposed design
inventory. A shared cached server read seeds images, canonical product links and
actual option-aware KES prices. Explicitly unavailable cheaper options cannot set
the advertised price floor; unknown inventory is never labelled available or
sold out. Purchasing still happens through the existing shop/checkout.

Event links, posters, dates and commercial status reuse the existing public-event
presentation. Home promotion requires a valid dated public event, not a draft,
completed item or postponed listing. Catalogue reads refresh once per minute and
on return to the tab. Failed refreshes retain content but suppress stale ticket
availability/price claims. Empty reads retain useful event/shop/booking links.

## Content exception

SATUK's existing published record says **8 November / free admission**. The exact
currently assigned poster says **6 November / KES 200 for non-students**. Neither
version has been invented or silently edited. The exact slug/artwork pair in
`ui/data/home-promotion-holds.json` is withheld from homepage advertising.

The event remains published in the event directory and its detail page. Existing
placements elsewhere are unchanged. Reconcile the saved date, venue, admission,
ticket link and poster through the Control Room. Replace the contradictory
artwork, or explicitly remove the hold once the same artwork has been reconciled.
Changing only another field does not automatically clear this artwork-bound hold.

## Verification and limits

- Full test suite: 1,110 passed, 75 skipped (database integration requirements).
- Subsequent promotion tests: 24 passed; metadata/cache/SSR recheck: 82 passed.
- TypeScript passed; changed-file ESLint: zero errors, eight warnings.
- Static-render tests verify public-only canonical links, section order, one H1,
  custom CMS copy/FAQs, accurate prices and empty/stale states.
- Chromium checks cover 320, 390, 768, 1024 and 1440px without page overflow.
  Independent 390/1440px interactions cover menu/Escape focus, touch scrolling,
  FAQs, stale/empty responses and focus/reduced-motion background-video behavior.
- Local rendering uses copies of real public catalogue responses/original poster
  bytes because local database/KV bindings are not production bindings. Only local
  fixture contexts block service workers. Production verification must use the
  actual database, media routes and normal service-worker behavior.
- Build, Worker regression, PR merge and post-deployment evidence are recorded in
  `/workspace/artifacts/ugt-homepage-20261022/`; do not substitute local screenshots
  for post-deployment verification.

No CMS replacement, new database schema, private content import, staff login,
payment initiation, live test purchase or marketing message is part of this
release. Physical-device certification and load-capacity claims are not made.
