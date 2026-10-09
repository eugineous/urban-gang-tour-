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

## Mobile layout, contact docking, event discovery and Google sign-in follow-up

- Restored the phone homepage hero to a portrait layout of at least 830px or one viewport. Desktop retains its own composition; no V25 runtime or bottom navigation was restored.
- Removed the visible contact-card grip. A 420ms hold activates dragging; a normal tap still opens the card. Edge docking, side-aware arrows, persisted position, viewport bounds and Alt+arrow keyboard controls are supported. Keyboard docking and Escape share one handler.
- Discovery checks run every three minutes and on return to the tab. Own published upcoming events are refreshed independently and ranked by descending owner priority before external recommendations. New own listings produce a dismissible notice above the contact card.
- Added rate-limited, anonymous aggregate event-interest storage using the existing `traffic` table, with no new R2 storage. Consented searches matching a single event and outbound ticket clicks contribute a capped score over a seven-day window. Raw search strings and contact details are not recorded. Inquiry signal ingestion is supported by the API but no fabricated inquiry counts are added. This is a recommendation heuristic, not an authenticated measure of ticket sales or a Google ranking guarantee.
- Added official Google Identity Services buttons to existing buyer and organizer login screens. Token validation checks audience, issuer, expiry, verified email and Google's authority for the email domain. Existing accounts only; no automatic account creation or organizer approval. User and organizer cookies remain distinct. Admin retains its allowlist, receives a responsive rectangular Google button, and Google token verification has an eight-second timeout.
- The private static review shows Google button designs with an explicit preview label; it never simulates a successful real Google login. Production still needs the existing Google client ID, approved JavaScript origin and a connected database/session secret.

Validation for this follow-up: 211 unit tests passed, including verified Google identity boundaries, origin/field rejection, unknown-account rejection, pending organizer rejection, and separate signed session cookies. Production Worker and private static builds passed. Browser evidence and follow-up results are recorded in the associated execution logs; Google browser callbacks use fictional intercepted credentials, not a real Google account.

Final browser follow-up results:
- Chromium + WebKit: contact docking, long press, restored mobile hero, persistence, keyboard alternative, tap behavior and overflow passed at 390, 820 and 1440 pixels (six cases), in both the Worker and private static review builds.
- Public Worker routes and interactions passed at three widths, including gallery swipe, reels, newsletter and reduced-motion controls.
- Final Worker: consent gating, aggregate demand ranking, refreshed own-event hero priority and real pointer dismissal of the update notice passed.
- Final Worker: fictional Google ID-token callbacks passed at 390 and 1440 pixels. Buyer sign-in updates the account view; pending organizers cannot proceed to their dashboard.
- The final update is published only to the existing owner-private ChatGPT Site. No production Worker deployment or main-branch merge is part of this follow-up.
