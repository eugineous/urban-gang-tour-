# Payment confidence implementation plan

Spec: `docs/superpowers/specs/2026-11-02-payment-confidence-design.md`.
Base: `2d0f719e82343c5cf778932f0f762bb39c27e669`; branch `codex/payment-confidence-20261102`.
Preserve active Paystack configuration, other rail gates, all bindings and the existing cron schedule. Use existing worktree and dependencies. No real financial/provider write tests.

## Task 1: Durable settlement and prompt delivery

Own payment-effects, M-Pesa/Stripe callback and reconciliation paths and focused tests. Add failing tests for exact fresh settlement+outbox atomicity across rails, replay/no duplicate work, guarded mismatch reconciliation and email acceleration. Run and observe failure, implement minimal changes, rerun focused tests. Expected: all pass, no live requests. Commit scoped files.

## Task 2: Shared redacted progress and staff visibility

Own delivery summary helper, public status route, authenticated read-only payment delivery endpoint/panel and tests. Interface: `delivery` ticket/email enums in the spec, consumed by Task 3. Tests first: no PII/raw errors, unavailable schema is unknown, no writes on public read, unauthorized staff rejected, terminal/nonpaid does not expose documents. Expected: focused tests pass. Commit scoped files.

## Task 3: Customer feedback

Own PaymentStatus, payment presentation, appropriate locale catalogue and customer tests. Consume Task 2's additive summary. Tests first: paid does not imply delivered, email accepted not inbox delivered, check-again cannot charge, offline/error preserves reference, terminal failures/refunds truthful, bounded polling and cleanup. Retain existing document entitlement guards. Expected: focused tests pass. Commit scoped files.

## Task 4: Update notice and release verification

Own InstallableApp, App.module.css, dismissal helper and popup regression tests/scripts. TDD persisted release-specific dismissal and viewport geometry, preserve update safety guards. Expected: focused tests pass and real phone/wide-phone browser popup bounds fit. Commit scoped files.

## Whole-branch verification

Run full tests, TypeScript, lint, production Cloudflare build, fixture browser payment/PWA checks. One fresh-context review of the whole branch, fix important findings with regression tests. Standard PR merge then `wrangler deploy --keep-vars`; compare tested/merged trees and configuration, verify release via public GETs. Never claim live charges, email inbox or merchant approval were verified by fixtures.

Review focus: SQL compare-and-set races, existing-table gateway migration, no historical backfill, queue leases, refund interaction, public summary privacy, compatibility of old orders/tables, overlapping polling requests and cleanup, newer cart/attempt ownership, wide-phone CSS zoom and storage failures.
