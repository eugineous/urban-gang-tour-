# Eventify mobile reference — 9 November 2026

final result: passed (UGT reference adaptation, not identical reference content)

## Source and matched visual comparison

Owner-selected Dribbble shot27650927, by SHEIKH NAEEM. The exact public shot
image is2880×2160px. Its first phone content is normalized to390×844px for a
side-by-side comparison with the UGT phone homepage at390×844CSSpx,1×. Artifacts:
`/workspace/artifacts/ugt-full-audit-20261103/eventify-source-home.png`,
`eventify-home-comparison.png`, and `local-eventify-390.png`. The initial
comparison used the development renderer; the final comparison uses the clean
production build without a development badge. Both show the same home/discovery visual state, without a login or
transaction. Desktop is separately checked at1440×844CSSpx.

Expected adaptations, not accidental fidelity defects: real UGT brand/copy and
owned-host artwork replace fictitious animals/artists; the light branded header
retains the real cart; Shop and My tickets replace reference-only destinations.
Dark event details retain actual dates, venue, archive/postponement/status and
sales eligibility rather than advertising the reference's fictional concert.
The third phone's black-ticket/mint visual vocabulary does not create a fake
ticket, barcode or purchase. Existing private issued-ticket rendering retains
its genuine QR and entitlement/status controls.

## Findings corrected

- P1: hidden desktop hero could still request video on phones. Mobile
  presentation now prevents that source download and restores desktop playback
  on resize while respecting focus/reduced-motion/save-data preferences.
- P1: dark ticket inheritance could obscure white pending/inactive overlays or
  footer metadata. Explicit contrasting overlay, footer, admission and business
  text colours fix this. Local paid/pending/inactive style fixtures verify
  contrast colours and white print styling, with no QR or usable ticket.
- P2: the initial card crop cut the host's face. Corrected image position.
- P2: an existing surface selector overrode the round black menu. Matched its
  specificity; the surrounding header remains light as the owner requires.
- Small-screen introduction spacing has extra room below350px. Real eligible
  ticket purchase shortcuts remain above the navigation, not removed.

## Fidelity surfaces and verification boundary

- Typography: heavy compact black/magenta editorial headline, italic intro,
  compact readable labels and outlined event month. Native translations remain.
- Spacing/layout: large right-side host, paired overlapping cards, rounded
  floating black dock, mobile light canvas and dark event panels.
- Colours: near-black/white, vivid magenta and mint strips; dark ticket panels
  keep a high-contrast white QR area. Desktop palette is unchanged.
- Images: new generated derivative of owned M230 plus existing owned Lucy
  photograph. Master/provenance are tracked; reference artwork is not reused.
- Copy: actual UGT services, routes and event states, no invented event or stock.

The113 focused navigation/commerce/ticket tests passed. The7 motion tests and2
desktop hero tests are checked separately; the latter's stale scrim assertions
were aligned with the already-deployed .30/.66 values, with no desktop CSS edit.
21st CLI review of the two principal new components returned0 findings; catalogue
search was unavailable without authentication. Focused lint has0 errors and6
anchor/image/existing-ref warnings. Cloud desktop provides no browser capability;
the owner-approved local Chromium/Playwright fallback is used. This is not a
physical-device, native-app-store or real-money checkout certification. No live
payment, ticket issue, refund or customer-message test is performed.

Final clean Cloudflare build, TypeScript and keep-vars deployment dry run passed.
Built Chromium checks passed at390/1440px with no overflow or page errors; menu
open/Escape and cart/checkout navigation boundaries passed. Additional reflow
checks passed at320/390/430/768px, including Swahili, French, Russian, Chinese and
Spanish text. Coarse-touch980px-layout/320px-and390px-screen fallback had no
horizontal overflow. The actual two-product cart retained the same KES5,300
catalogue total through checkout, Back, reload and browser restart; history
refresh and initially unchecked terms passed. Normal-motion checks confirmed0
mobile hero-video requests, focus-view preservation and available desktop
playback after resizing. No actionable P0/P1/P2 finding remains in this checked
mobile presentation scope; private entitlement states were fixture-tested, not
accessed through a customer's account.

