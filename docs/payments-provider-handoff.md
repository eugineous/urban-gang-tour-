# Payment provider preparation — 28 October 2026

Pesapal is unavailable in checkout. This delivery adds server-only configuration
diagnostics and an API 3.0 authentication/status-verification adapter. It adds no
checkout button, route, order submission, IPN registration, ledger mutation,
fulfillment or reconciliation integration. Credentials alone cannot enable it:
`pesapalReadiness().checkoutEnabled` always returns `false`.

Existing Daraja, Paystack, Stripe, orders and settlement code are preserved. No
provider credentials were supplied or validated, and no financial/provider API
request, account registration, webhook registration or migration was performed.

## What is implemented

- `lib/server/pesapal-config.ts` checks configuration presence and syntax and
  reports variable names/reasons without values. `configurationReady` does not
  establish that credentials, an IPN ID or a callback URL actually work.
- `lib/server/pesapal.ts` supports `Auth/RequestToken` and authenticated
  `Transactions/GetTransactionStatus`. It does not implement
  `SubmitOrderRequest` or `RegisterIPN`.
- Both modules use Next's `server-only` import boundary. Keep successful private
  configuration and adapter instances out of serialized responses and logs.
- `verifyNotification(notification, binding)` takes a separately retrieved,
  durable server binding. A browser/IPN payload is not that binding. Unbound,
  mismatched, malformed and terminal/settled notifications produce no request.
- Verification requires a matching merchant reference, exact positive whole-KES
  ledger amount, `KES` currency and consistent documented status code/description.
  Completion also requires a bounded, safe confirmation code. Returned evidence
  omits provider payment accounts, contact data, tokens and raw errors.
- `0 / INVALID`, undocumented pending outcomes, inconsistent statuses and
  transport/protocol errors remain uncertain. `FAILED` and `REVERSED` are distinct
  outcomes, never completed payments. This module does not issue refunds.
- Tokens are request-instance memory only, coalesced during authentication,
  refreshed with a 30-second margin, and never reused beyond five minutes. The
  documented UTC expiry is required. A rejected token is discarded; no blind
  status retry occurs. All HTTP requests use a timeout, `no-store`, fixed provider
  origins and rejection of redirects. No external response bodies are logged.

`ok: true` means the status response was verified against the supplied binding.
It does **not** mean an order was settled, a receipt is valid, or fulfillment may
run without the durable conditional ledger transition described below. Repeated
notifications may repeat status reads while an order remains pending; in-memory
token coalescing is not payment idempotency.

## Server configuration to supply later

Store secrets only in the existing deployment's private server secret store.
Never use `NEXT_PUBLIC_` prefixes or commit `.env` values. Do not paste secrets
into logs, issue reports or this document.

| Pesapal variable | Meaning |
| --- | --- |
| `PESAPAL_ENV` | Explicit `sandbox` or `production`; no environment is inferred. |
| `PESAPAL_CONSUMER_KEY` | Merchant consumer key for the selected environment. |
| `PESAPAL_CONSUMER_SECRET` | Merchant consumer secret for that same environment. |
| `PESAPAL_NOTIFICATION_ID` | The GUID returned as `ipn_id` from the selected environment's registered IPN URL; later becomes `notification_id` in order submissions. |
| `PESAPAL_CALLBACK_URL` | Public HTTPS browser return endpoint, to be implemented before activation. No URL credentials or fragment. |
| `PESAPAL_IPN_URL` | Public HTTPS server notification endpoint, to be implemented and registered before activation. No URL credentials or fragment. |

All six variables are required by this preparation's configuration boundary.
Whitespace-only, padded and multiline values are rejected. Endpoint presence,
ownership, reachability, account approval, IPN registration and credential validity
are not inferred from a syntactically valid value. There is no activation flag.

The existing Daraja module uses these names, unchanged by this work:

