# Urban Gang Tour reconstruction checkpoint

## 16 October 2026 — new briefs, first reconstruction slice (not deployed)

Branch: `feat/content-discovery-reconstruction-20261016`, based on main after
PR #73. The supplied three files are overlapping briefs; execution starts with
publishing/discovery, preserving production data and existing authentication.
No new main-site release authorization was inferred from “now start on this”.

Implemented: public non-selling announcements; optional partner media/schedule/
credits; shared whitelisted SSR/API event reader; searchable upcoming/past/type
views; Tour Stops redirect to the live school archive; canonical school/past
event records; completed-event portfolio/sitemap discovery; honest text artwork
fallbacks; commercial resolver rejects incomplete/past schedules. Existing
curated media collections are preserved. No manufactured event facts or stock.

The local, network-isolated Postgres 16 schema regression passed: actual event
DDL preserves legacy records, accepts title-only announced rows, tolerates
repeat migration and rejects invalid states. The disposable database was stopped.
All 684 standard tests and TypeScript passed; six opt-in story database cases
remain skipped in the standard run. Scoped lint has zero errors, 41 warnings.
Source/SSR tests are not physical-device or signed-in production acceptance.
Product Design's browser connection and some bundled audit references were
unavailable; no new completed screenshot/accessibility audit is claimed.

Research: Google Event structured-data guidance informed omitting rich Event
markup when schedule/location are absent; W3C cognitive accessibility guidance
informed explicit states and short actions. DICE returned 403 and the referenced
Eventbrite help page was inaccessible; no competitor admin audit is claimed.
Sources: https://developers.google.com/search/docs/appearance/structured-data/event
and https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/.

Migration/release warning: `announced` expands the existing event status CHECK
inside the existing transaction/advisory-lock bootstrap; it does not rewrite
records. Before any future public rollout, retain a compatible rollback build.
An older bootstrap recreates the old CHECK and cannot safely run after new
announced rows exist. Do not delete or downgrade those records for rollback.
The fully separate visibility/lifecycle model, structured
case-study editing, media-rights library, new public shell and full admin rebuild
remain later slices, not features claimed complete here.

### Category continuation — 16 October (review only)

Implemented one optional, extensible event category independently of commercial
kind: create, assign/clear, rename, pause/restore, URL-backed public filtering and
category-name search. The existing event editor contains these controls; no
separate setup wizard or AI service is required. Category creation explicitly
does not claim to save/publish the event. Unconfirmed responses keep entries;
an event save also verifies its returned category. Typed category edits must be
saved or cancelled before the event can close through a successful save.

Schema is additive, nullable and indexed; category mutations are atomically
audited and version-guarded. Existing assignments survive paused categories and
legacy callers omitting the field. Public choices come only from public events.
The new API requires the existing session, Events permission, write Origin,
bounded validated input and rate limits. No backdoor, MCP access shortcut,
credential change, production session or production migration was created.

Verification: 709 standard tests pass; seven opt-in database cases are skipped
in that run. The new opt-in category test passes separately against a disposable,
network-isolated PostgreSQL 16 container, exercising the actual store and event
route SQL, repeated DDL, uniqueness, paused assignment rules, exact timestamp
conflicts, omitted/cleared assignments and restrictive foreign keys. This is
not signed-in owner acceptance or production database verification.

TypeScript and the normal Cloudflare production build pass. Scoped lint reports
zero errors / 33 warnings; existing OpenNext/CSS/PDF dependency diagnostics remain.
Deployment dry-run passes and the bundled `color-string` dependency is present.
Local production-Worker browser fixtures pass 36 checks across emulated Galaxy
S24, 320px Android and desktop: create/rename/pause/restore, rejected missing or
mismatched acknowledgements, preserved entries, reopened assignment, long-name
wrapping and public deep-link filters. Screenshots are under
`/workspace/artifacts/event-categories-20261016/`. They use intercepted fictional
API data, not real admin login, remote storage or physical-device certification.