---

# MOOKH/Nixtio restoration, shop boundaries and Paystack — 2 November 2026

final result: passed

## Visual truth and comparison

The owner's latest correction restores the established UGT MOOKH/Nixtio hybrid
outside Shop, with an explicit light-header override. This is not a pixel clone
of either reference and does not reuse their branding or content. Mkurugenzi's
collection/catalogue/mannequin presentation remains confined to shopping routes.

Approved pre-Mkurugenzi homepage source:
/workspace/artifacts/ugt-app-operations-20261028/live-release/home-1440.png.
Footer source:
/workspace/artifacts/ugt-events-release-20261022/captures/ugt-footer-desktop-final.png.
The captured Nixtio desktop/mobile-menu and MOOKH desktop references in that
captures directory also informed the existing design, not a new redesign.

Latest implementation evidence:
/workspace/artifacts/ugt-mookh-nixtio-restore-20261102/browser/.
home-comparison.png and footer-comparison.png in the artifact root place source
left and implementation right, each1440×900CSSpx at1×, without scaling differences.
The full views show restored type, hero composition, contact hierarchy and
spacing. Different owned-video frames are not a design discrepancy. Intentional
differences are the light cream header/menu/pill, magenta contact action, current
genuine footer links/language control and removal of the global storefront dock.

Focused states were inspected at native resolution: home-1440.png,
footer-1440.png, menu-390.png, category-1440.png and the decoded phone-poster
captures home-phone-no-preference.png/home-phone-reduce.png. Phone screenshots
are390×844CSSpx at1×; header, text and controls are readable without extra crops.
The initial phone capture preceded image decode; waiting for the real image and
finishing finite capture animations corrected the evidence, not application CSS.
Both motion preferences display the actual sharp poster while video is loading
or intentionally disabled. The normal animation controller remains enabled.

## Findings and corrections

- P1: the global Mkurugenzi storefront hub/header/dock displaced the approved
  site. Restored existing services, portfolio, presenters, original motion and
  premium shared navigation/footer. The homepage retains only its compact,
  factual public-product preview and a real Shop route.
- P2: collection controls scrolled to a mixed catalogue. Native category URLs
  now show matching products only, including after search/reset/reload, with
  distinct canonical metadata and honest unknown/unavailable handling.
- P2: fixed light headers overlapped category and checkout/result headings,
  including normal coarse-touch tablets. Actual-shell geometry regressions
  reproduced the overlap before the scoped spacing fixes and pass afterwards.
- P1: credentials could advertise/initiate alternative providers against the
  owner's Paystack-only instruction. New initiation is now Paystack-only at
  both UI and server boundaries, without disabling historical callbacks or
  changing credentials. Unsupported owned-ticket checkout is truthfully
  unavailable, not advertised as an online sale/InStock purchase offer.
- P2: shop products waited for browser JavaScript before loading. The existing
  public reader now supplies initial server HTML. This removes that dependency;
  it is not a guaranteed network speed or Core Web Vitals claim.

No actionable P0/P1/P2 findings remain in the checked scope. Independent code
review rechecked category/header geometry and owned-ticket advertising/schema
and found no remaining actionable issue. No P3 redesign is needed for release.

## Five fidelity surfaces

- Typography: established Inter hierarchy returns across the main site;
  locally hosted Poppins/Playfair/Bebas remain scoped to shopping. Six native
  languages retain working labels and collision-free responsive navigation.
- Spacing/layout: single-row desktop header, contained light mobile dialog,
  original hero/services rhythm, compact home preview and rich footer hierarchy.
  Category pages clear the header.44px controls, Escape/focus return, wide-phone
  fallback and reduced-motion behavior remain intact.
