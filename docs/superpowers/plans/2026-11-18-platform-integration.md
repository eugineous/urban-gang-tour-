# Urban News Integration Implementation Plan

> **For agentic workers:** Use executing-plans inline. Preserve the ledger and
> perform one independent whole-branch review. Existing owner authorization permits
> execution without repeated spec/plan approval prompts.

**Goal:** Restore the media-led UGT identity inside Urban News and deliver an
explicit Kenya-first, guest-friendly and account-safe reading experience.
**Architecture:** Extend existing public eligibility, media catalogue, auth,
PostgreSQL and language/consent primitives. Client preferences never personalize
shared server HTML; server account sync is separate, authenticated and versioned.
**Tech Stack:** Next16.4.6/React19.3.1/TypeScript/Neon/Cloudflare/Vitest/Chromium.
**Spec:** docs/superpowers/specs/2026-11-18-platform-integration-design.md

## Global constraints

Preserve branding, official logo/assets, `/blog` canonicals, old private archives,
guest tickets, Paystack-only commerce, existing customer IDs/prices/flags/bindings/
cron. No live charges/STKs/messages/accounts, secrets/billing changes or paid
services as tests. No unapproved publication, fabricated media/trends or ranking
guarantees. Keep six interface languages,44px controls and reduced motion.

## Review focus

1. Cookie panel intercepts bottom navigation on a fresh/short/wide-layout phone.
2. Blocked storage or session expiry must not pretend a preference save succeeded.
3. Device/account preferences and admin market preview must not silently overwrite
   one another or leak into shared server caches.
4. Ranking/search/media consume only eligible public records and truthful metadata.
5. Media restoration retains captions, lazy loading, explicit control and commerce.

### Task1: Audit and repair mobile interruption

