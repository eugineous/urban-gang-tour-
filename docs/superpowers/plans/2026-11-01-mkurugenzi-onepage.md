# UGT one-page storefront Implementation Plan

> **For agentic workers:** Use task-scoped independent implementation with focused TDD and one final whole-branch review. Do not restart the old15-block workflow.

**Goal:** Deliver a Mkurugenzi-grounded UGT one-page front door and repair concrete shop checkout friction.
**Architecture:** Compose the existing Site/LiveCommerce/shell. Add no host, provider or ledger replacement. Independent commerce and shell/catalogue tasks integrate into the homepage.
**Tech Stack:** Existing Next.js/React/TypeScript/CSS modules, Neon/OpenNext/Cloudflare.
**Spec:** docs/superpowers/specs/2026-11-01-mkurugenzi-onepage-design.md

## Global Constraints

- UGT-owned media and real public catalogue/posts; no reference brand/media reuse.
- English-first native six languages,44px targets and reduced-motion support.
- PAYSTACK_ENABLED remainsfalse; no provider activation, financial/messages tests,
  private publication/data changes, new dependency or binding/cron changes.
- Current24products are made to order; no invented stock or delivery promises.

## Review Focus

- Missing/failed capability read must never enable a payment submission.
- Disabling a provider must not hide or duplicate an already-saved payment.
- Legacy size without current colour must need explicit variant repair.
- Inline/header/tab cart events must not overwrite or infinitely echo storage.
- Microcards and search remain crawlable, accessible and public-only when feeds
  are empty/stale or a visitor uses a long translated label on a narrow phone.

## Task1: Honest payment choices and repairable synchronized carts

Files: LiveCommerce.tsx, server checkout options/fulfillment route/helper,
lib/client/live-cart.ts if needed, six-language commerce catalogue, focused tests;
RenderedPage.tsx /shop SSR branch only. Do not edit shell/catalogue visual files.

Produces LiveCommerce props `embedded?:boolean`, `initialProducts?:LiveShopProduct[]`
in addition to existing view/eventId. Embedded mode omits duplicate page hero/h1;
initial public products render without an empty startup catalogue.

- [x] Focused tests: unavailable combinations/load failure prevent provider requests;
  missing/stale variant requires repair; saved payment visible; cross-component
  storage event preserves quantity and personalization without echo.
- [x] Implement existing-configuration boolean options, no provider request.
  Guard UI and submit; preserve route/server enforcement and recovery semantics.
- [x] Add explicit current-label cart variation selector and actionable messages.
  Seed supplied public products safely, preserve first-server/client tree.
- [x] GREEN focused client/cart/recovery tests and intercepted browser cases:
  recovery-final.log records42passed; browser-dev/proof.json records3widths.
  Initial broader128focused result is implementer-reported below.

## Task2: Captured storefront shell and catalogue presentation

Files: AppShell.tsx, scoped storefront CSS in the existing navigation.css owner, ShopCatalogueView.tsx/
ShopCatalogue.module.css, shell catalogue as required, new focused tests. Root
adds the global stylesheet import. Do not edit LiveCommerce or its commerce copy.

Consumes existing cart storage/events and canonical routes; use search action
`/shop?q=...`, root anchor `/#explore`, root shop `/#merchandise-catalogue` and
contact `/contact-us`. Preserve existing main navigation destinations and Gallery.

- [x] Focused tests: one shared header, real search action/cart link/count, public
  module microcards and accessible mobile menu; product controls still genuine.
- [x] Implement compact logo/search/account/cart masthead with UGT icons/assets;
  responsive search/menu/actions and image-led module navigation. No fake controls.
- [x] Adapt catalogue density/typography/image cards to captured grid, retaining
  genuine variation/add/stock/personalization controls and all existing states.
- [x] GREEN integrated shell/navigation/module tests: integration-green.log15passed;
  chrome-green.log32passed. Development browser verifies catalogue controls.

## Task3: One-page homepage and final verification/release

Files: Site.tsx Home composition, new OnePageHub component/CSS/locale catalogue,
homepage tests, .21st design decision; root owns all shared integration.

Consumes Task1 LiveCommerce embedded/initialProducts and Task2 header/anchors.
Keep hero data attributes/media controls/CMS copy; keep HomeEvents gates and FAQ.

- [x] RED component tests: real destination microcards, published post titles/
  canonical links, supplied catalogue, empty feeds, no duplicated h1 or YouTube.
- [x] Compose hero→module microcards→live collection→events→published microcards
  →FAQ/contact using scoped styling and owned media. Keep prior detail routes.
- [x] Verify reference and prototype desktop/mobile screenshots plus working
  search/filter/options/cart/menu/checkout unavailable/recovery flows; no livewrites.
- [x] Run one final fullsuite/types/changedlint/Cloudflare build/drybundle/frozen
  browser and fresh independent review. Fix substantive failures with RED/GREEN.
- [x] Combined regression:252files/2221tests passed,12files/180tests gated skips;
  types exit0, changed-file lint0errors/36warnings and OpenNext build complete.
- [x] Local PWA regression and9mocked checkout browser scenarios passed.
- [x] Final desktop input min-height/margin regression, rebuild and frozen
  one-page visual proof; final search measures46px and passes its guard.
