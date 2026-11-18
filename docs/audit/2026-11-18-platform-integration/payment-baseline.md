# Commerce preservation baseline

The deployed public catalogue is read-only evidence; payment-provider readiness
is not inferred from badges. Existing source uses Paystack card+mobile_money,
including merchant-enabled M-Pesa. Keep merchant/subaccount configuration,
credentials, signed webhook handling, durable attempts, accepted price/split
snapshots, capacity, late-money/refund review and fulfillment idempotency.

Do not create a real order/charge/STK/refund/account/message as a test. Do not
activate ticket launch flags or certify merchant settlement from fixtures.
No direct Daraja or new payment abstraction is introduced by this plan.

Public snapshots of product/event IDs and product prices are stored in this
task’s private local verification artifacts. They contain no customer data.
Current source verification can use existing guided-checkout, cart persistence,
marketplace/owned Paystack and webhook tests with isolated fixtures. Actual
current merchant dashboard, settlement and live provider callback health remain
outside the public audit’s visibility.
