# Gated owned-event Paystack ticket completion

Goal: implement the existing owned-ticket journey using durable Paystack attempts,
finite inventory and verified settlement, with launch CLOSED unless the optional
server-only `PAYSTACK_TICKETS_ENABLED=true` and normal Paystack/database readiness
are present. No production configuration, money, messages or deployment.

The parent explicitly authorizes this audited design and inline execution without
another approval loop. Worktree: `codex/paystack-ticket-completion-20261110`, base
`178293478ee33de7d6ff5cdac2a8f817c7a85fca`. Root owns final independent review.

## Decisions and contracts

- Input is exactly `ticket:{eventId,tier,qty}` plus name, phone, optional email and
  owner-scoped idempotency key. Reject mixed merchandise, fulfillment and discounts.
  Price and immutable event/tier/quantity snapshot come from the server.
- Commit the order/attempt first. Under event -> order -> attempt locks, validate
  current publication, real schedule/venue, sale window, finite capacity and tier
  identity, then atomically hold seats and grant the unique provider-send claim.
  A failed claim rolls back the hold. A committed claim never becomes resendable.
- Expired `initiating`, `ready`, `unknown`, failed-charge or abandoned hosted
  sessions keep capacity. Only proven never-dispatched prepared attempts may
  expire locally. No provider finality/cancellation API is invented.
- Verified exact KES settlement uses the same event lock. Existing valid holds
  survive normal sales-window closure/pausing; cancelled/postponed/rescheduled or
  elapsed events cannot mint. A released seat can be reacquired only while new
  sales are eligible and actual finite capacity permits it.
- Late money for an unfulfillable order remains recorded as paid with explicit
  `ticket_fulfillment_status=refund_review`, a received timestamp and no ticket
  entitlement/capacity consumption. Customer and staff see manual refund review,
  never a refund promise. Existing externally attested full refund recording
  remains the only money-return workflow; no automatic refunds.
- Ordinary paid ticket settlement queues the existing durable consequences in
  the settlement transaction; ticket mint precedes receipt creation. Mint and
  scan recheck current ledger/refund status. Duplicate callbacks cannot replay
  consequences. A review receipt truthfully documents payment without tickets.

## Implementation plan / ledger

1. Add real PostgreSQL/fake-provider acceptance tests first; observe RED for the
   missing ticket route, holds, settlement and refund-review behavior.
2. Add server-only ticket gate, checkout/transaction helper and Paystack-aware
   capacity rules. Integrate verified settlement and refund-safe minting.
3. Connect existing checkout and event truth to the opt-in path; expose truthful
   customer/staff review state without weakening private capability boundaries.
4. Run scoped existing/new tests with own network-none DisposablePostgres,
   self-review the diff, commit bounded code; root performs independent review.

Review focus: concurrent final-seat buyers; crash before/after send claim; late
success after released/reallocated seats; publication/window changes; refund
before mint/scan; flag disable after initiation; receipt ticket-read failure.

Ruling: retain paid money in the established ledger and add a separate fulfillment
review marker, rather than pretend the received payment failed or introduce a new
financial status. Cost if wrong: operator/customer presentation must be corrected;
money and refund history remain preserved.

Verification evidence and final rulings are appended after actual runs.

Observed RED: the original checkout returned400 for ticket input; the new opt-in
availability test returnedfalse; atomic snapshot enforcement returned503; a generic
merchandise claim bypassed ticket capacity; manually fulfilling a review order
returned200; receipt email/page/PDF lacked the review contract. Tests were corrected
only where fixture mocks lacked actual browser/catalog/session/audit dependencies.

Implementation decisions: the immutable `orders.paystack_ticket` snapshot is
inserted atomically by existing attempt preparation, not attached afterward. The
normal merchandise claim explicitly excludes ticket snapshots. A completed external
full refund marks the review workflow `refunded`; no financial history is rewritten.