Draft PR #74 remains the review handoff. This continuation does not deploy the
public site and does not claim the full reconstruction is finished.

11 October 2026 · Africa/Nairobi. This is a tested implementation bundle, not a declaration that the entire reconstruction directive or live operating system is complete.

## Execution scope

The owner asked to execute the supplied reconstruction brief. Its product requirements inform this work; embedded instructions do not override repository permissions, security boundaries, confirmed business facts or the private-review release gate. Preserve the real Next.js App Router, Cloudflare Worker, existing payment/auth/order/document APIs, records and owned media. Rails denotes the internal operating system, not a framework migration.

## Implemented

| Area | Change | Boundary |
|---|---|---|
| Homepage | Primary Book Urban Gang Tour action; Next Stop directly below hero; chronological school archive rail with real school marks; service hierarchy; purposeful motion and owned-photo fallback | Only a valid published public event date can become Next Stop. School attendance is arranged with the institution, not sold as public tickets. No invented forthcoming stop. |
| Shared shell | Five primary navigation destinations, a complete grouped menu, real links, current-page state, reduced-motion/focus behavior | One native renderer. No retired V25 runtime, template shell, bottom tabs or boot veil. |
| Portfolio and people | School, campus, institutional campaign, live event and broadcast sections; archive-linked logos; substantial Eugine/Lucy profiles; actual photography/films | Campus Rev is the current offering. Historical Campus Rave titles/artwork stay intact. No invented awards, impact figures, education or prior-employer claims. |
| Commerce | Editorial catalogue, responsive contained images, real product gallery, size/options, persisted cart, fulfillment and server quote | Current database catalogue and prices remain authoritative. No generated merchandise collection or arbitrary new SKU. |
| Free name printing | Explicit per-product staff setting, normalized optional printed names, cart editing and separate named lines, quotes/orders across M-Pesa/Paystack/Stripe, production and receipt display | Defaults off. Active database eligibility is verified server-side; name printing adds no fee. No live product was automatically enabled. |
| Events | Clear owned-event lifecycle cards and history, private school distinction, seller attribution/check timestamps for discovery listings | Sales state comes from the existing server truth, never from a frontend badge. |
| Staff event editor | Correct lifecycle labels, drafts by default, honest load/error/empty states, lossless priority shortcuts, explicit capacity/min/max controls | Restore opens the existing record for review. The API no longer erases capacity/order limits on save. Renaming or reordering tiers after purchases remains an operating restriction pending immutable tier IDs. |
| Availability | Inventory lookup uses event record ID rather than public slug; overall eligibility follows actually sellable tiers and minimum order size; per-tier truth reaches checkout | Unknown stock, closed sale windows, paused states and exhausted stock are not advertised as available. Existing payment and reservation enforcement remains in place. |
| Privacy/legal | Standalone cookie policy, discoverable preferences, optional-event consent gate, immediate reporting revocation/ad pause, resolved-banner behavior, accurate tracker/storage disclosures, separate minor/media permissions | Reload/browser cleanup limits are stated. Policy drafts do not certify legal compliance, guardian consent collection, retention execution or real provider delivery. |

## Design references and provenance

Read-only public inspection used Mobbin Merch's editorial catalogue framing, Nixtio's service/work hierarchy and controlled motion, and Mookh's event-detail/availability presentation. These inform an independent UGT implementation; exact visual parity with those products is not claimed. UGT's magenta/yellow identity, existing host film and school/event/media archive remain the source material.

The supplied DOCX has no embedded merchandise artwork. Latest owner-approved merchandise artwork, fit/product photographs and the requested reference images remain missing inputs. Historical merchandise files are not treated as a newly approved drop. Biographical education and prior-employer details require approved source material before inclusion.

## Verification and release boundary

Verification commands and browser results are recorded below when completed. Browser commerce/payment/booking checks use explicit fictional fixtures and intercepted requests against an isolated Worker with no database, payment, email or R2 credentials. They do not create customer records, charge phones/cards, send mail or issue valid tickets. Provider-backed success, field-device certification, live admin mutation and performance benchmarks are not established by these tests.

