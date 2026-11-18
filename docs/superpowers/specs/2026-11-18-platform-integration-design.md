# Urban News integration and Kenya-first reader experience

## Intent and authority

The owner supplied three strategy pastes and said “go”. Keep Urban News dominant
while restoring the existing Eugine/Lucy identity, event films, events, merchandise
and services. Implement the audit and Kenya-first country-preference foundation
first, then the documented distribution/retention/commercial phases. Existing
session authorization permits inline implementation and the normal reviewed
release process; do not repeat design permission loops. Research recommendations
are proposals to assess against actual code, not evidence of installed services.

Inputs: the paste beginning “Nice, I love that…”; “Strategic Product Architecture,
Newsroom, Growth and Commerce Blueprint”; and “Autonomous Growth and Integration
Strategy / Global, AI-Powered Media and Growth Strategy”. An unrelated browser
state dump embedded in the first paste is excluded from task evidence and commits.

## Production truth

Base main1630fda2fe85300228ccd3d9c60af393449b4b14. Next16.4.6, React19.3.1,
Neon/PostgreSQL, existing Cloudflare Worker/KV/rate limiter and quarter-hour cron.
Inventory:208page/API routes,489tracked media/font assets,233catalogued media
including49videos, no missing catalogue files. Official logo:/assets/ugt-logo.png.
The new home dropped the media/profile modules; files themselves remain intact.
`/blog` is canonical Urban News; `/news` redirects. Existing approved-public
eligibility is authoritative. Do not resurrect the140intentionally archived old
articles just to populate a feed. Current source/merchant/account configuration
cannot be inferred from public HTML or mock tests.

A real first-visit mobile interaction reproduced a distinct navigation failure:
the cookie-choice card intercepts the bottom News link. Preserve explicit consent
and move the card clear of the dock; do not auto-accept or auto-reject cookies.

## Stage A — cohesive public foundation

1. Preserve routes, assets, product/event/order/ticket identities, prices and
   Paystack-only commerce. Record route/media/SEO/payment/test inventories and
   rollback before product edits. No account creation, live charge/STK/message,
   destructive scans, paid resources or secret/billing changes as verification.
2. Repair cookie/dock overlap at320/360/390/430/768px and Android’s wide-layout
   fallback. Keyboard navigation and denied/unchosen consent remain usable.
3. Restore real founder portraits (existing biographies M230/M228), programme and
   event footage on the news-first home. Add a real `/watch` destination using
   existing non-adult catalogue films. Public film titles retain their provenance;
   label event footage as event footage, not fresh newsroom reporting. Reuse muted
   play controls, captions, Data Saver/reduced-motion rules and lazy loading. No
   new generated portraits or logo edits. Existing film/gallery URLs stay valid.
4. Keep the current five mobile destinations with central Home and visible Shop
   and Contact, reflecting the owner’s direct earlier choices. Add Watch and
   personal edition through the header/menu and contextual home links. All nav
   controls have real destinations,44px targets and stable focus behavior.
5. Add explicit Kenya-first reading preferences:homeMarket,followedMarkets,topics,
   language. Residence, language, followed markets and interests are distinct;
   derive none from IP, ethnicity, politics, religion, health or hidden tracking.
   The initial registry includes Kenya and the named regional/diaspora/experimental
   markets; a preference does not claim an operational newsroom in that market.
6. Guests can save choices on their device without signing in. Reuse the six
   existing interface languages; articles retain their published language. If
   storage is blocked, choices work in memory and the UI says session-only.
   No analytics or marketing consent is granted by saving these preferences.
7. Optional account synchronization uses existing validated user IDs and a
   separate additive news-preference record with versioned CAS. Private read/write
   endpoints authenticate, validate bounded JSON and Origin, rate limit, return
   no-store and never accept customer IDs from the browser. No silent identity or
   anonymous-history merge. A conflict preserves typed choices and requires a
   deliberate reload/retry. Existing event/email preferences remain unchanged.
8. Ranking consumes only already-approved public summaries. Use explicit market,
   followed countries, topics, actual verification state and freshness with a
   deterministic diversity pass; no invented engagement/trend/editorial scores.
   Expose “Why this?” and Reset. Missing regional coverage falls back to clearly
   labelled latest published reporting rather than an invented local feed.
   `/for-you` renders a generic Kenya-first server snapshot and personalizes only
   in the browser. Shared HTML caches never contain account preferences.
9. Admin starts in Kenya; Preview as market reads the same approved public feed
   and uses local preview state. It never changes the admin’s device/account
   preferences or grants publication authority. Empty coverage is explicit.
10. Add working shared search across approved news, public events/products,
    non-adult existing videos and founder profiles. Bound inputs/results, retain
    real destinations, noindex search results and do not report raw queries.
    Search never fabricates an AI answer or uses private editorial evidence.

## Stage B — growth and retention (separate deliverables)

Extend existing campaigns/placements and consent-aware analytics before replacing
them. Add real event promotional kits, transparent partner/referral attribution,
saved/followed content and a notification preference center. Permission follows
explicit user action; subscription receipt must not pretend delivery is enabled.
Source discovery expands through a verified source/country registry and exact
revision provenance. Existing encrypted provider keys/one-send/daily limits stay.
No unknown “Moch API” integration, login/anti-bot bypass, fake communities or
unsolicited DMs. API keys, platform scopes, VAPID credentials and provider terms
are operational dependencies, never fabricated by the UI.

## Stage C — commercial distribution and native target

Merchant/feed/SEO integrations, explicit product-media classification, approved
social variants and bounded publishing queues follow the working foundation.
Keep authentic photography distinct from labelled previews/mockups; do not change
stock/prices or charge subscriptions without real offers. Memberships, marketplace
settlement, native binaries/store release and paid translations have independent
readiness gates. A document describing them is not a delivered capability.

## Review focus and acceptance

- A first visitor can tap News with the cookie panel still visible, without a
  forced consent choice or optional reporting. Short/wide phone layouts fit.
- Guest preferences survive normal refresh/tab changes, fail honestly when storage
  is blocked and do not leak into another authenticated account/shared HTML cache.
- Concurrent account saves return conflict instead of discarding preferences;
  invalid fields and untrusted origins cannot change another user’s preferences.
- Rankings preserve publication eligibility, stable ties and diversity without
  claiming unseen stories or using private excerpts. Admin preview is isolated.
- Home/Watch/search show existing real assets and links, respect media settings,
  and preserve event/shop/checkout/ticket/security behavior.

Use RED/GREEN behavior tests, actual isolated PostgreSQL, real Chromium at phone/
tablet/desktop/wide-Android layouts, existing commerce/consent regressions, types,
lint, production build/dryrun and independent whole-branch review. Review actual
live URLs/settings after any normal release; never infer success from CLI output.
