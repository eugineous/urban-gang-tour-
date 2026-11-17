# Marketplace ticket reliability implementation plan

> For agentic workers: use executing-plans or isolated subagent-driven development
> for each task; root coordinates integration and the single combined release gate.

**Goal:** Safe Paystack M-Pesa/card marketplace purchases and unobstructed ticket work.

**Architecture:** Existing PostgreSQL attempts/outbox and signed guest sessions,
with a distinct marketplace snapshot/capacity adapter. Existing consent policy
controls automatic prompts; gate UI distinguishes unverified transport outcomes.

**Tech stack:** Next.js/React/TypeScript, Neon PostgreSQL, Paystack, Cloudflare Workers.

**Spec:** docs/superpowers/specs/2026-11-16-marketplace-ticket-reliability-design.md

## Global constraints

Preserve records, IDs, prices, commission, bindings, cron and launch flags. Paystack
only. No real charges/STKs/messages/accounts/keys/events or new paid services.
Unknown capacity/commission/provider readiness must never become invented certainty.

## Task 1 — Marketplace accepted purchase and fulfilment

Files: app/api/marketplace/checkout/route.ts; lib/server/paystack-attempts.ts;
new lib/server/paystack-marketplace-tickets.ts; lib/server/marketplace.ts;
lib/server/payment-effects.ts; lib/server/tickets.ts; organizer validation/create/edit
routes/forms; marketplace approval; app/marketplace/[eventId]/BuyBox.tsx;
client attempt helper as needed; commerce messages; API.md; covering tests.

- [ ] Add failing route and real PostgreSQL proofs for one dispatch/hold, recovery,
  immutable commercial snapshot, capacity/edit races and verified settlement.
- [ ] Implement distinct snapshot/adapter and fail-closed pricing/capacity, shared
  locks/attempt contract, explicit legacy handling and paid refund review.
- [ ] Connect finite-capacity organizer controls and retry-safe client, localized
  Paystack method labels; preserve current commission and server pricing.
- [ ] Verify callback versus reconciliation/refund/mint and generic-claim isolation,
  saved shop attempt recovery, guest ownership and current merchant restrictions.
- [ ] Run focused tests plus opt-in isolated SQL; types/scoped lint; self-review;
  commit only owned paths. No full suite/build by the isolated writer.

## Task 2 — Private ticket consent controls

Files: CookieConsent.tsx, consent shared policy only as required, AppShell private
orders classification and focused effect/browser tests.

- [ ] Reproduce fresh/private and public-to-private automatic panels in failing tests.
- [ ] Gate auto-opening and rendering by the existing campaign/private policy;
  keep explicit path-scoped preferences, current choices and revocation behavior.
- [ ] Prove no inferred consent/writes/tracking on private routes, manual settings
  work and accepted consent never enables private-route analytics.
- [ ] Run focused tests/types/lint, self-review and commit owned paths.

## Task 3 — Gate outcome clarity and operating readiness

Files: app/admin/gate/GateApp.tsx; narrowly scoped supporting gate API/helper and
tests if required. Root owns this task after current behavior is traced.

- [ ] Reproduce transport failure being reported invalid/incremented as a scan.
- [ ] Show an unverified outcome with precise retry/exception-lane guidance;
  preserve true invalid/used results and online entitlement boundary.
- [ ] If retry needs durable scan identity, design/prove it before changing server
  admission; never imply an unknown response authorizes entry or offline admission.
- [ ] Document remaining merchant/venue readiness with measurable operator checks.

## Task 4 — Integration and release

- [ ] Inspect actual commits and cross-flow regressions; update API/operator contracts.
- [ ] Obtain one fresh independent full-branch review and resolve material findings.
- [ ] Run one combined test/type/lint/build gate, real SQL proofs and frozen browser
  cases including fresh private pages, recovery, marketplace and gate error states.
- [ ] Create/attach normal PR, merge exact reviewed head and deploy with keep-vars;
  verify live marker/private boundaries, binding/schedule preservation and clean tree.
- [ ] Report actual delivered scope and unverified provider/venue dependencies.
