# Paystack replacement-account handoff

## Current status — owner activated 1 November 2026

The owner explicitly requested activating Paystack after the storefront release.
Production `PAYSTACK_ENABLED` is now **true**, enabling the existing Paystack
card-merchandise path. This supersedes the earlier disabled rollout decision.
The code remains opt-in by default when the activation setting is absent.

Fresh checks: the replacement key authenticates a read-only integration GET with
HTTP200; current official documentation matches the implemented API-secret
HMAC-SHA512/raw-body webhook and KES card initialization contract. All139focused
adapter/webhook/checkout recovery/settlement/client/options tests passed. The
configuration update changed only `PAYSTACK_ENABLED`; all54other bindings were
unchanged. A deliberately invalid checkout request, rejected before ledger or
provider work, changed from HTTP503 `card_not_configured` to HTTP400
`invalid_idempotency_key`. No order or financial transaction was created.

This verifies the activation gate, not merchant approval, actual destination
subscriptions, settlement readiness, live ledger writes or a completed purchase.
Those remain unverified. No speculative signing change, new webhook destination,
historical-order replay, live charge, refund, STK or customer message was used.
Card tickets and Paystack mobile money remain outside the enabled scope.

## Initial installation history

The owner deleted the old Paystack account on 29 October 2026 and supplied a
replacement setup, reported as merchant **2080721**, on 31 October. The new live
key pair was installed privately in Cloudflare; a read-only authenticated
`GET /integration/payment_session_timeout` returned HTTP200. This proves API
authentication, not merchant identity, channel eligibility or settlement approval.
`PAYSTACK_ENABLED` was explicitly stored as **false**. Unrelated binding metadata
was unchanged. No financial transaction or customer message was used to test it.

The supplied keys had been disclosed in the owner's attachment. The owner
explicitly declined rotation. No rotation was performed; exposure risk remains.
Do not copy keys into source, tickets, commands, reports or this document.

## Disabled by default

Outbound Paystack requires BOTH `PAYSTACK_ENABLED=true` and a server-side
`PAYSTACK_SECRET_KEY`. An absent, empty or false activation setting disables
checkout, verification and subaccount requests. Keeping an old encrypted key or
replacing keys alone cannot enable the integration. Checkout rejects an inactive
provider before creating an order or sending a provider request. The existing
Stripe fallback is unchanged; its presence is not a claim that Stripe is ready.

Existing orders, receipts, settlements, stock and historical credentials are not
deleted or reassigned. Signature-gated inbound notifications retain their exact
reference, card-method, KES-amount and recoverable-state guards. No real charge,
refund, STK, customer message or account change was performed for verification.

## Implemented safeguards

- Signed guest scope and a provider-specific opaque retry key bind one durable
  order, accepted server price and delivery snapshot to each Paystack attempt.
- Atomic preparation and nonce claims prevent repeated initialization of that
  same attempt. Lost/ambiguous replies retain the order for recovery; they do not
  authorize a fresh payment or a terminal-failure assumption.
- Ready checkout URLs are exact-host HTTPS allowlisted and available only to the
  bound browser while the order is recoverable. Uncertain attempts open status;
  recovered paid orders open their existing receipt/status instead of a new buy.
- Prepared retries retain accepted prices but recheck active products and stock.
- Signed success and reconciliation require exact stored provider reference,
  card method, integer KES amount and an eligible ledger status. Infrastructure
  failure is retryable; browser closure, abandonment and failure events do not
  prove irreversible hosted-checkout cancellation.
- A fresh Paystack paid transition and four customer-effect jobs commit in one
  PostgreSQL statement. A failed job insertion rolls back the transition. The
  authenticated payment cron recovers persisted jobs independently of new
  provider verification; `after()` is only an acceleration path.
- Reservation, inventory, tickets and receipt preparation have independent,
  token-owned leases and bounded retries. Delayed inventory checks the current
  ledger under its transaction lock. Receipt preparation waits for ticket work
  and confirms insertion into the existing email delivery outbox; it does not
  itself send email. No historical paid-order backfill is performed.
- Owner email/WhatsApp notices remain best effort on a fresh transition only.
  They are not replayed by the recovery queue. This is not a promise of
  exactly-once network delivery.

## Outstanding verification and rollout limits

