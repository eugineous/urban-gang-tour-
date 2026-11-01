# Mkurugenzi-grounded UGT one-page QA — 1 November 2026

Result: **passed** for the adapted public design and local interaction gate.
The final frozen production bundle passed phone/tablet/desktop checks after the
desktop search spacing correction. Deployment evidence is recorded separately
by the release owner; this is not a live-payment certification.

## Source and comparison scope

Public reference: https://mkurugenzi.ke/. Captured at desktop 1440 × 1000 and
mobile 390 × 844 after its preloader and entrance animation settled. Private
evidence root: `/workspace/artifacts/ugt-mkurugenzi-20261101/`.

Visually inspected matching source/prototype viewport captures:

| Scope | Reference | UGT frozen production prototype |
| --- | --- | --- |
| Desktop entry | `reference/desktop-00.png` | `browser-frozen/home-1440.png` |
| Mobile entry | `reference/mobile-00.png` | `browser-frozen/home-390.png` |
| Desktop collection | `reference/desktop-03.png` | `browser-frozen/catalogue-1440.png` |

The public source grounds the logo/search/account/cart masthead, centered desktop
navigation, landscape hero, image-led discovery, compact merchandise grid and
five-action mobile dock. No reference private account, payment flow or backend
was inspected or copied. Screenshots are local browser emulation, not physical
device evidence or proof of live payment acceptance.

## Intentional adaptations and visual findings

- UGT retains its logo, warm white/magenta/yellow tokens, Inter/native fonts,
  authored hero copy and sharp, lightly shaded owned event video. Reference
  photography, branding and Poppins/Playfair/Bebas typography are not embedded.
- Six owned-image cards lead to Events, Gallery, Clients, Book, Vendors/Partners
  and About. These adapt the reference category-card pattern to real UGT modules;
  they do not invent collections or endorsements.
- The homepage adds the existing live 24-product collection, guarded events,
  latest published story cards and FAQ. Existing detail/cart/checkout/status/
  receipt routes remain the transaction destinations.
- Header, sections and mobile controls deliberately use less empty space than
  the reference. The mobile captures show the owned hero and discovery cards
  earlier, with a compact Home/Search/Shop/WhatsApp/More dock.
- Desktop development captures exposed an inherited column/gap on search and a
  legacy 112px shop offset. Current CSS explicitly sets horizontal search with
  zero gap and removes the old shop spacing. The first frozen run then measured
  search at61px: inherited input min-height50px and margin9px remained. The final
  input resets min-height to44px and margin to0. A new regression failed before
  this correction and passed afterward. Final frozen search height is46px, with
  compact header and collection spacing visually confirmed. Older captures
  remain diagnostic evidence.

This is a UGT adaptation of the captured structure, not a pixel-identical brand
clone. UGT payment availability/recovery copy follows its own backend safeguards.

## Workflow evidence

`browser-dev/proof.json` and `browser-dev-final.log` report successful checks at
390, 820 and 1440 CSS pixels: six module cards, 24 products, query search, genuine
variant selection/add-to-cart, cart persistence, disabled unavailable checkout,
mobile menu/Escape/focus return and no horizontal overflow. Recorded totals:
zero page errors, unexpected writes or live financial requests.

The browser harness intercepts API calls. It uses a saved public catalogue and
two explicitly local story fixtures, empty events and unavailable payment
booleans. Those checks establish rendered behavior and canonical story links,
not a fresh live CMS/catalogue/payment audit. Component tests independently cover
published/empty/private/unsafe story gates and one primary heading.

Focused logs inspected: `home-red.log` (five failures before implementation),
`home-green.log` (7 passed), `integration-green.log` (15 passed),
`cross-provider-recovery-red.log` (six additional failures), `recovery-final.log`
(42 passed, including 36 commerce cases), `chrome-green.log` (32 passed) and
`final-safety-green.log` (19 passed). Commerce cases cover missing/malformed/
failed options, explicit stale-variant repair, shared cart events, saved attempts
with disabled providers and recovery without creating another provider attempt.

`full-suite-frozen.log` records252passed test files,12skipped;2221passed tests
and180gated skips from final source. `lint-delivery.log` records0errors/36warnings;
the added search regression also passes lint (`lint-search-final.log`).
`types-frozen.log` exits0 and `cloudflare-build-frozen.log` ends with OpenNext
build complete. The final keep-vars dry bundle succeeded (`dry-frozen.log`).

`browser-frozen-final.log` and `browser-frozen/proof.json` record all3widths
passed,6modules/24products each, working query/options/cart/menu/focus, all5
non-English native locale overflow checks, unavailable-method safeguards and
0page errors/unexpected writes/live financial requests.

`paystack-browser-final.log` records9mocked checkout scenarios passed,0errors
and0live requests. `pwa-final.log` records responsive/install/connectivity/English-first,
iOS/storage-denied, worker-upgrade/cart/form preservation and offline/cache
checks. Its simulated503/offline resource failures are expected test conditions.
Neither result is a live payment or customer-message test.

## Remaining release gates

- [x] Final suite2221passed/180gated skips, TypeScript passed, changed-file
  lint0errors/36warnings and Cloudflare/OpenNext build completed.
- [x] Nine mocked checkout browser scenarios and local PWA regression passed.
- [x] Verify the final search CSS regression, rebuild and frozen browser proof
  at all three widths, including compact desktop search and catalogue spacing.
- [x] Release owner compared final same-viewport source/frozen screenshots;
  the adapted visual result passed with the documented UGT-specific differences.
- [ ] Normal PR/merge, tested-tree equality, keep-vars deployment, unchanged
  bindings/cron metadata and live read-only smoke evidence.

PAYSTACK_ENABLED remains false. Configuration booleans are not merchant approval;
destination signing/subscriptions, merchant/channel/settlement and authenticated
ledger-write readiness remain activation gates. No live charges, STKs, refunds,
transfers or customer-message tests are included.
