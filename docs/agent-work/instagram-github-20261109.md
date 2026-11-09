# Owned public Instagram and printed-shirt release

Scope: `urban_newsgang` only, GitHub Releases storage (no R2), original captions,
complete carousels, stable-ID deduplication, opted-in scheduled discovery and
approved dynamic gallery/reels publication. No Instagram credentials/cookies.

Hero artwork now has flattened large centre-front monochrome shirt prints,
natural cloth shading and host occlusion, rather than separate DOM watermarks.
It is a reference-based illustration, not a guarantee of pixel-identical raster
logo reproduction. Original masters remain. Menu engagement is page-local and
continuous until clicked, with reduced-motion/focus exceptions.

Verification evidence is retained outside the source tree under
`/workspace/artifacts/ugt-full-audit-20261103/`:

-49focused importer/mobile/menu tests passed; parser, delayed shared reel,
  incomplete carousel and interrupted-public-index regression tests went red→green.
-36language-shell tests passed after narrowing the test's language-context mock
  so it no longer impersonates the new media context.
-Typecheck passed. Focused lint:0errors,17warnings. Whole-project lint retains
 12errors in unchanged Events/OpsDashboard/use-reply-draft code.
-Anonymous public-source proof: reel DaFheilsDlh,35.618005s,720×1280,
 8,807,223bytes with audio, original caption and SHA-256 verified.
-First remote attempt created the `instagram-media` release, but workspace
  uploads were rejected with HTTP401. At this point it has no media/index;
  this is not a completed migration. Native GitHub Actions uses its own job
  token; actual runner results must be checked before claiming operational sync.

Existing full-suite baseline:46failures previously recorded, unrelated to this
scope. Use the final run log and focused reruns for exact results; do not call the
whole suite green. No customer payment, message, order, stock, provider credential
or existing Worker binding is changed by this release.

Operational instructions and limits: [setup](../instagram-github-import.md).

## Released verification

PR128 merged as620f53ddbc0eb063fd8da3687b878d1d7fe6f81d. Worker version
`cb7b5ffd-a717-4b14-9b17-b69e864f6db2` is live with release marker
`chest-menu-20261109-v1`;55bindings and the15-minute cron are unchanged.
Live responsive/menu/motion/cart persistence checks passed after waiting for
actual hydration, not the unrelated completion of all page downloads.

Native Actions run42720069384 imported one complete reel with original caption,
poster and audio. Live shared-link selection,35.618005s/720×1280video metadata,
gallery metadata, HEAD and byte-range playback passed. Run42720467053 failed
full-profile retrieval (`instagram_page_unavailable`); the account is NOT fully
migrated. Run42720827073 imported0duplicates and enabled30-minute archive checks;
future posts remain pending publication review. A double-counted known-link
summary discovered in that run is corrected by a script-only regression patch.

Full run:52failed,2445passed,191skipped. Six language-context mock failures were
corrected and all36shell tests reran green;46known legacy failures remain.
