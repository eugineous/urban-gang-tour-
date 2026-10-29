# Scheduled artwork handoff — 28 October 2026

## Implemented boundary

The existing secret-authenticated editorial cron accepts a private
`scheduled_story_artwork_queue` at `editorial-library/story-artwork-v1`.
The envelope permits one to seven independent batches, each with at most ten
exact targets. All batch schemas are validated before execution. Request IDs and
target slugs cannot overlap, and every batch must be inspection, scheduled
preview, or scheduled apply in the same phase. Other operations/public scope
cannot be embedded in this queue. Each apply batch remains atomic and uses the
existing immutable per-request journal and whole-record compare-and-swap; queue
retries retain the same batch IDs. One failed batch does not erase preceding
batch receipts.

Scheduled eligibility requires a managed article, its existing publisher approval
matching revision and content hash, no hold, no prior publication timestamp, and
a future publication slot. Exact record comparison, verified hash-addressed
1600×900/1200×630 WebP bytes, expiry and the future slot are checked before the
transaction can update artwork. Only `image`, `asset_manifest` and genuine
`updated_at` change. Text, approval, date, schedule, publication and social fields
are preserved. Scheduled manuscripts remain excluded by normal public reads.

Exact inspection returns selected artwork/identity metadata and an opaque record
version to private KV at `editorial-library/story-artwork-status-v1`. No body,
source manuscript or review payload is returned. Cron/heartbeat summaries remove
all individual targets, including those nested in queue batches.

Public illustration captions display `Editorial illustration`; descriptive alt
text removes an initial AI-generated label. Stored synthetic caption/provenance
are preserved. Photograph presentation is unchanged.

The separately scoped Color Blast activation hook uses
`catalogue-activation/pending-v1` and its own status key, and invalidates public
product truth only after activation or a confirmed already-applied result. It
does not share artwork authority.

## Private operator artifacts

Directory: `/workspace/artifacts/ugt-scheduled-art-20261028` (outside git).
`operator-inventory.private.json` records 64 historical future candidates, split
as six batches of ten and one of four. These are candidates, not a live
eligibility claim. Source filenames/hashes remain private. No manuscript text or
future article identity is included in this report.

`operator.mjs` provides all-target inspect/preview/apply/verification queues,
private exact receipt matching, derivative decode/hash checks, explicit upload
and readback, and future-public-page/image verification. Every remote write is
an explicit `stage-*` or `upload*` command. It never obtains a cron secret,
impersonates a user or changes a post directly. Local prepare/import has no
network side effect.

The helper validates the complete local image set before `upload-all` writes
anything. Replacing uncompleted pending work is rejected; an exact manifest retry
is accepted. Reusing a queue UUID alone does not authorize replacing a different
pending apply.

Artwork production is being completed by the separate producer. At this
handoff's local inspection, `web-manifest.json` had 16 images and was increasing.
Do not treat this snapshot as 64 finished images: `upload-all` requires a valid
derivative pair for every inventory target and fails before uploading if any is
missing or invalid.

## Verification evidence

- Focused repository command: `npx vitest run --no-cache
  __tests__/story-artwork.test.ts __tests__/story-artwork-staging.test.ts
  __tests__/story-artwork-cover.test.ts __tests__/editorial-cron.test.ts`:
  **4 files, 23 tests passed**.
- Real isolated SQL command:
  `UGT_EDITORIAL_SQL_CONTAINER=ugt-editorial-fixture-20261019 npx vitest run
  --no-cache __tests__/story-artwork-postgres.integration.test.ts`:
  **48 tests passed**. Existing fixture container was restarted after confirming
  Docker network mode `none`. Each run creates a uniquely named fixture database;
  it never opens `DATABASE_URL`. Coverage includes scheduled eligibility/privacy,
  queue validation before writes, independent batch retries, complete field
  preservation, changed/held/deleted/recreated records, invalid media, expiry
  during verification or row-lock waits, due-slot races, rollback and concurrent
  duplicate applies.
- Scoped ESLint on the ten changed artwork/library/cron/renderer/test files:
  **exit 0**. Scoped `git diff --check`: **exit 0**.
- Operator syntax: `node --check
  /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs`: **exit 0**.
- New offline operator tests first reproduced two real failures: incomplete
  artwork caused 120 simulated media PUTs before failure, and a changed pending
  apply with the same queue UUID was incorrectly replaced. Tests use a local curl
  stub and fictional metadata; no external request or live write is possible.
  The helper was then corrected. Rerunning `node --test
  /workspace/artifacts/ugt-scheduled-art-20261028/operator.offline.test.mjs`
  passed **3/3 tests** (zero failures), including exact seven-batch staging,
  private count-only output, preflight before upload and pending-apply protection.

No full suite/build/deploy was run by this task worker. No production data write,
media upload, publication, financial action or external message was performed.

## Post-deployment operator sequence

First deploy the reviewed Worker containing queue support. Use the configured
Cloudflare identity normally; do not extract Worker secrets or invoke an
unauthenticated cron. Run from any directory:

