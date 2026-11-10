# Charles interface craft implementation plan

> For agentic workers: execute inline with executing-plans and TDD; one independent whole-branch review, not a reviewer per task.

**Goal:** Apply the owner's Charles Unslop reference and screenshot principles to existing UGT page families without replacing the product or commercial truth.
**Architecture:** Existing design tokens/primitives carry shared improvements across real routes. A small non-rendering overlay enhancement records the actual activating control and supplies percentage transform origins to existing dialogs; existing components retain opening, closing, focus and data ownership.
**Stack:** Next16.4.2, React, existing CSS and Phosphor icons, Chromium/Playwright. No new product dependency.
**Spec / direction:** the following brief, expressly delegated to Codex by the owner.
**Execution outcome:** Implementation and one independent review complete. See `docs/agent-work/charles-interface-craft-20261110.md` for final build/browser evidence and the45remaining legacy test failures. Planned exit motion was deliberately rejected after a real hit-interception regression; safe immediate dismissal wins. The original46-failure baseline estimate below is superseded by the recorded combined run and reruns.

## Design direction

- Product: Kenyan event discovery/ticketing, merchandise and bookings for Eugine and Lucy.
- Character: energetic, assured, direct.
- World: live-event posters and the booking desk, not generic software dashboards.
- Moment: real posters and the owned host artwork; purchasing controls stay quiet.
- Signature: magenta actions and the existing diagonal booking arrow.
- Concept: the poster carries the energy; the next action is immediately clear.

Keep existing empty/in-use/done states truthful. Keep sections/features, magenta, six languages, the MOOKH/Nixtio desktop, Eventify mobile and Mkurugenzi shop distinctions. Keep the explicitly requested invitation ring, owned media/marquee, reduced motion/focus/save-data and white printing. No payment/provider/auth/publication/stock changes or production financial/message tests. Do not optimistically mark money received or issue tickets. Optimistic cart/save behavior already exists; do not add a second mechanism.

## Rendered audit

Baseline:32screens,16route families at390/1440px; no overflow or browser errors. Evidence: external `unslop-before/audit.json` and screenshots.
Small body text inherits−0.025em tracking; ordinary headings are compressed beyond display needs. Search/control pills compete with event content; shared surfaces mix cream, grey and pink. Menu entry comes from the top rather than its trigger. Checkout repeats the step counter/progress and busy explanation. Route loading spins the brand instead of reserving content space. Keep intentional hero display type and the actual provider logos.

## Review focus

1. Keyboard-triggered and nested dialogs use their own source, not a stale unrelated click.
2. Android normalized zoom must not shift the animation origin; use relative percentages.
3. Reduced motion/focus and immediate close/focus return must work without animation locks.
4. Loading/busy feedback must not shift controls or imply paid/confirmed state.
5. Private/admin and printed documents must remain usable, with no exposure/auth changes.

### Task1: Shared rhythm and hierarchy

Files: existing brand-palette/refinements/interaction-foundations CSS, root import ordering, relevant card/contact/dock modules; browser regression tests.
Consumes existing public surface classes and tokens. Produces a consistent4px spacing rhythm, neutral surfaces, readable type,44px controls, tabular figures, motion tokens and visible focus. Preserve hero/shop display fonts.

- [ ] Write browser assertions for `getComputedStyle(paragraph).letterSpacing === 'normal'`, equal button bounds across hover, inputs≥16px and labels≥4.5:1 contrast. Run against current CSS: tracking fails.
- [ ] Update the existing token/primitives, not a second UI framework. Use `--ugt-motion-enter:220ms`, `--ugt-motion-exit:160ms`, named transform/opacity/color transitions, no arbitrary waiting or content gating.
- [ ] Rerun browser tests; compare the same route screenshots. Record palette/type exceptions in the ledger.

### Task2: Cause-aware overlays

Files: new `lib/client/overlay-origin.ts`, new `app/_components/InteractionCraft.tsx`, existing AppShell/foundations, browser origin tests.
Interface: `installOverlayOrigins(document:Document):()=>void`. The installer only observes UI and applies origin/motion metadata to app-owned overlays; cleanup removes its listeners/observer.

- [ ] Test an existing native dialog and role-dialog opened by a button: measured origin equals its source centre; current UI has no origin metadata (RED). Also cover keyboard, no recent source, nested dialog, zoom and reduced motion.
- [ ] Implement bounded event observation, no per-frame React state and no network/storage writes. Use percentage origins and preserve native focus/close behavior. The component returns null and calls the installer from an effect.
- [ ] Test observer cleanup and rapid reversal; capture menu frames at controlled times. Run existing menu/dialog tests.

### Task3: Stable checkout/loading feedback and verification

Files: GuidedCheckout.tsx/module CSS, RouteLoading.tsx/foundations, component/browser tests; design context and provenance documentation.
Consumes existing translations, `step`, `busy` and heading ref. Produces the same checkout children/actions and a stable dedicated connection-status slot.

- [ ] SSR/browser-test that the current step has one progress indicator, the heading stays stable while connecting, the connection message appears once, and loading has reserved geometry without spinning the logo. Current components fail these expectations.
- [ ] Remove the redundant visible step counter, retain semantic progress, reserve status geometry and keep accurate existing provider/result copy. Replace the route spinner with neutral fixed-shape placeholders and one real loading label.
- [ ] Run focused tests, type/lint, one combined full suite and Cloudflare build. Record the known46baseline failures separately. Capture16families at phone/desktop plus320/430px, keyboard/menu/media/cart/checkout and reduced-motion states. Review the whole branch once; fix Important/Critical findings RED→GREEN. Deploy through the existing normal PR/keep-vars path only after checks; compare55bindings/cron and repeat live read-only checks.

## Source and attribution

User-requested Charles Unslop: LemonFace0309/charles-skills `skills/charles-unslop/SKILL.md`, blob1967adc2ece9eb03ae45cc2ec74e5a93d46bc06b. Adapted from Damir Sokolovsky's unslop, CC-BY-4.0, with Emil Kowalski/Charles Liu contributions; retain attribution in adaptations. Its signs/tokens and the related Charles Polish motion guidance were read. The user's screenshots are interaction references, not site content or licensed assets to publish.
