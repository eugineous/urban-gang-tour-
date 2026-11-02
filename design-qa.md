# Guided checkout and payment results — 2 November 2026

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

Latest focused Chromium run flow-final.log passes15cases: progressive navigation,
hidden-field validation, locale preservation, contact correction, short initial
screen, wide Android layout, paid/pending/failed/refunded/offline/bounded polling,
clipboard success/denial, receipt/ticket/order actions and shared category/search
reset. No unexpected page errors or financial requests. Direct Buy now additionally
has37focused tests including13Chromium cases for variants, quantity, persistence,
duplicate protection and Back/bfcache. Independent code review found no open issue.
Full suite full-suite-final.log passes2351tests/264files with191gated test skips;
changed/new22TypeScript files lint0errors/33warnings and TypeScript passes.
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
