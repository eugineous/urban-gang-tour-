# UGT Public Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire public site as one coherent product (marketing, discovery, shop, booking, ticket UX) with Meta/Grok-caliber craft that amplifies Urban Gang's loud Kenyan youth-culture DNA under Approach B three poster worlds, optimizing Tickets, Book the tour, and Shop equally.

**Architecture:** One responsive public shell + one design-token/component library replaces the native shell / V25 capture / MobileApp triad for in-scope routes. Home is the collision of three poster worlds (Events / Tour-Book / Shop); each world then owns its conversion continuum. Presentation changes only — commerce truth stays on existing server resolvers (`event-truth`, inventory, payment webhooks, `/api/bookings`).

**Tech Stack:** Next.js 15 App Router (React 19), TypeScript 5.7, CSS variables in `app/globals.css` + `app/_components/ugt/*`, Vitest (`npm test`, node env), `npx tsc --noEmit`, `npm run lint`, `npm run build`.

**Spec:** `docs/superpowers/specs/2026-09-27-ugt-public-redesign-design.md` (authoritative). DNA companion: `docs/superpowers/specs/2026-09-27-ugt-public-ui-restudy.md`.

## Global Constraints

- **Public only** — no Control Room, organizer portal, gate, or admin API redesign.
- **No invented commercial facts** — SEO/JSON-LD and UI may only assert what the product already asserts; no fabricated attendance, school counts, partnership, or press quotes.
- **Fail-closed availability** — unknown capacity / missing DB / failed truth resolve never becomes "in stock"; empty states stay honest.
- **Approach B — three poster worlds** — Events / Tour-Book / Shop collide on Home, share one design system and one public shell.
- **Equal hubs** — Tickets, Book the tour, and Shop get equal visual weight and hub-grade craft.
- **Loud motion Home + Tour only** — marquees, float, wobble, collage loops on `/` and `/experience`; quiet micro-motion everywhere else.
- **One design system** — kill V25/`RenderedPage` and `MobileApp` fork for touched routes as each phase lands; BottomTabBar stays chrome, not a second product.
- **Branch workflow** — push/merge allowed on `ui-ux-redesign`; no force-push; prefer normal commits/PRs for review.
- **PR #29 inherited history** — do not reopen PR #29 / `events-reconstruction` scope; do not rewrite the commercial-truth resolver for cosmetics; redesign owns presentation only.
- **Preserve backends** — payment, QR tickets, inventory, auth, rate limits, `hasDb()`, server-side prices, idempotency stay intact; consume existing APIs.
- **Real routes** — one crawlable URL per page, unique metadata/canonicals, real `<a href>` navigation; keep existing redirects; new `/press` gets its own canonical.
- **Voice ladder** — emotional lead "Where the culture gets made."; institutional subtitle "From Potential to Purpose"; do not invent new slogan primaries.
- **AGENTS.md security** — redesign must not regress checkout/ticket correctness or leak contacts.

## Review Focus

1. **Intent collision** — Book, Contact, and Work With Us must not share form capture, CTA copy, or POST shape; wrong door must not create a School Booking. Pinned in Tasks 12, 14, 15.
2. **Availability invention** — `StatusStamp` / Home chips must derive only from `EventTruth` fields; sold-out / postponed / unknown never paint as "On sale". Pinned in Tasks 4 and 16.
3. **MobileApp zombie** — after a route goes native, `MobileApp` must return null for that path so CSS `:has(.ugt-mobile-app)` cannot hide `#ssr-shell`. Pinned in Tasks 9, 11, 16, 19, 23.
4. **Motion leak** — loud keyframes (`marquee`, `spinSlow`, continuous `wob`) must not attach to Shop/Events/Book/Legal class roots. Pinned in Tasks 5 and 10.
5. **Nav/privacy drift** — single label map must drive header, tabbar menu, footer; `/privacy` must resolve to `/privacy-policy`. Pinned in Tasks 2 and 6.

---

## File Map

| Path | Responsibility |
|------|----------------|
| `app/_components/ugt/tokens.ts` | Canonical color/type/shadow/motion token values exported for tests + TS consumers |
| `app/_components/ugt/tokens.css` | `:root` / `[data-motion]` CSS variables imported by `globals.css` |
| `app/_components/ugt/nav.ts` | Single public nav label map (header, tabbar, menu, footer extras) |
| `app/_components/ugt/motion.ts` | `motionPolicy(pathname)` → `'loud' \| 'quiet'`; loud only `/` and `/experience` |
| `app/_components/ugt/statusStamp.ts` | Pure mapper from `EventTruth` (+ lifecycle status) → stamp label/tone |
| `app/_components/ugt/PosterCard.tsx` | Neo-brutal frame wrapper |
| `app/_components/ugt/StickerChip.tsx` | Tilted status/price/tier chip |
| `app/_components/ugt/MoneyButton.tsx` | Yellow primary CTA + magenta offset |
| `app/_components/ugt/GhostButton.tsx` / `InkButton.tsx` | Secondary actions |
| `app/_components/ugt/PathCard.tsx` | Numbered 01/02/03 wayfinding card |
| `app/_components/ugt/StatusStamp.tsx` | Lifecycle chip UI consuming `statusStamp.ts` |
| `app/_components/ugt/TierBoard.tsx` | Ticket tier sticker board |
| `app/_components/ugt/VariantChips.tsx` | Shop size/color stickers |
| `app/_components/ugt/NightStage.tsx` | Dark radial shell for tickets/marketplace/pay |
| `app/_components/ugt/LegalCard.tsx` | White/cream card on magenta stage |
| `app/_components/ugt/NewsPoster.tsx` | Urban News sister-brand card |
| `app/_components/ugt/FormField.tsx` | Shared label/input/error/focus field |
| `app/_components/ugt/Marquee.tsx` | Chyron/marquee for Home + Experience only |
| `app/_components/ugt/index.ts` | Barrel exports |
| `app/_components/PublicShell.tsx` | Header/footer consuming `nav.ts` + tokens |
| `app/_components/BottomTabBar.tsx` | Tabs + menu sheet from `nav.ts`; no duplicate Work labels |
| `app/_components/HomePage.tsx` | Three-world collision Home |
| `app/_components/MobileApp.tsx` | Shrink route map as native pages land; eventually unused on public marketing |
| `app/globals.css` | Import tokens; public/home styles use variables; remove hex snowflakes on touched surfaces |
| `lib/site.ts` | Align `ROUTES` nav labels + add `/press`; keep canonicals unique |
| `next.config.mjs` | Preserve redirects; add none that steal `/partners` |
| `app/experience/page.tsx` (+ `ExperiencePage.tsx`) | Native Tour myth page |
| `app/book/page.tsx` + `BookForm.tsx` / `BookPage.tsx` | Native Book instrument → `POST /api/bookings` |
| `app/work-with-us/page.tsx` | Native collab door |
| `app/contact-us/page.tsx` | Native general contact (not booking) |
| `app/about/page.tsx`, `app/the-gang/page.tsx`, `app/partners/page.tsx` | Native trust/collab pages |
| `app/events/page.tsx`, `app/events/[slug]/page.tsx` | Design-system Events board + poster checkout |
| `app/marketplace/**` | Same visual family + hosted-by labeling; NightStage |
| `app/shop/page.tsx`, `app/shop/[id]/page.tsx`, bag client, `app/pay/success/page.tsx` | Shop continuum |
| `app/press/page.tsx` | New Press lane |
| `app/gallery/page.tsx` | Native evidence wall |
| `app/faq/page.tsx`, `app/_components/LegalPage.tsx` | LegalCard pattern |
| `app/blog/**` | Sister-brand polish only |
| `__tests__/ugt-tokens.test.ts` | Token + motion + statusStamp unit tests |
| `__tests__/ugt-nav.test.ts` | Label/privacy/intent door tests |
| `__tests__/ugt-home-paths.test.ts` | Equal-hub path contract |
| `__tests__/ugt-forms-intent.test.ts` | Book vs Contact vs Work field/API contracts |
| `__tests__/ugt-mobile-app-routes.test.ts` | MobileApp null-map for native routes |

**Do not modify for cosmetics:** `lib/server/event-truth.ts`, inventory/payment/webhook routes, ticket QR issuance, auth session code.

---

## Phase 0 — Foundation

### Task 1: Design tokens (TS + CSS)

