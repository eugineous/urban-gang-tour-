# Shared premium surfaces — 27 October 2026

Implemented the owner's MOOKH-inspired direction using existing UGT primitives:
warm stone `#f2eee7`, cream `#fffcf6`, rich ink `#1b1918`, and existing magenta,
yellow and cyan. The desktop navigation is an ink capsule with yellow current
context; mobile controls remain compact with existing 44px targets. The people
section provides an ink interval with cream profile cards and cyan eyebrow.
Other cards use quiet stone outlines, with the existing magenta footer accent.
No new images, gradients, providers, dependencies, copy or business logic.

## Files

- `app/premium-implementation.css`: screen-only public tokens and shared visual
  rules. Root agent imports this stylesheet after existing global styles.
- `app/_components/AppShell.tsx`: semantic `data-public-surface` attributes only.
  Existing operational/document early returns stay outside the markers;
  organizer main content is also excluded.
- `ui/components/HomeDiscovery.module.css`: organizer stone and shop cream
  surface fallbacks; existing content, grids and image treatment preserved.
- `ui/components/ClientsPortfolio.module.css`: navigation and client cards use
  the inherited cream surface, preserving logo and layout rules.
- `ui/components/NewsroomIndex.module.css`: category controls and leading story
  use the inherited cream surface.
- `app/_components/ShopCatalogue.module.css`: page stone, product-card cream,
  and inherited border token; artwork, options, commerce and hero rules untouched.
- `__tests__/premium-shared-surfaces.test.ts`: parsed CSS contracts protect
  screen/public scoping and prohibit hero, generic input, document and motion
  overrides.

No global `:root` changes or hashed module selectors. Module substitutions keep
their original fallback colors when public screen tokens are absent, including
print. Existing white receipts/documents and staff dashboards retain their
presentation. Existing native dialogs, keyboard focus/return, reduced motion,
focus view, consent, translation and transaction behavior remain in place.

## Verification

- Focused Vitest run: 5 files, 47 tests passed (premium surface contracts,
  public navigation, homepage energy, product presentation, language shell).
- Focused ESLint on AppShell and new test: exit 0, no errors. Four existing
  AppShell warnings concern ref cleanup, native anchors and the logo image.
- Existing project tokens/components reused. 21st login/search/generation were
  not retried because authentication was already unavailable and the owner
  directed a fast implementation using existing project components.

Browser/reflow/visual review and combined type/lint/build/release verification
remain with the root agent. These source checks are not a browser or physical
device visual-verification claim. Hero media treatment and layout import belong
to the root agent and are intentionally absent from this commit.
