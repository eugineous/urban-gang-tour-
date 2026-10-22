# Events, navigation, showcase and shop — design QA
Date: 22 October 2026. Release: events-library-20261022-v2.

## Sources and comparison setup

The owner explicitly approved local Playwright verification. Chromium was used
with the inherited network proxy. These are browser/emulation results, not
physical Android/iPhone or WebKit certification.

Source visual truth is the owner's supplied mobile screenshots, plus current
browser captures of https://mookh.com/, https://nixtio.com/ and https://amp.shop/.
The approved adaptation retains Urban Gang Tour's real destinations, artwork,
people and catalogue. It does not copy another company's identity, invented
inventory, app advertisements, country coverage or business claims.

Evidence root: /workspace/artifacts/ugt-events-release-20261022/
All filenames below are relative to its captures/ directory.

- Mookh: mookh-mobile-top.png, mookh-mobile-cards.png,
  mookh-desktop-top.png, mookh-desktop-cards.png.
- Nixtio: nixtio-desktop-top.png, nixtio-desktop-scroll.png,
  nixtio-desktop-cta-hover.png, nixtio-mobile-top.png, nixtio-mobile-menu.png.
- AMP: amp-mobile-top-clear.png, amp-mobile-products-clear.png,
  amp-desktop-top-clear.png, amp-desktop-products-clear.png.
  AMP's obstructing newsletter prompt was dismissed using its actual
  "NO, THANKS" control; no signup was submitted.
- Implementation: ugt-events-390-top.png, ugt-events-1440-top.png,
  ugt-events-390-cards.png, ugt-events-1440-cards.png,
  ugt-events-390-empty.png, ugt-menu-mobile.png,
  ugt-header-desktop-scroll.png, ugt-shop-390-top.png,
  ugt-shop-390-products.png, ugt-shop-1440-products.png,
  ugt-showcase-390-shelf.png, ugt-calendar-390-top.png,
  ugt-eugine-390-top.png, ugt-lucy-390-top.png.

Matched CSS viewports/source pixels: 390x844 mobile and 1440x900 desktop,
deviceScaleFactor=1. No device bezel or browser chrome is included.
The initial six-width overflow matrix used height900; the matched comparison
journeys use mobile844/desktop900. Screenshots from different heights are not
treated as pixel-identical comparisons.

Source and implementation images were opened together in the same comparison
input. Full views covered hierarchy and density; focused header, product-grid,
poster, footer and shelf views were also inspected. The reference catalogue is
larger than the real eleven-event UGT catalogue; it is not duplicated to fill
space. Source announcements, legal prompts and other companies' logos are not
part of the intended reproduction.

## Findings and iteration history

1. Earlier report: blocked because no usable browser was available.
   This limitation was removed by the owner's explicit local Playwright
   approval. Current source captures and rendered implementation replaced
   HTTP/CSS-only assumptions.

2. [P1, fixed] Poster images loaded but disappeared behind the card background.
   The initial ugt-events-390-top capture showed black cards despite successful
   image requests. Negative image/overlay z-index was replaced with explicit
   0/1/2 image, legibility overlay and content layers. Later matched captures
   show the actual UNI FEST and SATUK catalogue artwork.

3. [P1, fixed] Horizontal shelf tracks shrank all cards into one viewport.
   Computed widths were75px for campus cards and25.55px for campaign cards;
   scrollWidth equalled clientWidth and controls stayed disabled. Fixed implicit
   grid tracks replace minmax(0,percentage), so cards overflow locally rather
   than compressing. Next/Previous and keyboard scrolling were re-tested.
   The same correction restored the event featured rail's intended density.

4. [P2, fixed] First-pass events typography/cards were oversized and too heavy.
   Regular display text, smaller mobile sizing, narrower desktop poster tracks
   and removal of the duplicate "My tickets" intro restored the intended
   search-first hierarchy. The global Android heading override is explicitly
   scoped out for this directory's designed heading.

5. [P2, fixed] Phone footer was a long single link column.
   It now has a full-width brand/social row, aligned Explore/Connect columns,
   readable Help links and bounded44px social controls. On desktop there are
   four aligned columns. The floating contact launcher yields to the footer so
   it does not cover policy links.

6. [P1, fixed and rechecked] A phone requesting a wide desktop viewport
   applies the existing root zoom. The menu's old100dvh cap was multiplied by
   that zoom, leaving its final links unreachable while body scroll was locked.
   The cap now divides by the measured phone zoom. Native dialog internal
   scrolling and last-link reachability pass the final production-build check:
   the dialog bottom is813.83px within an844px viewport and the last link is
   reachable after internal scrolling. Evidence: ugt-menu-widephone-final.png.

7. [P2, fixed] Shop had an unnecessary90px phone gap and unsupported arrow
   glyphs. Phone padding is20px; real Phosphor icons replace the glyphs.
   The white, bordered catalogue uses2 phone/3 desktop columns, with4 only
   on wider screens. Live catalogue, design-only items, search, categories,
   sort, options and prices remain distinct and functional.

