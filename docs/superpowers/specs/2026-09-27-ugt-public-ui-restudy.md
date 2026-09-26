# UGT Public UI Restudy — Design DNA Audit

**Date:** 2026-09-27 (Africa/Nairobi)  
**Branch:** `ui-ux-redesign`  
**Repo:** `C:\ugt-control-room`  
**Scope:** PUBLIC UI/UX only — inspiration audit for a Meta/Grok-caliber redesign (not a copy, not a bugfix).  
**Out of scope:** Control Room, organizer portal, gate, admin APIs.
**Approved design spec:** [2026-09-27-ugt-public-redesign-design.md](./2026-09-27-ugt-public-redesign-design.md)

---

## 1. Purpose

Capture the **current** public visual and interaction language so a redesign can amplify what already feels like Urban Gang — loud Kenyan youth culture, neo-brutal collage, magenta broadcast energy — while replacing seams, dual systems, and under-crafted conversion surfaces. The outcome is a **study**, not a ticket list.

---

## 2. Route inventory

### 2.1 How rendering works (three engines)

| Engine | Mechanism | Where used |
|--------|-----------|------------|
| **Native reconstructed** | React Server Components + `PublicHeader`/`PublicFooter` in root layout; page-owned JSX/CSS | Home, Events (+ detail), Blog (+ slug), Shop product, FAQ, Legal, Marketplace, checkout/ticket artifacts, authors, account |
| **Legacy V25 capture** | `RenderedPage` reads `app/_rendered/<page>.html`, corrects content, rewrites media, mounts `V25App` + `FastImages` | About, The Gang, Experience, Gallery, Shop index, Partners, Book, Contact Us |
| **Fallback stub** | Same `RenderedPage` path when no capture file exists — magenta Anton hero + BOOK/SHOP CTAs | Work With Us (`page: 'work'`, **no** `work.html`) |
| **Redirect** | `next.config.mjs` permanent aliases | Legacy URL names → canonical |

Root layout always wraps children in `#ssr-shell` with native `PublicHeader`/`PublicFooter`. Legacy routes additionally boot the V25 client runtime into `#v25-host`, which historically hid the SSR shell. Mobile ≤900px adds a **third** surface (`MobileApp` + CSS `:has(.ugt-mobile-app)` rules) that can hide shell, v25 host, and even the BottomTabBar on mapped routes.

### 2.2 Public route table

| Route | Render mode | Capture / notes |
|-------|-------------|-----------------|
| `/` | **Native** `HomePage` | Force-dynamic; DB-backed events/products/gallery/posts |
| `/about` | **Legacy** + clipped SEO shell | `about.html` (~15KB); crawler-only SSR text then `RenderedPage` |
| `/the-gang` | **Legacy** + clipped SEO shell | `gang.html` (~40KB); crew list also in SEO shell |
| `/experience` | **Legacy** | `exp.html` (~57KB) — richest narrative capture (“One Day. One Institution.”) |
| `/events` | **Native** | Inline-styled board; `events.html` capture exists but is **unused** |
| `/events/[slug]` | **Native** (legacy id → permanentRedirect) | Truthful lifecycle UI; sticky mobile CTA; links ticket booth |
| `/blog` | **Native** `NewsClient` | Comic-poster “Urban News” art direction; `news.html` unused |
| `/blog/[slug]` | **Native** | Magenta article shell + ShareBar |
| `/gallery` | **Legacy** | `gallery.html` (~6KB) thin catalogue frame |
| `/shop` | **Legacy** | `shop.html` (~38KB) “Wear The Culture” |
| `/shop/[id]` | **Native** | Cream product PDP; CTA deep-links `/shop?item=` into V25 bag |
| `/book` | **Legacy** | Uses page key `contact` → **`contact.html`** (shared with Contact) |
| `/contact-us` | **Legacy** | Same `contact.html` as Book — UX collision risk |
| `/work-with-us` | **Legacy fallback** | **No capture** — stub magenta page |
| `/partners` | **Legacy** | `partners.html` (~20KB) |
| `/faq` | **Native** | Magenta FAQ list + FAQPage JSON-LD |
| `/privacy-policy` | **Native** `LegalPage` | White card on magenta |
| `/terms` | **Native** `LegalPage` | |
| `/refund-policy` | **Native** `LegalPage` | |
| `/ticket-terms` | **Native** `LegalPage` | |
| `/marketplace` | **Native** | Dark third-party ticketing board (distinct from `/events`) |
| `/marketplace/[eventId]` | **Native** | Dark organizer-hosted checkout surface |
| `/pay/success` | **Native** | Merch payment confirmation (“asante sana”) |
| `/tickets/[orderId]` | **Native** | Full-screen ticket wallet overlay (`z-index: 12000`) |
| `/t/[code]` | **Native** | Single e-ticket artifact (QR flex object) |
| `/receipt/[id]` | **Native** | Paper-cream receipt |
| `/verify/[serial]` | **Native** | Dark verification stage |
| `/account` | **Native** | Magenta account entry |
| `/offline` | **Native** | PWA offline |
| `/author/eugine-micah` | **Native** | Magenta person page |
| `/author/lucy-ogunde` | **Native** | Magenta person page |

