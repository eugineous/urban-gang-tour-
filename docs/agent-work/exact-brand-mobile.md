# Exact-brand mobile refinement evidence

Plan: `docs/superpowers/plans/2026-11-09-exact-brand-mobile.md`.

- Owner's six refinements implemented inline in the existing linked release worktree.
- Navigation/artwork/event-selection tests first failed against the prior implementation; 21 rendered/data tests then passed.
- Phone Chromium checks cover normal/wide Android layout, six-language target fit, complete uncropped images, one-second eligible poster rotation, pause, single poster and reduced motion.
- Independent read-only whole-change review found shared manual Resume, stopped-rail browsing and first-retry media recovery gaps. Real-browser regression checks reproduced each before fixes; all three are in the single fix pass. Also removed delayed campaigns/booking invitation from Apply.
- Ruling: full uncropped poster/host imagery takes priority over fitting both card actions above the fold on a short phone; actions remain scroll-reachable and dock-safe. No image content is cropped merely to retain the old height assertion.
- Ruling: no eligible upcoming posters means a single explicitly labelled recent archive, preserving the existing exact-artwork hold; no invented event or ticket availability.
- Original shirt marks now use the original raster asset as anchored image layers; hero marks are grayscale. Welcome artwork is a clean-shirt editorial illustration, not event photography. Original masters and provenance retained.
- 21st catalogue search unavailable without sign-in; existing local design context/components were reused. 21st review: five changed UI files, zero findings.
- No financial/customer-message tests, credential changes, new backend submissions or publication mutations.
- Physical Android devices and paid checkout are not verified by browser emulation.

Final focused run: 100 tests passed across eight files, including eleven real-browser phone checks. Independent review's important findings are fixed; the moving failure-test target was stabilized before verifying one-click recovery. Typecheck passes; lint reports existing native-image/link recommendations, no errors.

The repository-wide suite is not green. A separate untouched `f4b9274` worktree reproduces the old payment-client harness `document is not defined` failures, both raw-HTML homepage heading assertions, the desktop light-header assertion, and old cart/international-copy assertions. New navigation expectations are updated for the deliberately changed Apply route. No payment production code is modified to silence unrelated test harness failures. Final counts and release results are recorded in the PR/private release artifacts.
