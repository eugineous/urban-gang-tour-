# Storage audit and replacement

The application needs no R2 subscription. Do not reactivate either bucket.

## The two former bindings

| Binding / bucket | Actual use | Replacement |
| --- | --- | --- |
| `NEXT_INC_CACHE_R2_BUCKET` / `ugt-isr-cache` | OpenNext's incremental-cache adapter stored prerender/ISR entries and populated the bucket during deployment. This blocked deployment when R2 was unavailable. | Build seeds bundled into ASSETS; mutable, build-scoped entries in the Workers Cache API. Eviction causes regeneration, never loss of business records. |
| `UGT_UPLOADS` / `ugt-uploads` | `lib/server/r2.ts` accepted authenticated upload bytes, deleted owned gallery objects, and constructed URLs using `R2_PUBLIC_URL_BASE`. | Native `UGT_MEDIA` Workers KV binding and same-origin, content-hashed `/media/` delivery. No S3 endpoint, access key, secret key or public bucket URL. |

## Every application consumer

| Path | Former operation | Preserved behavior |
| --- | --- | --- |
| `/api/admin/gallery/upload` → Gallery desk | Store image | Admin/gallery permission and origin check; JPEG/PNG/WebP signatures; 8 MB maximum; upload progress and `{url}` response. |
| `/api/admin/gallery` | Register owned upload; delete object before deleting its row | Validate owned, existing gallery upload; captions/dimensions; super-admin publication/deletion/reordering; deletion failure leaves the row retryable. |
| `/api/admin/docs/hero-upload` → DocGen | Store promo hero/partner artwork | Documents permission, origin check, 8 MB maximum, same client upload contract. |
| `/api/admin/docs/generate` phase attach → DocGen | Store generated PNG and optional PDF | Reserve serial first; attach once; retry returns original assets; 15 MB per asset; same download links and response fields. |
| `lib/server/docgen.ts` | Validate owned artwork URLs | Accept owned same-origin media URLs alongside existing bundled asset paths. |
| `/api/organizer/events/upload-image` | Store organizer-owned image | Approved-organizer gate; owner-scoped key; image signature check; 4 MB maximum; existing rate limit and `{ok,url}` response. |
| `lib/client/media-upload.ts` | Browser XHR upload transport | Same request body, progress callbacks and completion contract; no browser storage credentials. |

Bookings, payment initialization/callbacks, order/ticket issuance, accounts and
admin records use PostgreSQL and never used these buckets. Ticket and receipt
PDFs are generated on demand. Cart persistence uses the existing browser
storage. Those code paths and V25 markup, styles, captures and navigation were
not redesigned by this change.

## Media and access

Repository assets still use the normal `assets` → `public/assets` prebuild sync
and Cloudflare ASSETS pipeline, including existing photos, videos, logos and
fonts. No duplicate upload store is created for those files.

KV holds uploads durably; Cache API is only for reconstructible page cache.
Uploads get a SHA-256 content component so edits cannot overwrite a previous
document/image URL. File size and MIME restrictions remain below KV's 25 MiB
value limit. KV is eventually consistent across locations; newly written
objects can take up to approximately 60 seconds to appear at another location.
Existing download links stay ordinary same-origin links.

Published gallery/event images are public. Draft gallery images require a
gallery administrator; draft organizer images require their owner or a
marketplace administrator. Document bytes require documents-admin permission
and never receive public cache headers. Promotion artwork is public. MIME,
nosniff, ETag and HEAD behavior are enforced at delivery.

## Credentials and migration checks

Removed both bucket declarations, the old server/client helpers, R2 adapter,
application environment-variable dependencies and R2-specific types/comments.
Production secret *names* were inspected without reading their values: none
were R2/S3 credentials and no `R2_PUBLIC_URL_BASE` was configured. Existing
buckets/objects are not deleted, and unrelated secrets remain untouched.

`/api/health/media` checks known media columns and promo-artwork arrays, returning
only counts of references, recognizable legacy bucket references and external
URLs. A database failure returns 503 rather than pretending the inventory is
empty. Custom-domain external URLs need separate provenance checks if any exist.

The managed development environment separately provisions R2/S3 endpoint/key
bindings. Those are not application/Worker dependencies and are not used by
build, cache or upload paths. The currently available environment connector
only reads readiness; it cannot edit that stored environment profile. Removing
those profile bindings therefore remains an environment-settings operation,
not a reason to reactivate R2 or block an R2-free Worker deployment.

## Verification

UGT's existing `*/15 * * * *` cron remains installed. Routine deployments omit
the `triggers` block, which tells Wrangler to leave schedules untouched. The
account's cron limit rejects even a PUT of the identical existing schedule;
omitting that redundant PUT preserves payment reconciliation, ticket hold
cleanup and content-announcement jobs without deleting other projects' jobs.
If provisioning this Worker in a new account, install that single schedule
separately. The scheduled handler remains in `worker.js`.

See the task's deployment report for the final test counts, desktop/mobile
browser results, production inventory and active Worker version. OpenNext's
upstream dependency still contains optional adapters for multiple providers;
their presence in installed dependencies is not an application binding or
subscription requirement.
