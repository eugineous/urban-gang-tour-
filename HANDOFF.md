# Urban Gang Tour handoff

Production: https://urbangangtour.co.ke/ . Hosting: Cloudflare Worker `urban-gang-tour`.
The accepted design is V25. The October 6 PublicSite rebuild was rejected and
reverted by PR #37. PR #38's initial sweep was also reverted. Do not restore
either competing renderer. The public site uses one V25 runtime on phones
and desktop, with original server-rendered V25 fragments as its fallback.

## Working architecture

- Next.js App Router supplies real URLs, server HTML and page metadata.
- `RenderedPage` imports bundled fragments from `app/_rendered`; Workers
  must never try to read those files from a runtime filesystem.
- `V25App` loads the public feeds, then enhances with `v25-template.html`
  and self-hosted React/runtime. It hides the SSR shell only after a real
  main heading renders. Failed enhancement retains the server page.
- `data-ready="1"` indicates a usable runtime; `data-booted` only means
  loading started. Tests and screenshots must wait for readiness.
- Navigation uses document links. Work audience and event/product selections
  use query parameters that survive refresh and browser Back.
- The bottom navigation includes Menu. The team consists of Eugine Micah
  and Lucy Ogunde. Do not revive other crew cards or invented metrics.
- Published products, events and gallery data belong to the admin desks.
  An empty configured gallery stays empty. Only an unconfigured development
  gallery uses the repository archive with neutral captions.
- Prices, inventory, sessions, ownership and payment confirmation remain
  server authoritative. A client receipt display is not payment evidence.

## Build and verification

Use `npm ci`, `npm test`, `npx tsc --noEmit --incremental false`, and
`npm run cf:build`. Run the three `scripts/v25-*-regression.mjs` browser
scripts plus `scripts/auth-browser-regression.mjs` against a stable server.
Their payment/auth write paths use intercepted test fixtures, not live money.

For changed V25 markup, run `scripts/capture-v25.mjs` against a local server.
`PUBLIC_SOURCE=https://urbangangtour.co.ke` reads the published public feeds
for faithful snapshots. No credentials or authenticated data are captured.
`scripts/sync-assets.mjs` generates light media at build time.

Push a feature branch, create/review a PR, merge, then deploy with the current
runtime-bound Cloudflare credentials. Use Cloudflare only. Preserve existing
Worker secrets, the UGT_MEDIA KV namespace, service bindings and custom-domain routes.
Do not read historical pasted credentials or copy secrets into files/logs.

## Verification limits

Mocked checkout tests verify the interface, not successful provider settlement.
Live M-Pesa/card purchases and authenticated Google/admin sessions require their
normal user flows. Buyer password recovery and automated data export/deletion
are not implemented; the account exposes the documented email request path.
Do not advertise account order tracking until an ownership-backed view exists.
No 50,000-user capacity or Lighthouse 98 claim is justified without measurements.
