# Admin workspace: Events-first improvement

## Scope and evidence

The owner requested easier administration, starting with Events, its public
presentation, media and promotions. This branch is a review build; no new
production deployment or main merge is authorized for this phase.

Current-run screenshots: `/workspace/artifacts/admin-events-20261015/`.
Admin captures use isolated fixture APIs because an authenticated owner browser
was not available. No fixture was saved to the real business database. The
public Events capture initially showed loading and was rejected as audit
evidence; a fresh stable capture is saved as `03-public-events-stable.png`.
No end-to-end owner upload to live storage is claimed.

1. Event list — needs improvement: the old table forces horizontal overflow
   on a phone; status actions require the full editor. Screenshot 01.
2. Event editing — partial: the lifecycle selector exists, but the artwork
   control is a URL field. No local file picker is offered. Screenshot 02.
3. Upload diagnosis — confirmed in local browser: image preflight uses blob
   URLs, while CSP previously omitted blob from img-src. The existing Gallery
   dimension check is affected too. Allowing image-only blob URLs restores this
   path without expanding script or frame permissions. Live media health reports
   Workers KV configured; that alone is not proof of owner upload success.
4. Public data — the live API returned eleven public records: ten school stops
   and one past-client record, all non-sellable. No public ticketed event was
   returned. Do not invent or automatically publish ticketed records to fill
   the page. School-stop previews should lead to the school-tour page.

The packaged audit's shared overrides/preflight resources and in-app Browser
were unavailable. Chromium captures, DOM inspection and source tracing were used
as a limited fallback. This is not a comprehensive accessibility certification.

## Benchmark sources, checked 15 October 2026