- [ ] Normal PR merge, verify tested-tree equality, keep-vars deployment, unchanged
  metadata/cron and live read-only smoke. Record unresolved activation gates.

## Initial record

Final pre-release proof: full-suite-frozen.log2221passed/180gated skips;
types-frozen.log exit0; changedlint0errors/36warnings plus addedtestlint exit0;
cloudflare-build-frozen.log and dry-frozen.log completed. Frozen browser3widths
and5native alternate languages passed,9mocked checkout scenarios passed and
PWA-final passed. Final same-viewport source/frozen screenshots visually checked;
design-qa.md resultpassed. No live financial or customer-message requests.

Baseline is PR112 merge6506577c06b31bada18308ad0e68c4048d3dfde5, isolated linked
worktree, clean tree, previously verified2181suite/25SQL tests. Dependencies are
already installed; no redundant install/baseline fullsuite. Reference source
capture initially caught preloader/animation states; final captures wait actual
preload-remove and settled opacity rather than reproducing loading screens.
Saved Product Design context is absent; optional21stCLI unavailable. Existing
.21st context and captured source are grounding, no invented catalog results.

## Verified implementation and rulings

- Commerce Task1 implementer reported RED21missing behaviors, then128focused tests
  passed. Root review
  then found cross-provider uncertainty:6additional tests observed RED and GREEN
  after submission blocks another provider and key-only recovery reads the ledger
  without allocating a new key or initiating a provider.404retains the attempt.
- Module/story microcards RED5failures/1existingempty pass, then7/7including locale
  completeness. Six real public module links and latest canonical public stories.
- Shell/catalogue RED then15/15; top+bottom menu controls RED thenGREEN. Focus
  returns to the actual opener. Direct contact restored and all routes retained.
- Independent whole-branch review had one important payment guard gap and a cold
  dynamic-import test timeout. Guard fixed above; static test imports remove
  transform time from the per-test assertion deadline. No second review cycle.
- Ruling: one refresh owner for embedded products, not another independent fetch;
  parent stale state withdraws price/sales claims. Cost: an unavailable parent
  feed shows a retry route rather than potentially stale buy controls.
- Ruling: filter known retired p1–p14 and invalid/private/preview records from
  homepage live promotion; all24genuine live records remain (no12-item cap).
- Ruling: consolidate new public chrome into navigation.css, screen-only, rather
  than create competing style owners. Keep documents/private admin unchanged.
- Visual QA found inherited global form column/gap making desktop search too
  tall, and the old fixed-header112px shop offset. Explicit horizontal search
  layout and in-flow shop spacing correct those observed failures.
- Dev browser390/820/1440 passed module/post/cart/search/method-unavailable flows,
  zero pageerrors/overflow/unexpectedwrites. Final frozen build follows below.
- Full regression initial16oldcontract failures were reconciled to the new
  presentation while preserving retirement/publication/stale-data/CMS/FAQ gates.
  Next run2219passed/1screen-scope failure; the scoped screen fix passes19focused
  safety tests. Delivery fullsuite then passed2220tests with180gated skips;
 252testfiles passed/12skipped. Final search CSS rebuild/browser proof remains.

## Documentation checkpoint — final proof pending

- `design-qa.md` records the actual desktop/mobile source/prototype comparison,
  intentional UGT branding/media/font/spacing adaptations and observed dev issues.
- Inspected `home-red.log`/`home-green.log` prove5RED→7GREEN; the six added
  cross-provider cases are RED in `cross-provider-recovery-red.log`, then the
  complete36commerce/6hub cases pass in `recovery-final.log` (42total).
- Inspected development proof reports390/820/1440,6modules/24products, search,
  variant/add/cart persistence and unavailable methods; zero pageerrors/writes.
  Browser APIs are intercepted: saved public catalogue, local story fixtures,
  empty events and unavailable methods. This is workflow proof, not live acceptance.
- Earlier desktop captures retain tall search/old shop spacing. The initial
  frozen run then failed compact search at61px: inherited input min-height50px/
  margin9px. Root is correcting to min-height44px/margin0 with regression/rebuild;
  final frozen visual result remains pending.
- After environment recovery, `full-suite-delivery.log` records2220passed/
  180gated skips; `lint-delivery.log`0errors/36warnings. Root confirms types exit0;
  `cloudflare-build-delivery.log` ends OpenNext build complete. These checks
  precede the final input override, so rebuilt/frozen proof remains unchecked.
- `paystack-browser.log`:9mocked flows passed/0errors/0live requests. `pwa.log`:
  responsive/install/connectivity/language, iOS/storage-denied, worker upgrade,
  cart/form preservation and offline/cache checks passed; simulated503/offline
  resource failures are expected fixtures. No live payment acceptance is implied.
- Normal PR/merge, tested-tree equality, keep-vars deployment, metadata comparison
  and live read-only smoke remain unclaimed until the root records release proof.
- PAYSTACK_ENABLED remainsfalse; configuration booleans do not establish merchant
  approval or signing/channel/settlement/ledger-write readiness. No live finance
  or customer-message tests are authorized by this checklist.
