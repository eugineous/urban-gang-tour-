# Approved public design deployment, 8 October 2026

Deploys the approved private review's public information screens to the existing
Cloudflare Worker and custom domains. The user explicitly authorized public deployment.
This supersedes the historical V25-only visual restriction for these screens.

The Worker serves an explicit allowlist of static, server-rendered marketing pages.
The design assets have a separate /_design/_next prefix. Document links prevent
client navigation from crossing incompatible Next builds. Missing design HTML falls
back to the existing application. HTML revalidates instead of retaining old releases.
The packaging task exports only the approved public screens; simulated checkout,
local accounts, organizer dashboards and example admin modules are not exported.
Direct /_design-pages access is blocked to avoid duplicate indexable URLs.

Live shop/product pages, booking, account, organizer, admin, checkout/payment APIs,
receipts, tickets, verification and individual owner-managed blog articles retain
the existing implementation. These transactional screens retain their current design.
Marketing does not display sample catalogue prices or sample shopping cart counts.
Events consume /api/site-data/events, News consumes /api/site-data/posts, and event
discovery continues using the existing external discovery Worker. Contact/footer
forms prepare a WhatsApp or email draft; the visitor sends it from that application.

No R2 binding or Vercel service is introduced. Existing KV, services, secrets,
cron and custom-domain configuration are retained. No real payment or database
write is performed as a browser test.

Build: npm run cf:build builds both surfaces and packages approved assets.
Tests: npm test includes public-design routing and transactional isolation checks.
Rollback: restore the preceding Cloudflare deployment through the deployment API;
the original application remains bundled and can also be restored by removing the
publicDesignResponse interception. This is a staged public design rollout, not a
claim that preview account/checkout simulations have become production services.

Additional requested interactions in this release: pausable logo marquee; 16:9
campaign and collection film rows; eager gallery lightbox image loading with
neighbor prefetch, retry and touch swiping; cyclic Reels viewer using the actual
approved videos (no automatic Instagram/TikTok imports); draggable edge-docked
contact card; simplified Events priorities and an explicit opt-in newsletter
using the existing subscription API. Longer adaptive hero loops retain the
8-second low-bandwidth variant. Reduced-motion, Focus view and Save-Data suppress
automatic previews. Authenticated admin navigation gains module search and a
mobile drawer; ticket and receipt presentation changes preserve the original
signed codes, payment status, ownership and PDF generation. No security audit can
establish that a site can never be compromised; tests cover concrete boundaries.

The established /events?event=<id> checkout URL deliberately stays on the
live ticket runtime; /events without that parameter serves the new discovery
page. Only published ticketed backend records can become the UGT featured sale.
Security maintenance updates Next.js to 15.5.27 and jsPDF to 4.2.1, with patched
PostCSS, Sharp and source-map-js overrides. Production dependency audit: zero
reported vulnerabilities; this is not a guarantee against every future attack.
