# Urban News implementation plan

> For agentic workers: use isolated parallel implementers for Tasks1and2; root
> implements the dependent interfaces and integrates/reviews the combined result.

**Goal:** A working entertainment newsroom and news/events/shop front door.
**Architecture:** A private revisioned news lane publishes approved snapshots into
the existing posts read path, selected by URBAN_NEWS_ENABLED. Fixed-origin provider
adapters use separately encrypted credentials and durable dispatch budgets.
**Stack:** Existing Next16.4.6/React/Neon/Cloudflare, TypeScript, Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-17-urban-news-platform-design.md

## Global constraints

Preserve records, prices, Paystack/guest/launch/consent controls and old manuscripts.
Urban Gang Tour/Urban News, magenta, six-language public navigation. No paid service,
model calls/live data writes as tests, social dispatch, invented stories or ranks.
Keep /blog canonicals; old public content is privately archived only in news mode.
Only exact checked revisions publish. Installing credentials never enables jobs.

## Review focus

1. A private correction or failed generation must not replace the live revision.
2. Old admin/social/cron routes cannot mutate or broadcast the new lane.
3. Response loss/concurrent jobs cannot spend a provider budget twice.
4. An archive, held story or private evidence must never leak in HTML/feed/media.
5. Provider errors, malformed text and missing keys must produce usable honest UI.

## Task1 — Store, editorial policy and public projection

Owner files: lib/shared/urban-news.ts; lib/server/urban-news-store.ts;
lib/server/urban-news-policy.ts; lib/server/urban-news-mode.ts;
lib/server/editorial-publication.ts; app/_lib/blog.ts; public-query consumers,
generic story mutation/social exclusions and scoped tests. No provider/admin UI edits.

Interfaces consumed: shared types in lib/shared/urban-news.ts.
Produce async functions:

```ts
getUrbanNewsOverview(cursor?:string):Promise<UrbanNewsOverview>
getUrbanNewsItem(id:string):Promise<UrbanNewsItem|null>
createUrbanNewsCandidate(input:DiscoveredNews,actor:string,requestId:string):Promise<UrbanNewsItem>
saveUrbanNewsDraft(id:string,expectedRevision:number,draft:UrbanNewsDraft,actor:string):Promise<UrbanNewsItem>
publishUrbanNews(input:NewsPublication,actor:string):Promise<UrbanNewsItem>
holdUrbanNews(id:string,expectedRevision:number,reason:string,actor:string):Promise<UrbanNewsItem>
retractUrbanNews(id:string,expectedRevision:number,reason:string,actor:string):Promise<UrbanNewsItem>
ingestUrbanNewsCandidates(items:DiscoveredNews[],runId:string):Promise<{added:number;duplicates:number}>
releaseApprovedUrbanNews(limit?:number):Promise<{released:number;slugs:string[]}>
```

- [ ] Write failing policy/SQL tests for source/hash/revision guards, private
  corrections, response replay, public new-lane filtering and legacy preservation.
- [ ] Run focused tests plus opt-in UGT_URBAN_NEWS_PG_FIXTURE=1 using the existing
  network-none DisposablePostgres helper. Record RED before implementation.
- [ ] Implement additive schema, bounded keyset lists and atomic CAS/publication
  transactions. New posts carry urban_news_id and public-only payload; managed=false
  avoids the old daily-slot index. Exclude the marker from legacy eligibility,
  generic saves/history/trash and every social claim/scan path.
- [ ] Provide dynamic public predicate/projection getters so runtime mode is read
  per request. BlogPost includes optional public sources/verification/correction.
  Private excerpts never appear in any public select. Public reads retain coalescing
  and fail closed without stale publication fallback.
- [ ] Prove parallel edit/publish/retraction and failed correction preserve the
  correct live snapshot; old rows/keys and source-independent roles are preserved.
- [ ] Run focused SQL/unit tests, types and scoped lint. Commit only owned files.

## Task2 — Provider credentials, jobs and automation

Owner files: lib/server/urban-news-secrets.ts; urban-news-providers.ts;
urban-news-automation.ts; protected /api/internal/cron/urban-news route; scoped tests.
Do not edit worker-runtime, public projection or the store implementation.
Consume Task1interfaces and shared types. Produce:

