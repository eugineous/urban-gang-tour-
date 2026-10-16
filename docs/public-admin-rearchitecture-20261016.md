# Urban Gang Tour: public website and Control Room rearchitecture
Date: 16 October 2026 (Africa/Nairobi)
Status: approved problem statement, proposed implementation contract. **Not an implemented redesign.**
Source of requirements: owner's live UX complaints and supplied Oct 11 reconstruction notes, existing Next.js app, October 15-16 admin/event work and public website pages.

## Decision
UGT is first a youth entertainment, talent, events and creative-production company. Its own projects and bookable services come before third-party discovery listings. Make proof of delivered work and upcoming opportunities continuously visible. A single public event ledger must feed homepage, events, portfolio, media and related stories. Preserve database, auth, payments, shop orders, existing paths and uploaded original assets.

## Source-backed issues
1. `AppShell.tsx` currently exposes both six desktop links and a hamburger containing Experience, Tour stops, Events, Portfolio, Shop, Gallery, News, Reels, About and other links. These compete for attention.
2. `EventDiscovery.tsx` is partly a Kenya-wide aggregator. UGT's owned/partner events must be the primary inventory; independent sellers remain secondary and clearly attributed.
3. `tour-stops` consumes a static `ui/data/tour-timeline.json` in addition to DB-backed `tour_events`. This makes recent completed items hard to keep consistent with the public event feed.
4. `partnerPublicationError` currently requires original image, organizer, client, role, venue and date before partner publication, causing the owner's reported failure. Remove nonessential blockers only for **noncommercial announcement**; do not loosen checkout/seller verification.
5. A first admin workflow release already landed in PR #71. Preserve it. The remaining task is visual shell, governed publishing, reusable event records, media albums and linked client relationships. Do not claim previous tests certify live owner flow.
6. Current shop must distinguish Color Blast official/current catalogue from legacy magenta identity without inventing SKUs or prices.

## Canonical navigation (PUBLIC)
Desktop header (always visible): logo/Home | Events | Our Work | What We Do | About | Shop | **Book Urban Gang Tour**. Cart icon only where commerce-relevant. No desktop hamburger as primary navigation; More can be a labelled menu for News, Gallery, Videos, Partnerships, FAQs and account.
Mobile top bar: UGT logo, **Events**, **Book**, labelled **Menu** anchored from the top header (not an unexplained side-edge affordance). Top-of-screen expansion/full-height sheet only when necessary, with large tap targets and focus trapping. No bottom navigation in the public site.
Aliases: `/tour-stops` and `/experience` remain live via meaningful redirects or indexable landing pages during transition; preserve links and measure traffic before any permanent redirect. `/events` is the unified event+tour directory. `/portfolio` is the evidence-first work directory.
Keep one canonical route per public item; aliases should not produce duplicate canonicals.

## Homepage order
1. Hero: who UGT serves, real stage footage/fallback poster, one-line proposition, **Book Urban Gang Tour**, secondary **See our work**. Video framed 16:9 with captions; no full-screen blocking autoplay.
2. Next Stop: confirmed next dated published UGT/partner appearance, typed School/Campus/Corporate/Festival badge, organizer attribution, location/time or honestly TBC, admin-configured CTA `Details` / `Join us` / `Get tickets`. When none exists, show recent work and booking CTA; never invent a date.
3. **Where we've been**: animated, accessible cross-sector chronological stop rail driven from published completed event records (not only schools), real logo/media when available, 3-6 cards initially and View all.
4. **Selected work**: strongest real recent case studies across school, campus, corporate and brand. Show actual UGT role.
5. **Clients & collaborators**: approved logos grouped as Client, Partner, Venue, Media feature, Sponsor; never equate appearance on a poster with a contracted client.
6. **What we do**: School Tour; Campus Rave (use owner-approved public programme spelling); Corporate & Institutional Events; Brand Activations and Commercial Content; Event Hosting/Production.
7. Upcoming public opportunities: dates/announcements including external partner appearances, separated from paid UGT ticket inventory.
8. Short authentic social proof or verified results; founder/host introduction, official merchandise preview and direct booking brief.
9. Lightweight footer with company, routes, privacy, policies, install guidance and contacts.
Motion supports the story; respect reduced-motion, performance budgets and user-controlled playback. Popup host video is closeable, not an unavoidable overlay, and must not reappear repeatedly after dismissal.