Files:docs/audit/2026-11-18-platform-integration/*;
app/_components/PrivacyChoices.module.css;
__tests__/private-consent-browser.test.ts.
Interfaces:consume existing CookieConsent/AppShell/dock; preserve all consent APIs.

- [x] Finish route/media/SEO/payment/test and live audit records. Save screenshots
  and the real click-interception error; no private database dump.
- [x] Add Chromium case opening a public news-mode page with an undecided cookie
  panel, then tap the dock’s News link. Assert reachable destination, no consent
  write and no reporting. Include320/390px and short/wide-layout cases.
  Run `npx vitest run __tests__/private-consent-browser.test.ts`; observe RED.
- [x] Reserve the visible dock’s clearance in the cookie-card CSS only in mobile
  modes. Keep card buttons/close usable and its viewport height bounded.
  Re-run the same file; expect GREEN. Commit the audit and focused fix.

### Task2: Country preferences, deterministic ranking and private persistence

Create lib/shared/news-preferences.ts;lib/shared/news-ranking.ts;
lib/client/news-preferences.ts;lib/server/news-preferences.ts;
app/api/account/news-preferences/route.ts;
__tests__/news-preferences.test.ts;__tests__/news-preferences-api.test.ts;
__tests__/news-preferences-postgres.integration.test.ts.

Produces:
`NewsPreferences={homeMarket:string,followedMarkets:string[],topics:NewsCategory[],language:InterfaceLocale}`;
`DEFAULT_NEWS_PREFERENCES`(KE,[],[],en);
`parseNewsPreferences(value):NewsPreferences|null`(exact keys/registered markets/
max5followed/max7topics/known language/dedup);
`rankPublicNews<T>(items:T[],prefs,now):{item:T,reasons:string[]}[]`;
`createNewsPreferenceStore({storage,events})` with subscribe/getSnapshot/
getServerSnapshot/start/stop/set/reset;
`readNewsPreferences(userId)` and `saveNewsPreferences(userId,expectedVersion,prefs)`
return `{preferences,version}`. Conflicts throw `news_preferences_conflict`.

- [x] Write failing default/invalid/dedup/blocked-storage/cross-tab/ranking tests.
  Cover empty coverage, stable ties, public-only inputs and country/topic diversity.
  Run `npx vitest run __tests__/news-preferences.test.ts`; expect RED.
- [x] Implement shared validation, stable explicit-input ranking and the existing
  useSyncExternalStore-compatible storage pattern. No analytics/fingerprints.
  Run the same tests; expect GREEN.
- [x] Write failing authenticated API/private-cache/strict-Origin/stream-limit/
  invalid-body/session-expiry tests and disposable SQL ownership/CAS cases.
  GET returns only the validated buyer’s record; PUT accepts only expectedVersion
  and preferences. Use the existing readJsonObject and shared rate limiter.
- [x] Implement additive user-keyed JSON/version table with FK, bounded input and
  atomic INSERT/UPDATE expected-version matching. Run API tests plus opted-in
  `UGT_NEWS_PREFERENCES_PG_FIXTURE=1` network-none PostgreSQL; expect GREEN. Commit.

### Task3: Guest controls, personal edition and isolated admin preview

Create ui/components/NewsPreferences.tsx;ui/components/NewsPreferences.module.css;
ui/i18n/catalogues/reading.ts;app/news-preferences/page.tsx;app/for-you/page.tsx;
app/admin/NewsMarketPreview.tsx. Modify UrbanNews.tsx,UrbanNewsDesk.tsx and account
preferences page. Add __tests__/news-preferences-browser.test.ts.
Consumes Task2 contracts and existing LanguageProvider, NewsCards and public feed.

- [x] Write real Chromium cases for guest device saves/reset, blocked storage,
  optional account load/save/conflict/session-expiry, language independence,
  personalized explanations and admin preview never writing storage. Observe RED.
- [x] Implement labelled controls with explicit device/account persistence status,
  no login gate, independent interface language and retained typed choices on409.
  Add generic server-rendered Kenya-first `/for-you` with noindex and client-only
  preference application; Latest archive keeps its current explicit filters.
- [x] Add admin preview with local state/defaultKE and public summaries only.
  Run browser/shared/API cases; expect GREEN. Commit.

### Task4: Restore founder/video discovery and real Watch destination

Create ui/components/UrbanMedia.tsx;ui/components/UrbanMedia.module.css;
app/watch/page.tsx. Modify UrbanNews home and news-mode header/menu links, using
existing M230/M228 portraits and49catalogue films filtered to non-adult footage.
Add __tests__/urban-media.test.ts and browser coverage.

- [x] Write RED assertions for founder photo links, film controls, real Watch route,
  no adult assets, keyboard/mute/caption/error behavior and Data Saver/reduced motion.
- [x] Add compact genuine host identity near the news header, original films after
  the initial reporting, event/shop/booking paths and a filterable Watch catalogue.
  Reuse existing MediaFilm/MediaImage controls; no duplicate video downloads or
  autoplay without its existing permission/visibility/media-setting controls.
- [x] Run media and existing mobile/video/caption/consent browser regressions at
  320/360/390/430/768/1440 and980coarse fallback. Expect GREEN. Commit.

### Task5: Shared search and clear commercial discovery

Create lib/shared/site-search.ts;app/search/page.tsx; scoped search tests.
Modify public header/menu/home search links only. Consume existing approved news,
public event/product readers, genuine founder records and non-adult media catalogue.

- [x] Write RED tests for query length/normalization, dedup/caps, actual destinations,
  unavailable sources, and no private/draft/unpublished records in results.
- [x] Implement categorized bounded search with noindex/encoded links and honest
  empty/unavailable states. No external AI invocation or raw-query analytics.
  Keep existing campaigns/placements and event/shop workflows; do not auto-create
  advertising inventory, products, offers or sponsored editorial claims.
- [x] Run search/public-feed/commerce/consent cases; expect GREEN. Commit.

### Task6: Integrated verification and normal release

- [x] Review actual whole-branch changes independently; fix substantive findings
  with reproducing tests. Run relevant combined suite, isolated SQL, types/lint,
  production build/dryrun and real packaged-worker viewport/navigation checks.
- [x] Keep a complete roadmap of distribution/retention/commercial/native work with
  evidence and operational dependencies. Do not call those future capabilities done.
- [ ] Use the already-authorized normal PR/attach/exact-head/keep-vars procedure
  only after review and verification; validate public/mobile/preferences/assets,
  catalogue and all existing bindings/cron afterward. Record actual outcomes.

## Continuation beyond this plan

The supplied strategy’s growth, notifications, social distribution, memberships,
marketplace and native targets remain active follow-on work. Complete their own
scoped designs/tests against actual available accounts and budgets; do not label
this foundation as the full autonomous media business. The goal remains active
while meaningful authorized independent work remains.