### 2.3 Redirect aliases (public)

| From | To |
|------|----|
| `/home` | `/` |
| `/news`, `/urban-news` | `/blog` |
| `/tickets` | `/events` |
| `/contact` | `/contact-us` |
| `/tour` | `/experience` |
| `/gang` | `/the-gang` |
| `/merch` | `/shop` |
| `/v25-template.html` (document nav only) | `/` |

### 2.4 Counts (audit rollup)

| Class | Count | Routes |
|-------|------:|--------|
| **Native public pages** | **24** | `/`, `/events`, `/events/[slug]`, `/blog`, `/blog/[slug]`, `/shop/[id]`, `/faq`, 4× legal, `/marketplace`, `/marketplace/[eventId]`, `/pay/success`, `/tickets/[orderId]`, `/t/[code]`, `/receipt/[id]`, `/verify/[serial]`, `/account`, `/offline`, 2× author |
| **Legacy capture / V25** | **8** | about, the-gang, experience, gallery, shop (index), partners, book, contact-us |
| **Legacy fallback (no capture)** | **1** | work-with-us |
| **Redirect-only aliases** | **8** | listed above (not counted as destinations) |
| **Unused captures** | **2** | `events.html`, `news.html` (orphaned by native rebuilds) |

**Primary destinations in redesign scope ≈ 33 live URLs** (native 24 + legacy 8 + fallback 1). Ticket/checkout artifacts are public UX but noindex.

---

## 3. Visual DNA summary

### 3.1 Palette (observed, not invented)

| Token | Hex | Role |
|-------|-----|------|
| Magenta | `#E6218C` | Brand field, `themeColor`, body default, hero accents, CTAs |
| Signal yellow | `#FFD400` | Primary money CTA, kickers, selection, ticket highlights |
| Cyan | `#21C7E6` | Secondary accent, shop shadows, tier chips, social tiles |
| Ink | `#111` | Borders, type, header/footer bars, neo-brutal shadows |
| Cream / blush | `#fffafc`, `#f8f4ec`, `#f1ede5`, `#f7f2e9` | Native content canvases (home, PDP, mobile app) |
| Night | `#0c0c0c` / `#111` | Marketplace, tickets, pay success |
| News ink | `#1A0E14` | Urban News chrome |
| News gold | `#F7A81B` | Urban News poster accent (cousin of `#FFD400`, not identical) |

### 3.2 Type stack

Loaded globally: **Anton**, **Permanent Marker**, **Space Grotesk**, plus **Bungee**, **Titan One**, **Archivo**, **Spline Sans Mono**.

| Face | Use |
|------|-----|
| Anton | Display headlines, uppercase, often with tight `.85–.95` leading; sometimes `-webkit-text-stroke` |
| Permanent Marker | Slogan / hand energy (“From Potential to Purpose”, “asante sana”, news stickers) |
| Space Grotesk | Body + UI chrome |
| Titan One + Archivo | Urban News poster edition (strongest “art direction fork”) |

### 3.3 Logo & chrome