- Tokens: warm paper/cream, ink, UGT magenta/yellow and intentional light header
  in every state. The footer may remain ink; the header never becomes black.
- Assets/icons: actual UGT identity/owned sharp lightly shaded hero media,
  existing icon set and truthful existing mannequin illustrations. No invented
  endorsements, stock photography or unsupported wallet logos.
- Copy/content: genuine routes/public products, factual price floors and stock,
  concise payment steps and truthful statuses. Payment confirmation never comes
  merely from a redirect; email/ticket readiness remain separate facts.

## Verification and release boundary

Final full suite:2400passed/269files,191gated skips/12files. Fresh TypeScript,
55changed/new TypeScript-file lint with zero errors, production Next/OpenNext
build and keep-vars dry bundle pass. Existing warnings were not suppressed.
The final application source is ae9a23c; subsequent changes are this report and
two browser-harness email selectors corrected to match the actual optional label.

Built immutable-app browsers:22restoration/navigation/category checks plus
9Paystack and12checkout-client scenarios across phone/tablet/desktop. These
verify original motion starts, sharp hero, light/scrolled/menu states, all six
languages, real cart synchronization, Gallery, category-only navigation/reload,
payment options, fulfillment retry, saved recovery, receipts and guarded tickets.
Zero unexpected page/console errors or financial requests. Financial/browser
scenarios are intercepted fixtures, not live transactions or physical-device QA.

No credentials, provider flags, schedules, published catalogue, inventory or
customer records changed. No live purchase, charge, STK, refund, message or replay
was used. Paystack mobile-money/owned-ticket gates were not unlocked. Merchant
settlement, inbox delivery and complete live paid-ticket issuance are not claimed.
Normal PR/merge, keep-vars deployment and live read-only verification are recorded
separately in private release evidence. The earlier checkout/shop reports below
are historical context; their superseded global dock/provider details do not
override this report or the owner's latest instructions.

---

# Previous report: Guided checkout and payment results — 2 November 2026

final result: passed

## Comparison and state

Source visual truth: owner-supplied 2-1003065507.jpg and 1-1003065508.jpg in
/tmp/codex-remote-attachments/01a12a20-9a28-70a4-86c1-8aa86f78b05a/01acfcb4-bc6c-45d8-9f57-a8ed53132f4f/.
Source2 is720×1280pixels. The paid implementation result-paid-360.png is
720×1280pixels,360×640CSSpx at deviceScaleFactor2. Full-view normalized
comparison: /workspace/artifacts/ugt-checkout-journey-20261102/result-comparison.png
(source left, implementation right). Both depict confirmed payment. UGT intentionally
adds an actionable reference and order/receipt links, retains its own magenta/Inter
identity, omits the reference's confetti, foreign merchant claims and reward offer,
and does not reproduce OS/browser chrome. This is an adaptation, not a pixel clone.

Implementation evidence in that artifact root's screenshots directory:
result-paid-360.png, result-paid-full-360.png, result-declined-320.png,
result-pending-320.png and result-refunded-320.png. The latter full-page images use
320CSSpx/density2. Focused result headings/check/reference/primary actions are
readable at full resolution in the combined comparison; extra crops were not
needed. Checkout details/payment states at320/390/820/1440CSSpx are captured in
/workspace/artifacts/guided-checkout-20261102/checkout-{details,payment}-*.png.
The payment390capture was separately inspected at native resolution for logos,
radio labels, consent, Back and Pay actions.

## Findings and correction history

- P2: duplicate long checkout introductions and spacing placed the first Continue
  beyond the useful phone viewport. Removed only the redundant checkout intro,
  compacted the summary/progress/gaps, retained44px controls and required copy.
  Latest real-browser geometry regression passes at390×844 with72px dock reserve.
- P2: result amount/method pushed the primary action below the compact phone fold.
  Moved facts below actions and reduced phone badge/header spacing. Latest paid
  screenshot and360×640 assertion place the primary action above the dock reserve.
