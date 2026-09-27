# UGT Public Redesign — Design Spec (APPROVED)

**Date:** 2026-09-27 (Africa/Nairobi)  
**Branch:** `ui-ux-redesign`  
**Repo:** `C:\ugt-control-room`  
**Status:** APPROVED for implementation on this branch  
**Companion DNA audit:** [2026-09-27-ugt-public-ui-restudy.md](./2026-09-27-ugt-public-ui-restudy.md)

This is the redesign brief. It is **not** a UI patch list and **not** permission to ship Control Room work. Implement against this document; treat the restudy as the DNA source that this spec amplifies.

---

## 1. Goal & non-goals

### Goal

Rebuild the **entire public site** as one coherent product: marketing, discovery, shop, booking, and ticket UX — Meta/Grok-caliber craft that amplifies Urban Gang’s loud Kenyan youth-culture DNA (neo-brutal collage, magenta broadcast energy) instead of copying legacy V25 layouts or papering over seams.

Optimize **three conversion hubs equally**:

1. **Tickets** (Events world — discovery → event poster → checkout → ticket artifacts)
2. **Book the tour** (Tour-Book world — myth → booking → collab doors)
3. **Shop** (Shop world — grid → PDP → bag → pay success)

Visual direction (approved): **maximalist collage** on Home + The Tour (Experience); **quieter, precise motion** everywhere else.

Architecture direction (approved): **Approach B — three poster worlds** (Events / Tour-Book / Shop), colliding on Home, sharing one design system and one public shell.

### Non-goals

- No Control Room, organizer portal, gate, or admin API redesign in this effort.
- No inventing attendance, partnership, school-count, or commercial claims.
- No copying V25 capture markup into the new system.
- No dual mobile engines (no `MobileApp` fork beside the responsive shell).
- No UI implementation in the commit that lands this spec.
- No push from this docs-only step.

---

## 2. Constraints

| Constraint | Rule |
|------------|------|
| **Truthful commerce** | Preserve server-confirmed availability, pricing, lifecycle states (sold out / postponed / rescheduled / sale windows / per-tier capacity). Do not invent stock, dates, or partner claims. Copy tone may elevate; facts stay editorial/legal-owned. |
| **No invented commercial facts** | SEO/JSON-LD and UI may only assert what the product already asserts (broadcast partner, founders, etc.). New marketing lines must not fabricate numbers. |
| **Branch workflow** | Work on `ui-ux-redesign`. Push and merge on this branch are **allowed per Eugine** for redesign progress. Still do not force-push; prefer normal commits and PRs when opening review. |
| **PR #29 inherited history** | Events reconstruction (PR #29 / `events-reconstruction`) may exist in ancestry or parallel history. The redesign branch is **separate**. Do not reopen PR #29 scope, do not rewrite its commercial-truth resolver for cosmetic reasons, and do not conflate deploy-infra work with public UI redesign. Prefer importing truthful events/ticket behavior; redesign owns presentation. |
| **Security & payments** | `AGENTS.md` remains authoritative: server-side prices, idempotency, rate-limit tiers, `hasDb()`, no public contact leakage. Redesign must not regress checkout/ticket correctness. |
| **One public engine** | End the native shell + V25 capture + MobileApp triad. One responsive public shell; BottomTabBar stays as chrome, not a second product. |
| **Real routes** | Keep one crawlable URL per page, unique metadata/canonicals, real `<a href>` navigation. |

---

## 3. Information architecture

### 3.1 Home as collision

Home is where the **three poster worlds collide**:

| Path | World | Primary door |
|------|-------|--------------|
| **01 — Tour** | Tour-Book | The Tour (`/experience`) → Book (`/book`) |
| **02 — Tickets** | Events | Events (`/events`) → event detail → ticket booth |
| **03 — Wear** | Shop | Shop (`/shop`) → PDP → bag |

