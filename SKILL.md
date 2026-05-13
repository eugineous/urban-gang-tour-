---
name: urban-gang-tour-design
description: Use this skill to generate well-branded interfaces and assets for Urban Gang Tour (UGT) — Kenya's largest high school talent search, mentorship, and awards concert programme. Covers posters, decks, social reels, stage graphics, the marketing website, broadcast overlays, and merch. Contains colors, type, fonts, assets, motifs, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files:

- `colors_and_type.css` — drop-in CSS tokens + semantic defaults. Import at the top of any artefact.
- `assets/logos/ugt-logo-full.png` — master 3D logo (works on white, ink, magenta, orange).
- `assets/brand/calendar-poster.png` — the north-star reference poster. If in doubt about the visual language, look here.
- `preview/*.html` — design-system cards (colors, type, spacing, components, motifs).
- `ui_kits/website/` — click-through prototype of the marketing site with reusable React components (`TopNav`, `HeroStage`, `Marquee`, `CalendarSection`, `EventCard`, `AboutSection`, `PartnersSection`, `SponsorSection`, `Footer`, `ApplyPage`, `EventPage`).

If creating visual artefacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. If working on production code, copy assets and read the rules in `README.md` to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask them what they want to build or design, ask a few questions (surface: website / social poster / deck / broadcast overlay / merch; mode: stage+concert or sticker+scrapbook; audience), and act as an expert designer who outputs HTML artefacts _or_ production code depending on the need.

Core brand rules to never break:
- Motto is **From Potential to Purpose.** — always exactly this.
- Primary magenta `#C7238E`, secondary orange `#F5A623`, ink `#1A1A1A`.
- Sticker shadows (hard offset, zero blur) are the signature depth.
- No emoji in body copy; tier emoji (⭐🏆💡🌱) only for sponsor tiers.
- Display type is uppercase 99% of the time.
- No blue-purple gradients, no frosted-glass nav, no generic rounded-left-border cards.