- Official logo: `/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png` — used in native header, mobile sheet, marketplace, tickets.
- Native header: black bar, white type nav, yellow “Book the tour” CTA with magenta offset shadow.
- Legacy header (`headerHtml`): white sticky bar, fuller nav (“About & The Gang”, Work With Us dropdown remnant, bag icon, rotated Book CTA).
- Footer slogans in play: **“Where the culture gets made.”** (native) vs **“From Potential to Purpose”** (SITE + v25 footer). Both are live DNA, not contradictions to erase blindly — redesign should pick a hierarchy.
- Broadcast credit appears in native footer: “Broadcast network: PPP TV Kenya.”

### 3.4 Nav labels (current public)

**Native `PublicShell`:** Events · The Tour · Urban News · Gallery · Shop · **Book the tour**  
**Mobile BottomTabBar:** Home · Tickets · **Book** (raised yellow) · Shop · Gallery · Menu  
**Menu sheet extras:** About, The Gang, Experience, Work with UGT (duplicated label), Contact, Account, socials  
**SITE.ROUTES nav (SEO config, not identical to shell):** includes About, The Gang, Partners & Investors, Tickets, News — drift is part of the current messiness.

### 3.5 Recurring motifs (craft signatures)

1. **Neo-brutal frames** — 2–4px `#111` borders + hard offset shadows (`3px 3px 0` → `8px 8px 0`).
2. **Tilted stickers** — `rotate(-2deg)` on CTAs, Permanent Marker chips, news tags.
3. **Uppercase shout headlines** with kickers in tracked smallcaps pink/yellow.
4. **Numbered path cards** (Home `01/02/03`) — yellow / cyan / black pathway system.
5. **Collage poster energy** strongest on Urban News (tape strips, wiggle, dual-color Titan One title).
6. **Magenta as stage, not decoration** — legal cards, FAQ, authors sit *on* the brand field.
7. **Conversion yellow** as the “money color” — Book CTA, tab CTA, selection highlight.
8. **Artifact seriousness** for tickets/receipts — dark radial stages, gradient edges, monospace codes (craft already high here).

### 3.6 Motion (current)

- Global keyframes: `floatY`, `spinSlow`, `marquee`, `wob`, `pop`, `blink`, `dashmove`, `[data-reveal]` scroll fades.
- Urban News: `un-wiggle` on asterisk.
- Home card hover: 2px lift + shadow grow.
- **No unified motion system** — legacy pages inherit V25 animation density; native home is quieter; ticket stages are static prestige.

### 3.7 Voice & CTA lexicon (from UI copy only)

- Headlines: “The culture doesn’t wait.” / “Where the culture gets made.” / “Wear the culture” / “Make the moment.” / “You had to be there.”
- Kickers: Live culture · The evidence · Wear the signal · Urban News · Right now
- CTAs: Explore events · Book the tour · Shop merch · Work with us · Bring UGT to your school · Choose options and add to bag · BACK TO THE SHOP
- Slogan pair: **From Potential to Purpose** (SITE) ↔ **Where the culture gets made** (native footer/home framing)

Do not invent commercial claims beyond what pages already assert for SEO/JSON-LD (schools visited, broadcast partner, founders). Redesign can keep tone; claims stay editorial/legal-owned.

---

## 4. UX patterns & gaps

### 4.1 Hierarchy

- Home is the clearest native hierarchy: hero → events → three paths → gallery → merch → news → founders.
- Experience capture is the richest story hierarchy among legacy pages.
- Shop index (legacy) vs product detail (native) breaks continuity — PDP is cream neo-brutal; index is V25 collage.
- Book and Contact share one capture → same interactive surface for two intents.

### 4.2 Conversion doors (three hubs)

| Hub | Primary doors today | Friction |
|-----|---------------------|----------|
| **Events** | `/events` cards → `/events/[slug]` → ticket booth / sticky CTA; marketplace parallel universe | Two ticket worlds (UGT vs marketplace) visually unrelated; events list use of inline styles vs home CSS modules |
| **Tour–Book** | Home path 01 → `/book`; Experience → “Bring this to your institution”; Work With Us stub; Partners | Book UX is legacy form; Work With Us is fallback stub; About/Gang still V25 |
| **Shop** | Home merch strip → `/shop` (V25) → `/shop/[id]` (native) → `/shop?item=` bag → Paystack/Stripe → `/pay/success` | Handoff from native PDP into legacy bag is a seam |