Home stays loud collage: hero, live culture strip, three-path monument, gallery teaser, merch strip, news teaser, founders. It does not deep-sell every hub; it **routes** with equal visual weight on the three CTAs.

### 3.2 Three poster worlds

**World A — Events (Tickets)**  
Calendar and money for shows. Loud utility after Home. UGT-hosted events and Marketplace share one visual family with unmistakable “Hosted by …” labeling. Event detail = poster that becomes checkout. Ticket wallet / e-ticket / verify stay dark ceremonial artifacts.

**World B — Tour-Book**  
Myth + institutional conversion. Experience is the maximalist collage home for “one day, one institution.” Book is the primary conversion instrument for schools/campuses/brands. About + The Gang supply trust and faces. Work With Us and Partners are first-class collab doors.

**World C — Shop**  
Merch as identity (“Wear the culture / Wear the signal”). One continuum: index → PDP → bag → pay success. Cream/magenta neo-brutal tokens; KES honesty; sticker-chip variants.

### 3.3 Separated intent doors (approved)

| Route | Intent | Must not share |
|-------|--------|----------------|
| `/book` | Book the tour (institutional booking) | Contact form capture |
| `/work-with-us` | Collab / hire UGT / partnerships entry | Booking form |
| `/contact-us` | General contact / press routing / support | Booking form |

Today Book and Contact share `contact.html`; Work With Us is a stub. Redesign gives each its own native page and craft level.

### 3.4 Blog as sister brand

Urban News (`/blog`, `/blog/[slug]`) keeps Titan One / tape / news-gold as a **deliberate sister brand** under the magenta mothership. It may stay wilder than Events/Shop grids without fracturing the shell chrome or token system.

### 3.5 Press lane

Add a clear **Press** destination (route name: `/press`) for media kits, logos, founder bios for journalists, and broadcast credits. Footer and Contact can deep-link here. Partners stay commercial; Press stays media. Do not invent press quotes or coverage stats.

### 3.6 Canonical primary nav (one label set)

**Desktop / PublicHeader:**  
Events · The Tour · Urban News · Gallery · Shop · **Book the tour** (yellow money CTA)

**Menu sheet / footer extras (same labels everywhere):**  
About · The Gang · Work With Us · Partners · Press · Contact · FAQ · Account · Legal links

**Mobile BottomTabBar:**  
Home · Tickets (`/events`) · **Book** (raised yellow) · Shop · Gallery · Menu

Fix known drift: footer `/privacy` → `/privacy-policy`; kill duplicate “Work with UGT” / “Work With Us” labels; align SITE.ROUTES SEO map with shell labels.

### 3.7 Redirects to preserve

Keep existing public aliases (`/tour` → `/experience`, `/tickets` → `/events`, `/merch` → `/shop`, `/news` → `/blog`, etc.). New Press route gets its own canonical; do not steal Partners’ URL.

---

## 4. Visual system

### 4.1 Color tokens

Codify observed DNA (do not invent new primaries):

| Token | Value | Role |
|-------|-------|------|
| `--ugt-magenta` | `#E6218C` | Brand field, heroes, stage |
| `--ugt-yellow` | `#FFD400` | Money CTA, kickers, selection |
| `--ugt-cyan` | `#21C7E6` | Secondary accent, shop shadow, chips |
| `--ugt-ink` | `#111111` | Borders, type, chrome bars, brutal shadows |
| `--ugt-cream` | `#fffafc` | Soft canvas |
| `--ugt-blush` | `#f8f4ec` / `#f1ede5` / `#f7f2e9` | PDP / content canvases |
| `--ugt-night` | `#0c0c0c` | Ticket temple, marketplace, pay seriousness |
| `--ugt-news-ink` | `#1A0E14` | Urban News chrome |
| `--ugt-news-gold` | `#F7A81B` | Urban News sister accent (cousin of yellow, not identical) |
| `--ugt-whatsapp` | `#25D366` | FAB only |

