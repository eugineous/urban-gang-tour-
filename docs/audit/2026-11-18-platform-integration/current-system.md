# Current system — 18 November 2026

Read scope:the three user-supplied strategy pastes, tracked files in this project,
existing release receipts and read-only public URLs. No private production database,
merchant dashboard, customer account or provider-secret content was inspected.
The first paste’s unrelated serialized browser/authentication state is excluded.

Base main1630fda2fe85300228ccd3d9c60af393449b4b14; prior live release
urban-news-20261117-v1. Next16.4.6/React19.3.1/TypeScript, Neon PostgreSQL,
Cloudflare Worker/UGT_MEDIA KV/SharedRateLimiter and existing quarter-hour cron.
Inventory files:routes.csv,assets.csv,seo-urls.csv,inventory-summary.json.
208declared page/API routes;489tracked media/font files;233catalogue assets,
49videos,16collections. Every catalogue media file exists locally.

## Public content and provenance

`/blog` is Urban News; `/news` and `/urban-news` redirect there. The existing
URBAN_NEWS_ENABLED flag selects approved new-lane snapshots. An empty public feed
is not proof of a query bug:the140previously public legacy stories were deliberately
withdrawn into private archives in the preceding owner-authorized phase. Do not
resurrect them or invent a blanket redirect. The current newsroom separates source
evidence/private drafts/revisions from approved public snapshots; exact owner
review gates publication. Runtime public readers, feeds/sitemaps, media and edge
guards use the same eligibility. No new-lane social broadcasting is enabled.

## Reproduced defects and established gaps

1. Real first-visit320px Chromium:dock News click times out because the cookie
   card intercepts pointer events. It is a layout obstruction, not a broken
   `/blog` route. Consent is undecided; dismissing/accepting it must not be a
   navigation prerequisite. Private routes already suppress unsolicited prompts.
2. `app/page.tsx` selects UrbanNewsHome, which renders text-only founder links
   and no original video. Original photographs and49films still exist. Restore
   their visibility using the catalogue; do not recreate or delete the media.
3. New-news CSS has only viewport-width600/1023breakpoints. Android’s supported
   wide-layout phone bootstrap needs explicit coarse-pointer/small-device tests.
4. Existing account preferences cover event/email marketing only. There is no
   explicit reading-market/followed-country store or isolated admin market preview.
   Interface-language storage already supports six explicit languages.
5. News archive search currently searches only approved news summaries. A shared
   news/video/events/products/hosts search and real Watch destination are missing.

## Preserved integration points

Media:ui/data/media-library.json,MediaLibrary/MediaFilm,caption tracks,Data Saver,
muted-autoplay/visibility/reduced-motion hooks; public Instagram projection is
review-gated. Founder biographies use M230(Eugine) and M228(Lucy), with genuine
campaign/video/photo links. Official logo:/assets/ugt-logo.png; do not regenerate it.

Auth:existing native buyer sessions, Google option, guest ticket capabilities,
recovery/passkeys and role-checked Control Room. Identity is never inferred from
IP/name. No account/session migration is needed for reader preferences.

Commercial:public product/event readers, preserved cart/checkout, signed provider
callbacks and durable payment/ticket controls. See payment-baseline.md. Existing
campaign targeting/placements, explicit consent, GA event helpers, AdSense gating
and Search Console modules are reusable; they are not proof of configured accounts.

PWA:existing manifest/worker/offline/release logic and manual controls. No actual
Web Push subscription/delivery endpoint exists; existing email preferences cannot
be described as working push notifications. Native binaries were not delivered by
the previous newsroom release.

## Preservation and rollback

No assets, records, URLs, secrets, prices, event/ticket IDs, consent choices or
payment flags are deleted/re-keyed. Asset SHA256 values bind local bytes, not
rights or authenticity. DUPLICATE/ORPHAN are inventory classifications only;
delete nothing based on those labels. Rights remain unchanged/unknown where
unverified. Keep the existing public event/product ID+price baseline privately.

New preference storage is additive and user-keyed. Roll back application code
through the normal previous Worker version; retain new preference rows. Revert
individual layout/media additions independently. Existing URBAN_NEWS_ENABLED is
the previous lane cutover, not a reason to expose old archives. A production backup
must use the existing database owner’s snapshot/export facilities; no private dump
or billing change is created as an audit. Retain before/after binding/cron metadata
without values and use keep-vars for any authorized deployment.
