# International readiness — 19 October 2026

## Positioning decision

Urban Gang Tour is a Kenya-based school and campus events, live hosting and
production business, co-founded by Eugine Micah and Lucy Ogunde. Its work and
its founders' career archives are evidence, not proof that it delivered every
event shown in an archive. International enquiries are welcome; overseas offices,
worldwide delivery and international event operations are not established facts.

Primary visitor tasks: plan/book an event; discover an event and its real ticket
seller; see delivered work; shop; read news. Preserve these distinct destinations
and the existing visual identity. Do not position the business as an unverified
worldwide ticket aggregator. Header uses Services, Events, Our work, Shop, About;
Cart is separate from Shop. Language and help belong in the menu and footer.

## This release

- Six real, equivalent server-rendered introductions: `/welcome/en`, `/welcome/sw`,
  `/welcome/fr`, `/welcome/zh-Hans`, `/welcome/ru`, `/welcome/es`. Explicit scope:
  these are welcome translations, **not** translated checkout, legal or articles.
  Per-page canonical, title, description, social card, language on the content,
  self-inclusive reciprocal hreflang, x-default, sitemap and links. No language
  auto-redirect or third-party translation script; same-origin text/fonts.
- `/international`: enquiries from abroad, KES pricing, payment-method limitations,
  external ticket sellers, destination confirmation before payment, receipts/help.
- `/accessibility`: focus setting, keyboard/zoom help, known video-caption gaps,
  honest WCAG 2.2 AA goal rather than a compliance certificate.
- Apply saved focus preference before paint. Synchronize the page/menu/footer
  setting and other tabs; stop optional CSS animation/transition and use existing
  video/campaign opt-outs. Respect OS reduced motion. Preserve manual playback.
- Social icons get a white backing and retain visible platform labels, not
  colour-only links. No new forced theme or new homepage animation.
- Remove unverified broadcast-every-stop/national-audience promises from default
  metadata. Preserve Control Room SEO overrides instead of overwriting owner data.
- News detail and feed use the same Nairobi publication day and deterministic
  date/slug chronology. Use the newsroom byline where no verified author field
  exists. Remove the alternate renderer's silent stripping of Hype Ola credits.
  Preserve article bodies, owner images and originals; no bulk content mutation.

## Evidence and what remains unverified

This is an engineering/source review, not a completed screenshot-based UX audit.
The Browser skill's required browser connection is unavailable. Its visual audit
workflow is blocked; no claim of Android/iPhone, zoom, dark-mode or screen-reader
visual sign-off. Regression tests cover rendered welcome markup, navigation,
metadata, language validation, preference storage failure and cache isolation.
Build and read-only main-site checks are required before calling this deployed.

Availability in China, Russia, USA and France needs probes from those countries
and their actual networks. A .co.ke domain and globally reachable HTML are not
proof of local reach, search ranking, payment acceptance or legal availability.
Cloudflare's China Network is a separate Enterprise subscription; this release
does not purchase it, change DNS, claim an ICP approval, or guarantee YouTube,
Google, Meta or card access in mainland China. Essential welcome text does not
depend on those services. Mandarin translation is not a regional availability test.

Search Console country/query impressions, clicks and indexing are the evidence
for Google discovery, not a manual search from this workspace. Social canonical
tags and publicly fetchable image bytes help previews; actual platform caches
and account configuration still need checking. Do not invent WeChat/Weibo/Yandex
accounts, reviews, audience numbers, partners or testimonials.

Payments retain the previous release's signed guest recovery, durable M-Pesa
attempts and atomic ticket reservation. No live customer transaction is a test.
Outstanding financial work includes card-attempt durability, prepayment merch
stock holds, provider sandbox evidence and durable paid-consequence repair.
External refund recording is not a provider refund. International cards and
fulfilment must be verified operationally before advertising worldwide buying.

Accessibility is not an ADHD diagnosis or a promise that one setting serves
everyone. Remaining acceptance: keyboard-only end-to-end purchase, TalkBack and
NVDA/VoiceOver labels/status announcements, 200–400% zoom/reflow, forced colours,
video captions/transcripts, and testing with disabled users. The homepage has
hero, YouTube and campaign-film motion surfaces, plus interaction animations;
no runtime animation count was measured. Adding more motion is not the objective.

## Content and useful AI without a paid API

Scheduled publication of **approved** content and optional social announcements
already exist; social dispatch is gated by channel credentials, an owner switch
and per-article consent. Do not enable these switches or blast old articles just
because credentials exist. Autonomous factual reporting requires trusted source
ingestion, provenance, corrections/version history, rights/consent checks, duplicate
detection and an editorial approval policy. That pipeline is not finished here.

Safe art candidates: clearly illustrative culture explainers, abstract chapter
art, original typography, maps/timelines and diagrams. Keep real event photographs
for documentary reporting. Generated artwork is not evidence of attendance or a
manufactured person's endorsement; retain original rights and captions.

No-token does not mean zero-cost AI. Local/open-weight models require compute,
memory and a licence review. Chrome's built-in Translator API is browser/device/
language dependent, not a cross-browser guarantee; some devices need model
downloads. Browser translation is a useful optional fallback, not legally reviewed
terms. Deterministic headline suggestions, metadata validation, event-to-draft
templates and scheduled approved publishing need no AI model and must not be
marketed as one. Do not scrape a logged-in ChatGPT UI or expose private data to
unapproved services as a workaround for API billing.

## Competitive benchmark and next gates

Ticketsasa documents a discover → quantity → payment → delivered-ticket journey.
Eventbrite documents buyer receipts, tickets and organiser check-in. Use these as
task benchmarks, not evidence UGT outperforms either product. Brand differentiation
is delivered Kenyan school/campus work and known hosts, not number of admin tabs.
No speed/ranking/better-than-platform claim is justified by source comparisons.

Next order: (1) prove card and inventory correctness in sandbox; (2) assistive-tech
and real-device purchase tests; (3) native-language review and expansion into
complete selected journeys, not hundreds of thin pages; (4) regional probes and
Search Console baselines; (5) source-backed editorial drafts/revision controls.
Measure completion without help, purchase failures/retries, recovery success,
support contacts, loading percentiles, search clicks by country and qualified
booking enquiries. More routes alone do not establish business progress.

## Primary references consulted

- [Google localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions): reciprocal equivalent language URLs, not fake alternates for untranslated pages.
- [Google Search Console performance](https://support.google.com/webmasters/answer/7576553?hl=en): measured search visibility.
- [W3C cognitive motion guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p01-motion/): visitor control over moving/changing content.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): accessibility acceptance target.
- [Cloudflare China Network](https://developers.cloudflare.com/china-network/), [FAQ](https://developers.cloudflare.com/china-network/faq/): separate service and regional limitations.
- [Chrome Translator API](https://developer.chrome.com/docs/ai/translator-api): local translation capability with availability checks.
- [Ticketsasa buying guide](https://bookings.ticketsasa.com/events/buy-ticket): published Kenyan buyer journey.
- [Eventbrite organiser help](https://www.eventbrite.com.au/help/en-us/articles/742680/how-to-sell-tickets-at-your-event-with-eventbrite-organizer/): receipt/ticket/check-in tasks. Some main organiser pages returned 429; no interactive competitor audit claimed.