Surfaces: magenta *as stage* for FAQ/legal/authors; cream for shop continuum; night for money artifacts.

### 4.2 Type

Global faces already loaded — assign roles, stop snowflake pairing:

| Face | Role |
|------|------|
| **Anton** | Display shout headlines (uppercase, tight leading, optional stroke) |
| **Permanent Marker** | Slogan / hand energy / warm moments (“asante sana”, stickers) |
| **Space Grotesk** | Body + UI chrome |
| **Titan One + Archivo** | Urban News sister brand only |
| **Bungee / Spline Sans Mono** | Sparse accent / monospace refs on tickets |

Type scale: define display / H1–H3 / body / kicker / micro in one token file; Events list and Experience must share the same scale rhythm.

### 4.3 Components (library, not one-offs)

Build once, reuse across worlds:

1. **PublicShell** — header, footer, skip link, BottomTabBar, WhatsApp FAB placement rules.
2. **PosterCard** — neo-brutal frame (2–4px ink border + hard offset shadow `3px 3px 0` → `8px 8px 0`).
3. **StickerChip** — tilted status/price/tier tags (`rotate(-2deg)` scale).
4. **MoneyButton** — yellow primary CTA + magenta offset shadow (Book / Buy / Checkout).
5. **GhostButton / InkButton** — secondary actions.
6. **PathCard** — numbered 01/02/03 (yellow / cyan / black) for Home and wayfinding echoes.
7. **StatusStamp** — truthful lifecycle chips (on sale, sold out, postponed, rescheduled, hosted-by).
8. **TierBoard** — ticket tiers as sticker UI on event posters.
9. **VariantChips** — shop size/color stickers.
10. **NightStage** — dark radial shell for tickets, verify, marketplace checkout, pay success.
11. **LegalCard** — white/cream card on magenta stage.
12. **NewsPoster** — sister-brand article card (tape, wiggle asterisk, dual-color title).
13. **FormField** — shared booking/contact/work forms (label, error, focus ring).
14. **Marquee / Chyron** — Home + Tour only.

End inline-style snowflake pages; migrate Events/Marketplace/Legal onto tokens + these components.

### 4.4 Motion choreography

| Zone | Motion |
|------|--------|
| **Home + The Tour (`/experience`)** | Maximalist collage: marquee, sticker settle, float, reveal, controlled wobble. Expressive but purposeful — no parallax spam. |
| **Everywhere else** | Quiet: hover lift ≤2px, shadow grow, focus rings, springy sheet open/close, sticker settle on first paint only. No marquees, no spinSlow loops, no wiggle on Shop/Events grids/legal/checkout. |

Ticket NightStage stays mostly static prestige (no playful loops).

### 4.5 Voice ladder

| Tier | Line | Where |
|------|------|-------|
| **Emotional lead** | “Where the culture gets made.” | Home hero framing, native footer primary |
| **Institutional subtitle** | “From Potential to Purpose” | About, legal micro, secondary footer |
| **World kickers** | Live culture · One day, one institution · Wear the signal · Urban News · Press | Section kickers |
| **CTAs** | Explore events · Book the tour · Shop merch · Work with us · Bring UGT to your school | Buttons — one label per intent sitewide |

Do not invent new slogan primaries. Broadcast credit (“Broadcast network: PPP TV Kenya.”) stays in footer when already truthful.

### 4.6 Logo & chrome

- Official logo asset remains the native header mark.
- Header: ink bar, white nav type, yellow Book CTA with magenta offset.
- One header implementation — retire legacy `headerHtml` white sticky for public marketing once routes are native.
- Footer: emotional slogan primary + institutional subtitle micro; press + legal + socials; bottom padding for tabbar on mobile.

---

## 5. Build order (approved)

Implement in this sequence. Do not skip Foundation. Each phase ships as coherent craft, not half-migrated dual UI.