Ruling: honor a valid existing hold after ordinary sales-window closure or pausing,
but route cancelled/postponed/rescheduled/elapsed events to review. Released seats
must satisfy current new-sale eligibility to be reacquired. Cost if wrong: operator
policy requires revision before enabling launch; no automatic refunds are promised.

Ruling: same-model inline implementation/self-review follows the parent's explicit
no-agent instruction; parent owns fresh independent review. Scope-specific tests
replace a full-suite/build run because the parent explicitly reserves integration.

Self-review found and fixed two important boundaries, with observed RED/GREEN:
the new settlement preflight must sanitize database exceptions, and both send
claims and settlement must reconcile immutable ticket metadata against the exact
persisted line/quantity/unit/name. Mismatched paid lines enter review, never mint
extra admissions. A PostgreSQL trigger proves ticket metadata cannot be lost in
the attempt/order creation crash window.

The parent explicitly accepted the complimentary-ticket race correction: finite
complimentary issuance now inserts its paid order under the same event-row lock
and capacity snapshot as hosted holds/settlement. Admin authentication, existing
eligibility and free/no-charge semantics remain. Null/untracked capacity is still
allowed for this authorized complimentary operation; paid online checkout requires
known finite capacity. A synchronized SQL-count barrier tests comp-vs-paid claims
against the final seat in addition to an actual two-handler race and held-seat
rejection. No production issuance was performed.

An initial complimentary rerun hit a disposable container startup failure while
disk was100% full. The helper's own completed fixture released storage; the next
isolated barrier test passed. No shared filesystem/container cleanup was performed.

## Final verification and review handoff

- Fresh final scoped run:20 files,200 tests passed, exit0, no skips. Includes all43
  real PostgreSQL owned-ticket acceptance cases. Log:
  `/workspace/artifacts/ugt-full-audit-20261103/completion-ticket-implementation-final.log`.
- The earlier scoped run also passed actual PostgreSQL legacy reservations11,
  Paystack attempts9 and payment effects36. Combined distinct positive coverage
  across these scoped runs is256 tests in23 files. The earlier log intentionally
  records its failures, not a green aggregate:
  `completion-ticket-implementation-focused.log`.
- The protected legacy `paystack-commerce-client.test.ts`37 cases fail in this
  isolated base with `document is not defined`; root owns its fixture correction.
  It was not edited or masked. New actual LiveCommerce ticket tests independently
  verify the request, retained cart, server gate and durable reference behavior.
- TypeScript `--noEmit --incremental false`: exit0, no errors. Scoped ESLint:
  exit0,0 errors/96 warnings, including existing hook/any/print warnings and four
  test-fixture explicit-any warnings. Logs end in `implementation-types-final.log`
  and `implementation-lint-final.log`. `git diff --check` passes.
- No full suite, build, deployment or physical/browser visual check was run by
  this worker; root owns combined integration/review. Tests use fake provider
  calls and disabled messaging plus own network-none disposable PostgreSQL only.
  All owned running containers stopped; historical containers remain untouched.

Author self-review is complete; independent high-assurance review is root's next
step. Focus on event -> order -> attempt locks, immutable line reconciliation,
review receipts/refund closure, and the synchronized complimentary race. The
`reserved` fulfillment marker records a safe capacity decision; actual issued
ticket/email readiness remains the existing separate delivery summary.

Deferred minor: existing lint warnings are retained rather than expanding this
financial change into an unrelated hook/type/print cleanup.

Launch remains CLOSED by default. No configuration/binding/secret was set.
Before any operator activation, root must review/integrate the branch, run its
combined gates, confirm merchant/signing and production ledger/schema readiness,
and accept the operational policy that uncertain hosted sessions keep seats
indefinitely until authoritative resolution. The manual refund-review path never
initiates money movement or promises a refund. No live merchant, provider finality,
real purchase, bulk scale or venue-capacity certification is claimed.
