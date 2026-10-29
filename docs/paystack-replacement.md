# Paystack replacement-account handoff

The owner deleted the old Paystack account on 29 October 2026. This delivery
finishes bounded merchandise-payment construction, not merchant activation.

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

## When the replacement account is ready

1. Confirm the new merchant's approval, Kenya/KES support, payment channels,
   settlement details and business identity in Paystack. These are provider-side
   facts, not established by a saved URL or an existing secret entry.
2. Review unresolved orders/authorization URLs from the deleted account. Never
   reassign their references or fabricate/replay settlements under the new one.
3. Replace the server secret securely in Cloudflare, never in chat or source.
   Update `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` if needed by the selected client flow;
   the current hosted initialization itself is server-side.
4. Save the new account's LIVE callback
   `https://urbangangtour.co.ke/pay/success` and webhook
   `https://urbangangtour.co.ke/api/paystack/webhook`. Existing code sends the
   server-generated order reference as the callback's `ref` query parameter.
5. Verify in an isolated test deployment with test keys and its own return/webhook
   settings. Never mix test-mode payments into production records. Only after
   verified setup and approval should `PAYSTACK_ENABLED` become exactly `true`.
   Live financial tests require separate explicit authorization.

## Deliberate limits

Owned-event ticket cards are NOT enabled. Public Paystack docs do not establish
an irreversible per-checkout expiry/cancellation boundary. Bounded seat release
needs provider confirmation or an explicit late-payment/refund policy; until
then neither a local timer nor `abandoned` may release potentially payable seats.
Existing M-Pesa ticketing and marketplace configuration are otherwise unchanged.

There is no zero-failure claim. Existing settlement-to-deferred-fulfillment crash
recovery and cross-window localStorage atomicity remain separate limitations;
this change does not replay historical paid orders or initiate automatic refunds.

References: [initialize transaction](https://paystack.com/docs/api/transaction/#initialize),
[integration timeout](https://paystack.com/docs/api/integration/#update-timeout),
[verify payments](https://paystack.com/docs/payments/verify-payments/).
