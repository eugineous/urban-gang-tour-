# Existing PWA completion — 28 October 2026

## Delivered

`/app` is the explicit install/help entry for the existing PWA. It presents a
deliberate browser install action when available, iOS Share/Add to Home Screen
instructions, installed/cancelled/error states, connectivity and useful existing
shop, private order tracking and account/ticket links. The shell footer exposes
Get the app. All new customer copy exists in the six native catalogues, with
English first unless an explicit saved supported language overrides it.

The existing release client and service worker now leave upgrades waiting.
Update/refresh is a deliberate action; entering a form, protected commerce/staff
path or offline state blocks refreshing. A controller change from another tab
announces availability without reloading this tab. No push permission is sought.
Restrained connectivity/update notices are accessible and dismissible.

The worker excludes APIs, private/staff/customer/commerce paths, Authorization
and RSC requests; public asset retention respects private/no-store and
cookie/authorization Vary headers. Runtime storage is bounded at 80 entries,
storage failure preserves network responses, old UGT caches are cleaned on
activation, and public navigation has the existing offline fallback. Manifest
shortcuts target shop, order tracking and account. Offline retry now uses a
native link, so it works even when the fallback has no working JavaScript.

## Verified evidence

`QA_ORIGIN=http://127.0.0.1:4186 node scripts/pwa-operations-regression.mjs`
completed with exit 0 against the local Next development preview through a
loopback-only proxy. The proxy blocks writes (and stubs the existing read-only
auth identity POST), and browser requests cannot leave its origin. No TLS
validation bypass or production request was used.

The fresh proof exercised:

- `/app` 200/hydration; English first with a French browser; 360, 390, 768 and
  1440px reflow; 44px app controls; existing customer destination links.
- Browser install event handling with no automatic prompt, deliberate prompt
  dismissal, installed-event UI, online/offline transitions, iOS UA instructions,
  and navigation with localStorage denied.
- A real service-worker registration/controller, a changed worker waiting
  instead of activating automatically, disabled refresh for a dirty QA form,
  unchanged form content after another-tab-style worker activation, persistent
  cart through that activation and an explicit update/reload.
- Public offline navigation fallback, no offline substitution for private/API
  fetches, old-cache removal, and the native retry link following its destination
  with JavaScript execution disabled.

Machine evidence is `/workspace/artifacts/ugt-pwa-20261028/pwa-proof.json`;
the complete browser log is `browser-proof.log` in the same directory. Fresh
screenshots are `app-360.png`, `app-390.png`, `app-768.png`, `app-1440.png`.
The 390px screenshot was visually inspected. Expected offline request failures
and unconfigured-local-backend 503 console messages are retained in the log;
there were no uncaught page errors. The shared focused run passed all 64 tests
across 13 files, including worker privacy/cache/update and release-client tests;
its log is `/workspace/artifacts/ugt-documents-20261028/focused-tests.log`.
The offline-retry test was observed RED before its native-link fix and GREEN
afterwards. Scoped source lint has zero errors; see documents report.

These are local desktop Chromium browser checks. The install/installed events
and iOS UA were simulated; no OS-level home-screen install or physical iPhone
was claimed. The waiting-worker lifecycle was real. An actual Cloudflare Worker
preview and combined release verification remain with the coordinator. The
validated local preview was stopped before handoff.

## Independent review correction

Review reproduced a race while `updateApp()` awaited service-worker registration:
the visitor could start a form, enter a protected route or go offline before
resolution, after which the activated/no-waiting branch could still reload.
A fresh `refreshBlocked(location.pathname)` guard now runs immediately after
that await, clearing the updating flag and returning before either reload or
worker activation. The existing controller-change guard remains in place.

The actual update action/lifecycle regression observed six RED failures before
the fix (dirty/protected/offline, with and without a waiting worker), while the
clean activated refresh control passed. After the one-line guard, the race,
worker, release-client and offline-retry suites passed **18 tests in 4 files**.
Scoped lint for the action and new regression file passed with zero errors and
zero warnings. Evidence: `update-race-{red,green}.log` and
`update-race-eslint.json` in `/workspace/artifacts/ugt-pwa-20261028/`.

## Production Worker offline correction — 29 October 2026

The integrated production Worker proof exposed a real limit in the earlier
development-preview check: cached `/offline` HTML still needed an uncached
Next route chunk. With JavaScript enabled, `ChunkLoadError` reached React's
error boundary and removed the native retry link. The failed proof is retained
at `/workspace/artifacts/ugt-app-operations-20261028/worker-pwa.log`.

The worker now precaches `/offline.html`, a standalone warm-cream/ink document
with inline CSS, native home retry and Get the app links, system typography and
no external JavaScript, fonts or media. English is present in the HTML. An
optional guarded inline script reads only the existing explicit saved
`ugt-interface-language-v1` choice, accepts the six supported values, and uses
`textContent` to apply the existing translated copy. Missing, unsupported or
denied preference storage leaves English working. The `/offline` React route
remains available online. Cache generation is `ugt-app-operations-20261028-v2`;
private/API/authenticated/RSC exclusions, retention cap and explicit waiting
worker activation are unchanged.

The focused regression was observed RED with three intended failures: the
worker returned the old fallback and the standalone document did not exist.
After the fix, **21 tests in four files passed**, including real local Chromium
rendering with all external assets unavailable, JavaScript enabled and disabled,
native retry navigation, 360/768px reflow and 44px controls, all six explicit
saved language choices, invalid preferences and denied storage. Worker tests
also exercise public navigation fallback and unchanged private/auth/RSC bypass.
Logs are `offline-fallback-{red,green}.log` in
`/workspace/artifacts/ugt-app-operations-20261028/`. Focused ESLint reported zero
errors and warnings in `offline-fallback-eslint.json`; worker/regression script
syntax and scoped diff whitespace checks passed.

The actual Worker browser regression now requires the exact standalone response,
no external rendering requests and zero page errors before following retry
with JavaScript still enabled, then also checks retry with JavaScript disabled.
Its real waiting-worker, dirty-form, cart, private/API and cache-cleanup proofs
remain. The coordinator will rerun the combined suite/build and actual Worker
proof against these frozen sources; this focused correction does not claim
those reruns have already passed.