- P2: Android coarse-touch980layout/393screen fallback cramped the new form and
  result action into narrow columns. Scoped coarse-touch responsive rules now
  stack the relevant tracks; real Chromium regressions require effective field
  and primary-action widths of at least240px with no horizontal overflow.
- P2: the complete production shell exposed global definition-list styles that
  clipped Card despite no document-level overflow. A new regression failed with
  the clipped total/method; scoped automatic width and block fact groups fix it.
  The latest screenshot and regression show both labels and values completely.
- P2: the sticky site header and ID-specific phone heading override were absent
  from the initial component harness. Including the actual header CSS footprint
  and main-content ID reproduced Continue at846px and the result action at662px,
  beyond their772/568px dock-safe limits. Scoped top-spacing and heading fixes
  now pass those unchanged bounds with the production cascade represented.

No actionable P0/P1/P2 differences remain in the checked states. The owner also
explicitly requested unsuccessful screens: declined/cancelled/failed/timed-out
statuses use the same dedicated result shell with an X icon, honest explanation,
reference, safe recheck and support. Pending/unknown/offline never claim failure
or success. Refunds have a distinct result, preserving remaining valid tickets.

## Five required fidelity surfaces

- Typography: existing Inter used for legible30px phone result headings and
  compact field labels; long references wrap in monospace rather than clip.
  Existing Mkurugenzi-grounded shop fonts are unchanged. Six native locales pass.
- Spacing/layout: centered white result panel, strong check/title/reference/action
  hierarchy, short three-panel checkout, collapsed optional summary/promo,44px
  controls, phone/tablet/desktop and coarse-touch fallback assertions pass.
- Tokens: UGT magenta action/check, paper/white/ink surfaces, amber pending,
  red unsuccessful and cyan refund; text and symbols supplement state colour.
- Assets/icons: genuine M-Pesa wordmark and official Visa/Mastercard assets with
  public provenance notes; supplied UGT logo and existing Phosphor icons. No fake
  wallet marks, custom decorative SVG/CSS art or unsupported Apple Pay promise.
- Copy/content: concise task labels; no invented money receipt, mail delivery,
  stock, reward, merchant statement descriptor or success from a redirect URL.
  Ticket readiness and email acceptance remain distinct from payment truth.

## Interaction verification and boundaries

Latest focused-final.log passes92tests, including16Chromium cases: progressive navigation,
hidden-field validation, locale preservation, contact correction, short initial
screen, wide Android layout, paid/pending/failed/refunded/offline/bounded polling,
clipboard success/denial, receipt/ticket/order actions and shared category/search
reset. No unexpected page errors or financial requests. Direct Buy now additionally
has37focused tests including13Chromium cases for variants, quantity, persistence,
duplicate protection and Back/bfcache. Independent code review found no open issue.
Full suite full-suite-final.log passes2351tests/264files with191gated test skips;
this precedes the final scoped layout/harness corrections, after which the92
focused checks pass. Changed/new22TypeScript files lint0errors/33warnings and
TypeScript passes; the final edited browser tests also pass fresh scoped lint.
Release build/frozen-runtime/live checks are recorded separately in private release
evidence; component screenshots are not claimed as physical-device verification.

Checklist: visual comparison complete; earlier findings fixed and recaptured;
configured-brand assets checked; primary states and interactions checked; release
gates remain mandatory. No P3 change is required for this bounded implementation.

---

# Previous report: Shop visual completion — 1 November 2026

final result: passed

## Source and rendered evidence

Source: https://mkurugenzi.ke/, captured desktop1440×1000 and phone390×844 in
/workspace/artifacts/ugt-mkurugenzi-20261101/reference (desktop-03.png/mobile-06.png).
Final implementation: /workspace/artifacts/ugt-shop-completion-20261101/browser-release.
Combined source/implementation evidence: final-comparison-desktop.png and
final-comparison-phone.png in that evidence root. Phone captures were normalized
from their device-density raster sizes to390×844 CSS pixels before comparison;
desktop used1440×1000 at1×. Both compare the public catalogue scroll state;
actual product identities/order/prices differ intentionally between businesses.

