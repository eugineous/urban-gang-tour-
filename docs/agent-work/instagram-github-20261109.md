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