```sh
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-inspect-all
# Wait for the existing authenticated cron to consume the queue.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-all inspect
# After all 64 derivative pairs have been generated and reviewed:
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs upload-all
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-preview-all
# Wait for cron; inspect its exact private receipts.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-all preview
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-apply-all
# Wait for cron; require every selected target updated/already and zero conflicts.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-all apply
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-verify-all
# Wait for cron; require all exact artwork metadata to match.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-all verify
```

`current-status` prints counts only. `status-all PHASE` binds the queue and every
batch receipt to exact manifest hashes and saves private per-batch files. Commands
return nonzero for stale receipts, expiry, conflicts or missing assets. Stop and
inspect any conflict; regenerate an exact inspection/preview rather than
overwriting a changed record. Manifests expire after six hours; staging TTL is
24 hours. A retry of the same unexpired apply must reuse its saved IDs/content.

Finally run `verify-public N` for each batch 1–7 while those slots are future.
It requires a 404 for each future article and each future hero/OG image URL,
then verifies the stored image bytes through authenticated private KV readback.
Future admin-story artwork remains behind the existing media publication gate.
If a slot has become due, it stops for separate publication verification; a due
slot alone is not evidence of a public release. Public image 200/hash checks
belong only to an independently confirmed public target after the public guarded
flow. This command does not publish an article or alter its schedule.

Offline operator regression command:
`node --test /workspace/artifacts/ugt-scheduled-art-20261028/operator.offline.test.mjs`.

## Cohort aging correction

The historical 64-image inventory is retained for uploads. `stage-inspect-all`
now selects only slots whose saved `scheduled_at` is still future, and writes a
separate `operator-scheduled-cohort.private.json`. Before preview, it partitions
again using the exact private inspection queue and every bound batch receipt.
Only matched identities with exact opaque versions and a still-future unchanged
schedule enter the scheduled preview; due, unmatched or changed identities are
deferred privately. The selected targets are rechunked into max-ten batches.
Thus one aged/unmatched record cannot block its nine matched peers. Inspection
conflicts still return exit 2 for operator attention; the subsequent scheduled
preview contains only eligible matched targets. `upload-all` still validates and
uploads the original commissioned image cohort, including any deferred image.

If 1 of the historical 64 is due, the selected scheduled queue has 63 targets in
six batches of ten and one of three. If a slot becomes due after preview, apply
staging stops before its KV write and requests a fresh inspection/preview of the
remaining future cohort. The server's original scheduled predicate and exact
record guards are unchanged.

Local metadata at this correction showed **0 due slots**, with the earliest saved
slot `2026-10-29T04:23:00.000Z` (07:23 Nairobi). A Nairobi date rollover alone is
not evidence that a story has been published. No live eligibility/publication
claim is made.

A deferred cohort target whose public release is independently confirmed can use
the existing separate public scope. Supply its exact current stored image value
from the existing public/CMS metadata; a due slot alone grants no public access:

```sh
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-public-preview "$ARTWORK_SLUG" "$CURRENT_IMAGE"
# Wait for the existing cron, then save the exact private version receipt.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-public preview "$ARTWORK_SLUG"
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs stage-public-apply "$ARTWORK_SLUG"
# Wait for cron and require one updated/already with zero conflicts.
node /workspace/artifacts/ugt-scheduled-art-20261028/operator.mjs status-public apply "$ARTWORK_SLUG"
```

Public preview/apply requires an exact historical cohort identity and a due saved
slot. Preview still uses the unchanged server public-eligibility predicate; held,
unpublished or mismatched records cannot pass. `stage-public-apply` takes the
opaque full-record version only from its exact private preview receipt, keeps
the same expected image and artwork, and uses the original image-only atomic
public apply path. It cannot publish an article or alter text, approval, dates or
schedules. Complete the scheduled operation before staging the separate public
request so the shared pending key cannot overwrite unfinished work.

Three new offline RED cases reproduced the original aging failures. After the
operator correction, **6/6 offline tests passed**, including exclusion/rechunking
of an aged target, exclusion of one unmatched inspection result without blocking
the other 63, and exact private-version binding for the separate public flow.
Only private operator artifacts and this handoff changed in this correction;
there were no remote calls, Worker changes, build or production writes.

## Future-image privacy verification correction

Independent review found the helper previously expected public 200 responses for
future hero/OG images despite the existing intentional media publication gate.
`verify-public N` now requires **404 for the article and all future artwork URLs**
and proves every uploaded derivative hash using authenticated private KV reads.
It rejects a publicly accessible future image and a changed private stored hash.
No media route or eligibility gate changed. The offline regression first failed
on the original incorrect 200 expectation. The focused rerun, `node --test
--test-name-pattern='future artwork remains'
/workspace/artifacts/ugt-scheduled-art-20261028/operator.offline.test.mjs`,
passed **1/1** (exit 0), exercising valid privacy/readback, public-image exposure
rejection and changed private-byte rejection. This check made no remote calls.
