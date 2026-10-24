# Homepage-first experience refinement — 24 October 2026

## Scope and preservation

Continue the owner-approved existing-site refinement and tested feature-branch,
PR and Cloudflare release. The latest request reopens shop reliability work, but
does not authorize catalogue, price, stock, provider credential or customer-data
changes. No live payment/STK, test messages, document issuance or publication
changes are part of verification. Preserve authentication, consent, private
editorial gates, bindings and scheduled jobs.

## Screenshot-led findings and changes

1. The phone homepage had 162px below its three actions. A stretching grid and
   content-safe minimum height reduce this to 18px (desktop 40px), including long
   owner-written copy. The selected cover remains a poster, not a video off-switch.
2. The tour video remains first-party, muted, inline and adaptive. It pauses for
   reduced-motion changes and offscreen/hidden state; explicit Play can override
   reduced motion. Save-data starts on a poster. Retry retains useful page actions.
3. Keep the cart icon and real navigation destinations. Browser-language detection
   and the existing explicit public-only translation override live in the footer,
   not the header. English content retains an honest document language. This is
   not a claim that all content, checkout or legal terms have been translated.
4. New pages/reloads start at the top; preserve explicit element destinations and
   native browser text-fragment activation on entry. This uses actual Chromium, not mocked
   visible hashes. Native Back/Forward Cache history intentionally retains its
   previous position; the new-page/reload rule does not change Back history.
   Element destinations inserted in hidden streamed containers wait for their
   first visible layout; observers disconnect before scrolling and on navigation.
   Browsers hide/consume text directives: a reload with no observable element hash
   follows the top-on-reload rule, not an emulated hidden text/history position.
5. Restore the clients archive using 22 existing owned logos and historical context,
   with working archive/service destinations and an adult-category disclosure.
   Concrete local logo-height caps resolve a reproduced shared-image CSS conflict.
6. Reuse the existing crawlable newsroom. Sort full publication instants before
   trimming homepage SSR data; retain all eligible stories, unique metadata,
   canonical links, semantic dates, topic/search/history state and pagination.
   Failed refreshes withdraw stale cards and show an honest retry state.
7. Fulfillment options fail visibly and hold checkout until recovered. Confirmed
   paid matching carts notify shared controls when cleared. Unknown payment attempts
   retain their existing recovery path, never an invented success or a second STK.
8. Mobile admin controls, cards, invoice selectors and document line items reflow;
   existing authenticated PDF/payment guards and APIs remain unchanged.
9. Eligible automatic popups stay pinned while open, retain consent/caps/focus/Escape,
   and avoid private routes. Conditional exact advertising origins preserve CSP.

The reference sites informed clear video/art emphasis, concise CTAs and visual
rhythm; no reference assets were copied. Existing owned imagery, brand colors,
scroll entrances and an original motion-safe yellow spark retain the site's identity.

## Verification and limits

Evidence is stored outside Git in `/workspace/artifacts/ugt-home-energy-20261024`.
The stable final suite passed 1,330 tests with 75 skipped (187 passed test files,
9 skipped). Homepage browser checks passed at six sizes (320–1440px, including
short landscape), plus save-data and failed-video recovery. Normal and manual
reduced-motion playback passed separately. Independent code review's chronology
and native text-fragment findings were fixed and retested before release.
Regression tests were observed failing before their fixes. Local browser checks
cover responsive layouts, clients/news journeys, checkout recovery, 93 admin-module
openings, 76 admin layout checks, and private PDF guards. Final full-suite/build/
Worker/live results are recorded in the release evidence, not inferred from these
focused results. The two lint errors in touched admin files predate this release;
do not describe repository lint as clean.

Production has no eligible configured campaign in the public feed and `/ads.txt`
returns an explicit not-configured response. No publisher ID or campaign was
invented. Enabling actual paid advertising requires the owner's valid publisher
configuration; actual promotional appearance requires a real eligible campaign.

Chromium automation and HTTP/TLS UA checks are not branded Brave, physical Safari,
load-testing, universal accessibility certification, live STK/provider readiness,
guaranteed indexing/rankings, or a promise of zero failures. Search discovery and
direct browser reachability are separate concerns.
