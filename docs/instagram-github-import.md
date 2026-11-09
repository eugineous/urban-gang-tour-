# Instagram import: GitHub storage, no Instagram login

Open **Admin → Gallery → Instagram → website**. Only `urban_newsgang` is supported.

1. Open **Open importer in GitHub**, then **Run workflow**. The profile URL is prefilled; an owned public post/reel URL can also be used.
2. Confirm that the content may be republished on the site, including music. Instagram music licences do not necessarily cover a separate website.
3. Choose whether this is a general-audience batch for publication and whether future30-minute checks should run. Without publication confirmation, files are archived but not added to the website.
4. Watch the actual GitHub run summary for imported/skipped/failed counts. Completed post IDs are retained. The Gallery status refresh shows the public archive update, not a fabricated upload receipt.

Files live in the existing public repository's **instagram-media** release, not R2 or large Git commits. Every binary is hash-named; captions and metadata have versioned archive-index checkpoints. Only `instagram-public.json` is replaced. Website gallery/reels consume that approved public index dynamically, so subsequent media does not require a new site build. Hiding media on the website does not make public GitHub archives private.

Scheduled jobs read the latest durable checkpoint, not the replaceable public index, for the owner's opt-in. An interrupted public-index replacement is repaired before another Instagram crawl. No-new checks still update the public check time; retrieval failures are reported rather than presented as success. A carousel is only completed when its advertised child count is present and no next page remains. Shared imported-video links wait for the catalogue rather than opening a different clip.

## Optional direct dispatch from the admin form

The native GitHub workflow works without any Instagram or server-side GitHub token. For the in-site **Import / sync new posts** button, an owner may install `GITHUB_INSTAGRAM_TOKEN` as a server-only fine-grained token restricted to this repository with Actions read/write. Do not paste tokens in chat or use a broad personal token. The endpoint is owner-only, checks origin/rate/input and returns **queued**, not **completed**.

GitHub Actions uses its normal short-lived job token with contents-write permission. The workflow and repository must have Actions enabled. No Meta access token, Instagram password, cookie file or browser-session import is accepted. The pinned public extractor uses only data exposed to logged-out visitors and refuses another author.

## Honest limits

- A public profile may expose only a recent window. Deleted, private, login-gated or older posts are not silently recovered. Publicly visible links do not guarantee that every media file will remain downloadable.
- Other authors and unverified collaborations are excluded, even when suggested alongside the profile.
- Unavailable, oversize, incomplete and rate-limited items are reported. Files are not shortened or replaced by thumbnails to claim success.
- Each file is capped at250MiB, each run at1GiB, and one run processes at most12 newly visible posts. These are runner safety limits, not a claim that GitHub is unlimited video storage/CDN service.
- GitHub scheduling, inactivity controls, service limits and CDN propagation can delay updates. Check the actual Actions run if the latest status is stale or failed.
- The archive imports original captions for later grouping. It does not infer event dates, enable ticket sales, generate endorsements or post back to Instagram.

Extractor dependency: yt-dlp2026.10.26, Unlicense, https://github.com/yt-dlp/yt-dlp. FFprobe validates downloaded media. Do not enable logins, impersonation, hidden cookies or provider-access bypasses when updating it.
