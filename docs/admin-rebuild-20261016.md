# Admin rebuild: first functional batch and full plan

16 October 2026, Africa/Nairobi. This is a code/workflow review and implementation
record, **not a completed signed-in visual audit or an entire admin redesign**.
No production content, customer records, provider credentials or messages changed.

## Goal

Make common tasks obvious, retain work when people get distracted, show clear
next actions, and make success/failure visible. Cognitive accessibility is a
design goal, not a clinical claim or proof of WCAG compliance. Do not claim to
outperform Google, Instagram or TikTok without comparative user testing.

## Source-grounded research

- [W3C: Make each step clear](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/)
  supports clear position/progress so a distracted user can resume.
- [W3C: Let users go back](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p02-back-undo/)
  supports recovery and reversible actions instead of losing entered work.
- [Shopify: Creating collections](https://help.shopify.com/en/manual/products/collections/create-collection)
  shows product organisation as an explicit, editable task.
- [Shopify: Importing products](https://help.shopify.com/en/manual/products/import-export/import-products)
  documents import and overwrite choices. Our event import deliberately cannot
  overwrite existing records or publish automatically.
- [WordPress revisions](https://wordpress.org/documentation/article/revisions/)
  and [post status](https://wordpress.org/documentation/article/post-status/)
  distinguish saved drafts, publication and recoverable previous versions.

These are official public documentation sources, not authenticated competitor
admin audits. No screenshots or private competitor interfaces were inspected.

## Current findings and first batch

| Step / task | Finding from code | First-batch state |
| --- | --- | --- |
| 1. Paste event information | Previous form required manual field entry | Labelled ChatGPT text, Markdown and JSON now parse locally; choose an event, preview and open a new draft |
| 2. Edit merchandise | Edit exists, but only three category choices and an image-path input | New category names and native product image upload added; server Products permission enforced |
| 3. Write/edit/publish a story | Edit/Delete exist; save errors were only a temporary toast; edits could change during a save | Persistent failure message and locked save snapshot; open editor retained; full revisions/Trash still missing |
| 4. Upload photos | Both picker and drop handler read files[0] only | Twenty-file serial queue with individual progress, retained failures, retry and batch category |
| 5. See gallery changes on the site | Public gallery rendered the static archive; existing DB-backed PhotoGallery was unused | PublishedGallery now reads the same published-only source as the public API, with category filters and the existing viewer |
| 6. Reply to Gmail | Selecting a message cleared reply text; unhandled requests could leave loading/sending stuck | Per-message drafts, timeouts, try/finally, stable selection and clear delivery-uncertainty feedback |
| 7. Contact someone | Local nine-digit Kenyan numbers could produce wrong WhatsApp URLs; mailto depended on installed mail app | Shared number validation/normalisation, safe WhatsApp compose and an explicit Gmail compose alternative |
| 8. Navigate without losing work | replaceState removed route history; tools unmounted; stale list responses could populate a different tab | pushState/popstate, retained opened editors, stale-response guard and unload warnings |
| 9. Full visual rebuild | No connected Browser capture tool / signed-in admin flow available | Blocked; no completed visual/accessibility audit or approved new visual design claimed |

### Import details

- Paste a single event or a full response containing multiple Name: blocks.
- The supplied attachment produces three complete recognised event blocks; its
  final UniFest text is truncated. No missing content is invented.
- Preview fields and warnings, choose a record, click Use this draft, upload
  actual posters, review and save through the existing authenticated route.
- Kind/date/time/admission are normalised deterministically. Placeholder values
  such as Not confirmed and Leave blank become empty fields.
- Invalid dates/URLs are flagged; a missing year is not guessed. Primary poster
  caption is imported and stored accessibly for partner events.
- No AI service, API key, prompt execution, image recreation, status promotion,
  imported prices, existing IDs, external image URLs or silent overwrites.
- Copy ChatGPT prompt includes a plain text fallback if clipboard access fails.

### Bulk photos and publication

- Select/drop up to twenty photos; eight MB per file, JPG/PNG/WebP.
- Serial processing limits simultaneous mobile decoding/network use.
- Queue cap includes completed rows until explicitly cleared, limiting retained
  browser File objects. Clearing the queue does not delete saved gallery photos.
- Failures remain visible. Retrying reuses the stored URL when possible.
- The existing unique URL index supports a short atomic ON CONFLICT no-op;
  retrying cannot overwrite captions/category or change publication state.
- Category is owner-entered, not invented from the image. It is a grouping field,
  **not yet a separate folder/album model or an automatically created public page**.
- Uploads remain private. Caption/category/accessible description still require
  human confirmation before the normal publication action.
- Gallery page and API share a whitelisted published-only reader. Cache
  coalescing is five seconds, with an absolute fifteen-second stale fallback
  limit. Mutations invalidate this reader. Gallery HTML bypasses edge page cache.
- The static owned archive is preserved, with a separate latest-published section.

### Draft protection and communication limits

Opened Events, Products, Gallery, Contacts and Gmail stay mounted when switching
admin sections. Gmail keeps separate replies per mailbox/message; a successful
send clears only the exact sent text, not edits made during sending. An uncertain
send never claims delivery and instructs checking Sent before retrying.

These are **in-memory drafts**, not server autosave. Closing/reloading the browser
can still lose unsaved work after accepting the browser warning. Explicit logout
clears private editor state; private content is not put into shared localStorage.
Refresh-proof server drafts and revisions are a next batch, not claimed done.

Contact links open compose screens only. No WhatsApp message or email was sent.
Actual Gmail/WhatsApp Business delivery depends on authorised provider connection,
scope, recipient details and account configuration. A source fix does not prove
that those external integrations are currently connected.

## Full rebuild plan

1. **Capture and choose the design.** Connect the signed-in browser, capture
   actual Today/Events/Stories/Products/Photos/Messages workflows on Android and
   desktop, inspect screenshots, then select a visual direction before replacing
   the shell. Keep operational fixes separate from claims about visual quality.
2. **A simpler task menu.** Today; Events; Stories; Shop; Photos & videos;
   Messages; Contacts. Put money, team access, connection settings and diagnostics
   behind clearly named secondary groups. One primary action and visible current
   location per page; keyboard focus, screen-reader names and large targets.
3. **One reusable editor pattern.** Clear Basics / Media / Review sections,
   actual save state, persistent actionable errors, visible preview link and safe
   retry. Preserve authenticated module permissions and owner publishing gates.
4. **Server drafts and revisions.** Author-owned draft records separate from the
   published version; debounced save, stable IDs, version checks, recoverable
   revision history and last-saved timestamps. Never unpublish a live story just
   because its next draft was saved. Return version conflicts instead of replacing
   another editor's work. Add named draft lists and resume links to Today.
5. **Recoverable removal.** Add Trash/Restore for stories and media, protect
   referenced files and purchase history, and make permanent purge a separate
   owner-only action. Do not silently expire/delete records or promise recovery
   of content already hard-deleted without checking backups.
6. **Real albums and categories.** Separate collection records, names/covers,
   item assignment, rename/merge and safe deletion; connect them to real public
   routes and filters. Keep product/category management next to product editing.
   Do not present an unbacked decorative folder tree as a working library.
7. **Bulk workspaces.** Preview selections; batch category/album; per-file errors;
   pause/resume; bounded upload batches; explicit review/publish. Add import
   duplicate detection and preview-before-apply for spreadsheet product changes.
   Video processing requires a separately bounded storage/job workflow.
8. **Messages that show reality.** Separate Gmail, WhatsApp conversations and
   contact shortcuts; show connected/disconnected/reconnect states. Keep composed
   drafts, queued/sent/delivered/failed states from actual provider responses,
   safe retries/outbox IDs and recipient confirmation. Never send test messages
   to customers merely to verify a button.
9. **Final proof before production.** Real authorised draft create/edit/reload,
   publish/unpublish, public-page verification, Trash/Restore, category/album
   changes, invalid and interrupted bulk uploads, mobile/back/keyboard tests and
   delegated-role denial tests. Verify chosen provider connections without
   exposing tokens. Review the release, then deploy only on explicit instruction.

## Evidence and remaining blockers

The source review confirmed the code paths above. Unit, route, SSR and simulated
React-handler tests use fixtures/mocked services, not real customer writes.
644 tests across 92 files pass, including supplied-text parsing, simulated React
paste/preview/use flows, Gmail draft switching/network failure recovery, queue
retry/serialisation, upload permissions, contact-link rendering, published gallery
SSR/data whitelisting/cache expiry, and existing security/commerce regressions.
TypeScript and the Cloudflare production build pass. Scoped ESLint has zero errors
and four existing any-type warnings. Existing CSS compatibility, font-parser and
OpenNext color-string copy diagnostics remain; the bundled color-string file was
checked present after the successful build. No warning-free build is claimed.
Wrangler's deployment dry-run also passes with existing bindings. This does not
publish the build or replace a real owner-session acceptance check.

The Product Design audit workflow could not capture the signed-in product because
its Browser tool was not exposed. Some shared skill references/preflight resources
were also unavailable. No old screenshot is substituted as current audit evidence,
and no new screenshot-based design/accessibility verdict is claimed. The user has
been asked to connect a signed-in admin browser, without sharing passwords/cookies.

No new live mobile/browser check, owner upload, actual Gmail/WhatsApp send, provider
connection or hosted migration is verified in this batch. The existing browser
regression scripts are supplied/updated but are not claimed run during this review.

This batch remains on a review branch. The earlier deployment approval covered
the partner-event release, not this broader admin rebuild. No main merge or
production deployment is performed here.
