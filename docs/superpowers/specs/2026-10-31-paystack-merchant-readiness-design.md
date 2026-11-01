# Replacement Paystack merchant readiness

Owner's31October implementation brief requires the existing KES merchandise
checkout to connect to merchant2080721, preserving the existing app/database and
all other providers. The brief directly authorizes execution and forbids real
financial/customer-message tests. Keys remain private; no rotation is performed
against the owner's explicit decision. Exposure remains a disclosed risk.

## Boundaries

Securely install only the supplied Paystack API/public keys and explicit disabled
flag. A read-only integration-setting query can establish API authentication,
not merchant identity/channel/settlement approval. Do not enable while the live
database rejects capacity or new-destination signing remains unverified.
Official docs specify raw-body HMAC-SHA512/hex in x-paystack-signature with the
secret key. They do not establish the masked whsec/new-destination contract or
the identities of the owner's two subscriptions. Do not guess or add fallbacks.

## Durable customer consequences

Add an empty private payment_effect_outbox. Only a fresh exact guarded Paystack
paid transition may create reservation/inventory/ticket/receipt jobs in the same
PostgreSQL statement. Failed enqueue rolls back settlement. No scan/backfill of
old paid rows. Existing provider-disabled state does not prevent draining these
already-recorded jobs through the authenticated reconciliation cron.

Per-effect claims have bounded leases, unique tokens and token-bound completion/
retry. Repeated DB effects use existing idempotency. Delayed inventory rechecks
the current ledger under its transaction's row lock. Refunded/failed orders
cannot gain late consequences. Receipt enqueue waits for tickets, uses the
existing deterministic payment receipt identity, and does not send mail itself.
Existing email cron and provider deduplication window remain authoritative.

Owner email/WhatsApp notification remains separate best-effort behavior; never
replay the combined non-idempotent sender or promise exactly-once network calls.
The customer notification covered by this work is the existing receipt outbox.

## Acceptance

Pin exact currency/reference/amount/recoverable-state guards; atomic rollback on
enqueue failure; concurrent notifications create one job per effect; interrupted
processing safely resumes; stale claimants cannot finish newer claims; receipt
cannot race ticket preparation; terminal/historical rows receive no new effects.
Use the network-none PostgreSQL fixture plus existing mocked-provider Vitest,
types/lint/build and frozen Worker checks. Keep all live payment channels off
until genuine operational dependencies and signing evidence are resolved.