```ts
getUrbanNewsProviderStatus():Promise<NewsProviderReadiness>
saveUrbanNewsProviderKey(provider:NewsProvider,key:string,actor:string):Promise<void>
deleteUrbanNewsProviderKey(provider:NewsProvider,actor:string):Promise<void>
getUrbanNewsConfig():Promise<UrbanNewsConfig>
saveUrbanNewsConfig(value:UrbanNewsConfig,actor:string):Promise<UrbanNewsConfig>
discoverUrbanNews(requestId:string,actor:string):Promise<NewsJobResult>
generateUrbanNewsDraft(id:string,expectedRevision:number,requestId:string,actor:string):Promise<NewsJobResult>
runUrbanNewsAutomation():Promise<NewsJobResult>
```

- [ ] Write failing tests for encrypted-only credentials, no-key/terms-disabled
  operation, exact fixed origins, body deadlines, prompt injection and wrong IDs.
- [ ] Prove real SQL daily-budget/one-send claim races before implementing jobs.
  Reserve before dispatch; unknown dispatched outcomes consume a slot and cannot
  be reclaimed by lease expiry. Prepared jobs may resume without double spend.
- [ ] Implement bounded GDELT metadata discovery/dedup and private structured
  Gemini/OpenAI drafting. No Search Grounding, tools or arbitrary provider URLs.
  Unsupported facts/finish states become a held draft or bounded failure, never
  approval. Persist only bounded errors and usage metadata without source/key logs.
- [ ] Add strict config/credential handling in dedicated encrypted storage derived
  from SESSION_SECRET. Default discovery/drafting off and budget2drafts/96discovery
  daily. Model/provider/terms are explicit; key installation alone changes no flags.
- [ ] Implement cron secret authentication and bounded job lease/heartbeat; use
  releaseApprovedUrbanNews for unchanged due approvals only. No social calls.
- [ ] Run focused SQL/fixture provider tests, types and lint; commit owned files.

## Task3 — Admin, homepage, navigation and article/SEO experience

Root owns /api/admin/urban-news, provider endpoints orchestration, UrbanNewsDesk,
AdminApp integration, homepage/news index/article/source panels, navigation, public
policy, sitemap/feed/JSON-LD integration and worker scheduled job entry.

- [ ] Add failing API/browser cases for role/Origin/stream limits, bad commands,
  key redaction, revision conflicts, missing providers and source review state.
- [ ] Reuse content permission for editing/draft requests; restrict provider
  configuration/publication/retraction to super-admin. Dispatch the exact shared
  functions; reject unexpected fields. The Newsroom pitches desk stays distinct.
- [ ] Implement inbox, editor/evidence, review, corrections, scheduled/live and
  setup/status panels with stable loading and explicit saved/unsaved/error state.
- [ ] Rework home/news surfaces around news/events/shop, actual records and owned
  assets. Preserve existing shop UI, hosts and guest tickets. Mobile adds News and
  moves My tickets to a prominent header action; Home remains central.
- [ ] Render public source, verification, AI disclosure and corrections; use actual
  NewsArticle dates/canonicals and optional licensed imagery. Keep SEO/edge/feed/
  media eligibility shared. Add the cron job without replacing existing jobs.
- [ ] Run source-grounded UI review and actual browser cases at320/390/1440px,
  six-language navigation, keyboard/reduced motion, empty/error/current states.

## Task4 — Development, integration and release

- [ ] Provide a local doctor/smoke command and example configuration without
  credentials. Test npm dev on loopback, honest no-DB/provider readiness, admin
  auth boundaries and failure/retry. Never introduce a production dev-auth bypass.
- [ ] Inspect/cherry-pick actual writer commits. Verify no paid/social/account/
  money changes. Update API/operator setup and .21st decisions from final UI.
- [ ] Independent whole-branch review; resolve substantive findings. One combined
  suite, opted-in real SQL, types/lint, dependency audit, production build/dryrun
  and frozen browser checks; repeat only affected checks after justified fixes.
- [ ] Normal PR/attach/exact-head merge and keep-vars deploy. Preserve existing
  bindings/cron; explicitly add only URBAN_NEWS_ENABLED nonsecret cutover flag.
  Verify live mode, legacy article withdrawal, new public eligibility, secret/admin
  boundaries, commerce and no unexpected crossposting. Report credential and
  source-availability dependencies honestly; no live model/publication tests.
