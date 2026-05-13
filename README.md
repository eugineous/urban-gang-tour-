# Urban Gang Tour — Design System

> **From Potential to Purpose.**
> The brand kit for Kenya's largest high school talent search, mentorship, and awards concert programme. This system is built for anyone designing for UGT — posters, decks, social reels, stage backdrops, the website, merch, or the PPP TV broadcast overlays.

---

## 1. Who this brand is

Urban Gang Tour (UGT) goes directly into Kenyan high schools, universities, and community venues to discover talent, nurture dreams, and transform young people. It is half talent search, half mentorship tour, half concert — a full 5 AM → 5:30 PM day-long production with a 30+ person crew, a T-shaped stage with 36–42 branded boards, Urban Pods (mentorship breakouts), tree planting with The Green Movement, a gospel session from Destiny Life Church, and an awards ceremony broadcast nationally on **Urban News** (PPP TV Kenya, up to 8M viewers).

### Product surfaces in scope
| Surface | Status | Notes |
|---|---|---|
| Marketing website | Primary | Hero, calendar, about, partners, sponsors, gallery, apply. |
| Social posters / reels | Primary | Instagram, TikTok, YouTube Shorts — 8–12 clips per event. |
| Stage / event graphics | Primary | T-stage backdrop (36–42 boards), teardrop banners, tickets, certificates. |
| Slide decks | Primary | Company profile, sponsor deck, programme deck (Arial today; revamped here). |
| Broadcast overlays | Secondary | Lower-thirds and bumpers for the Urban News episode. |
| Merch | Adjacent | Official merchandise and branded event wear. |

### Sub-brands
- **Urban Gang Snacks** — affordable snack shop at events
- **Urban Gang Moments** — instant-print photobooth, KES 20/pic
- **Official merchandise** — branded apparel and event merchandise
- **Urban News** — the TV show on PPP TV Kenya, hosted by Eugine Micah & Lucy Ogunde

### Partners (visually present across most artefacts)
- **Destiny Life Church, Syokimau** — co-production (stage, sound, LED PAR, speaker, counselling, Tribez youth team, Lit Gen DJ). Uses deep **church purple** accent.
- **PPP TV Kenya** — national broadcaster, the Urban News home.
- **The Experience Hub** — 30-person hype team (Hype Ola, DJ Carian, dancers).
- **The Green Movement** — tree planting at every school (led by Tai). Uses the **green** accent.
- **Faly Mark Events** — stage and sound equipment.

