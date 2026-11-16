# UGT operations handover — 16 November 2026

## Add photographs and short videos

Open **Control Room → Media → Upload photos or video**. Choose up to 20 files,
select a category, and watch each file's progress. Photos: JPEG/PNG/WebP up to 8 MiB;
video: MP4 up to 15 MiB. Files remain private. Review captions, descriptions and
categories in the library, save, then publish using an owner account. Download
originals from each native media card. Removed records retain bytes for restoration;
moving a file to Removed does not free storage. Failed files stay available for
manual retry; check the result before starting again.

The website keeps the source bytes; compression cannot restore missing detail.
Use the original camera file, avoid repeated re-encoding, and export a modern
H.264/AAC MP4 for broad phone compatibility. A sharp 720p video often needs fewer
bytes than a poorly encoded 1080p file. Check the result before uploading. Native
videos load on demand and support byte ranges.

## Longer videos and Instagram

In Media, open **Storage and video links → Add a YouTube video**. Add the owned
video/Shorts link, caption, category and rights confirmation; save privately, then
review before publishing. Only the URL and caption are stored. Public visitors
choose whether to load YouTube; no player is loaded before that choice. YouTube's
terms, availability and privacy policy still apply. This is not video storage on UGT.

**Import from Instagram** shows the existing owned-account importer, archive
counts and run progress. It preserves original captions, completed IDs and
publication choices. It cannot bypass Instagram login gates or rate limits.
One-click dispatch needs an owner-configured existing GitHub workflow credential;
if absent, the panel says so and links the existing workflow. No credential is
created automatically. Approved archived files can be downloaded from this panel;
the full published collection remains in Gallery. Direct uploads and YouTube links
work independently of Instagram. Existing GitHub files have not been migrated.

## Storage costs and limits

No Supabase project, R2 bucket, paid storage service or automatic upgrade was added.
New uploads use the existing website store, capped conservatively at 500 MiB and 100
storage attempts per rolling 24 hours. Existing unknown-size records are
budgeted at the store's 25 MiB object maximum, so displayed reserved space can exceed
actual image bytes. Database/storage/inventory failures stop new uploads; they do
not erase existing content. A write with an uncertain outcome retains its reservation.

This cap is not an account-wide bill cap: requests, database compute, messages,
domains and payment fees are separate. The UGT DNS zone is Free; historical shared
account invoices exist. Current Neon plan/usage and the Workers product's next bill
were not independently established. Do not cancel them without checking their
dependencies. Unlimited, free-forever video hosting is not promised. No billing or
shared subscription was changed. Monitor account-wide quotas in the owner dashboards.

## Codex and ChatGPT event drafts

Open **Connected tools** as owner; create a named 1-, 7- or 30-day credential with
poster upload and/or event draft scope. Copy it once into a private credential
store, never a prompt, poster, repository or support message. Revoke it when done.
At most 10 active credentials; 6 successful operations/minute and 30/day each, plus
shared attempt budgets. Poster images are limited to 5 MiB.

Use the [Codex CLI and private ChatGPT Action guide](../integrations/connected-tools.md).
The Action requires manual setup in a supported ChatGPT client; a site API is not
an automatically installed ChatGPT connection. Short-lived attachment URLs must
come from the exact documented OpenAI host. An expired attachment must be sent
again; a local CLI upload is the fallback. Keys only create drafts and upload
their own posters. Staff review and publish separately. They cannot change ticket
sales, payments, users or existing events. No live keys or event drafts were created
for verification.

## Customer experience and publishing

Phone shop browsing now shows two merchandise cards per row, full contained
artwork and 44px actions. Category links remain dedicated category pages. Existing
search, cart persistence, native accounts, guest ticket links and verified payment
state remain authoritative. “Book Us” is the concise booking label; actual host
names remain in biographies. Back to top appears on long public pages, outside
private payment/ticket screens, and respects reduced motion.

Story archives have real page links and matching canonical URLs, so older stories
can be reached without pressing a JavaScript load-more button. Search-filtered
archive views are excluded from indexing. Published article text remains untouched.
Valid metadata and sitemaps help discovery; they do not guarantee rankings. The
connected Search Console reader was plan-blocked, so search performance is unverified.

## Security and release limits

The defensive review inventoried 199 base page/API modules and exercised local
authentication, scope, origin, uploads, publication, attachment-host, webhook and
shared-rate boundaries. Changes close unpublished media exposure, bound upload/
webhook streams and patch the flagged transitive DOMPurify version. The production
dependency audit reports zero advisories at the time of checking; this is not a
security guarantee. Real isolated PostgreSQL tests cover concurrent quota/key use.

No live charges, STKs, receipt messages, customer accounts or destructive scans
were used. Ticket-sales gates remain closed until the established readiness checks
are satisfied. An authenticated production walkthrough, actual Paystack settlement,
email delivery, provider dashboard readiness, account-wide billing and full Instagram
coverage are not certified by local tests. Historic weak-reference status disclosure
and a future CSP nonce rollout remain documented follow-ups, not silent scope claims.

Cloudflare's automatic build integration currently references a deleted/rolled
build token and fails before compilation. The normal reviewed CLI deployment uses
the existing authorized token and `--keep-vars`; no credential was rotated. Repair
that integration separately in the owner dashboard. Release evidence records the
actual deployed version, bindings and read-only availability checks.

Design craft attribution: [Charles Unslop](https://github.com/LemonFace0309/charles-skills/tree/main/skills/charles-unslop),
Charles Liu and Damir Sokolovsky, CC-BY-4.0. Refinements retain UGT's existing identity.