| Phase | Name | Deliverable |
|------:|------|-------------|
| **0** | **Foundation** | Design tokens (CSS variables), type roles, component primitives (PosterCard, MoneyButton, StickerChip, FormField, PublicShell cleanup), motion tokens (loud vs quiet), single nav label map, fix privacy link + duplicate Work labels. No full page redesigns yet beyond shell wiring. |
| **1** | **Home** | Native Home as three-world collision; maximalist collage; equal weight CTAs for Tickets / Book / Shop; retire any leftover dual-mobile fork on Home (already skips MobileApp — keep it that way under one shell). |
| **2** | **Tour / Book** | Native Experience (myth collage), native Book (separated form), About + The Gang trust pages, Work With Us + Partners collab doors. Retire V25 captures for these routes. |
| **3** | **Events** | Events board + event detail poster→checkout presentation on the design system; Marketplace visual family alignment; preserve `event-truth` and slug routes; sticky mobile CTA; StatusStamp chips. Ticket artifacts stay NightStage. |
| **4** | **Shop** | Native shop index + healed PDP→bag→pay success continuum; cream/magenta tokens; variant stickers; keep “asante sana” warmth on success. Retire shop V25 index capture. |
| **5** | **Press** | New `/press` lane + Contact polish + FAQ/Legal on LegalCard pattern; Urban News kept as sister brand (light shell alignment only unless blocking). Gallery native if still legacy by this phase. |

After Phase 5: remove dead captures/unused `MobileApp` paths only when no public route depends on them; do not delete checkout backends.

---

## 6. Page-level intent (major routes)

Redesign inspired by restudy DNA — **rebuild, do not patch** V25 layouts.

| Route | World | Intent |
|-------|-------|--------|
| `/` | Collision | Loud broadcast landing. Hero + live strip + 01/02/03 paths + gallery/merch/news teasers + founders. Equal doors to Events, Book, Shop. Maximal motion. |
| `/experience` | Tour-Book | Myth page: “One Day. One Institution.” Full collage ceiling. Ends in Book CTA. Maximal motion. |
| `/book` | Tour-Book | Primary institutional booking instrument. Clear fields, states, success. Quiet motion. Not Contact. |
| `/work-with-us` | Tour-Book | Collab / hire / brand door with hub-grade craft (replaces stub). Quiet. |
| `/partners` | Tour-Book | Partners & investors trust surface; links Work With Us / Press as needed. Quiet. |
| `/about` | Tour-Book | Story + mission; institutional subtitle lives here. Quiet. |
| `/the-gang` | Tour-Book | Faces & crew; founder gravity (Eugine & Lucy) without burying Book. Quiet. |
| `/events` | Events | Live culture calendar — loudest utility after Home. Search/filters/status chips. Quiet motion, high craft. |
| `/events/[slug]` | Events | Poster that becomes checkout. Truthful lifecycle UI, tiers, sticky mobile CTA. Quiet springs. |
| `/marketplace` | Events | Third-party board in same visual family; unmistakable hosted-by labeling. Night-leaning OK. |
| `/marketplace/[eventId]` | Events | Organizer-hosted checkout; NightStage family. |
| `/tickets/[orderId]`, `/t/[code]`, `/verify/[serial]`, `/receipt/[id]` | Events | Ceremonial artifacts — dark, precious, monospace refs. Do not pastel. |
| `/shop` | Shop | “Wear the culture” grid — identity merch, not dump. Cream neo-brutal. Quiet. |
| `/shop/[id]` | Shop | PDP continuous with index; variant stickers; bag handoff native (no V25 bag seam). Quiet. |
| `/pay/success` | Shop | Warm confirmation; keep Permanent Marker “asante sana”. Night or cream family consistent with checkout. |
| `/blog` | Sister | Urban News poster edition — sister brand wildness allowed. |
| `/blog/[slug]` | Sister | Article shell aligned to news tokens; ShareBar; quieter than index. |
| `/gallery` | Shared | Evidence wall — neo-brutal frames; quieter; feeds Home teaser. |
| `/press` | Press | Media kit / logos / boilerplate / contact-for-press. No fake quotes. Quiet. |
| `/contact-us` | Shared | General contact only; route press inquiries to Press; do not own booking. Quiet. |
| `/faq` | Shared | Magenta stage + cards; honest answers. Quiet. |
| `/privacy-policy`, `/terms`, `/refund-policy`, `/ticket-terms` | Shared | LegalCard on magenta; trustworthy typography. Quiet. |
| `/account` | Shared | Magenta entry; light shell alignment. |
| `/offline` | Shared | PWA offline; on-brand minimal. |
| `/author/eugine-micah`, `/author/lucy-ogunde` | Shared | Person pages on magenta stage; link Press/About. |