### Source materials
The system below is distilled from:
- `uploads/UGT_Company_Profile_v2.docx` → extracted to `uploads/extracted_UGT_Company_Profile_v2.txt`
- `uploads/UGT_Programme_v2.docx` → `uploads/extracted_UGT_Programme_v2.txt` (the full run-of-show)
- `uploads/UGT_Sponsor_Catalogue_v2.docx` → `uploads/extracted_UGT_Sponsor_Catalogue_v2.txt`
- `uploads/UGT_Partner_Catalogue_v2.docx` → `uploads/extracted_UGT_Partner_Catalogue_v2.txt`
- `uploads/Urban Gang Tour.docx` → `uploads/extracted_Urban Gang Tour.txt` (the founder's voice memo)
- `uploads/b0de05ed-...png` → the master 3D logo (`assets/logos/ugt-logo-full.png`)
- `uploads/CALENDAR.png` → the 2nd-term calendar poster (`assets/brand/calendar-poster.png`) — **this is the clearest single source of truth for the brand's visual language**
- `uploads/471322347_..._.jpg` → Destiny Life Church Syokimau logo (`assets/logos/destiny-life-church.jpg`)
- GitHub repo `eugineous/urban-gang-tour-` — currently empty (repo exists, tree is 409 / no commits). Nothing to import yet; if code lands there later, pull it into `ui_kits/website/` and lift tokens from it.

---

## 2. Index (what's in this folder)

```
colors_and_type.css              ← tokens + semantic defaults — import this into every artefact
README.md                        ← this file
SKILL.md                         ← portable Claude Code skill entry point

assets/
  logos/ugt-logo-full.png        ← master 3D logo (1024×1024, works on light or dark)
  logos/destiny-life-church.jpg  ← partner logo
  brand/calendar-poster.png      ← reference poster — the north star of the visual language

preview/                         ← design-system cards registered in the Design System tab
  type-*.html, color-*.html, component-*.html, etc.

ui_kits/
  website/
    index.html                   ← click-through prototype of the UGT marketing site
    README.md
    components/*.jsx

slides/
  index.html                     ← sample deck using the brand
  *.jsx                          ← one slide-type component per file
```

---

## 3. CONTENT FUNDAMENTALS

The voice sits between a creative director and a Gen Z hype-man. Confident, warm, purposeful — never corporate, never stiff. It's a motto brand: short lines hit harder than paragraphs.

### Voice principles
1. **Short, punchy, stacked.** Sentences are often fragments. Three beats, not three paragraphs.
   - *"This is long-term. This is countrywide. This is bigger than a school event."*
   - *"From Potential to Purpose."*
2. **"We" and "you" — never "the brand".** UGT speaks in the first-person plural ("We go directly into institutions…"). Partners and students are always "you".
3. **Name the people.** The docs name everyone by role — Eugine, Lucy, Hype Ola, Tai, DJ Xavi. The brand is warm because it's people-shaped, not faceless.
4. **Specific, not abstract.** Numbers and names > adjectives. *"30+ person team", "KES 20 per picture", "up to 8M viewers", "T-shaped stage, 36–42 boards"*.
5. **Energetic but purposeful.** Every hype line has a "so that" behind it. *"We are not in the business of just entertaining. We are here to educate, inform, nurture…"*
6. **No emoji in body copy.** The docs use ⭐🏆💡🌱 sparingly as **tier markers** (presenting / impact / category / community) and that's it. No 🔥 or 🎤. Sticker-style graphics do the heavy lifting instead.
7. **No jargon, no buzzwords.** You won't find "synergy", "disrupt", "leverage". You will find "hype", "crowd", "reel", "bridge" (MC term), "drop" (music term), "pod".

### Casing
- **HEADLINES → ALL CAPS.** Display type is uppercase 99% of the time, across both Anton and Archivo Black.
- **Sub-heads → Title Case or ALL CAPS.** Both exist.
- **Body → Sentence case.** Normal prose.
- **Sticker tags ("2ND TERM CALENDAR", "BOOKINGS STILL OPEN") → ALL CAPS.**
- **Names of people → Title Case.** Never upper, even in captions.

### Signature phrases (use verbatim)
- **"From Potential to Purpose."** — the motto. Always appears as its own line or with an em-dash lead-in. Never "from potential TO purpose" and never lowercased.
- **"This is long-term. This is countrywide."** — sponsor close.
- **"Urban Gang Tour will be back!"** — closing remarks line.
- **"Bookings still open."** — calendar / booking callout (see poster).
- **"Urban News on PPP TV Kenya"** — broadcast attribution, always full.
- **"[Team Member], [Primary Role / Secondary Role]"** — the "dual roles" pattern is part of the brand's DNA, not just an ops detail.

### Tone examples
- **✅ Good:** *"Imagine thousands of students chanting your brand name from a stage. Imagine your logo on a certificate that a 16-year-old frames and hangs on their wall."*
- **✅ Good:** *"Every young person in Kenya has potential. The question is: who will help them find their purpose?"*
- **❌ Off-brand:** *"Our innovative youth engagement solution leverages multi-channel media to drive impact outcomes."*
- **❌ Off-brand:** *"Hey fam 🔥🔥 we're soooo hyped to announce…"*

### Punctuation quirks
- **Em-dashes and ellipses** are used heavily in the founder's own writing. Keep them, but in polished collateral prefer a clean em-dash (`—`) over `...`.
- Numbers are often stacked: *"400K– millions"*, *"36–42 boards"*, *"5:00 AM – 5:30 PM"*. Use an en-dash with spaces for ranges.
- KES is written inline: **"KES 20 per picture"**, not "Ksh20" or "20 bob".

### Language note
Primary language is English. Occasional Swahili / Sheng is on-brand when authentic (never forced): *Tribez, Lit Gen, Kalamu Nyeusi, Mokaya Junior*. Don't translate names of people, crews, or sessions.

---

## 4. VISUAL FOUNDATIONS

The visual system has two modes that share the same palette:

**Mode A — Sticker / Scrapbook** (the calendar poster, Instagram posts, event collateral). Magenta field, hand-painted white brush strokes, **dashed ticket-stub borders**, **yellow highlighter** under dates, **X-pattern underlines**, pieces of masking tape at the corners. This is the **primary brand mode** — it's what makes UGT feel like a youth movement, not a corporate roadshow.

**Mode B — Stage / Broadcast** (the website hero, the TV episode, stage backdrops). Near-black background, magenta glow, chunky 3D logo, big condensed type, photography at full bleed. Used when the brand needs to feel like a concert, not a classroom.

Artefacts mix the two — a black stage-mode hero followed by a magenta scrapbook-mode event card list is a signature UGT flow.

### Colors
See `colors_and_type.css` for the full token list. The six that matter most:

| Token | Hex | Use |
|---|---|---|
| `--ugt-magenta` | `#C7238E` | Primary. H2, CTAs, most backgrounds in Mode A, logo accent. |
| `--ugt-orange` | `#F5A623` | Secondary. Sub-brand, accents, highlighter, "GANG" in the logo. |
| `--ugt-ink` | `#1A1A1A` | Body text, Mode B backgrounds, sticker shadows, mega borders. |
| `--ugt-white` | `#FFFFFF` | Cards, stickers, display text on magenta. |
| `--ugt-magenta-soft` | `#FDF0F7` | Alt table rows, soft tint panels. |
| `--ugt-orange-soft` | `#FFF8ED` | Warm panels, secondary soft bg. |

Partner / segment accents (use sparingly, only when that partner's content is on screen): `--ugt-church-purple` `#7B1FA2` for DLC segments, `--ugt-green` `#2E7D32` for Green Movement / tree-planting segments, `--ugt-pptv-blue` `#1E40AF` for broadcast attribution.

### Typography
- **Spec says Arial everywhere** — this is strictly enforced in the physical documents (Company Profile, Programme, Sponsor Catalogue).
- **For web / motion / posters** we substitute:
  - **Anton** — main display condensed, a stand-in for the extruded 3D logo energy on digital surfaces.
  - **Archivo Black** — wider block headlines ("BOOKINGS STILL OPEN" vibe).
  - **Bangers** — graffiti/poster category callouts ("2ND TERM CALENDAR" orange bit).
  - **Permanent Marker** — handwritten dates, scrapbook tags ("30TH.MAY").
  - **Caveat** — quieter handwritten notes.
  - **Inter** — body + UI (Arial is preserved as fallback).
- **Sizes.** Headings 32–56pt doc-side; on web we go bigger (display can hit 160px on hero). Body 20–22pt in docs, 17px on web. Captions 13–18pt.
- **Never use serifs. Never use decorative fonts besides the hand-lettered Permanent Marker / Caveat accents.**

> ⚠️ **Font substitution flag.** The brand spec locks to Arial. We haven't been given bespoke type. Anton / Archivo Black / Bangers / Permanent Marker / Caveat / Inter are Google Fonts substitutes chosen to match the visual energy of the calendar poster and 3D logo. If you have a licensed display face (or want to commission one), drop it in `fonts/` and replace `--font-display` / `--font-graffiti` / `--font-handwritten` in `colors_and_type.css`. For print / PPTX decks, keep Arial.

### Backgrounds
- **Solid magenta field** is the default marketing background.
- **Hand-painted white brush-stroke streaks** layer on top of magenta fields (see poster). Use the `assets/brand/` stroke PNGs or CSS paint motifs. Never digital-perfect gradients here — the strokes have texture.
- **Near-black `#0A0A0A`** is the default stage / broadcast background.
- **Radial magenta glow** from the top centre is the default hero background in Mode B (`--grad-stage-glow`).
- **Light pink `#FDF0F7`** is the soft panel / alternate table row.
- **Warm orange `#FFF8ED`** is the optional warm accent panel.
- Gradients: use the brand-specific `--grad-magenta-orange` (135°, magenta → orange) sparingly for buttons and text effects. Avoid generic blue-purple, sunset, or pastel gradients.
- Patterns: dashed lines, X-rows, diagonal hatch (`repeating-linear-gradient(-45deg, ...)`), scotch-tape corners. These are the supporting texture, not decoration.

### Imagery
- **Warm, saturated, youth photography.** Bright skin tones pushed a little. High contrast. Not cool, not desaturated, not cinematic-teal.
- **Cut-outs.** Heroes are often masked out of their background and placed on a brand field (see calendar poster's Eugine & Lucy cut-out).
- **Grain / paint texture over photos** is acceptable to unify a collage.
- **Group crowd shots** go full-bleed with a magenta or black overlay at the bottom for text.
- **No stock photography** unless clearly illustrative. Everything should look like UGT's own camera crew shot it.

### Layout rules
- **Max content width ≈ 1200px**, but hero sections go edge-to-edge.
- **12-column grid on desktop, 4-column on mobile.**
- **Fixed elements:** top nav with logo left + CTA right; sticky "APPLY NOW" magenta bar on the bottom of mobile.
- **Sections alternate:** black stage → magenta scrapbook → white card grid → magenta scrapbook → black CTA. Rhythm matters.
- **Big negative space around display type.** The 3D logo breathes; so should the headlines.
- **Rotation / tilt** (±2–4°) on sticker cards, polaroids, and tape is welcome. This is a brand that's allowed to be a little off-axis.

### Borders
- **Mega 6px black border** on sticker cards and buttons (primary lockup).
- **Bold 3px black border** on smaller chips and badges.
- **3px dashed black border** for scrapbook / ticket-stub frames.
- **No subtle 1px gray borders.** If you see one, it's wrong for this brand.

### Radii
- **Medium (12–20px)** is the default for cards and buttons.
- **Pill (999px)** for status chips, ticket tabs, and CTAs.
- **Ticket-stub radii** (`14px 4px 14px 4px`) asymmetric, on the "tag" family — looks torn.
- **Sharp 0px** only for ticker strips and full-bleed image captions.

### Shadows / elevation
The **hard-offset sticker shadow** is the brand's signature depth. A 6px × 6px black or magenta shadow with zero blur. Every primary card uses it.

- `--shadow-sticker-ink` — default on white or light cards.
- `--shadow-sticker-magenta` — on light pink / orange panels.
- `--shadow-sticker-orange` — on magenta cards.
- `--shadow-soft` — secondary, for hover lift.
- `--shadow-glow-magenta` — stage mode, behind CTAs and logo.

Hover: card **shifts 2–3px toward the shadow** (translate), shadow shrinks to 3px 3px. Pressed: card shifts all the way to 0,0 and shadow disappears. This is a physical, stamp-like interaction — never rely on just opacity.

### Interaction states
- **Hover.** Primary CTAs: shift into shadow (`translate(2px, 2px)`) + shadow tightens. Links: underline animates in from left. Photo cards: slight rotation (+1°) + scale(1.02).
- **Press.** Full flatten — `translate(6px, 6px)`, `box-shadow: none`. Feels like you just stamped it.
- **Focus.** 3px `--ugt-orange` outline with 2px offset. Never blue. Never default browser.
- **Disabled.** 40% opacity, no shadow, `cursor: not-allowed`.

### Transparency & blur
- **Transparency only on full-bleed photo overlays** (black or magenta at 40–70% to tint). No "frosted glass" nav bars — that's corporate SaaS, not concert.
- **Blur backdrops** are reserved for modal and drawer surfaces.

### Animation / motion
- **Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out)** is the default. For stamp / stick interactions, **`cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce-out)** gives the "land" feel.
- **Durations:** 140ms micro, 220ms base, 420ms slow, 800ms hero entrance.
- **Entrance pattern.** Stickers land from +12px, rotating from 8° to their rest angle (0–4°), with a light bounce.
- **Exit pattern.** Fade + shrink, no rotation.
- **Marquee / ticker** strips (magenta bar of "FROM POTENTIAL TO PURPOSE · FROM POTENTIAL TO PURPOSE · …") scroll horizontally, always. This is a signature.
- **Hero video/image** can have a slow parallax on scroll. Nothing over-clever.
- **Respect `prefers-reduced-motion`** — swap bounces for fades, kill the marquee.

### Accessibility notes
- Magenta `#C7238E` on white passes AA for large text only. Use `--ugt-ink` or `--ugt-magenta-deep` (#9E1A6F) for body runs on white.
- White on magenta passes AA for body 17px+ and display. Good.
- Orange `#F5A623` on white is **not** text-safe — use it only on filled chips or against `--ugt-ink`.
- Minimum hit target: 44×44px. Stretch up to 56px on "APPLY NOW" style CTAs.

---

## 5. ICONOGRAPHY

UGT has no custom icon font or SVG sprite of its own (and the GitHub repo is empty). The physical materials don't use line icons much at all — they use **sticker motifs, hand-drawn marks, and photography** where a design system would normally use an icon.

### The brand's "icon equivalents"
- **Hand-drawn arrows.** Chunky curved ones like on the calendar poster pointing at "2ND TERM CALENDAR". Used to direct attention.
- **Yellow highlighter swipe** under words. Replaces bullets.
- **X-row / dashed underlines.** Replaces section dividers.
- **Masking-tape corners.** Replaces drop-shadow-only cards.
- **Teardrop banners** (the ones flanking the stage). Used as event-location flags on maps / calendars.
- **Magenta or orange color bars** (2–3 stacked rectangles) as section dividers.

### For UI (web / app / docs)
We use **Lucide** via CDN as a working icon set — clean 1.5px stroke, matches the brand's preference for bold-but-simple. Loaded from `https://unpkg.com/lucide@latest` and styled with `stroke: currentColor; stroke-width: 2`. See the ICONOGRAPHY card in `preview/`.

> ⚠️ **Icon substitution flag.** Lucide is our stand-in. If the team later commissions a bespoke sticker icon set that matches the scrapbook vocabulary (arrows, tape, tears, stars, mic, tree, crown), drop SVGs in `assets/icons/` and document them here. For now, **keep icon use sparse** — icons should only appear where an icon clarifies a UI affordance (nav, form fields, filters). In marketing / posters, use sticker motifs instead.

### Emoji
- **Not used in body copy.**
- **Used only as tier badges** in the Sponsor Catalogue: ⭐ Presenting · 🏆 Impact · 💡 Category · 🌱 Community. Keep these four; don't invent new emoji tiers.

### Unicode
- **Em-dash (`—`)**, **en-dash (`–`)**, **middle dot (`·`)** for rhythm in headlines and tickers.
- **Bullet (`•`)** for inline lists: *"High School Talent Search  •  Mentorship  •  Awards Concert"*.

### Logo usage
- The master logo (`assets/logos/ugt-logo-full.png`) is the **3D extruded lockup**: "URBAN" silver top, "GANG" orange bottom, "TOUR" on a magenta ribbon badge in the middle.
- Minimum size: 80px wide on screen, 20mm in print.
- Clearspace: at least the height of the "U" in URBAN on all sides.
- Background: works on white, magenta, black. Avoid busy photos — if you must, place the logo on a solid sticker card first.
- **Do not:** recolour, flatten to 2D, remove the ribbon, stretch, or apply heavy filters.
- The logo has its own drop shadow baked in; don't add another.

---

## 6. UI Kits

- **`ui_kits/website/`** — the marketing website for the tour. Homepage (hero, calendar, about, partners, sponsors, press), apply flow, gallery. Click-through prototype with 3–5 screens.

*(The admin dashboard repo `eugineous/urban-tour` exists but was not pulled in for this pass — the user's focus was the concert-facing brand, not the internal CMS. Flag for a future round.)*

---

## 7. Known caveats / things to confirm

See the closing summary for the bold ask. Quick hits:
- Fonts are Google Fonts stand-ins. Arial is the doc-side truth.
- Lucide is our working icon set. No bespoke icon language yet.
- GitHub repo `urban-gang-tour-` is currently an empty shell.
- We have one logo file (the 3D lockup). No monochrome, no horizontal variant, no favicon-optimised cut — flag items to commission.
- No stage/crowd photography has been provided. Components that show people (hero, gallery, hosts grid) use the calendar poster and placeholder blocks.
