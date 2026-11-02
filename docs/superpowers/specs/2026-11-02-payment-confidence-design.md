# Payment confidence — 2 November 2026

Continue the existing UGT checkout, not a new payment integration or visual redesign. Customers, the payment automation and authorized staff must see consistent, truthful progress. English remains the default; existing locale coverage is retained. No production charges, STK requests, refunds or test messages.

## Evidence and decisions

- [Paystack verification](https://paystack.com/docs/payments/verify-payments/): transaction status is distinct from API request success; verify on the server, avoid duplicate fulfillment.
- [Paystack webhooks](https://paystack.com/docs/payments/webhooks/): authenticate raw payloads, handle repeated deliveries and acknowledge promptly.
- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page): customer redirects are not guaranteed; fulfillment must survive duplicate/concurrent webhook delivery.
- [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): announce changed results/progress without moving focus.
- Safaricom's public Express Query page was unavailable during research. Preserve the existing authenticated CheckoutRequestID-bound query/callback checks; do not invent a new proof or activate unconfigured rails.

Request accepted is not money received. Only authenticated provider evidence plus exact server-ledger guards can mark paid. Payment confirmation, ticket preparation and email-provider acceptance are independent states. Email acceptance is not inbox delivery. Unknown, offline and lookup failure never become payment failure. No invented completion percentage, countdown or guaranteed confirmation time.

## Scope and contract

1. Persist the existing four fulfillment jobs atomically with each fresh verified Paystack, M-Pesa or Stripe paid transition. Extend the existing outbox's gateway constraint safely. No historical paid-order backfill or unsolicited messages. Preserve existing inventory locks, capacity gates, refunds and provider reference/amount checks. Guard reconciliation writes against concurrently settled/refunded rows.
2. Attempt the durably queued receipt email immediately after the receipt effect commits, outside the payment transition; retain existing email leases, idempotency window, retry budget and scheduled recovery. Failure cannot undo confirmed payment.
3. Add a redacted `delivery` summary to `/api/orders/status`: `tickets` = not_required/preparing/ready/review/unknown; `email` = not_requested/preparing/queued/processing/accepted/review/unknown. Only confirmed orders expose delivery progress. Read-only lookups, no queue initialization or fulfillment in public polling. Missing tables/read failures become unknown, never false ready. No contacts, payloads, raw errors or ticket codes. Existing status/receipt fields remain compatible; responses are no-store.
4. Customer status view separates payment and fulfillment, keeps bounded adaptive polling while confirmed documents are preparing, offers a non-charging status refresh, recognizes offline/reconnect, and never clears a newer order's stored checkout state. Provide truthful next steps for failures/refunds. Authorized staff get read-only queue progress with safe refresh; concurrent staff see database truth, not client-invented success. Existing roles remain enforced.
5. Fix update notice clipping under the existing wide-phone CSS zoom. Keep compact, dismissible, release-specific persistence and all financial/dirty/offline refresh protections. Verify the floating notice outside `/app`, not only the inline update control.

## Acceptance / failure matrix

Tests cover repeated/out-of-order provider events, wrong reference/amount, paid/refund races, atomic ledger+queue writes, worker/email failure, unready ticket/email versus paid funds, privacy/auth rejection, bounded read-only polling, offline lookup failure, failed/refunded presentation, zoomed phone geometry and update dismissal. Browser checks use local fixtures and block live financial writes. No claim of production merchant approval, settlement or inbox delivery without external evidence.