Full-view and focused review used shop-hero-390.png, shop-hero-1440.png,
shop-collections-* and shop-products-* at390/820/1440. Product title/price/image
regions are readable in the combined captures; the phone hero was separately
inspected for text/garment overlap.

## Findings and correction history

- P2: the first phone hero description overlapped the garment. Real browser
  regression failed with noteRight210.19px versus imageLeft152.11px. Scoped43%
  copy width and source display font corrected it. Final frozen browser assertion
  and shop-hero-390.png verify clear copy, legible controls and intact garment.
- P2: initial two-column phone catalogue/horizontal collection rail and generic
  serif differed from the actual source. Corrected to single-column phone
  products/stacked collection cards, five desktop columns, and locally hosted
  source Poppins/Playfair Display/Bebas Neue with OFL licenses. Final captures
  and actual font-load/grid checks passed.
- Three generated apparel presentations omitted the small Color Blast wording.
  Those assets were corrected with image generation and all five final standalone
  assets visually inspected before packaging. The supplied print master remains
  unmodified. Illustrations are not represented as actual stock photographs.

No actionable P0/P1/P2 findings remain in the completed catalogue presentation.

## Required fidelity surfaces

- Typography: source fonts are locally served; Playfair names and bold prices,
  Poppins controls, Bebas banner. Native-language fallback remains available.
- Layout: landscape banner, three real collection-photo controls, rounded white
  cards and source-like five/one desktop/phone catalogue. Tablet uses three.
  UGT's compact header intentionally retains the owner's no-dead-space constraint.
- Tokens: white shop surfaces, dark readable controls and existing UGT magenta
  mobile dock/brand accents. UGT branding is retained, not Mkurugenzi branding.
- Images: five900×1200WebP black-apparel mannequin presentations (~492KB total),
  correctly loaded without garment clipping. Other selected colours retain their
  accurate existing imagery rather than relabelling a black mannequin.
- Content: real24-product catalogue/options/prices, made-to-order labels and
  canonical product/cart/checkout links. No invented inventory or endorsements.

## Functional verification

Full suite2229passed/180gated skips (253passed files/12skipped) in
full-suite-final.log. This preceded the last CSS/font-only source-fidelity
corrections; subsequent focused-release.log passed107tests. Production
build-release.log completed compilation, TypeScript and OpenNext packaging;
dry-release.log completed the keep-vars dry bundle. Changed-source lint has
0errors/5warnings; syntax and diff checks passed.

browser-release.log/proof.json:390/820/1440, actual source font loading,
5/3/1columns, three collection controls, all five images decoded900×1200,
Black→White→Black correctness, genuine options/add/cart persistence, search,
menus/Escape/focus, unavailable-method guards and all five alternate native
locales; zero page errors/unexpected writes/live financial requests.

paystack-release.log: nine mocked checkout scenarios passed. PWA recheck passed
responsive/install/connectivity/English-first, iOS/storage-denied, upgrade/cart/
form preservation and offline/cache checks. One concurrent run timed out waiting
for iOS readiness with no JavaScript errors; unchanged isolated recheck passed.
An immediate story-count harness assertion was corrected to wait for the actual
asynchronous public story cards; its expected count was not weakened.

## Release boundaries

Normal PR/merge, tested-tree equality, keep-vars deployment, unchanged binding/
cron metadata and live read-only four-page/image/zoom verification are recorded
separately in the private release record. PAYSTACK_ENABLED staystrue under the
owner's explicit activation instruction. No order, real charge, refund, STK or
customer message was used for testing. This is not a merchant/settlement audit,
a paid end-to-end certification, or a pixel-identical third-party branding clone.
