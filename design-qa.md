# Shop visual completion — 1 November 2026

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