| Daraja variable | Meaning/current behavior |
| --- | --- |
| `MPESA_CONSUMER_KEY` | Safaricom Daraja application consumer key. |
| `MPESA_CONSUMER_SECRET` | Matching Daraja consumer secret. |
| `MPESA_SHORTCODE` | Authorized business shortcode. |
| `MPESA_PASSKEY` | STK passkey for that shortcode/environment. |
| `MPESA_ENV` | `production` selects `https://api.safaricom.co.ke`; the existing code otherwise selects `https://sandbox.safaricom.co.ke`. Set it explicitly. |
| `MPESA_CALLBACK_URL` | STK callback HTTPS URL; the existing default is `https://urbangangtour.co.ke/api/mpesa/callback`. |

`mpesaConfigured()` currently checks the first four variables only; it does not
validate credentials or prove callback readiness. Configure the correct
Safaricom application/account and callback URL through its normal merchant
process. Existing `POST /api/mpesa/callback` treats notifications as signals and
uses authenticated STK query before its guarded ledger transition. This handoff
does not alter those routes or claim end-to-end Daraja acceptance. No live STK
test is part of this delivery.

## Official Pesapal contract checked

Retrieved on 28 October 2026 over ordinary certificate-verified HTTPS. No TLS
bypass, sample credential download or merchant API call was used.

| Environment | Fixed API base |
| --- | --- |
| Sandbox | `https://cybqa.pesapal.com/pesapalv3/api` |
| Production | `https://pay.pesapal.com/v3/api` |

Official sources:

- [Authentication](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/authentication): `POST Auth/RequestToken` with `consumer_key` and
  `consumer_secret`; response includes `token`, UTC `expiryDate`, `error` and
  `status`. The token is valid for a maximum five minutes and subsequent requests
  use `Authorization: Bearer ...`.
- [IPN registration](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/registeripnurl): `POST URLSetup/RegisterIPN` with `url` and
  `ipn_notification_type` (`GET` or `POST`); returned `ipn_id` is required for order
  submission. Registration is an external write and was not performed.
- [Order submission and notifications](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/submitorderrequest): `POST Transactions/SubmitOrderRequest`
  requires unique `id` (maximum 50 characters; alphanumeric, `-`, `_`, `.`, `:`),
  ISO `currency`, amount in currency units, description (maximum 100),
  `callback_url`, `notification_id` and billing address with phone and/or email.
  Response `order_tracking_id`, `merchant_reference` and `redirect_url` indicate
  order creation, not payment completion.
- [Transaction status and IPN response](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus): authenticated
  `GET Transactions/GetTransactionStatus?orderTrackingId=...` returns amount,
  currency, merchant reference, confirmation code and status. Documented codes
  are `0 INVALID`, `1 COMPLETED`, `2 FAILED`, `3 REVERSED`. An HTTP/API `200`
  alone is not payment completion.

The documented notification fields are `OrderTrackingId`,
`OrderMerchantReference` and `OrderNotificationType` (`CALLBACKURL` for browser
return or `IPNCHANGE` for an IPN). The documentation explicitly says callback/IPN
requests do not carry payment status and requires a status query. These sources
do not specify an HMAC/signature verification scheme; none has been invented.
Callback parameters, a source hostname, IP allowlisting or a browser return can
never constitute payment evidence.

## Concrete integration follow-up before enabling checkout

This is a bounded extension of the existing orders ledger, not a second ledger.
The existing `mpesa_ref` and `mpesa_checkout_attempts` are Daraja-specific; they
must not be repurposed for Pesapal. No schema described here has been applied.

1. Add a reviewed durable Pesapal attempt binding linked to `orders.id`, including
   a unique merchant reference, unique provider tracking GUID, immutable
   server-priced positive whole-KES total/currency, request hash/idempotency key,
   initiation state and single-winner claim/nonce. A proposed
   `pesapal_checkout_attempts` table can follow the existing Daraja durable-claim
   model. Persist the original provider reference and order association together.
   A timeout after submission remains unknown; never blindly submit another
   charge request. Do not hold a database transaction open during provider I/O.
