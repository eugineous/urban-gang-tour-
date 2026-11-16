# Current handover implementation — 16 November 2026

Owner latest: “Continue and then deploy.” Broader request: free-first storage,
usable admin media/Instagram, native file/video workflows, Codex/ChatGPT event
draft upload, professional Book Us copy, denser Jumia-like mobile shop while
preserving identity, navigation/motion, crawlable stories and defensive red team.
Supabase project proposal is DROPPED. No new paid storage or automatic upgrade.

Root /workspace/ugt-main-release-20261012, branch
codex/zero-cost-admin-handover-20261116, base main1ea75c0(PR133 already live).
Accepted commits:2b5ccbb(shop),8e9281f(webhook bounds),35d6b7e(editor tools).
Root has uncommitted media/quota/publication/video/copy/navigation/test changes.
Preserve everything; no user edits intermixed. Root owns integration/deploy.

## Skills and execution rulings

Read current Product Design Audit/index/user-context/framework, Charles Unslop
from requested GitHub (CC-BY attribution retained in prior docs), using-superpowers
and Codex mapping, dispatch-parallel, brainstorming, worktrees, plans, TDD,
Cloudflare runtime and web-perf. Existing /docs/agent-work/english-first/
CONSOLIDATED.md + user explicit fix/deploy override repeated approval rituals.
Relevant user skills work via full skill://user/... packages; old alias may fail.
Product Design shared critical-overrides resource unavailable; no workflow halt.
Product preflight script was read and stored in functions store(pd_preflight),
not yet written/run. Root fresh capture still needed; shop agent captured live
before and snapshot-local after, inspected those files.

## Agent bundles (all currently FAILED due model usage cap; not still writing)

- dense_shop_handover: worktree /workspace/ugt-dense-shop-20261116. Root committed
  01d9aae and cherry-picked2b5ccbb. Two-column phones, compact collection strip,
  desktop5columns.43focused tests/4files passed; real24card captures at
  /tmp/ugt-dense-shop-evidence. Grid320 y2035/17562px tall →975/6480;
  390 y2209/19584→963/6902;44px controls, no overflow/errors/writes. Cached21st
  CLI available but search authblocked; local review34info findings, no fixes.
- editor_tools_handover: /workspace/ugt-editor-integration-20261116. Root committed
  46c8e76 and cherry-picked35d6b7e.19files663lines: owner Connected tools tab/tile,
  hashed expiring scopes poster:upload/event:draft, no publish/money/account rights,
  key-row lock serializes revoke,6/min30/day, idempotent event draft with empty
  tiers, poster ownership. Management /api/admin/connected-tools GET/POST/DELETE;
  /api/editor-tools/posters,drafts,openapi; /guides/connected-tools, CLI
  scripts/editor-tools.mjs. API.md/.gitignore changes integrated. Root reviewed
  core175lines/routes. Actual22focused cases including2realPG passed; root added
  concurrency fixture(second test) and independent beforeEach reset. Rerun after
  hook change. ChatGPT Actions draft text/preuploaded same-key posterId supported;
  attachment download intentionally NOT supported (no URL fetch). Codex CLI uploads
  actual image. Do not pretend app is automatically connected or create live key.
- defensive_redteam_handover: /workspace/ugt-webhook-bounds-20261116. Root committed
  5aa113c/cherry8e9281f. Actual declared/stream1MiB webhook bound,5s deadline,
  check malformed signatures before reading, exact raw Buffer retained.54focused
  tests passed. Full route matrix199modules(75pages/124handlers),160focused proof,
  7base exploit cases in /workspace/artifacts/ugt-handover-20261116/security-*.
- cost_seo_handover: /workspace/ugt-news-archive-20261116 CLEAN, no SEO code written
  before usage cap. Evidence artifact cost-discovery-evidence.md. Resume sameagent
  after quota reset if useful; root can implement below. No duplicate implementer.

## Root implemented with RED/GREEN

- lib/server/media-budget.ts: persistent Postgres500MiB native storage budget,
 100KV upload writes/rolling24h, serialize under advisory lock74111620. Bootstrap
 KV inventory ONCE, count known byte metadata and conservatively25MiB for unknown
 control records, no customer file content read. Reserve before KV put, unknown
 outcome kept reserved, immutable stored retry skips rewrite; release only after
 confirmed deletion. Bulk unnest seed.6real network-nonePG cases passed twice,
 newest media-budget-bulk-green.log. No automatic paid upgrade.
- media.ts wraps mediaPut/mediaDel with above; mediaStorageStatus() returns private
 aggregate. MP4 permitted ONLYgallery prefix up to existing15MiB cap. mediaGet
 still serves existing images/PDF. Media-storage fixture mocks quota boundary;
 separate storage-order tests prove reserve→put→commit and failure retention.
- Streamed image uploads repaired: gallery/docs hero/organizer use upload-body.ts
 built on bounded raw helper, byte signatures, declared/actual cap, finite deadline;
 gallery/docs rate20/min and organizer strictOrigin.6new security tests pass.
- /media route protects admin-events/products/campaigns until actual publication
 through upload-publication.ts; correct event statuses/partner details, active
 product image/photos, exact existing publicCampaigns visibility. Auth staff own
 module gets private/no-store. Existing gallery/story/org/document guards remain.
 Single byte ranges206/416 and ?download=1 attachment added.10delivery tests pass.
