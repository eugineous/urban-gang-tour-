# Contracted / partner events — 15 October 2026

Branch: `admin/partner-event-listings-20261015`.
Review-gated implementation; no production merge, deployment, database mutation
or owner-session impersonation performed in this batch.

## Implemented

- Fourth admin kind: Contracted / partner event. Separate organiser, contracting
  company and credited role, institutions, related news slug and admission.
- External ticket URL, free admission, invitation and unconfirmed entry modes.
  External links are HTTPS-only and reject credentials, local/private IP hosts
  and Urban Gang checkout. They are not fetched by the server.
- Partner records can never create Urban Gang ticket inventory. Save discards
  tiers; public DTO suppresses tiers and returns sellable=false; discovery/home
  do not trust forged sellable flags. Existing kinds cannot be converted.
- Additive partner_details JSONB / kind CHECK migration in the existing atomic
  advisory-locked operations schema bootstrap. No data rewrite or delete.
- Publication readiness enforced in both full saves and narrow status changes.
  Original primary artwork, credits, client, venue and confirmed date are required
  (postponed dates may be absent); active external events also need a seller URL.
- Original poster variants have independent uploads and captions. One event can
  carry all UniFest variants instead of creating duplicate listings.
- Canonical public event pages, actual organiser attribution, safe external CTA,
  completed-event archive, original-poster gallery and public story cross-links.
- Partner work appears in discovery, homepage eligibility and the portfolio.
  Published news can link back to its event. Drafts and unpublished stories do
  not create public links. A five-second coalesced portfolio snapshot has a
  fifteen-second absolute stale fallback limit, matching event-feed policy.
- Upcoming Event schema credits the organiser and does not invent ticket stock.
  Completed partner work uses CreativeWork instead of advertising a live offer.
  Canonical metadata and sitemap retain completed partner portfolio records.
- Campus Rev / Compass Rev corrected to Campus Rave in all matched page sources.
- Five editable event briefs and five unpublished news templates in Events and
  Content. Opening a template does not write any database row. Existing matching
  templates are disabled after saving rather than overwriting published work.
- Release/cache namespace prepared: partner-event-listings-20261015-v1.

## Poster evidence and editorial limits

| Event | Date | Verified context | Still to confirm |
| --- | --- | --- | --- |
| Mr & Miss Air Travel 2026 | 18 September 2026 | Air Travel Karen; Eugine Micah on hype with Hype Ola; Air Travel & Related Studies Centre / Sherehe Vibes Africa | Original file, start time if available |
| Freshers Bash x Color Blast | 25 September, year absent | Faculty of Agriculture, University of Nairobi; Eugine hype; Lucy Ogunde interviews; Deejay Xavi music | Year, original file, entry arrangements |
| UniFest 2026 | 6 November 2026 | UoN Graduation Square; free admission; three distinct poster variants | Original files, start time, exact presenter attribution and individual team duties |
| Mr & Miss Culture Gala Night | 30 October 2026 | Moi University Students Organization; Student Center; Echoes of Roots; official dress code | Client, Urban Gang role, original file, entry/start time |
| SATUK Award Gala | 5 November 2026, 4 PM | Technical University of Kenya; Office of the President / Sherehe Vibes Africa | Client/Urban Gang role, original file, admission |

Owner confirmed Sherehe Vibes Africa contracted Urban Gang for the original
three events. The two subsequently supplied new posters do not establish exact
Urban Gang team duties or the contracting company, so those template fields
remain blank. Nobody is identified from an unlabelled portrait.

No attendance, sold-out, testimonial, commercial outcome or successful-event
claim was invented. November events remain upcoming as of this batch. Air Travel
poster prices and seller are historical context, not current sales inventory.

The inline posters are visually readable in this chat but no corresponding
original JPG/PNG bytes or fetchable source URLs were provided to the execution
workspace. The owner says they have no separate files. Do not ask repeatedly,
generate replacements, claim uploads succeeded, or use a different event poster.
Actual image publication remains blocked until the originals are accessible.

## Verification

- TypeScript noEmit passes.
- 610 tests across 86 test files pass; 19 cache tests rechecked after the release
  namespace bump. Includes mocked route-level permission/Origin, save/status,
  tier stripping, kind immutability, public DTO, SSR, canonical and schema tests.
- 73 local-only Playwright checks pass against both development and the compiled
  production server on Galaxy S24, Galaxy A55, landscape and
  desktop: partner form, uploads/variants/captions, free admission, newline
  normalisation, unpublished story templates, public partner cards, status
  confirmation/conflict, ordinary events, stories, campaigns and gallery.
- Screenshots: /workspace/artifacts/admin-events-20261015/after.
- Source spelling scan and git diff whitespace checks pass.
- Cloudflare production build and Wrangler deployment dry-run pass. Existing
  CSS compatibility/font-parser warnings remain. OpenNext prints a color-string
  copy diagnostic but exits successfully; the bundled package file is present.
  Scoped ESLint reports zero errors (88 warnings, including native images,
  existing any/hooks and navigation recommendations). This is not a claim of a
  warning-free build.

Browser admin APIs were fixture-intercepted. This proves UI flow/serialization,
not a real owner upload or production Postgres migration. Source/API tests mock
database calls; actual hosted schema acceptance and admin-to-live publishing
remain unverified without legitimate authenticated access.

## Release and operations

Follow feature branch -> reviewed PR -> explicit production approval -> main
merge -> Cloudflare deploy --keep-vars. Preserve existing bindings, cron, secrets
and customer data. No new provider or payment split is involved.

After authorized deployment, verify owner login, save a real partner draft,
upload the actual posters, confirm missing facts, review and publish. Mark past
confirmed events Completed, not Upcoming. Publish approved news through Content
with the matching news slug. Verify canonical page, discovery, portfolio, story
links and sitemap. Check the external seller independently before enabling it;
never run a real charge as a test.