2. Coordinate an existing orders checkout extension (or a bounded
   `POST /api/orders/pesapal`) with the commerce owner. Preserve server prices,
   variants, stock/reservations, authentication/ownership, rate limits and
   idempotency. Use only the documented submission schema and bind the returned
   merchant reference/tracking ID before exposing a validated HTTPS provider
   redirect. Validate redirect origin against the selected Pesapal environment;
   an accepted submission still displays pending payment.
3. Implement a bounded, rate-limited `GET/POST /api/pesapal/ipn` and browser return
   `GET /api/pesapal/return` (proposed paths, **not deployed routes**). Require the
   stored tracking/reference pair before provider work; normalize only the
   documented notification fields. Unknown/settled records do not trigger
   provider calls. The server loads a real binding and invokes the adapter.
   Customer return redirects to the existing order status flow and cannot mark
   anything paid. Preserve private order ownership/bearer-reference rules.
4. For matching authenticated completion, atomically update the existing order
   only from `pending`, `unknown` or `reconciling`, while the attempt tracking ID,
   merchant reference, amount/currency and order relationship still match.
   Fulfillment runs only for the conditional-write winner through existing
   reservation, ticket, merchandise, receipt and notification mechanisms. Include
   durable retry/recovery for a crash after settlement but before these effects;
   every effect must retain its existing idempotency. Already settled,
   failed/refunded or conflicting records never reopen.
5. Add Pesapal to existing reconciliation by the same stored binding. Uncertainty
   stays pending/reconciling. Failure does not pretend payment occurred; reversal
   needs the existing reviewed refund/accounting workflow, never an invented
   automatic refund. Callbacks and reconciliation must share settlement logic.
6. After the reviewed routes exist, an operator registers the correct environment's
   IPN URL as `POST` (or deliberately supported `GET`) with `RegisterIPN`, stores
   returned `ipn_id` as `PESAPAL_NOTIFICATION_ID`, and confirms the registered URL
   matches `PESAPAL_IPN_URL`. Future IPN processing must implement the documented
   acknowledgement shape, including `orderNotificationType`, `orderTrackingId`,
   `orderMerchantReference` and numeric `status` (`200` received/processed; `500`
   processing problem). A browser return is a customer page/redirect, not this
   acknowledgement JSON. Define durable processing before acknowledging success.
7. Run the acceptance cases below with mocked provider HTTP and a real local
   transaction fixture. Only then consider enabling a configured provider. Sandbox
   merchant validation and later production activation need their own explicit
   operational authorization; this preparation performs neither.

## Required acceptance evidence for the follow-up

- Missing/invalid configuration cannot expose a working checkout option or make
  provider calls. Tokens expire/refetch correctly without leaking values.
- Unbound/forged callback IDs cannot query arbitrary transactions or settle an
  order. Amount, currency, merchant reference, tracking/order binding and status
  inconsistencies never produce paid status, receipt, tickets or inventory work.
- Pending/invalid/unavailable provider outcomes remain recoverable; submission
  timeouts cannot cause duplicate charges. Browser success URLs prove nothing.
- Simultaneous/replayed IPNs and reconciliation produce one guarded settlement;
  final/refunded states never reopen. Verify against the real local transaction
  boundary, not a mock settlement function.
- A crash between settlement and each fulfillment effect is recoverable without
  duplicate tickets, merchandise effects, receipts or customer messages.
- Auth/ownership, callback body limits/rate limits, trusted redirect checks and
  private data redaction pass. No secret appears in client assets/logs/responses.
- Full tests/types/lint/Cloudflare build and local Worker checkout/status checks
  pass. Production money acceptance remains unproven until a separately authorized
  provider/merchant acceptance process has actually completed.
