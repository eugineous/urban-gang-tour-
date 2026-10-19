# Issue #81 — actual integration status

Source: https://github.com/eugineous/urban-gang-tour-/issues/81, fetched 19 October.
Use the existing posts/Control Room workflow. No duplicate CMS, social broadcast,
automatic paid model provisioning or invented reporting.

## Initial archive discovery (before the owner's Drive handoff)

The requested `URBAN_NEWS_OCT_DEC_2026_EDITORIAL_CODEX_PACK.zip` is not in this
workspace's ZIP inventory or main-branch tree. GitHub code search for its exact
name returned no matches; the editorial branch search returned no branches.
Issue #81 is the only issue search result mentioning the filename, has zero
comments, and explicitly says the ZIP was not uploaded by creating the issue.
The ChatGPT/Codex chat-history listing tool did not acknowledge the request;
this is not proof that the originating chat or ZIP does not exist.

Do not claim the ten draft articles, 63 briefs, 73 art prompts, exact CSV/JSON
schedule or batch files have been imported. Titles in the issue are not full
articles. The date window contains 73 days, but varied times are not available.

## Safe foundation in this release

- Correct RSS's fabricated 06:00 UTC for legacy day-only publication dates.
  Protocols requiring an instant derive Nairobi midnight, explicitly day-precision
  fallback, not a newly claimed historical publication time. Future ISO instants
  are preserved as instants instead of appending a second time component.
- Correct RSS image URLs when the stored image is already absolute.
- Apply Nairobi-derived publication instants to the 48-hour news freshness check.
- Use actual updated_at for article dateModified when available, not datePublished.
- Strict Nairobi wall-time conversion utility: 20 October 06:07 EAT = 03:07 UTC.
- Calendar-date utility enumerates 73 dates without pretending they are imported
  article assignments or confirmed release times. No calendar was seeded into
  production, no post body/image/status was changed, and no cron was reconfigured.

## Required before autonomous website publication

1. Obtain the actual archive/accessible asset link; inspect its full directive,
   source audit and schedule. Validate ZIP paths, expansion limits and file types
   before extraction. Fingerprint each item for duplicate-safe imports.
2. Audit the existing 109-ish stories using actual current inventory rather than
   assuming an exact count from the issue. Verify founding/reach claims against
   records; do not repeat 2019/2024, 50+ schools or 100k+ students as settled facts.
3. Add nullable scheduled_at/published_at TIMESTAMPTZ and metadata in a tested,
   backward-compatible migration. Keep legacy records and true history intact.
4. One approval/due/source/rights predicate across all public surfaces; test
   cache invalidation and logged-out direct URLs before enabling publication.
   Current date-only publication remains in place until that complete migration.
5. Import ten **unpublished drafts**, 63 **research briefs**, source/author/rights
   manifests and the exact 73-row schedule. Briefs cannot pass the article gate.
6. Build independent approval/audit, idempotent publish/rollback, hold-on-failure,
   and monitoring around the existing CMS. Do not infer approval from a timer.
7. Produce per-item authorized responsive/OG art with attribution and accurate
   alt/caption. Synthetic illustrations must not impersonate documentary photos.
8. Only run background research/writing with explicitly configured credentials,
   provider and spend cap. A recurring ChatGPT reminder is not the website engine.
9. Execute Issue81's real-DB, timing, feed/sitemap, cache, downtime and rollback
   tests. Verify the first approved live post after its actual due instant.

## Drive handoff received later on 19 October

The owner supplied a private Drive library and intact ZIP. Authenticated Drive
metadata and raw-file retrieval succeeded for file
`1O5DShpSy6eiZgBBntxzve2KhsuMiLBbi` (2,610,723 bytes). Issue #81 now has a
handoff comment with exact locations. The initial missing-file finding above is
historical, not a current access blocker. Inspect and integrate privately in the
next feature branch; do not commit unpublished manuscripts to this public repo.

This release does not claim Issue81 is finished or that automatic live publishing
is deployed. The separate 06:00 EAT recurring task was not created or modified.