## Unified Events / Tour Stops
Top tabs: All | Upcoming | Past. Filter chips: School | Campus | Corporate | Festivals | Faith | Sports | Awards | Music | Other; search by name, school, institution, venue, city. Independent multi-dimensional facets are event format, audience/sector and UGT relationship, not one overloaded category.
Always lead with UGT-produced and UGT-contracted appearances. Third-party events can be under a separately labelled `Explore Kenya` section or dedicated filter, never masquerading as Urban Gang projects.
Each item has permalink, clear status, original organizer, **Our involvement**, date (or announced/TBC), location, cover generated from text/approved brand template if no art, photo/video gallery and relevant action. Completed events never show an active purchase CTA. Past event pages stay accessible and, if appropriate, indexable.
Completed work appears on `/events?tab=past`, homepage archive rail and portfolio when `showInPortfolio` is enabled. No manual duplicate copying. Cancellation/reschedule updates remain visible to relevant ticket holders and status must be accurate.
Keep school attendance private by default; `Join us` only with institution approval, and never equate a school tour with public ticket sales.

## Event publishing contracts
Do **not** require poster, precise time, description, UGT role or contracting client for a simple public announcement. Make an image-less event page with typographic card and `Details coming soon` placeholder.
Two release types:
A. **Announcement only**: minimum title, relationship (UGT-owned / contracted appearance / independent listing), category, approval to disclose and one of a confirmed date or explicit `Date to be announced`. Venue/organizer/client fields may be unknown but never assert UGT as organizer by default. Publish as `announced` presentation state without payments/structured Event rich-result markup while dates are missing.
B. **Ticketing enabled**: requires confirmed date/time, venue, seller/organizer attribution, valid admission/price/tier inventory and capacity where relevant, approved seller URL or server-configured owned checkout, and permission to sell. Preserve existing server-only price and inventory checks, session/role permissions and fraud safeguards.
C. **Completed work**: explicit verified completion and role, not just an old date; date may be historical/partial but label honestly. Events from external sellers cannot be assumed to have been delivered by UGT.
Lifecycle remains draft/review/published/ongoing/paused/sold-out/postponed/rescheduled/completed/archived. `Announcement only` is a publication mode/presentation capability; don't casually add a commercial status that existing payment code misinterprets.
Separate: display publication status, operational completion status, CTA mode, checkout eligibility, relationship and date confidence. Change existing `partnerPublicationError` and save/API validation in coordination, with targeted tests; do not simply remove all checks.

## ChatGPT event importer
Paste brief > Parse & classify > Review missing fields > Save draft > Publish announcement (optional) > Complete media/seller details later.
Multi-label taxonomy:
- Sector: school, university/campus, corporate, religious, community, public/civic, private, other
- Format: festival, talent competition, awards/gala, concert, colour festival, workshop, conference, sports, brand activation, worship, comedy, mixed
- UGT relationship: produced/owned, contracted performer/host/production, partner, media coverage only, independently listed
- Audience: public, students/private institution, invitation, staff/internal
- Admission: no ticket, free, invite-only, external seller, UGT paid tickets, unknown
- Lifecycle/temporal: date confirmed, date TBC, upcoming, ongoing, completed, postponed, cancelled
Use deterministic extraction for facts plus optionally AI for suggested tags. Show confidence and uncertainty. Owner can edit/override. Never hallucinate school, relationship, organizer, artwork, ticket price or date; never auto-sell. Existing Oct 16 importer can be expanded, not replaced.

