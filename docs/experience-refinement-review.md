# Urban Gang Tour experience refinement review

9 October 2026. Feature branch: `codex/site-experience-refinement`.

## Review scope and release boundary

The current public website was inspected and captured at 390 × 844, 820 × 1180 and 1440 × 900. The refinement applies one shared interface to public content and real transaction screens. The existing owner-private ChatGPT Site remains the place to review changes. The owner subsequently explicitly authorized deployment of this refinement to urbangangtour.co.ke on 9 October 2026. This release will use the existing Cloudflare Worker and no R2 binding.

## Numbered findings and changes

1. **Navigation and orientation.** “Menu” becomes “Explore.” Contact stays last; the remaining destinations retain their existing alphabetical order. The shared header, page titles, breadcrumb links, back actions and current-location states remain real routes. The Control Room retains its own navigation and permission checks.
2. **Client proof.** The homepage rail previously selected six logos. It now includes all 22 supplied logo assets in two matching groups for a seamless, continuous loop. These are supplied assets, not a claim that there are 22 paying customers. Hover does not stop the rail. A visible Pause control and Focus view still let visitors stop movement.
3. **Video rails.** Hover does not pause motion, and releasing a touch interaction resumes scrolling. Only visible previews play. Native players keep the original footage and sound available when opened. Motion follows reduced-motion, Focus view and Save-Data preferences. Animation and playback stop together when a visitor opens navigation or leaves the page, and resume appropriately after returning.
4. **Reels.** Reels retains the website header and uses a dedicated vertical feed without sidebars. The toolbar now has readable contrast. Search, categories, saved clips, sound, pause, sharing, error recovery and direct clip links are available. Matching end frames wrap the feed back to its beginning. The next and previous clip are prepared, rather than eagerly loading every original video. Adult commercial clips stay outside the general feed.
5. **Booking invitation.** The popup uses a real, cropped, silent video of Eugine Micah and Lucy Ogunde with no visible logos. It appears after at least 12 seconds, a meaningful scroll and 2.5 seconds without interaction, once per browser while local storage remains available. Portfolio, tour-stop and individual collection journeys are also excluded. It does not appear on checkout, payment, booking, account, Reels, admin or organizer dashboards. Form interaction suppresses it; this fixes a newsletter retry that the initial E2E run found it could cover. Closing, Escape and “Keep exploring” dismiss it. There is no fabricated scarcity, attendance claim or guaranteed availability.
6. **Reading rhythm.** Shared spacing, narrower reading measures, readable metadata, calmer card treatments, clear selected states and 44–48 px action targets improve public pages. Phone cards stack and category tabs scroll horizontally; tablet layouts use intermediate grids. The Reels video area fills the viewport below its actual controls. Tiny screens receive a simple browser fallback, not a claim of a native smartwatch application.
7. **Contact and booking.** The floating contact preview is larger and uses both hosts. Its hover, focus and docked arrow states are clearer. It stays out of critical forms. Booking exposes the essentials first, with date, phone and attendance details optional where the backend permits them. School authorization and privacy acknowledgement remain required. The real form preserves server request IDs, timeouts and retry behavior.
8. **Sharing.** Stories, collections and discovery pages support native sharing, WhatsApp and copying a link. Links use the current origin so a private review does not accidentally send visitors to an older public interface. When clipboard access fails, a selectable link is provided.
9. **Operations.** Shared Control Room styles improve module controls, tables, labels, focus states and narrow layouts. Module search has an empty state. Quick actions preserve their URL, and users can return to Today. The security and Gmail connection cards use the same design language. Authenticated module checks use fixtures; existing server authentication, role scopes and customer privacy rules remain intact. The private review retains its 12 grouped workspaces, organizer flow, merchandise ledger and document tools.

## Main user journeys

| Journey | Expected path |
|---|---|
| School or campus booking | Choose event type → share a brief → discuss availability and quote → confirm separately |
| Merchandise | Product and variant → cart → checkout → confirmed payment → receipt and fulfillment |
| Own-event tickets | Event and ticket tier → checkout → server settlement → issued ticket and receipt → authenticated gate validation |
| External events | Search/filter → attributed event → original seller; no claim that Urban Gang processed the sale |
| Reels | Swipe → save/share → collection or booking; sound and motion remain controllable |
| Admin | Server session and allowed modules → Today or requested module → linked operational record |
| Private review | Sample order/draft → explicit preview confirmation; no live charge or mail send |

## Evidence and limits

The private review includes a results page and individual screenshots. 218 unit tests passed; 80 Chromium/WebKit responsive route checks passed; 1,110 private route checks passed. The tester-army framework passed 137 of 138 scenarios in the full run; the repaired remaining tablet tour-stop journey then passed in isolation. A stale CDP service-worker target required a clean browser profile for that rerun. The Next.js/Cloudflare and private static builds passed. Lint passed with existing warnings. Customer data, payment callbacks and Gmail delivery are tested with fixtures or explicit compose handoffs; no real purchase, mailing or customer record was created by these checks.

WebKit is a browser engine test, not an actual iPhone or Apple Watch certification. During the sweep, the Linux WebKit runner stalled on navigation after playing and interacting with several looping players. Individual clip, direct-link and reduced-motion checks passed. Media-heavy navigation and playback on physical iOS hardware remain a release check; do not describe every browser flow as verified while that issue remains unresolved.

The 200 × 300 layout is a small browser fallback. Native watch permissions, playback, authentication and app-store distribution are not part of this change. Continuous playback also remains subject to a browser's autoplay and network policies.

No new marketing integration has been switched on, no external campaign was posted, and no search-ranking or conversion lift is guaranteed. Use actual booking funnel data to measure results after an approved public release.

## Research applied

- [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): generous touch controls and adequate spacing.
- [WCAG pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html): continuous movement remains user-controllable.
- [Recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/): visible labels, familiar destinations and clear selected categories.
- [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): the booking essentials appear before optional details.

These principles inform decisions. They are not evidence of a “1000×” conversion increase for this business.