- [Ticket Tailor features](https://www.tickettailor.com/features): event-page
  creation, public/private listings, scheduled sales, discount codes, roles,
  order management and clear reporting.
- [Humanitix features](https://humanitix.com/us/features): event setup, ticket
  capacity, guest management and delegated teams.
- [Eventbrite organizer overview](https://www.eventbrite.com/organizer/overview/):
  event creation, customizable pages, sales, promotion and mobile operations.

These are official public feature descriptions, not signed-in competitor admin
audits. No unsupported claim of being objectively better than those products.
The applicable pattern is task-based management with clear publication state,
safe defaults and explicit outcomes, not copying their artwork or screens.

## Implemented first batch

- Responsive event cards with search, kind/status filters, artwork, schedule,
  public visibility, Edit, Feature and correct public-preview destinations.
- Direct status selection with explicit confirmation and cancellation. A narrow
  status API checks both current state and the exact microsecond update timestamp;
  concurrent edits return 409 instead of overwriting media, dates or prices.
  State change and audit insert are one SQL statement. Missing public details
  and unverified recovered records must be reviewed before quick publication.
- Ongoing is added to canonical lifecycle, public presentation, detail notice,
  homepage eligibility and the database constraint. Public caches are invalidated.
- Public owned-event updates refresh every twenty seconds while the page is
  visible, separately from the three-minute external listings refresh. The first
  successful load establishes a baseline without a false change notification.
  Subsequent state changes produce a real notice. Existing server microcaching
  means propagation is not instantaneous; checkout still independently validates.
- The public event API coalesces reads for five seconds, uses no-store response
  headers and expires cached fallback snapshots after fifteen seconds. An outage
  produces 503, not an empty successful feed or an indefinitely stale offer.
  The client removes stale cards and shows the unavailable state on failure.
- Shared image picker for Events, client logos, Stories and Campaigns, including
  validation, upload progress, timeout, stored preview and actionable failure.
  Retain the previous image on upload failure. Preserve text edited during upload.
  Save is disabled until the upload finishes. Gallery retains its existing flow.
- A module-scoped upload endpoint: events → events permission, stories → content,
  campaigns → ops_promos. Authenticate and check Origin before reading bytes.
  Limit actual streamed bytes to 8 MiB, check MIME/signature, reject SVG, enforce
  rate/body-time limits and generate server-owned paths. Do not trust filenames.
- New stories start as drafts even for the owner. Scheduling/publication remains
  explicit. Story fields reflow on phones. Remove nested main landmarks.
- Shorter task-specific headings and shortcuts to existing discounts, campaigns
  and event operations. Existing discount eligibility is not expanded silently.

## State contract

| Operator choice | Public behaviour | Online ticket sales |
| --- | --- | --- |
| Draft / pending review | Hidden | Closed |
| Upcoming (published) | Listed with confirmed details | Only if inventory and sale window permit |
| Happening now (ongoing) | In-progress label and public details | Closed by default |
| Sales paused / sold out | Visible with notice | Closed |
| Postponed / rescheduled | Visible with updated notice | Closed until reviewed and republished |
| Completed | History/details retained | Closed |
| Cancelled / archived | Hidden under current site policy; records retained | Closed |

“Live” is ambiguous: publish means visible, ongoing means happening now.
“Failed” should be an internal outcome/reason, not a confusing public sales state.
Status changes do not automatically send communications, issue refunds or void
existing tickets. Operators must handle these separately and confirm outcomes.
Manually selected ongoing stays in effect until changed; it is not an automatic
calendar rule. No attendance or successful-event claim is inferred from a date.

## Recommended operating workflow

Create draft → set date/venue → upload artwork → configure ticket capacity and
prices → preview/readiness check → publish → monitor orders and check-in →
mark ongoing/completed → attach recap. Pause/postpone/cancel are explicit
exception workflows, each with affected-ticket-holder review.

## Next batches, not claimed implemented

1. Guided editor: Basics, Artwork, Tickets, Promotion, Review; saved-draft
   recovery, unsaved-change protection, duplicate-as-draft, full-edit version
   guards and readiness checks.
2. Unified media library: image selection/reuse, albums, alt text, ownership,
   mobile cropping, bulk progress/retry and safe orphan cleanup. Do not expose
   uploaded drafts as listings. Raw upload URLs are public, not private storage.
3. Event-specific promotions: ticket-code eligibility, caps and expiry enforced
   transactionally at checkout, with a linked campaign preview. Current Promos
   are merchandise-oriented; do not imply ticket discounts exist already.
4. Event workspace: attendees, check-in, capacity, sales windows, orders, refund
   review and communication drafts. Immutable ticket-tier IDs before allowing
   sold tiers to be renamed/reordered. No automatic money movement.
5. Editorial desk: draft/review/scheduled/live views, story previews, image
   descriptions, author permissions and a publication calendar.
6. Operations: internal outcome/reason (including failed/cancelled), tasks,
   responsible person, activity history and approvals for sensitive actions.

## Verification and deployment limits

569 tests across 83 files and TypeScript pass. Scoped lint reports no errors
(native-image and pre-existing type/hook warnings remain). Four-profile browser
checks cover Galaxy S24, A55, landscape and desktop; file preflight, upload
failure handling, status confirmation/conflicts and public polling use isolated
fixtures. Compiled anonymous access checks pass for the existing 51 protected
admin handlers plus the new upload handler. The real database constraint change
and a signed-in owner's live storage upload still need deployment verification.

Run `npm test`, `npx tsc --noEmit`, `npm run cf:build` and
`BASE_URL=http://127.0.0.1:4202 node scripts/admin-events-regression.mjs` against
an isolated compiled server without production DB/provider settings. The browser
suite intercepts writes and covers statuses, conflict handling, file selection,
upload failure preservation, Gallery preflight and mobile reflow. Do not claim
live payment, mail, real owner authentication or database migration coverage
from fixture tests.

The status constraint expands to allow ongoing. No records are deleted or
automatically republished. An eventual deployment needs owner approval, normal
PR merge and Cloudflare verification. A rollback must retain the expanded
constraint when ongoing records exist; do not reapply a restrictive old schema.