- Native media videos: gallery_photos.media_type additive(defaultphotograph),
 read/registration/library projection supports video/youtube. Canonical YouTube
 parser lib/managed-video.ts never fetches input URLs, rejects external/userinfo.
 POST gallery kind video.link requires rights/caption, saves privately; nativeMP4
 serverinfers type. Gallery uploader now accepts8MiBphotos/15MiBMP4 and reads
 clientmetadata; unchanged upload progress/private review/version semantics.
- MediaDesk now Media library with video previews/download originals, Instagram
 collapsed rather than dominating. MediaAdditions has private budget status and
 YouTube link form. New /api/admin/media-budget GET verified gallery admin only.
- PublishedGallery splits genuine approved videos into ManagedFilms: nativeMP4
 controls preloadnone; YouTube iframe ONLY after visitor click, no thirdparty
 initial request. Six-language labels.15related tests pass published-video-green.
- Book Us labels changed ContactEntry(all6languages), BookingInvitation, apply
 metadata, MobileAppHeroen, legacy Swahili correction. Names remain in biographies.
- BackToTop component+CSS added/wired public AppShell(noncritical only),44+px,
 reducedmotion and mainfocus. Media navlabel Gallery→Media, underlyingtab/perms
 unchanged. Shop image hover/touch transform subtle/reducedmotion added after
 accepted agentCSS. Need rendered proof and existingtests adjustments if oldcopy.
- SharedRateGuard editor-tools30/min before generic strictpublic-write added.
- DOMPurify transitive jsPDF advisory patched via override3.4.18, npm install
 ignore-scripts changed1package. Fresh npm audit --omit=dev:0 vulnerabilities.

## Facts from cost/discovery audit

- Current CF docs Sep4 2026 removed gzip bundle limits:64MiB UNCOMPRESSED Free/Paid.
 Do NOT rewrite PDF or claim4.24MiBgzip forces paid. Runtime CPU freecompat NOT
 proven:3397requests/day,95errors, P50=9.987ms/P99=649.414ms (Nov15–16 sample).
- Zone plan Free$0. Account invoices historically$5/$4.84, not attributable to UGT.
 Do not cancel shared plans or claim all billing$0. No new paid resources made.
- KV164mediafiles86,809,306bytes +7control records without metadata. ExistingGitHub
 release5assets9.26MB working. Nativequota conservatively budgets unknown records.
- Google Search Console connected but Windsor Free blocks reads(15accounts/1free
 allowance). No ranking metrics; no upgrades/disconnections. Native /api/admin/
 search-console exists, shell has no Google serviceaccount or NeonDB credentials.
- Sitemaps226URLs incl138stories correct; latest3samples selfcanonical/BlogPosting,
 missingstory404/noindex, privatepagesnoindex. Concrete defect: blog12links + JS
 Morebutton with no crawlable page URLs. Need SSR archive pagination.

## Immediate remaining work

1. Fix current TS issue published-gallery mediaType widening (explicit union).
2. Finish Instagram admin clarity/downloads for existing approved index and honest
 missing direct-dispatch state; don't fake public scrape availability. Existing
 public GitHub schedule/source integration preserved. Native upload/link fallback
 now actual. Add overflow styles/video error states and quota messages to queue.
3. Implement SSR blog pagination: NewsroomIndex currently useUrlFilters q/category,
 state limit12 clientloadmore. Pass optional newsArchive through Site/HostedSite
 from /blog; hook optional initialvalues to keep real defaults, or include page in
 filters initialized server-side. New archive mode realprev/nextanchors, preserve
 filters/resetpage when changed; legacy callers cankeep existingmore. Shared
 helper categorymatching/search/strictpage parsing; servercompute count and404
 only when feedcurrent and truly outofrange; canonical pageURLs, searchnoindex,
 structured data matches visiblepage. Read installed Next page docs for awaited
 searchParams before editing. Site.tsx Props + function one longline: use Node
 read exactline→apply_patch inside functions without printing wholeline to model.
4. Write actual short owner handover/cost/security test report, API contract/root
 AGENTS latest directive, scope all claimed tests honestly. Fresh browser before/
 after root public+fixtureadmin, meaningful MP4/YouTube/private/budget/caption
 flows, touch/backtotop/navigation. No productionpositive admin/financialwrites.
5. One final wholebranch securityreview (try gpt-6-astra per requestingreviewskill,
 no extraimplementers). Agents6.1-sol hitusage cap around11:37UTC, says3:25PM
 (likely12:25UTC Nairobi). Root continued inline; don't idle45min waiting.
6. ONE combinedfullsuite/types/scopedlint/build/dryrun; fix realfailures targeted.
 Normal PR merge/attach/keep-vars deploy + live readonlychecks55bindings/cron.
 Rootpreviousbuild outputs ignored; disk~1.2GB free AFTER removing ONLYown ignored
 .next/cache/webpack614MB. Can remove own .open-next/standalone before new build,
 not node_modules(symlinked bywriters) or any user/otherworktree/artifacts.

Current logs/artifacts under /workspace/artifacts/ugt-handover-20261116. Parent
artifact folderprior /workspace/artifacts/ugt-full-audit-20261103 has reusable
release-settings.mjs and guest-ticket-pages.mjs (must update marker before reuse).
Production still version07b8ad37-5ce1-447b-b0f7-75d491428c85 marker
account-ticket-reliability-20261112-v1 from PR133. Newtask not released yet.
Current autoCFbuild still fails deleted/rolled buildtoken; CLIdeployment works.
Never claim “allfreeforever”, “unhackable”, Google ranking, allInstagram coverage,
or productionticket launch. No live key/event/account/message/payment tests.