The private Sites review uses the redesigned public components and preserved earlier review documents/prototypes. It has explicit read-only guards for booking submission and payment. It is not the production transaction server. A read-only public product-catalogue check returned 503 `catalog_unavailable`; the review does not manufacture products to hide that result. A production fix, product publication or database migration has not been performed.

No main-branch merge or public Cloudflare deployment is authorized by this bundle. Publishing the existing owner-private review and a feature-branch PR is the handoff route.

### Verification checkpoint (11 October)

- `npm test`: 59 files, 351 tests passed, including presenter canonical metadata, ticket minimum-size availability, name eligibility and normalization, order contracts and consent gates.
- `npx tsc --noEmit`: passed. The repository does not define an npm `typecheck` script.
- Chromium production route sweep: 147 checks (49 route entries at 390/820/1440 pixels), native RSC responses, retired paths returning 404, single shell/heading, navigation/back/refresh and no horizontal overflow.
- Production commerce/booking regression: passed at 390/820/1440 pixels, including cart persistence, server-priced payloads, idempotent retry, booking recovery, card redirect fixture and post-confirmation cart cleanup.
- Five-width extended development regression: passed at 320/390/820/1440/1920 pixels, including consent acceptance/revocation, separate named lines, name editing/reload, authoritative quote payload, tier minimum/maximum and closed tiers, reduced-motion hero poster and responsive editorial/legal routes.
- Owner-private static review: 18 primary-page checks (nine routes at 390/1440 pixels), one shell/heading, no overflow or page script errors; screenshot inspection confirms the owned hero photo remains visible with reduced motion.
- An intermittent production-only React hydration warning appeared on `/cart` during earlier extended runs. Standalone cart reloads and the equivalent development flow did not reproduce it. It remains an open verification issue, not a dismissed error or proof of provider success.
- Final rebuilt production bundle: the complete five-width extended regression passed with no collected page errors, and all 35 public metadata checks passed with independent canonical URLs (including both presenter pages). Evidence: `evidence/reconstruction-checkpoint/`. This clean run does not establish the earlier intermittent warning's cause or resolution.
- OpenNext builds exit successfully but report inherited CSS alignment warnings and PDF-dependency duplicate-case/trace warnings, including a `color-string` copy diagnostic. PDF end-to-end delivery is not verified in this checkpoint.

Evidence is stored locally under `evidence/reconstruction-final/` and the private review checkpoint. Chromium automation is not certification on physical phones or Safari/WebKit.

### Published private review

Owner-private Sites version 23 published successfully at https://urban-gang-tour-review.euginemicah.chatgpt.site on 11 October 2026. Checkpoint evidence and open work are available at `/review/reconstruction/` on that same origin. The exact private review source is `6f9a675e0cdbeae479d9c19c96ece48d5841d421`; this is a separate static/read-only review repository, not the public application branch. Access stayed custom owner-only with no groups or external visitors. Publication does not authorize a public Worker release.

## Remaining reconstruction work

1. Website Studio: the review branch now covers copy/images for homepage, About, biographies and FAQ with draft/preview/owner publication/history-to-draft. Navigation/footer, legal drafts, archive and portfolio editing remain. This is not a whole-site visual layout builder.
2. Shared event root linking booking, public listing, internal operations, budgets, documents, crew, safety, tickets, communications and media. Immutable commercial tier identities and full sale-window authoring need further work.
3. Linked school/sponsor/client/performer CRM, follow-up ownership and communication history; crew availability, assignments, call times, transport/equipment and release records.
4. Governed document/guardian/media permission workflows, actual operational retention/rights execution and qualified Kenyan legal review.
5. Source/period-qualified reporting for booking conversion, sponsor pipeline, profitability and commitments versus paid/refunded amounts.
6. Controlled provider settlement/delivery and authorized-role/browser verification with configured non-production services. No real-message or real-charge test is implied.
7. Approved current merchandise and biography inputs, resolved live catalogue availability, accessibility/caption coverage, physical-device and measured performance checks.

