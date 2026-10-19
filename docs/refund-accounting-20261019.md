# External refund accounting and ticket allocation

Owner-approved first tranche of the prioritized audit repairs. This release does
not initiate a real refund or claim that card recovery, stock reservations and
the rest of the audit are complete.

## Correctness contract

The Orders control records money already returned externally, with explicit
operator confirmation, reference, reason and an opaque retry key. It does not
call or independently verify a payment provider. Full/partial state derives
from the cumulative amount, not a freely chosen status.

An order-row lock serializes cumulative refund budget checks. The ledger, status,
ticket voids and audit commit together. Lost acknowledgements can replay the same
record; changed requests conflict. External references are case-normalized and
unique within an order. Legacy records remain unchanged.

Partial ticket returns select exact original, unused ticket entitlements. Saved
order positions and unit prices are checked rather than current catalogue names
or prices. Mixed allocations, missing issuance/price evidence and unallocated
legacy partial refunds require review. Full cumulative returns revoke all
remaining tickets. Used tickets are not eligible for the partial-ticket path.

Only explicitly allocated partial refunds preserve unaffected tickets in the
gate, ticket/PDF pages, verification page and account wallet. Legacy partials are
not mass-reactivated. Minting rechecks the locked order, not an old paid callback
snapshot. A partial refund never mints new tickets. Customer pages distinguish
a recorded return from pending payment or independently verified provider action.

The form keeps its request snapshot after uncertain acknowledgement, stays
mounted across admin modules, and has private, permissioned history. No automatic
merchandise restock, external reversal, credit-note issuance or legacy refund
backfill is introduced. Cases outside the allocation contract need review.

## Evidence

812 default regression cases pass; 45 opt-in cases skip in that invocation.
Separate actual PostgreSQL run: 32 pass across refund accounting, M-Pesa attempts
and ticket reservation. Ten refund cases cover 20 competing requests, budget
limits, dedupe, rollback, legacy safety, ticket allocation and the actual gate
route's admit-once behavior. UI tests prove stable retry payload and no submit
during rendering. No live customer financial record or message was used as a test.

TypeScript and changed-source lint pass with no errors. Build/dry-run/live
deployment evidence is recorded separately in
`/workspace/artifacts/ugt-refund-accounting-20261019`.

## Next work, not certified by this release

Card retry recovery; pre-payment merchandise reservations; durable payment
follow-up repair; CI/restore drills; publishing consistency; authenticated Android
and real provider sandbox testing; production-shaped whole-site capacity.