8. [P2, fixed] Restoring the calendar page left its old redirect and sitemap
   exclusions behind. Both were removed. /tour-stops now has a real calendar,
   canonical metadata, keyboard date controls and an event-directory link.

9. [P1, fixed] The first live cold-load run missed a layout selection while
   subsequent runs passed. The initial server-rendered filter controls could
   appear usable before their handlers attached. Initial search/layout/date/type
   controls now expose an explicit disabled-until-ready state. Native event and
   calendar links stay usable without scripts. The events route also renders
   its own directory directly instead of importing the whole-site renderer.
   A deliberate script-hold browser test proves the before/after interaction
   states; local-cold-filters.json and ugt-cold-filters-before.png record it.

## Required fidelity surfaces

- Fonts/typography: large regular event heading, compact navigation and legible
  product labels were checked. Inter is retained instead of copying AMP's
  proprietary condensed brand treatment. No arbitrary sitewide font change.
- Spacing/layout: warm search-first events layout; original-artwork poster rail;
  two-column phone event grid; horizontal showcase shelves; full-width shop
  grid; aligned footer. Real content counts, filters and commerce controls
  intentionally differ from the reference businesses.
- Colors/tokens: Mookh-grounded warm neutral directory, owned action/focus
  colors and explicitly requested white shop. Dark footer social icons remain
  visible. Poster overlays provide text contrast rather than replace artwork.
- Image quality: original catalogue posters, real founder photographs and
  existing owned portfolio/product media are used. No copied third-party
  product artwork, invented model bodies or new synthetic portraits.
  Missing artwork has a useful text state; direct detail URLs are preserved.
- Copy/content: real public records only. No fabricated completed work, stock,
  credentials, awards, biography facts, Wikipedia affiliation or "best/#1"
  competitor claims. The ticketing guide explains factual selection criteria.

## Interaction and responsive evidence

local-browser-journeys.json records14 route/viewport journeys: event search,
empty/reset, grid/list, all-events filters, mobile menu/Escape/focus return,
desktop scroll-to-pill, catalogue filtering, month navigation, keyboard dates
and horizontal shelf controls. Runtime errors: none in that run.
browser-first-pass.json records280/320/390/768/1024/1440 widths: no document
overflow, desktop links and mobile menu mutually exclusive.
browser-widephone.json records six additional routes at280 phone and980
desktop-request viewport with390 screen; no document overflow/runtime errors.

The source Nixtio nav measured816px expanded to445px after150px scrolling,
with300ms transitions. UGT uses the same100px threshold/measured contraction
and folding CTA behavior; its compact width differs because its real links
differ. UGT retains its supplied static logo, not Nixtio's proprietary Lottie.
An exact animated-logo/pixel-identical branding claim is not made.

Consent, reduced motion, focus view, critical checkout/account routes,
admin authentication and payment submission are preserved. Browser checks
do not submit payments, emails, WhatsApp messages or admin edits.

## Engineering evidence and remaining limits

The final full suite passes1077 tests with75 explicitly skipped; regressions
cover the shelf sizing, calendar entry and cold-load readiness. Typecheck
passes. Changed code has no lint errors. Full-repository lint still reports29
pre-existing errors in unchanged files; this release does not claim to resolve
that admin/auth/test debt. No40,000-request/minute or live-payment certification
is claimed.

## Final production-build recheck

The final Cloudflare build and Wrangler dry run pass. All14 browser journeys
pass again against the production Next build, without runtime errors.
local-browser-boundaries-final.json verifies the corrected wide-phone dialog,
an unobstructed footer, effectively immediate reduced-motion transitions and
no event placements on cart/account routes. Final focused evidence includes
ugt-menu-widephone-final.png and ugt-footer-desktop-final.png. These captures
were opened and inspected after the fixes; the final three-column desktop shop
was compared with amp-desktop-products-clear.png in the same input.

Actual production Worker-bundle checks pass33 shared-control routes,9 language
routes and5 editorial/private-path boundaries (47total). They use local Worker
bindings, not a claim of live provider-payment verification. Deployment/live
readback remains an operational release step, not a missing visual comparison.
The v1 main-site readback passed40 checks with all54 bindings, existing cron,
113 public posts,11 events and14 products retained. Live browser journeys and
metadata/XML checks also passed after the cold-load timing observation above.
The narrowed v2 follow-up passes its build, typecheck, lint, delayed-script
browser test, fourteen built-server journeys and the same47 Worker checks.
One existing console policy block remains: Cloudflare's automatically injected
analytics beacon is blocked by the site's CSP. The policy was not relaxed to
silence optional tracking; application runtime errors were checked separately.
No actionable P0/P1/P2 visual issue remains in this scoped release. No P3
cosmetic follow-up blocks it.

final result: passed