## Portfolio and case-study contract
Hero: `The work. The audiences. The proof.` with immediately visible approved logo grid and service filters. Each real case study opens its own canonical detail page:
- event/project name, type, location and date
- client/organizer/UGT role as separate explicit values
- brief/problem, scope delivered, programme, genuine photos and YouTube or video, permitted credits
- verified metrics/results only when evidence exists
- related story, related events, booking CTA relevant to the service
Separate `Our Clients` (verified contracted), `Collaborators`, `Appearances`, `Sponsors`, and `Upcoming / Announced`. Never falsely say a future event was delivered. Prior school logo approval/permissions should be checked. Archive entries without full evidence get lightweight detail pages rather than fabricated case studies.

## What We Do (remove Experience menu label)
A services landing page plus differentiated route sections for School Tours, Campus Rave, Host & Live Production, Corporate & Institutional Events, Brand Activations / Commercials, Talent Development. `Campaign films` becomes `Brand Campaigns & Commercials` only when production credits are real; distinguish on-screen talent from agency-created advertising. Every service page shows real selected work, expected deliverables, FAQ and a contextual booking brief.

## About, hosts, partnerships, media
Company-first About: history verified by owner; mission `From Potential to Purpose`; programme model; audiences, activities, milestones; press/brand kit and team. Eugine and Lucy each get well-sourced, substantial professional profile, not unsupported encyclopedia claims. Partners page includes sponsor opportunities, types of deliverables and downloadable proposal after approved facts. Gallery, Reels and News stay available as secondary journeys and from each case-study/event page. Uploaded media rights, institution/guardian permissions and captioning matter.

## Shop
Feature currently approved Color Blast merchandise first; legacy magenta logo products in a labelled Archive/Previous Collections section only if actually offered. Do not mix discontinued products with active stock. Product grid images = approved product photo, detail, size guide, colour variants, model view and fabric/fit. Display actual server stock/prices, Kenya delivery and pickup rules, full costs before payment, transparent return/refund and server-enforced per-SKU eligibility for free name printing. Only use approved subject portraits for identity-preserving mockups, marked as mockups; no invented real models/photos or product SKUs. Never expose M-Pesa/Stripe/Paystack secrets client-side. Preserve order/receipt/idempotency controls.

## Admin / Control Room mobile-first
Desktop: visible grouped left rail + global search, breadcrumbs, high-contrast state chips, contextual quick actions. Phone: compact top header, labelled task selector and a limited bottom action bar *within admin only* if tested for usability; no wide tables, horizontally clipped images, or editor-only controls below the fold.
Primary tabs: Today | Events | Portfolio | Media | Shop | Bookings | Inbox | Clients | Finance | Settings. Existing deep ops modules remain accessible under contextual subnav.
Today shows upcoming stops, items waiting for approval, unsaved drafts, payment/inbox follow-ups and recent edits; role-specific permissions.
One editor pattern: Basic details (fast) | Media (optional for announcements) | Sales & Admission (restricted) | Publication/Preview. Persistent save, version/undo, mobile preview, publish confirmation and error feedback. Keep drafts recoverable; not all prior editors yet have server autosave.
Event record links crew, budget, client, venue, media, posters, story and payments but none of these should be prerequisites for a simple announcement.
Cards on mobile; dense optional table on large desktop. Bulk publishing and media upload show individual progress/errors; no implicit silent overwrite. Clear admin roles and server-side authorization.
Accessibility: keyboard focus, explicit labels, 44x44 px preferred touch areas, WCAG 2.2 AA floor, 200% zoom/reflow, focus-visible and reduced motion.

## Installable site / app
Evaluate PWA manifest/icons, scope, HTTPS, compatible service worker and careful caching, genuine Android install prompt where supported; iOS Safari guide for Add to Home Screen. Do not call it an App Store/Play Store app unless it is published there. Separate staff session and customer offline behavior: never cache private/admin/payment pages or API responses as public offline content. Measure before claiming installability.