**Files:**
- Create: `app/_components/ugt/tokens.ts`
- Create: `app/_components/ugt/tokens.css`
- Modify: `app/globals.css` (import tokens at top; do not delete unrelated v25 rules yet)
- Test: `__tests__/ugt-tokens.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `export const UGT_COLORS = { magenta: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6', ink: '#111111', cream: '#fffafc', blush: '#f8f4ec', blushAlt: '#f1ede5', blushWarm: '#f7f2e9', night: '#0c0c0c', newsInk: '#1A0E14', newsGold: '#F7A81B', whatsapp: '#25D366' } as const`
  - `export const UGT_SHADOWS = { sm: '3px 3px 0 var(--ugt-ink)', md: '5px 6px 0 var(--ugt-ink)', lg: '8px 8px 0 var(--ugt-ink)', money: '3px 3px 0 var(--ugt-magenta)' } as const`
  - `export const UGT_TYPE = { display: "'Anton', 'Arial Black', sans-serif", slogan: "'Permanent Marker', cursive", body: "'Space Grotesk', Arial, sans-serif", newsDisplay: "'Titan One', cursive", newsBody: "'Archivo', sans-serif", mono: "'Spline Sans Mono', ui-monospace, monospace" } as const`
  - CSS vars: `--ugt-magenta`, `--ugt-yellow`, `--ugt-cyan`, `--ugt-ink`, `--ugt-cream`, `--ugt-blush`, `--ugt-night`, `--ugt-news-ink`, `--ugt-news-gold`, `--ugt-whatsapp`, `--ugt-shadow-sm|md|lg|money`, `--ugt-type-display|slogan|body|news-display|news-body|mono`, `--ugt-fs-display|h1|h2|h3|body|kicker|micro`, `--ugt-sticker-tilt: -2deg`

- [x] **Step 1: Write the failing test**

```ts
// __tests__/ugt-tokens.test.ts
import { describe, expect, it } from 'vitest';
import { UGT_COLORS, UGT_SHADOWS, UGT_TYPE } from '@/app/_components/ugt/tokens';

describe('UGT design tokens', () => {
  it('codifies approved brand primaries without inventing new ones', () => {
    expect(UGT_COLORS.magenta).toBe('#E6218C');
    expect(UGT_COLORS.yellow).toBe('#FFD400');
    expect(UGT_COLORS.cyan).toBe('#21C7E6');
    expect(UGT_COLORS.ink).toBe('#111111');
    expect(UGT_COLORS.cream).toBe('#fffafc');
    expect(UGT_COLORS.night).toBe('#0c0c0c');
    expect(UGT_COLORS.newsGold).toBe('#F7A81B');
    expect(UGT_COLORS.whatsapp).toBe('#25D366');
  });

  it('exposes neo-brutal hard shadows and type role faces', () => {
    expect(UGT_SHADOWS.money).toContain('magenta');
    expect(UGT_TYPE.display.toLowerCase()).toContain('anton');
    expect(UGT_TYPE.slogan.toLowerCase()).toContain('permanent marker');
    expect(UGT_TYPE.body.toLowerCase()).toContain('space grotesk');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts`
Expected: FAIL — cannot resolve `@/app/_components/ugt/tokens`

- [x] **Step 3: Write minimal implementation**

```ts
// app/_components/ugt/tokens.ts
export const UGT_COLORS = {
  magenta: '#E6218C',
  yellow: '#FFD400',
  cyan: '#21C7E6',
  ink: '#111111',
  cream: '#fffafc',
  blush: '#f8f4ec',
  blushAlt: '#f1ede5',
  blushWarm: '#f7f2e9',
  night: '#0c0c0c',
  newsInk: '#1A0E14',
  newsGold: '#F7A81B',
  whatsapp: '#25D366',
} as const;

export const UGT_SHADOWS = {
  sm: '3px 3px 0 var(--ugt-ink)',
  md: '5px 6px 0 var(--ugt-ink)',
  lg: '8px 8px 0 var(--ugt-ink)',
  money: '3px 3px 0 var(--ugt-magenta)',
} as const;

export const UGT_TYPE = {
  display: "'Anton', 'Arial Black', sans-serif",
  slogan: "'Permanent Marker', cursive",
  body: "'Space Grotesk', Arial, sans-serif",
  newsDisplay: "'Titan One', cursive",
  newsBody: "'Archivo', sans-serif",
  mono: "'Spline Sans Mono', ui-monospace, monospace",
} as const;
```

```css
/* app/_components/ugt/tokens.css */
:root {
  --ugt-magenta: #E6218C;
  --ugt-yellow: #FFD400;
  --ugt-cyan: #21C7E6;
  --ugt-ink: #111111;
  --ugt-cream: #fffafc;
  --ugt-blush: #f8f4ec;
  --ugt-blush-alt: #f1ede5;
  --ugt-blush-warm: #f7f2e9;
  --ugt-night: #0c0c0c;
  --ugt-news-ink: #1A0E14;
  --ugt-news-gold: #F7A81B;
  --ugt-whatsapp: #25D366;
  --ugt-shadow-sm: 3px 3px 0 var(--ugt-ink);
  --ugt-shadow-md: 5px 6px 0 var(--ugt-ink);
  --ugt-shadow-lg: 8px 8px 0 var(--ugt-ink);
  --ugt-shadow-money: 3px 3px 0 var(--ugt-magenta);
  --ugt-type-display: 'Anton', 'Arial Black', sans-serif;
  --ugt-type-slogan: 'Permanent Marker', cursive;
  --ugt-type-body: 'Space Grotesk', Arial, sans-serif;
  --ugt-type-news-display: 'Titan One', cursive;
  --ugt-type-news-body: 'Archivo', sans-serif;
  --ugt-type-mono: 'Spline Sans Mono', ui-monospace, monospace;
  --ugt-fs-display: clamp(50px, 7vw, 92px);
  --ugt-fs-h1: clamp(38px, 5vw, 64px);
  --ugt-fs-h2: clamp(31px, 3.2vw, 47px);
  --ugt-fs-h3: 25px;
  --ugt-fs-body: 16px;
  --ugt-fs-kicker: 11px;
  --ugt-fs-micro: 10px;
  --ugt-sticker-tilt: -2deg;
}
```

At the very top of `app/globals.css` add:

```css
@import './_components/ugt/tokens.css';
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts`
Expected: PASS

- [x] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: exit 0

```bash
git add app/_components/ugt/tokens.ts app/_components/ugt/tokens.css app/globals.css __tests__/ugt-tokens.test.ts
git commit -m "feat(ugt): add public design tokens for redesign foundation"
```

### Task 2: Single public nav label map

**Files:**
- Create: `app/_components/ugt/nav.ts`
- Modify: `lib/site.ts` (align `nav` labels with map; add Press route entry without stealing Partners)
- Test: `__tests__/ugt-nav.test.ts`

**Interfaces:**
- Consumes: none beyond existing `SITE.domain` patterns
- Produces:
  - `export type NavLink = { href: string; label: string }`
  - `export const PUBLIC_HEADER_NAV: NavLink[]` — Events, The Tour, Urban News, Gallery, Shop
  - `export const PUBLIC_HEADER_CTA: NavLink` — `{ href: '/book', label: 'Book the tour' }`
  - `export const BOTTOM_TABS: Array<NavLink & { icon: string; cta?: boolean }>` — Home, Tickets(`/events`), Book(cta), Shop, Gallery
  - `export const MENU_EXTRAS: NavLink[]` — About, The Gang, Work With Us, Partners, Press, Contact, FAQ, Account (+ legal links)
  - `export const FOOTER_LINKS: NavLink[]` — includes `{ href: '/privacy-policy', label: 'Privacy' }` (never `/privacy`)
  - `export const VOICE = { emotional: 'Where the culture gets made.', institutional: 'From Potential to Purpose' } as const`

- [x] **Step 1: Write the failing test**

```ts
// __tests__/ugt-nav.test.ts
import { describe, expect, it } from 'vitest';
import {
  PUBLIC_HEADER_NAV, PUBLIC_HEADER_CTA, BOTTOM_TABS, MENU_EXTRAS, FOOTER_LINKS, VOICE,
} from '@/app/_components/ugt/nav';
import { ROUTES } from '@/lib/site';

describe('public nav label map', () => {
  it('matches approved desktop header labels and yellow Book CTA', () => {
    expect(PUBLIC_HEADER_NAV.map((l) => l.label)).toEqual([
      'Events', 'The Tour', 'Urban News', 'Gallery', 'Shop',
    ]);
    expect(PUBLIC_HEADER_CTA).toEqual({ href: '/book', label: 'Book the tour' });
  });

  it('matches BottomTabBar labels with raised Book CTA', () => {
    expect(BOTTOM_TABS.map((t) => t.label)).toEqual(['Home', 'Tickets', 'Book', 'Shop', 'Gallery']);
    expect(BOTTOM_TABS.find((t) => t.label === 'Book')?.cta).toBe(true);
    expect(BOTTOM_TABS.find((t) => t.label === 'Tickets')?.href).toBe('/events');
  });

  it('has one Work With Us label and a working privacy door', () => {
    const work = MENU_EXTRAS.filter((l) => /work with/i.test(l.label));
    expect(work).toHaveLength(1);
    expect(work[0].href).toBe('/work-with-us');
    expect(FOOTER_LINKS.some((l) => l.href === '/privacy-policy' && l.label === 'Privacy')).toBe(true);
    expect(FOOTER_LINKS.some((l) => l.href === '/privacy')).toBe(false);
  });

  it('keeps separated intent doors and voice ladder', () => {
    const hrefs = MENU_EXTRAS.map((l) => l.href);
    expect(hrefs).toContain('/book');
    expect(hrefs).toContain('/work-with-us');
    expect(hrefs).toContain('/contact-us');
    expect(hrefs).toContain('/press');
    expect(VOICE.emotional).toBe('Where the culture gets made.');
    expect(VOICE.institutional).toBe('From Potential to Purpose');
  });

  it('includes Press in ROUTES without stealing Partners URL', () => {
    const press = ROUTES.find((r) => r.path === '/press');
    const partners = ROUTES.find((r) => r.path === '/partners');
    expect(press).toBeTruthy();
    expect(partners?.path).toBe('/partners');
    expect(press?.path).not.toBe('/partners');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run --no-cache __tests__/ugt-nav.test.ts`
Expected: FAIL — module not found / Press missing

- [x] **Step 3: Implement `nav.ts` and align `lib/site.ts`**

```ts
// app/_components/ugt/nav.ts
export type NavLink = { href: string; label: string };

export const VOICE = {
  emotional: 'Where the culture gets made.',
  institutional: 'From Potential to Purpose',
} as const;

export const PUBLIC_HEADER_NAV: NavLink[] = [
  { href: '/events', label: 'Events' },
  { href: '/experience', label: 'The Tour' },
  { href: '/blog', label: 'Urban News' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/shop', label: 'Shop' },
];

export const PUBLIC_HEADER_CTA: NavLink = { href: '/book', label: 'Book the tour' };

export const BOTTOM_TABS: Array<NavLink & { icon: string; cta?: boolean }> = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/events', label: 'Tickets', icon: 'ticket' },
  { href: '/book', label: 'Book', icon: 'book', cta: true },
  { href: '/shop', label: 'Shop', icon: 'bag' },
  { href: '/gallery', label: 'Gallery', icon: 'gallery' },
];

export const MENU_EXTRAS: NavLink[] = [
  { href: '/book', label: 'Book the tour' },
  { href: '/about', label: 'About' },
  { href: '/the-gang', label: 'The Gang' },
  { href: '/work-with-us', label: 'Work With Us' },
  { href: '/partners', label: 'Partners' },
  { href: '/press', label: 'Press' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
  { href: '/account', label: 'Account' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/ticket-terms', label: 'Ticket Terms' },
];

export const FOOTER_LINKS: NavLink[] = [
  { href: '/book', label: 'Bring UGT to your school' },
  { href: '/work-with-us', label: 'Work With Us' },
  { href: '/press', label: 'Press' },
  { href: '/contact-us', label: 'Contact' },
  { href: '/privacy-policy', label: 'Privacy' },
];
```

In `lib/site.ts`, add a Press `RouteDef` after Partners (canonical `/press`, title/description media-kit oriented, **no fabricated coverage stats**), and set blog `nav: 'Urban News'` (not `'News'`) so SEO map matches shell. Keep Partners path `/partners`.

- [x] **Step 4: Run tests**

Run: `npx vitest run --no-cache __tests__/ugt-nav.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add app/_components/ugt/nav.ts lib/site.ts __tests__/ugt-nav.test.ts
git commit -m "feat(ugt): unify public nav labels and add Press route config"
```

---

### Task 3: Sticker component primitives

**Files:**
- Create: `app/_components/ugt/PosterCard.tsx`
- Create: `app/_components/ugt/StickerChip.tsx`
- Create: `app/_components/ugt/MoneyButton.tsx`
- Create: `app/_components/ugt/GhostButton.tsx`
- Create: `app/_components/ugt/InkButton.tsx`
- Create: `app/_components/ugt/PathCard.tsx`
- Create: `app/_components/ugt/ugt-primitives.css`
- Create: `app/_components/ugt/index.ts`
- Modify: `app/globals.css` — `@import './_components/ugt/ugt-primitives.css';`
- Test: extend `__tests__/ugt-tokens.test.ts` with export smoke (Vitest is node-only; no RTL)

**Interfaces:**
- Consumes: CSS vars from Task 1
- Produces:
  - `PosterCard({ children, className?, as?: 'article'|'div'|'li' })`
  - `StickerChip({ children, tone?: 'yellow'|'cyan'|'ink'|'magenta'|'cream', tilt?: boolean })`
  - `MoneyButton({ href?, onClick?, children, type? })` — yellow + magenta offset; renders `Link` or `button`
  - `GhostButton`, `InkButton`
  - `PathCard({ href, number: '01'|'02'|'03', tone: 'yellow'|'cyan'|'ink', title, copy, label })`

- [x] **Step 1: Write failing export smoke test**

```ts
// append to __tests__/ugt-tokens.test.ts
import * as primitives from '@/app/_components/ugt/index';

describe('ugt primitives barrel', () => {
  it('exports sticker system components', () => {
    for (const name of ['PosterCard', 'StickerChip', 'MoneyButton', 'GhostButton', 'InkButton', 'PathCard']) {
      expect(typeof (primitives as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
```

- [x] **Step 2: Run — expect FAIL** (`index` missing)

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts`

- [x] **Step 3: Implement components**

```tsx
// app/_components/ugt/MoneyButton.tsx
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  href?: string;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function MoneyButton({ children, href, className = '', ...rest }: Props) {
  const cls = `ugt-money-btn ${className}`.trim();
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
```

```tsx
// app/_components/ugt/PathCard.tsx
import Link from 'next/link';

export function PathCard(props: {
  href: string;
  number: '01' | '02' | '03';
  tone: 'yellow' | 'cyan' | 'ink';
  title: string;
  copy: string;
  label: string;
}) {
  return (
    <Link href={props.href} className={`ugt-path-card ugt-path-card--${props.tone}`}>
      <span className="ugt-path-card__num">{props.number}</span>
      <h2 className="ugt-path-card__title">{props.title}</h2>
      <p className="ugt-path-card__copy">{props.copy}</p>
      <b className="ugt-path-card__cta">{props.label} →</b>
    </Link>
  );
}
```

```tsx
// app/_components/ugt/PosterCard.tsx
import type { ReactNode } from 'react';
export function PosterCard({ children, className = '', as: Tag = 'article' }: {
  children: ReactNode; className?: string; as?: 'article' | 'div' | 'li';
}) {
  return <Tag className={`ugt-poster-card ${className}`.trim()}>{children}</Tag>;
}
```

```tsx
// app/_components/ugt/StickerChip.tsx
import type { ReactNode } from 'react';
export function StickerChip({ children, tone = 'yellow', tilt = true }: {
  children: ReactNode; tone?: 'yellow' | 'cyan' | 'ink' | 'magenta' | 'cream'; tilt?: boolean;
}) {
  return (
    <span className={`ugt-sticker ugt-sticker--${tone}${tilt ? ' ugt-sticker--tilt' : ''}`}>
      {children}
    </span>
  );
}
```

Implement `GhostButton` / `InkButton` with classes `ugt-ghost-btn` / `ugt-ink-btn` using the same Link-or-button pattern as `MoneyButton`.

```css
/* app/_components/ugt/ugt-primitives.css */
.ugt-poster-card{background:#fff;border:3px solid var(--ugt-ink);box-shadow:var(--ugt-shadow-md);color:var(--ugt-ink)}
.ugt-sticker{display:inline-flex;align-items:center;padding:6px 8px;border:2px solid var(--ugt-ink);font:900 11px/1.2 var(--ugt-type-body);text-transform:uppercase;letter-spacing:.04em}
.ugt-sticker--tilt{transform:rotate(var(--ugt-sticker-tilt))}
.ugt-sticker--yellow{background:var(--ugt-yellow);color:var(--ugt-ink)}
.ugt-sticker--cyan{background:var(--ugt-cyan);color:var(--ugt-ink)}
.ugt-sticker--ink{background:var(--ugt-ink);color:var(--ugt-yellow)}
.ugt-sticker--magenta{background:var(--ugt-magenta);color:#fff}
.ugt-sticker--cream{background:var(--ugt-cream);color:var(--ugt-ink)}
.ugt-money-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 18px;background:var(--ugt-yellow);color:var(--ugt-ink);border:2px solid #fff;font:900 12px/1 var(--ugt-type-body);text-transform:uppercase;letter-spacing:.04em;text-decoration:none;box-shadow:var(--ugt-shadow-money)}
.ugt-money-btn:focus-visible,.ugt-ghost-btn:focus-visible,.ugt-ink-btn:focus-visible,.ugt-path-card:focus-visible{outline:3px solid var(--ugt-cyan);outline-offset:3px}
.ugt-ghost-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 18px;background:transparent;color:inherit;border:3px solid currentColor;font:900 12px/1 var(--ugt-type-body);text-transform:uppercase;text-decoration:none}
.ugt-ink-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 18px;background:var(--ugt-ink);color:#fff;border:3px solid var(--ugt-ink);font:900 12px/1 var(--ugt-type-body);text-transform:uppercase;text-decoration:none;box-shadow:var(--ugt-shadow-sm)}
.ugt-path-card{min-height:320px;display:flex;flex-direction:column;border:3px solid var(--ugt-ink);padding:23px;color:var(--ugt-ink);text-decoration:none;box-shadow:var(--ugt-shadow-md)}
.ugt-path-card--yellow{background:var(--ugt-yellow)}
.ugt-path-card--cyan{background:var(--ugt-cyan)}
.ugt-path-card--ink{background:var(--ugt-ink);color:#fff;box-shadow:5px 6px 0 var(--ugt-magenta)}
.ugt-path-card__num{font-size:12px;font-weight:900;letter-spacing:.1em}
.ugt-path-card__title{font:var(--ugt-fs-h2)/.95 var(--ugt-type-display);text-transform:uppercase;margin:34px 0 0}
.ugt-path-card__copy{font-size:14px;font-weight:700;line-height:1.45;margin:17px 0}
.ugt-path-card__cta{margin-top:auto;font-size:13px;text-decoration:underline;text-underline-offset:4px;text-transform:uppercase}
```

```ts
// app/_components/ugt/index.ts
export * from './tokens';
export * from './nav';
export { PosterCard } from './PosterCard';
export { StickerChip } from './StickerChip';
export { MoneyButton } from './MoneyButton';
export { GhostButton } from './GhostButton';
export { InkButton } from './InkButton';
export { PathCard } from './PathCard';
```

- [x] **Step 4: Run tests + tsc**

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts && npx tsc --noEmit`
Expected: PASS / exit 0

- [x] **Step 5: Commit**

```bash
git add app/_components/ugt __tests__/ugt-tokens.test.ts app/globals.css
git commit -m "feat(ugt): add poster/sticker/money/path primitives"
```

### Task 4: StatusStamp mapper + NightStage + TierBoard shells

**Files:**
- Create: `app/_components/ugt/statusStamp.ts`
- Create: `app/_components/ugt/StatusStamp.tsx`
- Create: `app/_components/ugt/TierBoard.tsx`
- Create: `app/_components/ugt/NightStage.tsx`
- Create: `app/_components/ugt/VariantChips.tsx`
- Create: `app/_components/ugt/LegalCard.tsx`
- Create: `app/_components/ugt/NewsPoster.tsx`
- Modify: `app/_components/ugt/index.ts`, `ugt-primitives.css`
- Test: extend `__tests__/ugt-tokens.test.ts` — pins Review Focus #2

**Interfaces:**
- Consumes: `EventTruth` type from `@/lib/server/event-truth` (type-only import)
- Produces:
  - `export type StampTone = 'yellow' | 'cyan' | 'ink' | 'magenta' | 'cream'`
  - `export function stampFromEventTruth(truth: Pick<EventTruth,'isSellable'|'isSoldOut'|'isPostponed'|'isRescheduled'|'isCompleted'|'isCancelled'|'minPrice'>, status: string): { label: string; tone: StampTone }`
  - Fail-closed rules: sellable → `On sale` (yellow) or `From KES…` only when `minPrice !== null`; soldOut → `Sold out`; postponed/rescheduled/cancelled/completed exact labels; else `Event update` — **never** invent On sale when `!isSellable`
  - UI wrappers: `StatusStamp`, `TierBoard`, `NightStage`, `VariantChips`, `LegalCard`, `NewsPoster`

- [x] **Step 1: Failing tests for fail-closed stamps**

```ts
import { stampFromEventTruth } from '@/app/_components/ugt/statusStamp';

describe('stampFromEventTruth', () => {
  const base = {
    isSellable: false, isSoldOut: false, isPostponed: false, isRescheduled: false,
    isCompleted: false, isCancelled: false, minPrice: null as number | null,
  };
  it('never paints On sale when not sellable', () => {
    expect(stampFromEventTruth(base, 'published').label).toBe('Event update');
  });
  it('uses sold out / postponed / rescheduled truthfully', () => {
    expect(stampFromEventTruth({ ...base, isSoldOut: true }, 'sold_out').label).toBe('Sold out');
    expect(stampFromEventTruth({ ...base, isPostponed: true }, 'postponed').label).toBe('Postponed');
    expect(stampFromEventTruth({ ...base, isRescheduled: true }, 'rescheduled').label).toBe('Rescheduled');
  });
  it('shows From price only when sellable and minPrice known', () => {
    expect(stampFromEventTruth({ ...base, isSellable: true, minPrice: 500 }, 'published').label).toMatch(/From/);
    expect(stampFromEventTruth({ ...base, isSellable: true, minPrice: null }, 'published').label).toBe('On sale');
  });
});
```

- [x] **Step 2: Run — FAIL**

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts`

- [x] **Step 3: Implement mapper + thin UI wrappers**

```ts
// app/_components/ugt/statusStamp.ts
import type { EventTruth } from '@/lib/server/event-truth';

export type StampTone = 'yellow' | 'cyan' | 'ink' | 'magenta' | 'cream';

export function stampFromEventTruth(
  truth: Pick<EventTruth, 'isSellable' | 'isSoldOut' | 'isPostponed' | 'isRescheduled' | 'isCompleted' | 'isCancelled' | 'minPrice'>,
  _status: string,
): { label: string; tone: StampTone } {
  if (truth.isSoldOut) return { label: 'Sold out', tone: 'ink' };
  if (truth.isCancelled) return { label: 'Cancelled', tone: 'ink' };
  if (truth.isPostponed) return { label: 'Postponed', tone: 'magenta' };
  if (truth.isRescheduled) return { label: 'Rescheduled', tone: 'magenta' };
  if (truth.isCompleted) return { label: 'Ended', tone: 'cream' };
  if (truth.isSellable) {
    if (truth.minPrice !== null) {
      const price = new Intl.NumberFormat('en-KE', {
        style: 'currency', currency: 'KES', maximumFractionDigits: 0,
      }).format(truth.minPrice);
      return { label: `From ${price}`, tone: 'yellow' };
    }
    return { label: 'On sale', tone: 'yellow' };
  }
  return { label: 'Event update', tone: 'cream' };
}
```

`StatusStamp` renders `StickerChip` from mapper output. `TierBoard({ tiers })` maps tiers to sticker rows; non-sellable tiers show muted chip, never a buy affordance. `NightStage` wraps children in `.ugt-night-stage` (background `var(--ugt-night)`, radial magenta/cyan glow, **no** playful loops). `LegalCard` = white card on magenta parent. `NewsPoster` uses news gold/ink classes only. `VariantChips` takes `{ options: string[]; value?: string; onChange?: (v: string) => void }`.

Export new symbols from `index.ts`.

- [x] **Step 4: Tests + tsc pass**

Run: `npx vitest run --no-cache __tests__/ugt-tokens.test.ts && npx tsc --noEmit`

- [x] **Step 5: Commit**

```bash
git add app/_components/ugt __tests__/ugt-tokens.test.ts
git commit -m "feat(ugt): add StatusStamp, TierBoard, NightStage, LegalCard, NewsPoster"
```

---

### Task 5: Motion policy + Marquee (loud vs quiet)

**Files:**
- Create: `app/_components/ugt/motion.ts`
- Create: `app/_components/ugt/Marquee.tsx`
- Modify: `tokens.css` / `ugt-primitives.css` — `[data-ugt-motion='loud']` enables marquee/float; quiet disables
- Modify: `index.ts`
- Test: `__tests__/ugt-tokens.test.ts` — pins Review Focus #4

**Interfaces:**
- Produces: `export function motionPolicy(pathname: string): 'loud' | 'quiet'` — loud iff pathname is `/` or `/experience`
- `Marquee({ children, className? })` — CSS animation only under `[data-ugt-motion='loud']`

- [x] **Step 1: Failing test**

```ts
import { motionPolicy } from '@/app/_components/ugt/motion';
describe('motionPolicy', () => {
  it('is loud only on Home and Experience', () => {
    expect(motionPolicy('/')).toBe('loud');
    expect(motionPolicy('/experience')).toBe('loud');
    expect(motionPolicy('/events')).toBe('quiet');
    expect(motionPolicy('/shop')).toBe('quiet');
    expect(motionPolicy('/book')).toBe('quiet');
    expect(motionPolicy('/privacy-policy')).toBe('quiet');
  });
});
```

- [x] **Step 2: Run — FAIL**

- [x] **Step 3: Implement**

```ts
// app/_components/ugt/motion.ts
export function motionPolicy(pathname: string): 'loud' | 'quiet' {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  return path === '/' || path === '/experience' ? 'loud' : 'quiet';
}
```

```tsx
// app/_components/ugt/Marquee.tsx
import type { ReactNode } from 'react';
export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ugt-marquee ${className}`.trim()} aria-hidden="true">
      <div className="ugt-marquee__track"><span>{children}</span><span>{children}</span></div>
    </div>
  );
}
```

```css
.ugt-marquee{overflow:hidden;border-block:3px solid var(--ugt-ink);background:var(--ugt-yellow)}
.ugt-marquee__track{display:flex;gap:48px;width:max-content;font:900 12px/1 var(--ugt-type-body);text-transform:uppercase;letter-spacing:.08em;padding:10px 0}
[data-ugt-motion='loud'] .ugt-marquee__track{animation:marquee 28s linear infinite}
[data-ugt-motion='quiet'] .ugt-marquee__track{animation:none}
```

Prefer page-level `<main data-ugt-motion={motionPolicy(PATH)}>` over layout body churn.

- [x] **Step 4: PASS** — `npx vitest run --no-cache __tests__/ugt-tokens.test.ts && npx tsc --noEmit`

- [x] **Step 5: Commit**

```bash
git add app/_components/ugt __tests__/ugt-tokens.test.ts
git commit -m "feat(ugt): gate loud motion to Home and Experience"
```

---

### Task 6: PublicShell cleanup (header/footer + privacy)

**Files:**
- Modify: `app/_components/PublicShell.tsx`
- Modify: `app/globals.css` — footer subtitle micro style using tokens
- Test: `__tests__/ugt-nav.test.ts` source contract — pins Review Focus #5

**Interfaces:**
- Consumes: `PUBLIC_HEADER_NAV`, `PUBLIC_HEADER_CTA`, `FOOTER_LINKS`, `VOICE`
- Produces: same `PublicHeader` / `PublicFooter` exports, now map-driven

- [x] **Step 1: Failing test — shell sources map**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

it('PublicShell sources header/footer from ugt/nav', () => {
  const src = readFileSync(resolve(__dirname, '../app/_components/PublicShell.tsx'), 'utf8');
  expect(src).toMatch(/from '\.\/ugt\/nav'|from '@\/app\/_components\/ugt\/nav'/);
  expect(src).toContain('PUBLIC_HEADER_NAV');
  expect(src).toContain('FOOTER_LINKS');
  expect(src).toContain('VOICE');
  expect(src).not.toContain('href="/privacy"');
});
```

- [x] **Step 2: FAIL (still hardcodes `/privacy`)**

- [x] **Step 3: Rewrite shell**

```tsx
// app/_components/PublicShell.tsx
import Link from 'next/link';
import { PUBLIC_HEADER_NAV, PUBLIC_HEADER_CTA, FOOTER_LINKS, VOICE } from './ugt/nav';

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link href="/" className="public-header__brand" aria-label="Urban Gang Tour home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" />
        </Link>
        <nav className="public-header__nav" aria-label="Main navigation">
          {PUBLIC_HEADER_NAV.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <Link href={PUBLIC_HEADER_CTA.href} className="public-header__cta ugt-money-btn">
          {PUBLIC_HEADER_CTA.label}
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div>
          <p className="public-footer__eyebrow">Urban Gang Tour</p>
          <p className="public-footer__statement">{VOICE.emotional}</p>
          <p className="public-footer__subtitle">{VOICE.institutional}</p>
        </div>
        <div className="public-footer__links" aria-label="Footer navigation">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href + l.label} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </div>
      <div className="public-footer__legal">
        © {new Date().getFullYear()} Urban Gang Tour. Broadcast network: PPP TV Kenya.
      </div>
    </footer>
  );
}
```

Add `.public-footer__subtitle` micro institutional line (Permanent Marker or small Space Grotesk). Point header/footer colors at `var(--ugt-*)`.

- [x] **Step 4:** `npx vitest run --no-cache __tests__/ugt-nav.test.ts && npx tsc --noEmit`

- [x] **Step 5: Commit**

```bash
git add app/_components/PublicShell.tsx app/globals.css __tests__/ugt-nav.test.ts
git commit -m "refactor(ugt): drive PublicShell from nav map and fix privacy link"
```

---

### Task 7: BottomTabBar single chrome engine

**Files:**
- Modify: `app/_components/BottomTabBar.tsx`
- Test: source contract in `__tests__/ugt-nav.test.ts`

**Interfaces:**
- Consumes: `BOTTOM_TABS`, `MENU_EXTRAS` from `nav.ts`
- Produces: unchanged export `BottomTabBar`; menu must not duplicate Work labels; Menu button remains 6th control

- [x] **Step 1: Failing source test**

```ts
it('BottomTabBar uses BOTTOM_TABS and MENU_EXTRAS without duplicate Work labels', () => {
  const src = readFileSync(resolve(__dirname, '../app/_components/BottomTabBar.tsx'), 'utf8');
  expect(src).toMatch(/BOTTOM_TABS/);
  expect(src).toMatch(/MENU_EXTRAS/);
  expect(src).not.toMatch(/Work with UGT/);
});
```

- [x] **Step 2: FAIL → Step 3:** replace local `TABS`/`MENU_LINKS` with imports; keep Icon + sheet a11y/scroll-lock behavior; use `key={\`${l.href}-${l.label}\`}` for menu rows

- [x] **Step 4:** `npm test && npx tsc --noEmit`

- [x] **Step 5: Commit**

```bash
git add app/_components/BottomTabBar.tsx __tests__/ugt-nav.test.ts
git commit -m "refactor(ugt): single-source BottomTabBar labels"
```

---

### Task 8: FormField primitive

**Files:**
- Create: `app/_components/ugt/FormField.tsx`
- Modify: `ugt-primitives.css`, `index.ts`
- Test: `__tests__/ugt-forms-intent.test.ts`

**Interfaces:**
- Produces:
  - `FormField({ id, label, error?, children })` — associates `htmlFor`, renders error in `#${id}-error`, sets `aria-invalid` / `aria-describedby` when error
  - `export function formErrorProps(id: string, error?: string)` → input aria props

- [x] **Step 1: Failing test**

```ts
// __tests__/ugt-forms-intent.test.ts
import { describe, expect, it } from 'vitest';
import { formErrorProps } from '@/app/_components/ugt/FormField';

describe('FormField a11y helpers', () => {
  it('wires aria-invalid and describedby only when error present', () => {
    expect(formErrorProps('email')).toEqual({});
    expect(formErrorProps('email', 'invalid_email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'email-error',
    });
  });
});
```

- [x] **Step 2: FAIL**

- [x] **Step 3: Implement**

```tsx
import type { ReactNode } from 'react';

export function formErrorProps(id: string, error?: string) {
  if (!error) return {};
  return { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` };
}

export function FormField({ id, label, error, children }: {
  id: string; label: string; error?: string; children: ReactNode;
}) {
  return (
    <label className="ugt-field" htmlFor={id}>
      <span className="ugt-field__label">{label}</span>
      {children}
      {error ? <span id={`${id}-error`} className="ugt-field__error" role="alert">{error}</span> : null}
    </label>
  );
}
```

```css
.ugt-field{display:grid;gap:8px;font-family:var(--ugt-type-body)}
.ugt-field__label{font-weight:800;font-size:13px}
.ugt-field input,.ugt-field textarea,.ugt-field select{border:3px solid var(--ugt-ink);padding:12px;font:600 15px/1.3 var(--ugt-type-body);background:#fff}
.ugt-field input:focus-visible,.ugt-field textarea:focus-visible,.ugt-field select:focus-visible{outline:3px solid var(--ugt-cyan);outline-offset:2px}
.ugt-field__error{color:var(--ugt-magenta);font-weight:800;font-size:12px}
```

- [x] **Step 4:** `npx vitest run --no-cache __tests__/ugt-forms-intent.test.ts && npx tsc --noEmit`

- [x] **Step 5: Commit**

```bash
git add app/_components/ugt __tests__/ugt-forms-intent.test.ts
git commit -m "feat(ugt): add shared FormField with a11y error wiring"
```

**Phase 0 gate:** `npx tsc --noEmit && npm test && npm run lint` — all green before Home.

---

## Phase 1 — Home collision redesign

### Task 9: Home three-world equal hubs

**Files:**
- Modify: `app/_components/HomePage.tsx`
- Modify: `app/globals.css` (`.home-*` path section)
- Modify: `app/_components/MobileApp.tsx` — keep `/` → null (already); lock in test
- Test: `__tests__/ugt-home-paths.test.ts`, `__tests__/ugt-mobile-app-routes.test.ts`

**Interfaces:**
- Consumes: `PathCard`, `MoneyButton`, `GhostButton`, `StickerChip`, `stampFromEventTruth`, existing `homeEvents`/`homeProducts`/`homePhotos`/`getBlogPosts` loaders (preserve `hasDb()` fail-closed)
- Produces: Home sections — hero, live culture strip, **equal** PathCards `01 Tickets → /events`, `02 Book → /book`, `03 Shop → /shop`, gallery/merch/news teasers, founders. Work With Us and Urban News remain reachable via nav, not the monument.

- [ ] **Step 1: Failing tests**

```ts
// __tests__/ugt-home-paths.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () => readFileSync(resolve(__dirname, '../app/_components/HomePage.tsx'), 'utf8');

describe('Home equal hubs', () => {
  it('monuments Tickets, Book, and Shop with equal PathCard doors', () => {
    const s = src();
    expect(s).toContain('PathCard');
    expect(s).toContain('href="/events"');
    expect(s).toContain('href="/book"');
    expect(s).toContain('href="/shop"');
    expect(s).toContain('number="01"');
    expect(s).toContain('number="02"');
    expect(s).toContain('number="03"');
    expect(s).not.toMatch(/PathCard[\s\S]{0,120}href="\/work-with-us"/);
    expect(s).not.toMatch(/PathCard[\s\S]{0,120}href="\/blog"/);
  });
  it('keeps fail-closed empty copy when no events', () => {
    expect(src()).toMatch(/no public events|next chapter is loading/i);
  });
});
```

```ts
// __tests__/ugt-mobile-app-routes.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () => readFileSync(resolve(__dirname, '../app/_components/MobileApp.tsx'), 'utf8');

describe('MobileApp route shrinkage', () => {
  it('never mounts MobileApp on Home', () => {
    expect(src()).toMatch(/pathname === '\/'\s*\)?\s*return null/);
  });
});
```

- [ ] **Step 2: Run — FAIL on PathCard hubs**

Run: `npx vitest run --no-cache __tests__/ugt-home-paths.test.ts __tests__/ugt-mobile-app-routes.test.ts`

- [ ] **Step 3: Implement Home collision**

Replace path section with:

```tsx
<section className="home-section home-paths" aria-label="Three ways in">
  <div className="home-frame home-paths__grid">
    <PathCard
      href="/events"
      number="01"
      tone="yellow"
      title="Catch the live culture."
      copy="Explore UGT events and get tickets when they're on sale."
      label="Explore events"
    />
    <PathCard
      href="/book"
      number="02"
      tone="cyan"
      title="Bring the tour to your school."
      copy="Book a campus or school experience made for your community."
      label="Book the tour"
    />
    <PathCard
      href="/shop"
      number="03"
      tone="ink"
      title="Wear the signal."
      copy="Merch that carries the culture — not a catalog dump."
      label="Shop merch"
    />
  </div>
</section>
```

Hero CTAs: primary `MoneyButton href="/events"` "Explore events"; secondary `GhostButton href="/book"` "Book the tour". Event cards: replace ad-hoc `eventState` chip with `stampFromEventTruth(event.truth, event.status)` + `StickerChip` / `StatusStamp`. Keep DB helpers unchanged. Wrap `<main className="home-page" data-ugt-motion="loud">`.

- [ ] **Step 4:** `npx vitest run --no-cache __tests__/ugt-home-paths.test.ts __tests__/ugt-mobile-app-routes.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add app/_components/HomePage.tsx app/globals.css __tests__/ugt-home-paths.test.ts __tests__/ugt-mobile-app-routes.test.ts
git commit -m "feat(home): three-world collision with equal Tickets/Book/Shop hubs"
```

---

### Task 10: Home loud collage motion + tokenized styles

**Files:**
- Modify: `app/_components/HomePage.tsx` (add `Marquee` live strip)
- Modify: `app/globals.css` `.home-*` block to consume `var(--ugt-*)` instead of local hex duplicates
- Test: motion policy assertions already in Task 5; extend if needed

- [ ] **Step 1: Add marquee under hero**

```tsx
import { Marquee } from '@/app/_components/ugt/Marquee';
// inside loud main:
<Marquee className="home-chyron">
  Live culture · Book the tour · Wear the signal · Urban News · Where the culture gets made.
</Marquee>
```

- [ ] **Step 2: Alias home CSS vars to design tokens**

```css
.home-page{
  --home-ink:var(--ugt-ink);
  --home-pink:var(--ugt-magenta);
  --home-yellow:var(--ugt-yellow);
  --home-blue:var(--ugt-cyan);
  background:var(--ugt-cream);
  color:var(--ugt-ink);
  font-family:var(--ugt-type-body);
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: compile success; Home shows marquee under loud policy; Shop/Events stay quiet policy via `motionPolicy`.

- [ ] **Step 4: Commit**

```bash
git add app/_components/HomePage.tsx app/globals.css
git commit -m "feat(home): loud collage motion and tokenized home styles"
```

**Phase 1 gate:** equal hubs visible; Home still skips MobileApp; `npm test` green.

---

## Phase 2 — Tour / Book world

### Task 11: Native Experience (myth collage)

**Files:**
- Modify: `app/experience/page.tsx` — remove `RenderedPage`
- Create: `app/_components/ExperiencePage.tsx`
- Test: `__tests__/ugt-mobile-app-routes.test.ts` source contract

**Interfaces:**
- Consumes: `Marquee`, `MoneyButton`, `PosterCard`, loud motion, `VOICE`
- Produces: native RSC page; metadata via `metadataForPathDynamic('/experience')`; ends with Book CTA
- Copy: "One Day. One Institution." myth framing; **do not** invent school counts; do not copy About JSON-LD stats into Experience UI

- [ ] **Step 1: Failing test**

```ts
it('experience page is native (no RenderedPage)', () => {
  const s = readFileSync(resolve(__dirname, '../app/experience/page.tsx'), 'utf8');
  expect(s).not.toMatch(/RenderedPage/);
  expect(s).toMatch(/ExperiencePage/);
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement `ExperiencePage`** — myth hero (Anton), day-shape collage strips, institutional promise without stats, closing `MoneyButton href="/book"` ("Book the tour" / "Bring UGT to your school"). `<main data-ugt-motion="loud">`. Page file:

```tsx
import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { ExperiencePage } from '@/app/_components/ExperiencePage';

const PATH = '/experience';
export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}
export default function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <ExperiencePage />
    </>
  );
}
```

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/ugt-mobile-app-routes.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/experience/page.tsx app/_components/ExperiencePage.tsx __tests__/ugt-mobile-app-routes.test.ts
git commit -m "feat(experience): native myth collage page on design system"
```