---

## 7. Success criteria / verification expectations

A phase is “done” only when all of the following hold for its routes:

1. **Single engine** — No `RenderedPage` / V25 boot for that phase’s marketing routes; no `MobileApp` takeover fork; same design system on mobile and desktop (density scales, engines do not).
2. **Token compliance** — Colors, type, shadows, stickers come from the token/component library; no new hex snowflakes without updating tokens.
3. **IA honesty** — Book ≠ Contact ≠ Work With Us; nav labels match §3.6 everywhere; privacy link works; three Home paths remain equal weight.
4. **Commerce truth** — Availability, prices, lifecycle chips, and ticket issuance still match server truth (`event-truth`, inventory, payment webhooks). Manual spot-check: on-sale, sold-out, postponed.
5. **Motion policy** — Expressive loops only on Home + Experience; quiet elsewhere (spot-check Events list, Shop grid, Book form, Legal).
6. **A11y baseline** — Skip link works; focus visible on new components; keyboard reaches sticky CTAs and ticket overlays (Escape/close); contrast checked on magenta/ink/yellow pairings.
7. **SEO intact** — Unique title/description/canonical/OG per route; JSON-LD types preserved or improved; redirects unchanged unless intentionally added for Press.
8. **Regression gates** — `npx tsc --noEmit`, `npm test`, `npm run lint`, and relevant Playwright/verify scripts for touched funnels pass before merge.
9. **Equal hub craft** — Tickets, Book, and Shop each have hub-grade poster craft (no orphan stub doors in scope of a completed phase).
10. **No claim drift** — Diff review confirms no new fabricated commercial statistics.

---

## 8. Out of scope

- Control Room / `/admin` / organizer portal / gate scanning product UI.
- Deploy-infra PRs (Wrangler preview envs, deleting `vercel.json`, Cloudflare Builds dashboard) — separate lane from PR #29 notes.
- Payment provider contract changes, webhook redesign, or inventory algorithm changes (consume existing truth; do not reopen).
- Inventing press coverage, school counts, or partner logos not already licensed/owned.
- Rewriting Urban News into mothership magenta (sister brand stays).
- Pastel-izing ticket NightStage.
- Replacing BottomTabBar with a desktop-only paradigm (mobile-first tabs stay).
- Pushing to `main` without review; force-pushing shared history.
- Implementing UI in the same change-set as this design document.

---

## Approval record

| Decision | Status |
|----------|--------|
| Scope: full public site (marketing + discovery + shop + booking + ticket UX); Control Room later | **Approved** |
| Visual direction: maximalist collage; quieter motion outside Home + The Tour | **Approved** |
| Optimize tickets, Book the tour, and shop equally | **Approved** |
| Approach B: three poster worlds (Events / Tour-Book / Shop) | **Approved** |
| Revised IA (Home collision; separated Book / Work With Us / Contact; Blog sister brand; Press lane) | **Approved** |
| Visual system (tokens, type, components, motion, voice ladder) | **Approved** |
| Build order (Foundation → Home → Tour/Book → Events → Shop → Press) | **Approved** |

---

*End of approved design spec. Implement on `ui-ux-redesign`; DNA detail lives in the companion restudy.*
