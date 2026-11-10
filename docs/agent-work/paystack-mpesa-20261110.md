# Paystack M-Pesa merchandise checkout

The owner requested M-Pesa through Paystack and explicitly confirmed the merchant
dashboard channel is enabled. The site had hardcoded `channels: ['card']`.
The bounded fix adds `mobile_money` to the existing hosted merchandise checkout;
no Daraja fallback, new credentials, storage, payment attempt or ledger migration.

The UI shows the original M-Pesa asset alongside Visa/Mastercard and lets the buyer
select their rail at Paystack. Its capability flag is separate from the disabled
direct-Daraja flag. The existing durable attempt, exact reference/amount/currency
verification, signature check, uncertain-state recovery and effects outbox remain.
The legacy `pay_method='card'` marks the hosted gateway family; customer receipts
and status identify Paystack rather than falsely asserting a card was used.
No fabricated provider receipt number is displayed. Ticket/marketplace gates and
the adapter's card-only default are unchanged.

Official documentation read 10 November 2026:
- https://paystack.com/docs/payments/payment-channels/ — Mobile Money supports
  Kenya; M-PESA provider `mpesa`. Customers authorize on their phones.
- https://paystack.com/docs/api/transaction/ — Initialize accepts `channels`,
  including `card` and `mobile_money`.

Initial RED: six intended behavior failures /77passes; browser RED: three intended
M-Pesa-display failures /10passes. Production changes followed these failures.
The next run passed91checks; five old exact-object option assertions correctly
needed the new explicit capability field. They were updated to cover that field.
Final verification/release evidence is recorded externally in the task artifacts.
The final focused run passed152tests/11files, and release/cache/native-label
checks passed58tests/3files. The combined suite reported2476passed,45failed,
191skipped across297files. All45failures remain in the same8legacy files as the
previous release (37direct-hook document harness failures; older home-heading,
copy, screen-parser and teal-palette assertions). The whole suite is not green.
The separately added CSV regression passed in the focused run. Focused lint
reported zero errors (existing warnings remain). No dependencies/config changed.
One independent read-only review found no Critical/Important issues. Both Minor
notes were addressed: the earlier fulfillment contract now describes the new
flag correctly; authorized order CSV exports append the stored Paystack reference
alongside the documented raw family tag. The CSV change also had a RED regression
before its implementation. Existing auth/permission gates remain unchanged.
No real charge, STK, message, paid receipt, ticket or authenticated customer write
is used for testing. Merchant enablement is owner-confirmed, not an independently
completed real-money acceptance or settlement test.

Final package: Next compilation/TypeScript/static generation and OpenNext repack
passed. A fresh standalone compilation includes the last CSV projection fix
(confirmed in both the Next route and packaged handler). Production-browser
checks at320/390/1440px passed: actual M-Pesa image decoding, clear hosted method
choice, unchecked terms, retained cart, no overflow/errors and no non-GET/HEAD
requests. Phone/desktop screenshots were visually inspected. The two-product
KES5,300 cart also survived refresh/history/browser restart with matching checkout.