### 4.3 Mobile behavior

- ≤900px: BottomTabBar (app-style) + optional `MobileApp` takeover for mapped routes (events/gallery/shop/book); **home deliberately skips MobileApp**.
- CSS can hide `#ssr-shell`, `#v25-host`, and tabbar when `.ugt-mobile-app` mounts — **dual mobile products coexist**.
- Native home responds with stacked grids and full-width buttons; footer gains bottom padding for tabbar.
- WhatsApp FAB (`#25D366` brutal square) + cookie banner + promo bar compete for edge attention.

### 4.4 Accessibility gaps (observed)

- Skip link exists (good); focus styles uneven across inline-styled pages.
- Legacy captures: heavy inline styles, decorative rotations, possible contrast issues on magenta+black type.
- Menu sheet duplicates “Work with UGT” / “Work With Us”.
- Native footer links to `/privacy` but legal page lives at `/privacy-policy` (broken door).
- Clipped SEO shells on about/gang use `aria-hidden` + clip — fine for crawlers, confusing if ever exposed.
- Ticket overlays set `body{overflow:hidden}` and sit above chrome — strong UX, but keyboard escape paths need redesign care.
- V25 requires `'unsafe-eval'` for boot — architectural smell for a craft redesign (replace runtime, don’t patch).

### 4.5 Strengths worth amplifying

1. **Brand chroma triad** (magenta / yellow / cyan) is instantly recognizable and broadcast-ready.
2. **Neo-brutal sticker language** already feels “youth poster,” not corporate NGO.
3. **Home’s three-path system** is an elegant IA for Tour / Collab / Story.
4. **Urban News poster edition** shows the ceiling when art direction is intentional.
5. **Ticket/receipt artifacts** already feel Meta-app precious — keep that seriousness.
6. **Founders as public faces** (Eugine & Lucy) give human gravity.
7. **App-like bottom nav** instinct is right for Kenyan mobile-first audiences.

### 4.6 Weaknesses a redesign should replace

1. **Three concurrent UIs** (native shell, V25 capture, MobileApp) — craft cannot peak until one system owns public.
2. **Nav/label drift** across PublicShell, SITE.ROUTES, headerHtml, tabbar, menu sheet.
3. **Book ≡ Contact capture** — conversion intent muddied.
4. **Work With Us stub** — a primary business door looks unfinished.
5. **Shop index/detail split** — catalog and PDP feel like different products.
6. **Inline-style sprawl** on events/marketplace/legal vs tokenized home CSS — inconsistent rhythm.
7. **Motion without choreography** — either maximal on home+tour or quiet elsewhere; today it’s accidental.
8. **Footer slogan fork** + broken privacy link — small trust leaks.

---

## 5. Three-hub implications for redesign

### Hub A — Events (Tickets)

- Own the **live culture calendar** as the loudest utility surface after Home.
- Unify UGT events and Marketplace under one visual system with unmistakable “Hosted by …” labeling (copy already honest — craft should match).
- Event detail should feel like a **poster that becomes a checkout**, not a form strapped to a hero.
- Preserve truthful lifecycle states (sold out / postponed / rescheduled) as designed chips, not afterthoughts.
- Ticket wallet (`/tickets`, `/t`) stays a dark ceremonial artifact — don’t pastel it.

### Hub B — Tour–Book (Experience + booking + collab)

- Experience is the **myth page** — redesign’s maximalist collage home for “one day, one institution.”
- Book becomes the primary conversion instrument (schools/campuses/brands) — separate from Contact.
- Work With Us / Partners become collab doors with equal craft, not leftover stubs.
- About + The Gang supply trust and faces; keep founder gravity without burying the Book CTA.

### Hub C — Shop (Merch)

