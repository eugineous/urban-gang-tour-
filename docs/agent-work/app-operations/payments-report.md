# Task 5 — Payment readiness and Pesapal preparation

Status: adapter/configuration preparation delivered; Pesapal checkout remains
unavailable. No credential or money-acceptance claim. This uses the plan's
explicit disabled-adapter fallback because durable Pesapal initiation/binding,
settlement and reconciliation entrypoints are not yet implemented.

## Changed paths

- `lib/server/pesapal-config.ts` — server-only configuration validation, fixed
  sandbox/production origins and value-free readiness diagnostics. Explicit
  configuration is required and `checkoutEnabled` remains false even when all
  six variables have valid syntax.
- `lib/server/pesapal.ts` — server-only token/status adapter; authenticated
  provider lookup against a separately stored order binding. No submission,
  registration, route, database access, settlement or fulfillment capability.
- `__tests__/pesapal-readiness.test.ts` — missing/invalid configuration,
  secret-free diagnostics and disabled configured checkout (9 cases).
- `__tests__/pesapal-adapter.test.ts` — actual adapter with mocked HTTP only:
  auth payload/fixed endpoint, expiry/refresh/rejected tokens, unbound/forged
  callback rejection, settled/terminal replay rejection, exact amount/currency/
  reference checks, uncertain outcomes, consistent completion/failure/reversal,
  concurrent authentication and private-error redaction (44 cases).
- `docs/payments-provider-handoff.md` — exact Pesapal/Daraja environment names,
  official API3 sources, callback/IPN contract, unavailable capabilities and
  concrete durable integration/activation acceptance requirements.
- This report.

## Evidence

Official documentation was fetched with normal certificate-verified `curl`
HTTPS on 28 October 2026: authentication, IPN registration, order submission and
transaction status pages under
`https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/`.
No TLS bypass or merchant API/registration call occurred. Documentation says
notifications carry identifiers only and require authenticated status lookup;
no callback signature algorithm was invented.

TDD RED: readiness tests failed before the missing module existed (9 failures);
adapter tests failed on the absent authenticated adapter boundary (44 failures).
The initial named behavior failure was `the authenticated provider boundary must
exist: expected undefined to be type of 'function'`. Subsequent implementation
and test cleanup produced GREEN.

Focused verification, most recent run 28 October 2026:

```
npx vitest run --no-cache __tests__/pesapal-adapter.test.ts __tests__/pesapal-readiness.test.ts --maxWorkers=1 --minWorkers=1
```

Result: 2 files passed, 53 tests passed; exit 0. The pre-existing Vite CJS Node
API deprecation warning remains. No test made real HTTP calls to Pesapal.

```
npx eslint lib/server/pesapal.ts lib/server/pesapal-config.ts __tests__/pesapal-adapter.test.ts __tests__/pesapal-readiness.test.ts
```

Result: no diagnostics; exit 0. Full suite/types/Cloudflare build are intentionally
left for the parent agent's single combined integration check, as assigned.

## Preserved boundaries and remaining work

No existing Daraja, Paystack, Stripe, ledger, checkout, receipt, reconciliation,
operations route or UI file was edited. No provider option/button was added.
No secrets were read, supplied, logged or committed. No live financial request,
test STK, message, provider registration, webhook, migration or commit occurred.

The parent agent was notified that integration requires a durable Pesapal attempt
bound to the existing order ledger (immutable merchant reference, unique tracking
ID, amount/currency, idempotency hash and claim), plus bounded initiation/IPN/
return entrypoints and conditional shared settlement/reconciliation. The handoff
specifies exact proposed paths and acceptance cases; none are represented as
deployed. In-memory token coalescing is not durable payment idempotency, and
returned completed evidence does not itself settle or fulfill any order.

Owner-supplied environment-matched credentials, reviewed durable integration,
registered reachable callback/IPN routes, offline transaction-boundary acceptance
tests and separately authorized merchant validation remain prerequisites to
future activation. Daraja environment/callback instructions are documented from
the unchanged implementation; its credential validity and live acceptance have
not been checked.