1. An earlier database failure was HTTP402, `provider_capacity`. The fresh
   1 November public product check returned HTTP200 with all24 products, so that
   previous outage is not still asserted as current. Public reads alone do not
   prove authenticated ledger/schema readiness or durable write capacity: verify
   those on the existing Neon project. Do not replace the
   database or invent products, stock or payment records to conceal a failure.
2. The owner reports a new webhook destination `WHK_18474e59`, with two event
   subscriptions and a separately masked `whsec_` secret. Its actual event names
   and signing contract have not been verified. Published Paystack documentation
   specifies **HMAC-SHA512 of exact raw bytes, hex `x-paystack-signature`, keyed
   with the API secret**. The current verifier follows that published contract;
   it has not been certified for this new destination's separate secret.
   Current published documentation still confirms the API-secret contract;
   the separate reported secret is not proof of a mismatch. Authentic destination
   confirmation and an isolated fixture remain outstanding verification, not
   completed checks. Do not guess a Stripe-style envelope or try multiple keys.
3. Confirm `charge.success` is subscribed. Public payment docs do not document
   `charge.failed` as an emitted payment event; the existing defensive handler is
   not evidence that it is subscribed. The relationship between the new
   destination and the legacy "Webhook URL: Not set" field is unverified: do not
   register a duplicate destination or populate it speculatively.
4. Confirm the replacement merchant's Kenya/KES cards, business approval and
   settlement readiness, and review outstanding legacy-account orders without
   reassigning their references. A read-only API response does not settle this.

Reported live destinations are:

- Callback: `https://urbangangtour.co.ke/pay/success`
- Webhook: `https://urbangangtour.co.ke/api/paystack/webhook`

Card merchandise is the prepared scope. Paystack mobile money is not enabled.
For Kenya, the documented hosted channel is `mobile_money` (provider `mpesa`),
not a channel named `mpesa`; eligibility and ledger behavior still need proof.

## Remaining merchant validation and future verification

1. Confirm the new merchant's approval, Kenya/KES support, payment channels,
   settlement details and business identity in Paystack. These are provider-side
   facts, not established by a saved URL or an existing secret entry.
2. Review unresolved orders/authorization URLs from the deleted account. Never
   reassign their references or fabricate/replay settlements under the new one.
3. The replacement server/public keys are already installed securely in
   Cloudflare. Keep them private; the current hosted initialization is
   server-side. Replacing keys is not an activation step.
4. Save the new account's LIVE callback
   `https://urbangangtour.co.ke/pay/success` and webhook
   `https://urbangangtour.co.ke/api/paystack/webhook`. Existing code sends the
   server-generated order reference as the callback's `ref` query parameter.
5. Further end-to-end verification should use an isolated test deployment with
   test keys and its own return/webhook settings. Never mix test-mode payments
   into production records. The owner requested production activation as recorded
   above; that decision does not establish the outstanding merchant facts.
   Live financial tests require separate explicit authorization.

## Deliberate limits

Owned-event ticket cards are NOT enabled. Public Paystack docs do not establish
an irreversible per-checkout expiry/cancellation boundary. Bounded seat release
needs provider confirmation or an explicit late-payment/refund policy; until
then neither a local timer nor `abandoned` may release potentially payable seats.
Existing M-Pesa ticketing and marketplace configuration are otherwise unchanged.

There is no zero-failure claim. Effects that exhaust retries are blocked for
operator review, not silently discarded. Existing receipt-provider retry windows
and cross-window localStorage atomicity remain limits. This change does not
replay historical paid orders or initiate automatic refunds.

Two pre-existing helper limits are not certified away by this queue. A refund
between the worker's read and reservation consumption can change reservation
bookkeeping, but it cannot grant stock, a ticket or saleable capacity: those
paths check the current ledger independently. Also, the existing receipt renderer
treats ticket-read/attachment failures as optional; completed ticket preparation
prevents premature minting races, not a later optional attachment-read failure.
Card ticket activation remains off. The Paystack deployment itself does not
certify other providers, merchant approval or an end-to-end live purchase.

References: [initialize transaction](https://paystack.com/docs/api/transaction/#initialize),
[integration timeout](https://paystack.com/docs/api/integration/#update-timeout),
[verify payments](https://paystack.com/docs/payments/verify-payments/),
[webhook signatures](https://paystack.com/docs/payments/webhooks/),
[new Dashboard webhook guide](https://support.paystack.com/en/articles/10609026),
[webhook event API](https://paystack.com/docs/api/webhook-events/).
