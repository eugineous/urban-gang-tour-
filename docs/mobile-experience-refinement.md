# Mobile-first experience refinement

References inspected directly on 9 October 2026: Mookh event discovery and Nixtio mobile homepage. Screenshots are in `evidence/mobile-refinement/`.

## Changes

- Native AppShell retains a single responsive renderer. The hamburger has a 48px target and accessible open/close labels, without the visible Explore label.
- Menu uses two columns on phones, three in landscape, one on very narrow displays, and scrolls inside the remaining viewport. Existing focus trap and Escape behavior remain; shade dismissal restores focus and the underlying main is inert while open.
- Video rail cards keep a 16:9 preview bounded by viewport width and height. Source video uses contain to avoid distortion. Continuous scrolling survives hover; portrait/landscape rotation is checked. Reduced motion and manual pause remain available.
- Landscape motion control no longer stretches between top and bottom offsets. Floating contact card is hidden in short landscape viewports so it cannot cover the booking CTA.
- Events now starts with search and horizontal categories, followed by entertainment picks and a compact poster grid. Further filters are optional. Own events retain priority and native ticket links; outside sellers retain their original purchase destinations. Live polling, ranking, consent-gated interest signals, source disclosures and tour links remain.
- Shared page intros, heading scales, service grids, contact and booking layouts adapt to touch tablets and landscape phones. Existing photography and media are preserved.

## Verification

- TypeScript and 205 unit tests pass.
- Chromium and WebKit each pass 210 responsive route checks (420 total).
- TesterArmy e2e runner passes 9 affected-flow cases: Events load/refresh, newsletter failure/retry, and Shop → Contact → Book navigation at phone, tablet and desktop widths.
- Production Next build and Cloudflare Worker bundling/dry run pass. Bindings remain Assets, KV and Worker self-reference; no R2.
- `scripts/mobile-experience-e2e.mjs`: 42 routes at 390×844, 360×740, 844×390, 820×1180 and 1440×900. Checks include single H1, horizontal overflow, runtime exceptions, menu dimensions/Escape, 16:9 video bounds, event filter/search/reset behavior. External video player and event feed are controlled fixtures for repeatability. This does not constitute a real purchase or a live email/payment-provider test.
- Separate real rotation and continuous-scroll/hover check passes on production build.
- Private static design review checked at four screen sizes. It presents the design; the production repository remains the authoritative backend implementation.

Public deployment is not part of this unreviewed change. The existing owner-private Sites review is the review destination.