---

### Task 12: Native Book form (institutional booking only)

**Files:**
- Modify: `app/book/page.tsx`
- Create: `app/_components/BookForm.tsx` (`'use client'`)
- Create: `app/_components/BookPage.tsx`
- Modify: `MobileApp.tsx` — remove `/book` from routes map
- Test: `__tests__/ugt-forms-intent.test.ts` — pins Review Focus #1
- **API unchanged:** `POST /api/bookings`

**Interfaces:**
- Consumes: `FormField`, `formErrorProps`, `MoneyButton`
- Default type `School Booking`; school fields require `org`, message ≥10 chars, `schoolContactConfirmed: true`
- Produces: success state with booking id; 503 → "Booking desk unavailable" fail-closed
- Quiet motion: `<main data-ugt-motion="quiet">`

- [ ] **Step 1: Failing tests**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Book intent', () => {
  it('book page is native and posts to /api/bookings', () => {
    const page = readFileSync(resolve(__dirname, '../app/book/page.tsx'), 'utf8');
    const form = readFileSync(resolve(__dirname, '../app/_components/BookForm.tsx'), 'utf8');
    expect(page).not.toMatch(/RenderedPage/);
    expect(form).toMatch(/\/api\/bookings/);
    expect(form).toMatch(/School Booking/);
    expect(form).not.toMatch(/press kit/i);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement client form**

```tsx
// BookForm.tsx sketch
'use client';
import { FormEvent, useState } from 'react';
import { FormField, formErrorProps } from '@/app/_components/ugt/FormField';
import { MoneyButton } from '@/app/_components/ugt/MoneyButton';

export function BookForm() {
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [error, setError] = useState('');
  const [id, setId] = useState('');
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const fd = new FormData(e.currentTarget);
    const requestId = crypto.randomUUID().replace(/-/g, '');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: String(fd.get('name') || ''),
        org: String(fd.get('org') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || ''),
        type: 'School Booking',
        message: String(fd.get('message') || ''),
        schoolContactConfirmed: fd.get('schoolContactConfirmed') === 'on',
        requestId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus('error');
      setError(typeof data.error === 'string' ? data.error : 'booking_unavailable');
      return;
    }
    setId(String(data.id || ''));
    setStatus('sent');
  }
  // render FormFields + MoneyButton submit; map API error codes to field errors
  return <form onSubmit={onSubmit}>{/* fields */}</form>;
}
```

- [ ] **Step 4:** tests + tsc; confirm MobileApp map lacks `/book`

- [ ] **Step 5: Commit**

```bash
git add app/book/page.tsx app/_components/BookForm.tsx app/_components/BookPage.tsx app/_components/MobileApp.tsx __tests__/ugt-forms-intent.test.ts __tests__/ugt-mobile-app-routes.test.ts
git commit -m "feat(book): native institutional booking form on /book"
```

---

### Task 13: Native About + The Gang

**Files:**
- Modify: `app/about/page.tsx`, `app/the-gang/page.tsx`
- Create: `app/_components/AboutPage.tsx`, `app/_components/TheGangPage.tsx`

**Interfaces:**
- Consumes: token sections, `VOICE.institutional` on About, founder links to `/author/eugine-micah`, `/author/lucy-ogunde`, `MoneyButton` to `/book`
- Produces: native pages; no `RenderedPage`
- If About JSON-LD already contains historical stats, leave claims unchanged — do not expand them into visible UI

- [ ] **Step 1: Source tests** — both pages lack `RenderedPage`, include founder names already public
- [ ] **Step 2: FAIL → Step 3: implement quiet native layouts**
- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/ugt-mobile-app-routes.test.ts`
- [ ] **Step 5: Commit**

```bash
git add app/about/page.tsx app/the-gang/page.tsx app/_components/AboutPage.tsx app/_components/TheGangPage.tsx
git commit -m "feat(about,gang): native trust pages"
```

---

### Task 14: Native Work With Us + Partners

**Files:**
- Modify: `app/work-with-us/page.tsx`, `app/partners/page.tsx`
- Create: `app/_components/WorkWithUsPage.tsx`, `app/_components/PartnersPage.tsx`

**Interfaces:**
- Work With Us: collab/hire/brand door; CTA "Work with us"; may POST `/api/bookings` with `type: 'Sponsorship'` or `'Media'` only — **never** `School Booking`
- Partners: trust surface; links to Work With Us + Press; **no invented partner logos** — text/boilerplate only unless assets already in `/uploads`

- [ ] **Step 1: Intent tests**

```ts
it('Work With Us must not submit School Booking type', () => {
  const form = readFileSync(resolve(__dirname, '../app/_components/WorkWithUsPage.tsx'), 'utf8');
  expect(form).not.toMatch(/School Booking/);
  expect(form).toMatch(/Sponsorship|Work with us/i);
});
it('Partners page does not invent coverage stats', () => {
  const s = readFileSync(resolve(__dirname, '../app/_components/PartnersPage.tsx'), 'utf8');
  expect(s).not.toMatch(/\d{2,}\+?\s+schools/i);
});
```

- [ ] **Step 2–4: implement + pass + tsc**
- [ ] **Step 5: Commit**

```bash
git add app/work-with-us/page.tsx app/partners/page.tsx app/_components/WorkWithUsPage.tsx app/_components/PartnersPage.tsx __tests__/ugt-forms-intent.test.ts
git commit -m "feat(collab): native Work With Us and Partners doors"
```

---

### Task 15: Native Contact Us (not booking)

**Files:**
- Modify: `app/contact-us/page.tsx`
- Create: `app/_components/ContactPage.tsx`
- Modify: `MobileApp.tsx` — remove `/contact-us` → book mapping
- Test: `__tests__/ugt-forms-intent.test.ts`

**Interfaces:**
- General contact / press routing / support only
- Must deep-link `/press` and `/book` as alternate doors
- Must **not** POST as `School Booking`; if using `/api/bookings`, use `type: 'Media'` with message required

- [ ] **Step 1: Failing intent test**

```ts
it('Contact is native, separated from Book capture', () => {
  const page = readFileSync(resolve(__dirname, '../app/contact-us/page.tsx'), 'utf8');
  const contact = readFileSync(resolve(__dirname, '../app/_components/ContactPage.tsx'), 'utf8');
  const book = readFileSync(resolve(__dirname, '../app/_components/BookForm.tsx'), 'utf8');
  expect(page).not.toMatch(/RenderedPage/);
  expect(contact).toMatch(/\/press/);
  expect(contact).not.toMatch(/School Booking/);
  expect(book).toMatch(/School Booking/);
});
```

- [ ] **Step 2–4: implement + update mobile route test expecting `/contact-us` absent from MobileApp map**
- [ ] **Step 5: Commit**

```bash
git add app/contact-us/page.tsx app/_components/ContactPage.tsx app/_components/MobileApp.tsx __tests__/ugt-forms-intent.test.ts __tests__/ugt-mobile-app-routes.test.ts
git commit -m "feat(contact): native general contact separated from Book"
```

**Phase 2 gate:** no `RenderedPage` on experience/book/about/the-gang/work-with-us/partners/contact-us; `npm test && npx tsc --noEmit`.

---

## Phase 3 — Events world

### Task 16: Events board on design system

**Files:**
- Modify: `app/events/page.tsx` — replace inline style sprawl with `PosterCard` / `StatusStamp` / token classes
- Create: `app/_components/ugt/events.css` (quiet motion)
- Modify: `app/globals.css` — import `events.css`
- Modify: `MobileApp.tsx` — **remove `/events` from routes map**
- Test: `__tests__/ugt-mobile-app-routes.test.ts` + source contract; existing `__tests__/event-route.test.ts` must still pass

**Interfaces:**
- Consumes: `resolveManyEventTruths` (unchanged), `stampFromEventTruth`, `PosterCard`, `StatusStamp`
- Produces: design-system board with status chips; preserve `dynamic = 'force-dynamic'`; `<main data-ugt-motion="quiet" className="ugt-events-page">`
- Do not invent filters that change availability math; keep server list + honest empty state

- [ ] **Step 1: Tests**

```ts
it('events page uses StatusStamp/PosterCard and not MobileApp takeover', () => {
  const page = readFileSync(resolve(__dirname, '../app/events/page.tsx'), 'utf8');
  const mobile = readFileSync(resolve(__dirname, '../app/_components/MobileApp.tsx'), 'utf8');
  expect(page).toMatch(/StatusStamp|stampFromEventTruth/);
  expect(page).toMatch(/PosterCard|ugt-poster-card/);
  expect(page).toMatch(/data-ugt-motion=\"quiet\"/);
  expect(mobile).not.toMatch(/'\/events'\s*:/);
});
```

- [ ] **Step 2: FAIL → Step 3: restyle using truths already loaded**

Example card body:

```tsx
import { PosterCard } from '@/app/_components/ugt/PosterCard';
import { StatusStamp } from '@/app/_components/ugt/StatusStamp';
// ...
<PosterCard className="ugt-event-card">
  <StatusStamp truth={event.truth} status={event.status} />
  <h2>{event.name}</h2>
  {/* date/venue from existing fields */}
  <a href={ctaFor(event).href} aria-disabled={ctaFor(event).disabled || undefined}>
    {ctaFor(event).label}
  </a>
</PosterCard>
```

Keep `ctaFor` / money helpers; only presentation changes.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/event-route.test.ts __tests__/ugt-mobile-app-routes.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/events/page.tsx app/_components/ugt/events.css app/globals.css app/_components/MobileApp.tsx __tests__/ugt-mobile-app-routes.test.ts
git commit -m "feat(events): design-system events board with truthful stamps"
```

- [ ] **Step 6: Regression**

Run: `npx vitest run --no-cache __tests__/ticket-integrity.test.ts`
Expected: PASS

---

### Task 17: Event detail poster → checkout presentation

**Files:**
- Modify: `app/events/[slug]/page.tsx`
- Create: `app/_components/EventPoster.tsx` (presentation only)
- Keep sticky mobile CTA behavior; wire `TierBoard` to truth tiers
- **Do not** change checkout API or inventory math

**Interfaces:**
- Consumes: `resolveEventTruth`, `TierBoard`, `MoneyButton` (enabled only if `truth.isSellable`), `StatusStamp`
- Produces: poster layout; disabled CTA when not sellable; postponed/rescheduled messaging from truth flags

- [ ] **Step 1: Source test**

```ts
it('event detail gates buy CTA on isSellable and uses TierBoard', () => {
  const page = readFileSync(resolve(__dirname, '../app/events/[slug]/page.tsx'), 'utf8');
  const poster = readFileSync(resolve(__dirname, '../app/_components/EventPoster.tsx'), 'utf8');
  expect(page + poster).toMatch(/TierBoard/);
  expect(page + poster).toMatch(/isSellable/);
  expect(page + poster).toMatch(/stampFromEventTruth|StatusStamp/);
});
```

- [ ] **Step 2: FAIL → Step 3: extract presentation into `EventPoster`**

```tsx
// EventPoster.tsx sketch
export function EventPoster(props: {
  name: string;
  truth: EventTruth;
  status: string;
  // existing detail fields: date, venue, description, image, accent
  children?: React.ReactNode; // checkout widget slot unchanged
}) {
  const stamp = stampFromEventTruth(props.truth, props.status);
  return (
    <main className="ugt-event-poster" data-ugt-motion="quiet">
      <StatusStamp truth={props.truth} status={props.status} />
      <h1>{props.name}</h1>
      <TierBoard tiers={props.truth.tiers} />
      {props.truth.isSellable ? props.children : (
        <p role="status">{stamp.label}</p>
      )}
    </main>
  );
}
```

Preserve existing sticky CTA / ticket booth child that already talks to payment backends.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/event-route.test.ts __tests__/ticket-integrity.test.ts`

- [ ] **Step 5: Commit**

```bash
git add "app/events/[slug]/page.tsx" app/_components/EventPoster.tsx
git commit -m "feat(events): poster checkout presentation on event detail"
```

---

### Task 18: Marketplace family + NightStage ticket artifacts

**Files:**
- Modify: `app/marketplace/page.tsx`, `app/marketplace/[eventId]/page.tsx` — replace inline hex with `NightStage` + `PosterCard`; keep mandatory "Hosted by {organizer}"
- Modify: `app/tickets/[orderId]/page.tsx`, `app/t/[code]/page.tsx`, `app/verify/[serial]/page.tsx`, `app/receipt/[id]/page.tsx` — wrap with `NightStage` without pastel
- Test: source contract for Hosted-by + NightStage

**Interfaces:**
- Consumes: existing marketplace data loaders; `NightStage`
- Produces: same visual family as Events money moments; unmistakable hosted-by labeling

- [ ] **Step 1: Source test**

```ts
it('marketplace keeps Hosted by labeling and NightStage family', () => {
  const s = readFileSync(resolve(__dirname, '../app/marketplace/page.tsx'), 'utf8');
  expect(s).toMatch(/Hosted by/);
  expect(s).toMatch(/NightStage|ugt-night-stage/);
});
```

- [ ] **Step 2: FAIL → Step 3: restyle only** — do not change marketplace publish/payment logic

Example:

```tsx
import { NightStage } from '@/app/_components/ugt/NightStage';
import { PosterCard } from '@/app/_components/ugt/PosterCard';

export default async function MarketplacePage() {
  // existing fetch...
  return (
    <NightStage>
      <main className="ugt-marketplace" data-ugt-motion="quiet">
        <h1>Ticket Marketplace</h1>
        {events.map((ev) => (
          <PosterCard key={ev.id}>
            <p>Hosted by {ev.organizerName}</p>
            {/* existing fields */}
          </PosterCard>
        ))}
      </main>
    </NightStage>
  );
}
```

- [ ] **Step 4:** `npx tsc --noEmit && npm test`

- [ ] **Step 5: Commit**

```bash
git add app/marketplace app/tickets app/t app/verify app/receipt
git commit -m "feat(events): align marketplace and ticket artifacts to NightStage"
```

**Phase 3 gate:** Events/Marketplace visual family; commercial tests green; MobileApp not hijacking `/events`.

---

## Phase 4 — Shop continuum

### Task 19: Native shop index

**Files:**
- Modify: `app/shop/page.tsx` — remove `RenderedPage`; render native grid
- Create: `app/_components/ShopIndexPage.tsx`
- Modify: `MobileApp.tsx` — remove `/shop` from routes map
- Test: mobile + source contracts

**Interfaces:**
- Consumes: `shopCatalogList()` / DB active products (already used for JSON-LD), `PosterCard`, `StickerChip`, KES `Intl`
- Produces: "Wear the culture" / "Wear the signal" index; empty fail-closed; quiet motion; links to `/shop/[id]`

- [ ] **Step 1: Test**

```ts
it('shop index is native and frees MobileApp', () => {
  const page = readFileSync(resolve(__dirname, '../app/shop/page.tsx'), 'utf8');
  const mobile = readFileSync(resolve(__dirname, '../app/_components/MobileApp.tsx'), 'utf8');
  expect(page).not.toMatch(/RenderedPage/);
  expect(page).toMatch(/ShopIndexPage/);
  expect(mobile).not.toMatch(/'\/shop'\s*:/);
});
```

- [ ] **Step 2: FAIL → Step 3: implement cream neo-brutal grid**

```tsx
// ShopIndexPage.tsx sketch
export function ShopIndexPage({ products }: { products: Array<{ id: string; name: string; price: number; image: string; category: string }> }) {
  return (
    <main className="ugt-shop-index" data-ugt-motion="quiet">
      <p className="ugt-kicker">Wear the signal</p>
      <h1>Wear the culture.</h1>
      {products.length === 0 ? (
        <p>Merch drops will land here when stock is live.</p>
      ) : (
        <div className="ugt-shop-grid">
          {products.map((p) => (
            <PosterCard key={p.id} className="ugt-shop-card">
              <a href={`/shop/${p.id}`}>{/* image + name + KES */}</a>
            </PosterCard>
          ))}
        </div>
      )}
    </main>
  );
}
```

Keep `dynamic = 'force-dynamic'` and existing JSON-LD.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/ugt-mobile-app-routes.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/shop/page.tsx app/_components/ShopIndexPage.tsx app/_components/MobileApp.tsx
git commit -m "feat(shop): native Wear the culture index"
```

---

### Task 20: PDP + bag handoff heal + VariantChips

**Files:**
- Modify: `app/shop/[id]/page.tsx` — use `VariantChips`, tokenized cream PDP
- Create: `app/_components/ShopBag.tsx` (`'use client'`) — native bag UI replacing V25 `?item=` as the only handoff
- Reuse existing order/paystack/stripe fetch targets currently used by `MobileApp.tsx` bag checkout — **do not invent payment math**

**Interfaces:**
- Consumes: existing `/api/orders` and/or paystack checkout routes as used by mobile bag today
- Produces: PDP continuous with index; variant stickers; bag UI in public shell; server price validation preserved

- [ ] **Step 1: Tests**

```ts
it('PDP uses VariantChips and does not rely solely on V25 ?item= bag', () => {
  const pdp = readFileSync(resolve(__dirname, '../app/shop/[id]/page.tsx'), 'utf8');
  expect(pdp).toMatch(/VariantChips/);
  // may still accept ?item= as alias, but must mount ShopBag or equivalent
  expect(pdp).toMatch(/ShopBag|add to bag/i);
});
```

- [ ] **Step 2: FAIL → Step 3: implement**

Inspect `MobileApp.tsx` bag checkout `fetch` URLs and mirror them in `ShopBag`. Variant selection updates displayed price client-side for UX only; charge amount still server-validated.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/payment-math.test.ts __tests__/payment-callback-boundary.test.ts`

- [ ] **Step 5: Commit**

```bash
git add "app/shop/[id]/page.tsx" app/_components/ShopBag.tsx
git commit -m "feat(shop): heal PDP-bag continuum with VariantChips"
```

---

### Task 21: Pay success warmth

**Files:**
- Modify: `app/pay/success/page.tsx`

**Interfaces:**
- Keep Permanent Marker **"asante sana"**
- NightStage or cream family consistent with checkout continuum
- Quiet motion; link back to `/shop`

- [ ] **Step 1: Source test**

```ts
it('pay success keeps asante sana warmth', () => {
  const s = readFileSync(resolve(__dirname, '../app/pay/success/page.tsx'), 'utf8');
  expect(s.toLowerCase()).toMatch(/asante sana/);
  expect(s).toMatch(/Permanent Marker|ugt-type-slogan|ugt-slogan/);
});
```

- [ ] **Step 2–4: polish + `npx tsc --noEmit`**
- [ ] **Step 5: Commit**

```bash
git add app/pay/success/page.tsx
git commit -m "feat(shop): warm pay success on design system"
```

**Phase 4 gate:** shop index native; PDP/bag without V25 seam; payment tests green.

---

## Phase 5 — Press lane + shared polish

### Task 22: New `/press` lane

**Files:**
- Create: `app/press/page.tsx`, `app/_components/PressPage.tsx`
- Confirm: `lib/site.ts` Press entry from Task 2; footer/contact already link Press
- **No** redirect from `/partners` → `/press` in `next.config.mjs`

**Interfaces:**
- Media kit / official logo only / boilerplate / founder bios for journalists / truthful broadcast credit
- Explicit: no fake quotes, no coverage stats
- Quiet motion; secondary door to `/contact-us`

- [ ] **Step 1: Test**

```ts
it('press page exists and does not invent quotes', () => {
  const page = readFileSync(resolve(__dirname, '../app/press/page.tsx'), 'utf8');
  const s = readFileSync(resolve(__dirname, '../app/_components/PressPage.tsx'), 'utf8');
  expect(page).toMatch(/PressPage/);
  expect(s).toMatch(/Press|media kit|boilerplate/i);
  expect(s).not.toMatch(/as featured in/i);
  expect(s).not.toMatch(/\d+\s*(million|schools visited)/i);
});
```

- [ ] **Step 2: FAIL → Step 3: implement**

```tsx
// app/press/page.tsx
import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { PressPage } from '@/app/_components/PressPage';
const PATH = '/press';
export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}
export default function Page() { return <PressPage />; }
```

PressPage sections: Boilerplate (no stats), Logos (link existing `/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png`), Founders (links to author pages), Broadcast credit ("Broadcast network: PPP TV Kenya."), Contact for press → `/contact-us`.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run --no-cache __tests__/ugt-nav.test.ts`
- [ ] **Step 5: Commit**

```bash
git add app/press/page.tsx app/_components/PressPage.tsx
git commit -m "feat(press): add media Press lane"
```

---

### Task 23: Native Gallery

**Files:**
- Modify: `app/gallery/page.tsx`
- Create: `app/_components/GalleryPage.tsx` — neo-brutal frames from `gallery_photos` (same spirit as Home query)
- Modify: `MobileApp.tsx` — remove `/gallery`
- Fail-closed empty state

- [ ] **Step 1: Test**

```ts
it('gallery is native and frees MobileApp', () => {
  const page = readFileSync(resolve(__dirname, '../app/gallery/page.tsx'), 'utf8');
  const mobile = readFileSync(resolve(__dirname, '../app/_components/MobileApp.tsx'), 'utf8');
  expect(page).not.toMatch(/RenderedPage/);
  expect(page).toMatch(/GalleryPage/);
  expect(mobile).not.toMatch(/'\/gallery'\s*:/);
});
```

- [ ] **Step 2–4: implement with `hasDb()` + published photos query; `PosterCard` frames; quiet motion**
- [ ] **Step 5: Commit**

```bash
git add app/gallery/page.tsx app/_components/GalleryPage.tsx app/_components/MobileApp.tsx
git commit -m "feat(gallery): native evidence wall"
```

---

### Task 24: FAQ + LegalCard polish

**Files:**
- Modify: `app/faq/page.tsx`, `app/_components/LegalPage.tsx`, and legal routes already using `LegalPage`
- FAQ copy: school hosting → `/book`; general enquiries → `/contact-us`; do not invent policy facts

**Interfaces:**
- Consumes: `LegalCard`
- Magenta stage + cream/white cards; quiet motion; trustworthy typography

- [ ] **Step 1: Source tests**

```ts
it('FAQ and Legal use LegalCard pattern and correct doors', () => {
  const faq = readFileSync(resolve(__dirname, '../app/faq/page.tsx'), 'utf8');
  const legal = readFileSync(resolve(__dirname, '../app/_components/LegalPage.tsx'), 'utf8');
  expect(faq + legal).toMatch(/LegalCard|ugt-legal-card/);
  expect(faq).toMatch(/\/book/);
  expect(faq).toMatch(/\/contact-us/);
});
```

- [ ] **Step 2–4: implement + tsc**
- [ ] **Step 5: Commit**

```bash
git add app/faq/page.tsx app/_components/LegalPage.tsx
git commit -m "feat(legal): LegalCard FAQ/legal on magenta stage"
```

---

### Task 25: Urban News sister-brand light alignment

**Files:**
- Modify: `app/blog/NewsClient.tsx`, `app/blog/[slug]/page.tsx` lightly — shell spacing/chrome only
- Keep Titan One / tape / news-gold; do **not** repaint blog into mothership magenta

- [ ] **Step 1: Source assertions**

```ts
it('blog keeps news-gold sister brand and stays quiet', () => {
  const news = readFileSync(resolve(__dirname, '../app/blog/NewsClient.tsx'), 'utf8');
  expect(news).toMatch(/F7A81B|ugt-news-gold|news-gold/i);
  expect(news).not.toMatch(/ugt-marquee|spinSlow/);
});
```

- [ ] **Step 2–4: light shell alignment only**
- [ ] **Step 5: Commit**

```bash
git add app/blog/NewsClient.tsx "app/blog/[slug]/page.tsx"
git commit -m "style(blog): sister-brand alignment under shared shell"
```

---

### Task 26: Retire dead public captures / MobileApp paths

**Files:**
- Modify: `app/_components/MobileApp.tsx` — if public marketing map empty, make component `return null` always (keep file temporarily) **or** remove from `app/layout.tsx` when safe
- Modify: `app/layout.tsx` — remove `<MobileApp />` only when all former routes native
- Do **not** delete checkout backends; do not delete `V25App` until grep shows zero `RenderedPage` consumers
- Optional: leave `app/_rendered/*.html` orphaned until a later chore

- [ ] **Step 1: Grep verification test**

```ts
it('no public marketing page imports RenderedPage', () => {
  const pages = [
    'about','the-gang','experience','gallery','shop','partners','book','contact-us','work-with-us','press',
  ];
  for (const p of pages) {
    const s = readFileSync(resolve(__dirname, `../app/${p}/page.tsx`), 'utf8');
    expect(s, p).not.toMatch(/RenderedPage/);
  }
});
```

- [ ] **Step 2: FAIL if any remain → Step 3: finish native cutover leftovers; remove MobileApp from layout when map unused; keep BottomTabBar**

- [ ] **Step 4: Full gate**

Run: `npx tsc --noEmit && npm test && npm run lint && npm run build`
Expected: all green

- [ ] **Step 5: Commit**

```bash
git add app/_components/MobileApp.tsx app/layout.tsx __tests__/ugt-mobile-app-routes.test.ts
git commit -m "chore(ugt): retire MobileApp/V25 marketing paths after native cutover"
```

---

## Cross-cutting verification (every phase)

Before considering a phase done on `ui-ux-redesign`:

1. `npx tsc --noEmit`
2. `npm test`
3. `npm run lint`
4. `npm run build` (or `npm run cf:build` when validating the Cloudflare path)
5. Spot-check commerce when touching Events: one on-sale, one sold-out, one postponed
6. Diff review: no new fabricated statistics in copy/JSON-LD
7. Skip link still first focusable; new controls show `:focus-visible`
8. Confirm redirects in `next.config.mjs` still map `/tour`→`/experience`, `/tickets`→`/events`, `/merch`→`/shop`, `/news`→`/blog`, etc.

## Out of scope (do not schedule)

- Control Room / admin / organizer / gate UI
- Deploy-infra / Wrangler / deleting `vercel.json`
- Payment provider contract changes, webhook redesign, inventory algorithm changes
- Pastel ticket temple; rewriting Urban News into magenta
- Force-push; merging PR #29 history into this work
- Pushing to `main` without review
- Implementing UI in the same change-set as this plan document

---

## Self-review (spec coverage)

| Spec requirement | Task(s) |
|------------------|---------|
| Tokens colors/type/shadows | 1 |
| Component library (PosterCard…FormField…Marquee) | 3, 4, 5, 8 |
| Single nav labels + privacy fix + Press in IA | 2, 6, 7, 22 |
| Motion loud only Home+Experience | 5, 10, 11 |
| Home three-world equal CTAs | 9 |
| Experience myth + Book separated | 11, 12 |
| About, Gang, Work With Us, Partners | 13, 14 |
| Contact ≠ Book | 15 |
| Events board + detail + marketplace + NightStage | 16–18 |
| Shop continuum + asante sana | 19–21 |
| Press + Gallery + FAQ/Legal + Blog sister | 22–25 |
| Kill V25/MobileApp for touched routes | 11–15, 16, 19, 23, 26 |
| Preserve event-truth/payments/QR/auth | Constraints + Tasks 16–18, 20 gates |
| No invented commercial facts | Constraints + tests in 11, 14, 22 |
| Redirects preserved; Press own canonical | 2, 22 |
| Success criteria §7 | Phase gates + cross-cutting verification |

**Placeholder scan:** none — every task has files, interfaces, steps, commands, or explicit source tests. No "similar to Task N" deferrals.

**Coverage gaps fixed while writing this plan:**
1. Contact included in Tour/Book sequencing (user build order) while Press task still owns `/press` + FAQ/Legal/Gallery/Blog polish.
2. MobileApp zombie tests added (Review Focus #3).
3. Book/Work/Contact intent separation tests (Review Focus #1).
4. Partners kept on `/partners` while Press is a new canonical.
5. Payment/event regression gates called out so agents restyle presentation only.

---

*End of implementation plan. Implement on `ui-ux-redesign` only; do not push from docs-only commits without explicit ask.*
