# Shared controls repair — 21 October 2026

Scope: public navigation and shared action layout, plus confirmed admin CSS
validity defects. This is a source/HTTP regression review, not a screenshot
audit, physical-device test or claim that every website issue is resolved.

## Confirmed causes and repairs

1. Header/menu rules had accumulated across nine global stylesheets. The
   mechanical migration removes 278 obsolete selector branches, retaining other
   branches in mixed rules. `app/navigation.css` is now the sole layout owner.
2. Hidden alternate About/Shop controls were swapped by competing breakpoints.
   Remove them from the component rather than hiding them with more overrides.
3. Eighteen prominent menu destinations included multiple event filters and
   duplicate account/cart entry points. Use ten distinct main destinations,
   four secondary account/help links, and language/focus controls together.
   Event filters remain on Events; no content routes are deleted.
4. An icon-only menu lacked a visible label. Keep the accessible label and add
   visible “Menu” text. Use one native modal with scroll and focus restoration.
5. Admin `font: ... inherit` declarations and a mixed auto-repeat grid were
   invalid CSS. Use explicit font longhands and valid container-safe tracks.
6. Shared actions need wrapping text, consistent hit targets and no whole-button
   hover movement. Preserve actual submit handlers and payment behaviour.
7. Fourteen existing submit controls relied on implicit HTML behaviour. Their
   intended submit type is now explicit; no handler or endpoint is changed.
8. The adapter rejects Next 15 after its support window expired on 21 October.
   Upgrade to stable Next/ESLint 16.4.2, React 19.3.1 and Cloudflare adapter
   1.20.12 with Wrangler 4.148.0. Keep the supported webpack build, existing
   headers and bindings. Adapt tag invalidation to explicit immediate expiry,
   not stale-while-revalidate for hidden or withdrawn content.
9. A language modal can open above the navigation modal. Count nested overlays
   so closing the inner dialog cannot resume background videos prematurely.
10. Built-Worker checks exposed nested main landmarks on Account and related
    page/detail screens. AppShell remains the sole main; inner page containers
    become sections without losing classes, IDs, data or auth checks. The
    independent global-error document retains its main. The source scanner now
    rejects accidental nested main elements anywhere under the normal shell.

## Evidence and release checks

- Static control checker scans all 197 current app/UI JSX files for empty
  navigation targets, implicit form submits and unsafe new-window links.
- SSR contracts verify one shell, visible menu naming, current-section state,
  removal of alternate controls and preserved language/help entry points.
- CSS contracts reject new header overrides outside its single owner.
- Built-Worker checks exercise the shared shell on 29 actual routes, alongside
  existing editorial/auth/privacy and language regression checks.
- Full tests, typecheck, build, PR and live HTTP checks gate deployment. Actual
  run logs are kept in the private release artifact directory, not invented here.

## Still open

Browser capture is unavailable in this session. Android/iOS/foldable/tablet
reflow, pointer/keyboard interaction, dialog stacking and real form recovery
still require rendered testing. Static checks cannot establish those outcomes.
New React Compiler performance findings about legacy effect hydration remain
visible lint warnings during the framework migration; they are not claims of
broken payment logic, nor is this a zero-warning lint release.
At this release cut the broader page-by-page design review and63-article
completion were separate unfinished workstreams. The subsequent editorial
completion report records the finished manuscripts and its own scheduling
checks; this shared-control release itself did not approve their drafts.
