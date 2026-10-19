# Existing newsroom: private library and timed release

## Source handling

Authenticated Google Drive retrieved the owner's 2,610,723-byte ZIP on 19 October
2026. SHA-256: `ec32d6f2f37451e64c5f65edf6e8db91729a295948db13827d713292a1e89971`.
Validated 161 paths, symlinks, types and expansion bounds before private
extraction (2,933,667 uncompressed bytes). Main agent read README, full directive
and research memo. Verified 73 schedule records, ten article drafts, 63 research
assignments and 73 art prompts. The contact sheet is not usable publication art.
No archive, manuscript, brief or private import JSON belongs in this public repo.

`scripts/prepare-editorial-import.mjs` converts an already validated private
extraction to bounded JSON outside this repository, mode 0600, no overwrite.
It does not access the network, execute document instructions or publish.

## Architecture

No second CMS or post store. Additive metadata lives on existing `posts`.
`editorial_audit` stores operations, not copies of manuscripts; monitor stores
the last successful scheduler check. Legacy records remain unmanaged and retain
their true day-level history. No historical author, content or media is replaced.
Existing private story uploads are reused; new media URLs are not public until
their approved article is due. Rights/source records are never returned by public
feeds. A timed predicate protects previews, leaf routes, JSON-LD, RSS, sitemaps,
homepage/news cards, public API and original image/OG access. The outer Worker
checks that public feed before a leaf response starts; metadata alone could not
prevent Next's root loading boundary from emitting a soft 404 in the real adapter.

The existing Stories module gains an editorial calendar, import preview, saved
draft editing, explicit source/rights checklist, approval and hold controls.
Imported items are excluded from the date-only legacy editor to avoid bypassing
release checks. Slot uniqueness applies only to this editorial series, not other
news; the importer reports collisions instead of overwriting anything.

Current release is deterministic infrastructure. It does **not** independently
verify legal or factual assertions, generate art, research 63 articles, or provide
a configured paid model runtime. Owner attestation is recorded, not invented as
an automatic pass. Missing evidence/media keeps every unready item private.
No agent credential or backdoor was created.

## Timing and resilience

20 October 06:07 EAT becomes 03:07 UTC. Source schedules are validated against
Nairobi calendar dates and stored as TIMESTAMPTZ. Due comparisons use database
UTC instants, never browser locale or database CURRENT_DATE. Approved future
articles become eligible at the saved instant; one-second coalescing may delay
visibility/removal by up to one second. On database refresh failure, public
article reads fail closed rather than retain a retracted approval snapshot.
The quarter-hour cron records the state transition/heartbeat, not the release
clock. It retains existing operational jobs and all dashboard trigger settings.

Late approval is dated at actual approval, not the missed slot. Holds are
reversible only through a new explicit review. Already released manuscripts
cannot be rewritten through the prepublication editor; a full historical
correction/retraction editing workflow remains future work.

## Migration and rollback

Schema bootstrap runs only on authenticated editorial/cron work. Public SQL
uses compatibility-safe row JSON access while the columns are absent. Additive
columns/defaults/indexes and monitoring tables do not update legacy stories.
No automated destructive down migration is appropriate.

**Do not roll back to a pre-gateway Worker after importing managed rows** without
first setting `published=false` for all `editorial_managed` rows, using an
authorized backend operation. The old date-only reader does not know the gate.
Keep managed rows private, retain columns/audits/private staged source, and roll
forward a tested fix. A normal hold does not delete content, history or artwork.

## Evidence and remaining boundaries

Tests include actual isolated network-none PostgreSQL, strict input/auth/CSRF/
limits, repeat imports, private briefs, UTC boundary, invalidated approvals,
images, holds, cron failure monitoring and legacy compatibility. Build/test/live
release results are recorded in the task's external artifacts, not manuscripts.
Browser/device automation was not available; source layout and HTTP fixtures are
not claimed as Android/iOS/foldable visual or screen-reader verification.

The owner must not be told that 73 articles are complete or that daily autonomous
reporting is running. These are ten drafts requiring fact checks and original
individual art, plus 63 assignments requiring full reporting and drafting. A
configured generation provider, cost cap and evidence policy are still needed
for ongoing machine research. Google/SEO indexing and international availability
cannot be guaranteed by a deployment.