## Data design / migration
Extend existing `tour_events` additively with nullable metadata: `event_sector`, `formats`, `ugt_relationship`, `date_precision`, `admission_mode`, `publication_mode`, `display_priority`, `show_in_portfolio`, `featured`, `media_album_id`, `approved_logo_id`, `client_id`, `organizer_id`, `source_confirmation`. Prefer normalized relationship tables for approved client/org credits and case-study/media many-to-many. Existing kind and ticket inventory ownership rules must not be weakened. Migrate static school/tour archive using signed-off event IDs, not automated assumptions. Preserve all slugs with 301 redirects as appropriate, never delete purchased order references. One read model/query shared by home/events/portfolio/detail; reuse microcaching and invalidate on publication.

## Sequence, one vertical slice per PR
P0 A: Baseline production/branch audit and owner-visible real-user screenshots at 320/390/430/768/1024/1440/1920; freeze current API behavior and back up relevant data. Document permission limitations. No change to main.
P0 B: Event publication mode+API parity, artwork-optional cards, reliable public appearance, completed archive linked to feed. Tests: image-less partner announcement, future date TBC, false organizer, no public purchase on partner, unauthorized draft, cache invalidation.
P0 C: Unified Events / Tour Stops route with tabs, filters and past archives. Ensure gallery/media and old /tour-stops links resolve properly.
P1 D: Homepage and shared responsive nav; next-stop query, real cross-sector archive, company-first proof. Keep 16:9 host film and closeable promo.
P1 E: Portfolio/case studies/client roles and differentiated service pages. Only approved media/logos.
P1 F: Admin mobile shell and event workflows, then CMS and collection/albums.
P2 G: Shop visual update without changing payment contracts.
P2 H: About/profile/partners/news, PWA guidance/install support, legal disclosure and technical SEO.
Every PR includes source diff, automated tests, viewport screenshots, accessibility checks, review link, and rollback plan. Do NOT merge/deploy unrelated work without explicit release approval.

## Acceptance criteria (must be demonstrated)
- Owner creates artwork-free Campus event as public announcement in mobile admin; after server acknowledgment, it appears in Events, relevant homepage module, and portfolio if eligible. No fake poster, ticket or client claim.
- Owner marks a verified School or Corporate event Completed; it remains in Past and Portfolio where enabled, never as upcoming inventory; original URLs work.
- Event importer suggests correct independent sector/format/relationship tags and allows override; missing date/organizer is never fabricated.
- Desktop shows primary links with no dependency on hamburger; mobile Menu is obvious in top header and Book always discoverable.
- All major pages at listed viewports have no unintended horizontal overflow, cropped CTAs, inaccessible overlays, or broken images.
- Shop carries current vs legacy branding explicitly; checkout values and name-printing eligibility remain server-controlled; provider connection verified with authorized test environment, no live charge as UX test.
- Read-only site and authenticated staff flow measured separately. Metrics: publish completion time, failure rate, event-to-archive coverage, quote requests, event-detail clicks, mobile task success, Core Web Vitals.
- No false claims of performance, legality, delivered event, client relationships, or payment availability.

## Research and benchmarks (not copied designs)
- Nielsen Norman Group, hidden navigation harms discoverability, especially desktop: https://www.nngroup.com/articles/hamburger-menus/
- NN/G mobile combined navigation: https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- Ticket Tailor, accessible Past events tab: https://help.tickettailor.com/en/articles/10439770-how-can-i-view-past-events
- Eventbrite, organizer profile public-event grouping: https://www.eventbrite.com.au/help/en-au/articles/161196/how-to-set-up-your-organizer-profile-page/
- Yellow House Events work filtering: https://yellowhouseevents.com/work/
- We Outside Kenyan produced-events case studies: https://weoutside.co.ke/portfolio
- WCAG 2.2 accessibility/tap-size: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Google Event data and reschedules: https://developers.google.com/search/docs/appearance/structured-data/event
- Apple iPhone Add to Home Screen: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27

## Release safety
Existing Oct 16 PR #71 is already deployed, but is not a full UI redesign. This plan alone changes no UI, records, payment keys or deployments. Any implementation requires separate tested code PR(s), approval and controlled Cloudflare release according to AGENTS.md.
