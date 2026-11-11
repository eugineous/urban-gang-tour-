# Bounded account history and page exports

`GET /api/account` remains buyer-only: a current persisted buyer session and
existing profile are required. Every history query uses that buyer's `user.id`.
Guest purchases remain unclaimed. Ticket entitlement continues to exclude voided,
fully refunded and unallocated legacy partial-refund tickets.

Accepted query parameters are independent `orderCursor`, `ticketCursor` and
`requestCursor`, plus optional `download=1`. Unknown parameters, duplicates and
invalid cursors return HTTP 400. Cursors are canonical unpadded base64url JSON
`{"createdAt":"2026-11-10 12:00:00.123456+00","id":"ORDER-006"}` with validated
calendar dates, time zones, identifiers and a 512-character token bound. Cursors
are positions, never authorization. SQL binds every value as a parameter.

Responses preserve `{profile, orders, tickets, requests}` and add:

```ts
pagination: {
  exportScope: 'page',
  current: '/account?...',
  download: '/api/account?...&download=1',
  orders: {limit: 30, currentCursor, nextCursor, current, first, next},
  tickets: {limit: 200, currentCursor, nextCursor, current, first, next},
  requests: {limit: 20, currentCursor, nextCursor, current, first, next}
}
```

`currentCursor`, `nextCursor` and `next` are null when absent. `current`, `first`
and `next` are generated relative `/account` links; each stream preserves the
other two positions. `first` clears only its stream. There is no arbitrary page
size, OFFSET or COUNT query. Each query fetches one sentinel row above its fixed
page size, then removes that row from the response. Sorting and continuation use
`(created_at, id)` for orders/requests and `(created_at, code)` for tickets,
descending in both fields. SQL returns `created_at::text` so cursor construction
does not round away PostgreSQL microseconds.

`download=1` returns exactly the same bounded page as JSON with filename
`urban-gang-account-page.json` and its continuation links. It is not a complete
account export. Both ordinary and downloadable history responses use
`Cache-Control: private, no-store`.

## AccountApp integration (owned by the coordinating change)

```tsx
import AccountPurchases from './AccountPurchases';
import {accountCursorQuery} from '@/lib/server/account-pagination';

// Within the wallet effect, before fetchWithTimeout:
let query: string;
try {
  query = accountCursorQuery(new URLSearchParams(window.location.search));
} catch {
  setWalletError({key:'copy.your_purchases_could_not_load_please_try_again'});
  return;
}
fetchWithTimeout('/api/account' + (query ? '?' + query : ''), {
  signal: controller.signal,
}) // retain existing response/session/error handling

// Replace the old purchases card:
<AccountPurchases
  wallet={wallet}
  errorText={walletError ? t(walletError.key,walletError.values) : undefined}
  onRetry={() => {setWalletError(null);setProbe(probe+1)}}
/>
```

Remove the old privacy-section export link and `wallet.requests.map` because
the new component presents truthful page exports and the separate request list.
Keep the existing deletion form. `accountCursorQuery` forwards only validated
cursor keys; reset credentials, modes and arbitrary query inputs are excluded.

The stateless component uses existing account status messages, a complete
six-language additions catalogue, separate actual ticket rows, ordinary links,
44px controls and 16px body/control text. It introduces no motion.

## Focused verification

RED: the new real-PostgreSQL route tests failed because the old API returned 39
orders instead of 30 and accepted malformed cursors with HTTP 200.

GREEN: run the scoped tests, using only a disposable PostgreSQL container with
`--network none` (no live customer database, providers or messages):

```sh
UGT_ACCOUNT_HISTORY_PG_FIXTURE=1 ./node_modules/.bin/vitest run --no-cache \
  __tests__/account-history-postgres.integration.test.ts \
  __tests__/account-pagination.test.ts __tests__/account-purchases.test.ts
```

The coordinating agent owns combined type/lint/test/build checks and release.