- Single merch system from grid → PDP → bag → pay success.
- Amplify “Wear the signal / Wear the culture” — merch as identity, not catalog dump.
- Keep KES honesty and server-confirmed pricing language; elevate variant chips as sticker UI.
- Pay success’s “asante sana” Permanent Marker moment is DNA — keep warmth.

---

## 6. Creative directions (inspired by DNA, not copies)

Constraint for all directions: **maximalist collage energy on Home + Tour (Experience)**; **quieter, precise motion elsewhere** (Events, Shop, Blog article, Legal, Checkout).

1. **Broadcast Collage OS** — Treat every page as a PPP-era news desk overlay: Anton headlines as lower-thirds, cyan/yellow chyron bars, magenta studio wall. Home and Experience run full collage; Events/Shop use the same chrome but calmer grids.
2. **Sticker Economy** — Elevate offset shadows and tilted chips into a deliberate component library (price stickers, status stamps, desk tags). Motion = stickers settling, not parallax noise.
3. **Three-Path Monument** — Make Home’s 01/02/03 pathways architectural: Tour / Build / Story as permanent wayfinding across the site, echoed in tabbar and footers.
4. **Poster → Artifact** — Event and product pages start as oversized posters that “tear” into functional panels (tiers, variants, share). Quiet springs; no marquee spam off Home/Tour.
5. **Dual Slogan Hierarchy** — Lead with “Where the culture gets made” as emotional line; keep “From Potential to Purpose” as institutional subtitle (legal/about/footer micro). One voice ladder.
6. **Night Ticket Temple** — Extend the existing dark ticket craft to marketplace and pay flows so money moments feel like one family (radial magenta/cyan glows, monospace refs).
7. **Urban News as Sister Brand** — Keep Titan One / tape / gold as a deliberate sub-brand of the mothership magenta system, so Blog can stay wild without fracturing Shop/Events.
8. **Mobile-First Single Shell** — One responsive public shell replaces V25 + MobileApp dualism; BottomTabBar remains, but content is the same design system as desktop — collage density scales, engines don’t fork.

---

## 7. Redesign opportunities (priority lens)

1. **Unify onto one public design system** — retire RenderedPage/V25 for public marketing pages; keep only what checkout still needs until natively replaced.
2. **Separate Book vs Contact vs Work With Us** with hub-grade craft (Tour–Book hub).
3. **Heal Shop continuum** (index + PDP + bag + success) under cream/magenta neo-brutal tokens.
4. **Codify tokens** (color, type, shadow, radius, sticker rotation scale) — end inline-style snowflake pages.
5. **Choreograph motion** — expressive on Home+Experience only; micro-interactions elsewhere.
6. **Resolve nav IA** — one label set across header, tabbar, menu, footer; fix `/privacy` → `/privacy-policy`.
7. **Amplify ticket/news peaks** — use their craft level as the quality bar for Events list and Experience.
8. **Mobile: one surface** — keep app-like tabs; delete the second mobile app fork.

---

## 8. File anchors (for implementers)

| Concern | Path |
|---------|------|
| Native shell | `app/_components/PublicShell.tsx` |
| Home | `app/_components/HomePage.tsx` + `app/globals.css` (`.home-*`, `.public-*`) |
| Legacy renderer | `app/_components/RenderedPage.tsx`, `V25App.tsx` |
| Captures | `app/_rendered/{about,contact,events,exp,gallery,gang,news,partners,shop}.html` |
| Legacy chrome strings | `app/_components/headerHtml.ts`, `footerHtml.ts` |
| Route SEO map | `lib/site.ts` |
| Mobile tab + sheet | `app/_components/BottomTabBar.tsx` |
| Alternate mobile app | `app/_components/MobileApp.tsx` |
| Urban News art | `app/blog/NewsClient.tsx` |
| Legal pattern | `app/_components/LegalPage.tsx` |
| Redirects | `next.config.mjs` |

---

## 9. Non-goals of this document

- No UI code changes beyond this study file.
- No copying V25 layouts into the redesign.
- No inventing attendance / partnership claims.
- No Control Room / organizer / gate work.

---

*End of restudy. Use as the DNA brief for maximalist-collage redesign with quieter motion outside Home + Tour.*
