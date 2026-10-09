# User-flow sweep and V25 retirement

9 October 2026. Working branch: `codex/full-user-flow-sweep`. The public Cloudflare Worker has not been updated by this work.

## Replacements

- Deleted the V25 template, separate React/vendor loader, captured HTML pages, boot veil, bottom navigation, obsolete capture/diagnostic scripts, and unused template-rewriting code. Removed demo commerce/account/organizer implementations from the information-page renderer.
- Kept the approved marketing interface and reused its navigation, media, contact footer and motion. Admin and organizer operational dashboards use their own workspace navigation.
- Added real shop, bag, checkout and booking components. Existing `ugt_cart` entries migrate into the new bag. Variation prices display correctly; submitted prices remain server authoritative.
- Kept M-Pesa, merchandise card checkout, promo codes, marketplace checkout, accounts, receipts, ticket verification, organizer operations and admin permission checks connected to their existing APIs.
- Payment returns poll recorded settlement. A pending order is never presented as paid. Confirmed merchandise orders clear only the matching checkout bag. M-Pesa retries reuse the same idempotency key; booking retries reuse the same request ID.
- Corrected Documents navigation and login deep links, branding reset between events, mobile document control clipping, missing gallery destinations, and retry states for organizer event loading, bank lists and ticket verification.
- Removed malformed offline document markup. Account and operational API requests have bounded timeouts. Google sign-in loads only after the admin login card hydrates.
- Replaced fixed header overlap with proper page spacing; public navigation does not cover admin controls. Production no longer requires CSP unsafe-eval for a template runtime.

## Verification

204 unit tests pass. Production Next/OpenNext build and dry-run Worker bundle pass. Commerce, booking, organizer and account journeys pass at the tested widths. All 29 Control Room modules open at each width; 33 Safari-engine route checks pass. The public-page inventory found no broken internal links among 47 checked destinations. Anonymous access checks deny protected admin/organizer APIs and keep the document studio behind login. TesterArmy coverage is complete: 135 checks passed in the full run and the three homepage checks passed on a fresh-browser rerun, for 138 verified checks. The first homepage attempts failed because the SDK attached to a stale service-worker target, rather than because of a page failure. Native Chromium and WebKit homepage checks also pass.

The TesterArmy SDK suite covers 33 route load/refresh cases plus 13 important interaction cases at 390, 820 and 1440 pixels (138 checks). Additional Playwright suites exercise shop/cart/checkout, old-cart migration, paid-cart clearing, card fallback, booking retries, accounts, organizer workflows, 29 Control Room modules, media continuity, gallery gestures, and reduced motion. WebKit checks cover 11 routes at each width.

API writes in positive browser tests are fictional intercepted fixtures. Separate unit tests and anonymous endpoint reads check actual server boundaries. No customer purchases, emails or authenticated production records are modified. Mocked tests do not prove successful bank settlement or delivery to Gmail. Physical iOS/Android devices have not been tested.

## Review gate

Update only the existing owner-private ChatGPT Site. No public Cloudflare deployment, no merge to main, and no R2 reactivation. Business records, owned photography/video, payment verification and stock ledgers are preserved. Git history retains previous revisions for traceability; retired frontend code is absent from the new build.
