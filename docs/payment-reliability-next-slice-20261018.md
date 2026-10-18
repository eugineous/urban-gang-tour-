# Durable M-Pesa attempts: bounded implementation checkpoint

Branch: `fix/durable-mpesa-attempts-20261018`, from merged PR75.
Status: **persistence primitive implemented, not connected to checkout or deployed**.
No production migration, order, charge, provider request or credential change.

## What has actually shipped

PR75 deployed the poster feedback, unified shop discovery and navigation update.
The production marker is `posters-shop-discovery-20261018-v1`; the Worker version
is `b7ea12c9-746f-4d6c-bb4e-c1d23b9d81cf`. Twenty read-only live checks passed;
11 public event IDs, 14 products, 54 binding names/types and the existing
`*/15 * * * *` cron were preserved. The obsolete Vercel integration reported an
account-block failure; no Vercel deployment or protection changes were used.

## Phase 1: database boundary

`lib/server/mpesa-attempts.ts` contains the additive, currently unreferenced schema
and persistence operations. A unique owner-scope/token pair determines one
attempt. The request fingerprint includes normalized purchase, contact and
fulfilment input; object-key order is canonicalized, and changed inputs conflict.
Array order remains significant (conservative conflict, never silent reuse).
Retries retain the originally accepted authoritative total, not a new quote.

One statement creates the attempt, financial ledger row and delivery snapshot.
The order foreign key is deferred until the statement transaction commits.
Insert failure rolls back all three; existing financial history is untouched.
The caller must first ensure the existing customer/fulfilment schemas, validate
the purchase and calculate prices from the server, as the current route does.

A compare-and-set grants one initiation claim. A claim is never stolen after a
timeout: the previous worker may already have contacted Daraja. Reference storage
locks the attempt before atomically linking its original provider reference to
the ledger. No provider call occurs while a database lock is held. Pending,
unknown and reference-recorded are not payment confirmation. Closure follows an
existing terminal ledger status; it never creates that status or mints documents.

## Evidence and limits

The opt-in PostgreSQL 16 tests run in a disposable Docker container with networking
disabled, no exposed ports, no production credentials and a fresh connection per
query. They execute the implementation's SQL, not fabricated query responses.
Twenty concurrent prepares produce one attempt/order/delivery snapshot; twenty
send claims produce one winner and one fake-provider invocation. Additional tests
cover cold module reload, changed input, owner-scope separation, ledger/delivery
rollback, crashes before and after send permission, reference-persistence failure,
reference replay/rebinding, terminal closure and integer/ledger collision guards.

This is not a Daraja sandbox result or route/browser proof. There is no claim of
exactly-once delivery across SQL and an external provider. After acquiring send
permission, a crash before sending and a crash after provider acceptance may be
indistinguishable. Both must block automatic re-initiation until reconciliation.

Final checkpoint regression: **788 passed, eight opt-in cases skipped** across
the full suite with `UGT_MPESA_ATTEMPT_PG_FIXTURE=1`. This includes eleven real
PostgreSQL cases and two identity tests added here. TypeScript and lint of the
new files pass; no new lint errors or warnings. The disposable database containers
are stopped by the fixture. Logs are under
`/workspace/artifacts/ugt-source-audit-20261018/mpesa-attempt-*-final.log`.

## Phase 2: next implementation, before any finance release

1. Establish and validate a persistent server-bound guest/account principal.
   `mpesaAttemptIdentity` only hashes the supplied owner; hashing is **not auth**.
   Never use a browser-provided user ID or an unverified phone as that principal.
   A copied attempt token alone must not expose another buyer's recovery data.
2. Wire `/api/orders` to prepare/recover before the old process-local retry map;
   remove that map only when every branch uses the durable path. Require a
   cryptographically random attempt token; define compatible old-client handling.
   Replays use their stored accepted total even if current prices have changed.
3. Complete pre-send inventory/fulfilment work before acquiring permission to
   send; fail closed on failures. Preserve discount/referral accounting without
   counting a retry twice. Atomic ticket-capacity reservation remains a separate
   blocker for certifying ticket sales; do not mistake the new order claim for it.
4. Persist minimal checkout attempt/recovery identifiers before the request.
   On reload or lost response recover that identity; do not invent a new prompt.
   Keep the cart and entered details, and distinguish saved/initiating/unknown/
   reference-recorded/settled. Do not infer paid from HTTP 200 or STK acceptance.
5. Validate Daraja response shapes/HTTP failures and bound request timeouts. Keep
   the send claim uncertain on ambiguous failures. Surface aged unknown attempts
   to authorized operations staff and document reconciliation; no automatic lease
   expiry/retry. Use the existing callback's amount/state predicates and outbox.
   If closing attempts in a wider transaction, preserve attempt-before-order lock
   ordering; do not add an inverse lock path in settlement code.
6. Add actual route, client reload and callback regressions; preserve privacy,
   rate limits, Origin, authoritative prices and receipt/ticket deduplication.
   Separately obtain authorized sandbox evidence and finance/state review before
   merging/deploying the integrated repair. No real customer charge as a test.

## Subsequent priorities

After durable initiation is integrated: atomic ticket-capacity holds, provider-
specific card retry identity, enquiry recovery/truncation, uncertain Gmail sends,
then the reproducible Gallery hydration issue and mobile publishing checks.
Visual/page-copy work follows the source-led positioning brief without imposing
a new visual identity. No future deployment is implied by this checkpoint.