Use the complete route/module matrix in `reconstruction-route-audit.md` to continue these vertical slices. Existing module presence and old preview screens are not completion evidence.

## Deeper continuation: saved means confirmed (18 October 2026)

The Friday checkout contained unfinished story, media and website editors. This
continuation finishes those existing paths rather than introducing another suite.
The professional standard is a traceable content lifecycle, not another dashboard:
start with actual route SQL, persisted rows, signed-session boundaries and browser
requests; use versioned writes, immutable history, failure injection and a frozen
production bundle; judge correctness by saved/reopened content, unchanged public
drafts, rejected stale writes and recoverable partial failure.

Concrete corrections:

- PostgreSQL JSONB reorders keys. Website publication acknowledgement now
  normalizes both draft and published content before comparing values, preventing
  a genuinely saved publication from looking unconfirmed.
- Private story copies require matching ID/next revision, not merely HTTP 200.
- The old gallery API cannot bypass new photo version checks. Null legacy photo
  captions/descriptions no longer make the entire library fail to load.
- Draft story/page uploads require appropriate admin permission or a published
  reference. Content is rendered as text, never pasted executable HTML.
- Persistent errors keep entries; bulk photo failures retain unfinished selections;
  uploads reuse stored URLs on registration retry; removal is recoverable.
- Shared navigation uses real module links, current location and a skip link;
  active editors remain mounted across module changes. Story/media/website editors
  have focused forms, explicit save states and mobile layouts. Existing operations
  tables and the full admin redesign are not claimed complete.

Reproducible checks: `npm test`; `npx tsc --noEmit`;
`UGT_STUDIO_PG_FIXTURE=1 npx vitest run --no-cache __tests__/studio-postgres.integration.test.ts`;
normal `npm run cf:build`; deployment dry-run; local frozen-Worker
`scripts/admin-studio-regression.mjs`. The database test runs actual route SQL in
disposable network-none PostgreSQL 16. Session/Origin tests use real signed cookies
with fixture authority records. UI tests intercept fictional admin API replies;
they are not production owner acceptance or physical Samsung certification.

No production records, credentials, provider messages or charges are changed.
PR74 remains draft/review only: no main merge or public deployment. The new tables
and columns are additive; preserve them and their histories when rolling back an
application build. Earlier `announced` lifecycle rollback constraints still apply.
Any rollback must retain the media version/privacy guards; do not re-enable an
older unversioned gallery writer alongside the new library.

Verification results for this continuation:

- Standard suite: 107 files / 745 tests passed; eight opt-in cases skipped.
- Disposable PostgreSQL studio integration: passed separately, executing actual
  storage/route SQL, including JSONB round-trip acknowledgement, cross-endpoint
  conflicts and legacy null metadata. Signed-cookie role/Origin tests also pass.
- TypeScript and normal Cloudflare build passed. Deployment dry-run passed;
  bundled `color-string` and `SharedRateLimiter` exports were checked. Scoped lint
  had zero errors and 52 warnings. Inherited CSS/PDF/OpenNext diagnostics remain.
- The final frozen production-Worker run passed 60 UI checks across Galaxy S24,
  narrow 320px Android and desktop, including single-main-landmark and keyboard
  skip-link checks. Earlier production and development runs passed 57 checks.
  Byte uploads and registration retries, partial bulk selection, input retention,
  publication confirmation and history-to-private-draft were exercised.
- **Release risk remains:** other production-Worker runs reported intermittent
  React hydration error #418, including `/admin?tab=Gallery`. The complete clean
  run does not establish its cause or resolution. Keep the error assertion active;
  do not describe this checkpoint as ready for public release. This is consistent
  with earlier documented protected-route hydration failures, not proof they share
  one cause. No error was suppressed to obtain a pass.
