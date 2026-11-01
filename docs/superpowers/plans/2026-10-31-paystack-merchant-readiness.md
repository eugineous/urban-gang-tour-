# Paystack Merchant Readiness Implementation Plan

> **For agentic workers:** Use executing-plans or task-scoped implementation with one final independent review. Track steps below; do not restart the old15-block workflow.

**Goal:** Securely configure merchant2080721 while closing Paystack's durable customer-consequence gap and retaining disabled activation gates.
**Architecture:** Reuse the existing order ledger, server initialization/recovery and authenticated cron. An atomic paid-transition/effects enqueue drives idempotent DB work and the existing receipt delivery outbox.
**Tech Stack:** Existing Next.js/TypeScript, Neon PostgreSQL and Cloudflare/OpenNext; no new dependency or paid service.
**Spec:** docs/superpowers/specs/2026-10-31-paystack-merchant-readiness-design.md

## Global Constraints

- Preserve existing app/database/providers, historical merchant references and all unrelated Cloudflare bindings/cron.
- PAYSTACK_ENABLED stays false; no live financial/customer-message tests or historical receipt replay.
- Raw credentials never enter source, prompts, logs, argv or commits. No speculative signing protocol or key fallback.

## Review Focus

- Queue insertion failure must roll back paid status (Task2 local SQL trigger test).
- An effect lease expires after its operation commits (Task2 retry/concurrency tests).
- Refund races a delayed inventory retry (Task2 locked-current-ledger test).
- Separate email cron freezes receipt before tickets finish (Task2 dependency test).
- Provider-disabled verification fails while existing effects still need recovery (Task3 cron test).

## Task1: Private merchant configuration

- [x] Validate exactly one supplied live key pair without displaying values.
- [x] Authenticate via read-only GET /integration/payment_session_timeout; no transaction/financial action.
- [x] Use Wrangler secret bulk stdin to replace only PAYSTACK_SECRET_KEY/NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY and set PAYSTACK_ENABLED=false; compare unrelated binding metadata before/after.
- [x] Record actual configuration/deployment and signing/subscription uncertainty in the replacement handoff.

Evidence: private configuration-receipt.json confirms the three intended
bindings only, authenticated read and no rotation; source baseline has55 bindings
and unchanged `*/15 * * * *` cron. Secret update deployed Worker version
55d030cf-8d96-4f12-aeec-b68bbbd799bc on31October19:21UTC (22:21 Nairobi).
Ruling:1November public products now return200/24records; do not present the
previous capacity402 as current. Private ledger/write readiness remains a gate.

## Task2: Durable effects and safe delayed inventory

Files: new lib/server/payment-effects.ts; lib/server/inventory.ts; new __tests__/payment-effects.test.ts and payment-effects-postgres.integration.test.ts; existing inventory-transaction.test.ts.

Interfaces: ensurePaymentEffectsSchema():Promise<void>; settlePaystackOrder({orderId,reference,amountKes}):Promise<OrderRow|null>; processPaymentEffects(limit?,orderId?):Promise<EffectSummary[]>.

- [x] Write and run RED tests for atomic guarded settlement/enqueue, independent token-owned jobs, cold recovery, receipt dependency and terminal/historical exclusion.
- [x] Implement one data-modifying CTE: guarded UPDATE orders RETURNING*, then INSERT effect rows SELECT FROM the newly paid rows. No independent settlement write.
- [x] Add per-effect claims/leases/token-owned completion and finite retry/backoff; reuse consumeReservation, recordPaidMerchOrder, ensureTickets and enqueueReceiptEmail without network sends.
- [x] Recheck current order status FOR UPDATE inside inventory transaction before writes; update fake-pool fixtures and verify refunded rows do nothing.
- [x] Run GREEN focused tests and network-none PostgreSQL rollback/concurrency/crash tests.

## Task3: Existing webhook, reconciliation and cron integration

Files: app/api/paystack/webhook/route.ts; lib/server/reconcile.ts; app/api/internal/cron/payment-reconcile/route.ts and their existing tests.

- [x] Add RED integration contracts using the Task2 signatures: webhook/reconciliation cannot settle without durable queue, callback/invalid signature/amount remain unpaid.
- [x] Replace only Paystack's guarded paid write with settlePaystackOrder; after() accelerates persisted jobs rather than owning the sole work record. Preserve independent best-effort audit/admin notices and all Daraja logic.
- [x] Drain already-persisted jobs through the existing cron even when new Paystack verification is off; retain auth, private/no-store and503 dependency behavior.
- [x] Run focused Paystack/reconcile/receipt tests and one final combined full suite/types/lint/Cloudflare build/browser/review. Follow the approved normal PR/keep-vars release; record its actual deployment separately rather than assuming success.

## Task4: Operational handoff

- [x] Record provider docs precisely: current published HMAC contract vs unverified whsec/new-destination behavior, actual charge.success requirement and unknown second subscription.
- [x] Leave card-only merchandise preparation and all activation gates disabled until database/provider signing/channel checks can actually pass; do not invent live success.

## Verification and review record

- Task3 boundary test observed RED4failed/7passed before route integration;
  adapted existing safety contracts then GREEN65/65 across four integration files.
- TypeScript exits0. Changed-file ESLint exits0 with6existing any warnings.
- Task2 GREEN56/56 in69.15s, including25actual network-none PostgreSQL tests.
  Initial worker RED9expected failures; inventory guard RED6failures. Default5s
  Docker transport timeouts (1then7under concurrent load) were not assertion
  failures; explicit15s actualSQL budgets and final rerun passed all cases.
- Full suite2181passed180gatedskips0fail across259files. The25new SQL cases
  are gated in that run and proved separately above, not falsely counted twice.
- Actual Cloudflare/OpenNext production build and immutable Wrangler drybundle
  exit0. Frozen-runtime checkout regression9/9 across390/820/1440px,
  zero pageerrors or live requests; actual built-route smoke4/4 without credentials.
- Final independent review: no critical/important source regressions; merge
  contingent on final tests/build/browser checks, never activation approval.
- Deferred minor: existing reservation-consumption refund race affects internal
  bookkeeping only, not capacity/ticket/stock grants; current-ledger guarded
  inventory/ticket behavior stands. Cost: a consumed reservation can accompany a
  refunded order, requiring bookkeeping review.
- Deferred minor: receipt rendering still permits optional ticket-read or PDF
  attachment failure; completed minting dependency does not certify those later
  reads. Cost: a receipt may omit ticket attachments; card ticket activation off.
- Ruling: retain existing best-effort owner notices without recovery replay;
  replaying non-idempotent email/WhatsApp would risk duplicate messages. Cost:
  owner notice can be missed on a callback crash; customer receipt work persists.
- Not certified: live ledger/schema writes, merchant approval/channels/settlements,
  authentic new-destination signing/subscriptions, exactly-once network delivery,
  or an arbitrarily incompatible pre-existing queue table. Static atomic schema
  initialization fails retryably; a queue dependency failure stops the shared
  payment cron before later provider reconciliation. No new service or database
  migration architecture is introduced to conceal that dependency.
