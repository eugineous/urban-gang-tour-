# Public Instagram → GitHub → Urban Gang Tour

Owner selects GitHub and declines R2. They request a no-Instagram-login downloader for their public account, preserving captions, deduplicating later runs and updating gallery/videos. This supersedes the earlier API/R2 proposal.

## Proven source and boundaries

A fresh logged-out browser can see recent `urban_newsgang` posts. The pinned yt-dlp2026.10.26 public logged-out extractor returned original captions and source media. An owned35.618-second reel was downloaded and its full duration/audio checked with ffprobe. No Instagram password, personal cookies or Meta access token was used. Profile history beyond the public window is not promised; login/private/rate-limit gates stop extraction and are reported. Never use proxy rotation or login bypasses.

Only the exact profile or one of its public post/reel URLs is accepted. Returned metadata must name `urban_newsgang` as its author. Other authors, suggested posts and unverified collaborations are excluded. Preserve original text, timestamps, IDs and complete available carousel children; never substitute a video thumbnail for a video or mark a partial carousel complete.

## Storage and publication

Use the existing public repository `eugineous/urban-gang-tour-`, release tag `instagram-media`. Store hash-named media files and immutable timestamped archive-index checkpoints. Never overwrite a media binary. Replace only the generated `instagram-public.json` public projection after recording a versioned full checkpoint. Pending/adult/hidden entries and arbitrary source fields are excluded from the website projection. All archived GitHub files remain public; hiding something on the site does not make GitHub copies private.

The website's public read endpoint coalesces/caches the fixed GitHub index. First-party streaming routes map known published asset IDs to the fixed repository, validate redirects and byte ranges, and support GET/HEAD/ETag without an open proxy. No R2, database media migration, source-tree video blobs or redeployment is required for later index updates. Existing catalogue/reels consumers share a scoped media provider; existing content remains available if the optional archive fails.

## Operator flow

Add an Instagram panel to the existing admin media library: fixed account link, copy link, counts, last archive update, GitHub run/archive links and explicit publication options. Only the owner can dispatch a job. A fine-grained server-side GitHub Actions token is optional for in-site dispatch; without it the operator uses GitHub's native Run workflow page. This is GitHub write authorization, not Instagram authorization.

An owner-confirmed first run records whether automatic30-minute checks and general-audience publication are enabled. GitHub's normal job token writes the release, and concurrency serializes runs. Scheduled jobs stay idle until enabled; they retain completed IDs and do not redownload completed posts. Unknown/private/gated posts and download/upload failures are reported separately from completion. Jobs and GitHub/CDN scheduling can be delayed; do not promise immediate/unlimited availability. No comments, DMs or other account datasets are archived.

## Limits and verification

Per-file250MiB and per-run1GiB limits protect runner resources; oversize/incomplete media fails explicitly, never truncates. Download MIME signatures, hashes, actual dimensions, audio and durations are checked. URL/redirect allowlists reject arbitrary/private addresses. Account ID/post IDs remain the deduplication keys; changing signed transport URLs is not a new post.

Test parser ownership, captions, dimensions omitted by Instagram, carousel completeness, publication projection, auth/role/origin/rate limits, GitHub rejection vs queued status, range/HEAD/size contracts, redirect denial, and browser catalogue integration. Preserve Paystack, auth, stock, publication holds, all old media and six native public interface languages. Do not call archived/queued/partially imported content published or claim every historical Instagram item was accessible.
