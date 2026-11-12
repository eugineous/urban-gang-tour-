# Optional native passkeys: integration and evidence

Verified locally on 11 November 2026; handoff completed 12 November 2026.
Worktree: `/workspace/ugt-passkeys-completion-20261111`, branch
`codex/passkeys-completion-20261111`, implementation baseline `1782934`.

## Integration

The root release owns `AccountApp`, email verification, recovery, shared Worker
guards and dependency manifests. This change edits none of those existing files.
Dependencies already installed by the root: `@simplewebauthn/server` 14.1.0 and
`@simplewebauthn/browser` 14.0.0. Verification used Node 24.19.0 and Chromium.
The root must retain these exact dependencies in its release manifest/lockfile.

Import `PasskeySignIn` and `PasskeyManager` from
`app/account/PasskeyControls.tsx`. Render
`<PasskeySignIn onSuccess={({user}) => setUser(user)} />` in the logged-out login
view beside the optional Google control. Render
`<PasskeyManager verified={persistedEmailIsVerified} />` below the signed-in
email-verification card. Its verified prop controls the interface only; the
server independently reads persisted verification. Sign-in returns the existing
buyer profile shape `{id,email,phone,name}`. Password login stays available.
The manager loads actual key metadata, verifies the current password for adding
and revoking, and reports success only after the server accepts the operation.
Both controls require explicit interaction and prevent duplicate pending actions.
The scoped catalogue supplies English, Kiswahili, French, Simplified Chinese,
Russian and Spanish. CSS uses existing magenta/neutral tokens, 16px inputs and
44px minimum controls.

## API contract

Endpoint: `/api/account/passkeys`. All responses have
`Cache-Control: private, no-store`. Every POST requires both `requireOrigin`
and an exact allowlisted Origin: `https://urbangangtour.co.ke` or
`https://www.urbangangtour.co.ke`. RP ID is exactly `urbangangtour.co.ke`.
The body is an object streamed through `readJsonObject` with a 65,536-byte limit;
unknown action fields are rejected. Credential IDs are canonical base64url,
16–1024 characters. Errors contain sanitized codes only.

| Method/action | Fields beyond action | Authorization and result |
| --- | --- | --- |
| GET | none | Active persisted buyer; `{ok:true,passkeys:[{id,created_at,last_used_at}]}` for that account only. |
| POST `register-options` | `password` | Active persisted buyer, current password and verified email; `{ok:true,options}`. |
| POST `register-finish` | `challenge`, `credential` | Same signed buyer/session version, unexpired owner-bound challenge, actual verifier; `{ok:true}`. |
| POST `login-options` | none | Anonymous discoverable login, no email/phone lookup or enumeration; `{ok:true,options}`. |
| POST `login-finish` | `challenge`, `credential` | Owner-bound challenge, active stored key, matching opaque user handle, verified email and valid signed assertion; `{ok:true,user}` plus existing `ugt_user` session cookie. |
| POST `revoke` | `id`, `password` | Active persisted buyer and current password; scoped active-key update, `{ok:true}`. |

Options set a fresh random `ugt_passkey_owner` cookie with `HttpOnly; Secure;
SameSite=Strict; Path=/api/account/passkeys; Max-Age=300`. Only its SHA-256 hash
is stored. Registration challenges also bind user ID and signed session version;
login challenges are anonymous. Both last five minutes and are consumed atomically
with successful credential insertion or counter update. No challenge plaintext,
public key or counter appears in the GET result. Registration requests resident
credentials and required user verification, no attestation, and ES256/RSA
algorithms `[-7,-257]`. Both callbacks enforce RP, exact allowed origin,
challenge and verification with the maintained library. Login checks the actual
user handle and accepts synced zero counters while rejecting positive regressions.

The route has a 120/minute network backstop, 8/minute password budgets by
validated signed buyer, and 8/minute assertion budgets by credential ID. It does
not introduce an 8/IP carrier lockout. The root shared Worker guard remains the
outer network/identity enforcement layer.

Typical failures: 400 invalid input, 401 authentication/challenge failure,
403 missing verified email or invalid Origin, 404 unavailable owned key,
409 capacity/credential conflict, 413 oversized body, 429 budget exceeded,
503 unavailable persistence/service. Responses expose no verifier exception text.

## Schema and password reset

Call exported `ensureCustomerPasskeySchema()` from
`lib/server/customer-passkeys.ts` before a reset transaction uses these tables.
It performs additive static DDL through `qSchema`, including
`users.session_version` and nullable `users.email_verified_at`, and creates:

- `customer_passkey_accounts`: `user_id INTEGER PRIMARY KEY REFERENCES users(id)`,
  `handle TEXT NOT NULL UNIQUE`, an opaque stored random 32-byte base64url handle.
- `customer_passkeys`: `id TEXT PRIMARY KEY`, `user_id INTEGER REFERENCES users(id)`,
  `public_key TEXT` (base64url), `counter BIGINT`, `slot INTEGER` constrained 1–10,
  `transports JSONB`, `created_at`, `last_used_at`, `revoked_at`.
  A partial unique `(user_id,slot)` index limits active keys. Global credential ID
  uniqueness persists after revocation; an existing key is never reassigned.
- `customer_passkey_challenges`: `hash TEXT PRIMARY KEY`, `owner_hash TEXT`,
  `kind TEXT` (`register`/`login`), nullable `user_id`/`session_version`, `expires_at`.
  Registration requires the user/version columns; login requires them null.
  Expiry and user indexes support lookup and revocation. Bounded cleanup removes
  only expired challenge rows.

The root must include these statements in the **same transaction** that updates
the password, increments session version and consumes the reset token:

```sql
UPDATE customer_passkeys SET revoked_at=now()
WHERE user_id=$1 AND revoked_at IS NULL;
DELETE FROM customer_passkey_challenges WHERE user_id=$1;
```

Lock the user row before related challenge/credential rows. Callback transactions
do a cheap nonlocking owner/challenge precheck, then lock user → challenge → key
and recheck current account state. This avoids the inverse lock ordering with
reset/revocation. Preserve `customer_passkey_accounts.handle` through recovery.
Anonymous login challenges cannot identify a resetting account, but its revoked
credentials fail callback lookup. A passkey login cookie is minted after commit
using `signToken`/`sessionCookie` and the current persisted session version.

## Focused verification

Initial RED on 11 November: the PostgreSQL/crypto suite failed with the explicit
assertion `passkey endpoint must exist: expected null not to be null`. The UI
suite independently failed for missing controls and catalogue before they were
implemented. No verifier was mocked to return success.

Final GREEN, started 11 November 08:14:53 UTC:

```sh
npx vitest run __tests__/customer-passkeys-postgres.integration.test.ts __tests__/customer-passkeys-ui.test.ts __tests__/customer-passkeys-browser.test.ts --no-cache --maxWorkers=1 --minWorkers=1 --testTimeout=30000 --hookTimeout=30000
npx tsc --project __tests__/tsconfig.passkeys.json --noEmit --pretty false
npx eslint lib/server/customer-passkeys.ts app/api/account/passkeys/route.ts app/account/PasskeyControls.tsx ui/i18n/catalogues/passkeys.ts __tests__/customer-passkeys-postgres.integration.test.ts __tests__/customer-passkeys-ui.test.ts __tests__/customer-passkeys-browser.test.ts
```

All commands exited 0: 3 test files, 16 tests (11 real PostgreSQL/crypto,
3 browser-interaction, 2 SSR/catalogue); types and lint produced no diagnostics.
Vitest emitted its existing Vite CJS API deprecation notice.

The crypto suite uses a newly created disposable `postgres:16-alpine` container
with `--network none`, plus Chromium CDP's virtual resident authenticator.
Every browser request to the fake canonical HTTPS origin is intercepted locally;
the real website is never contacted. Actual `@simplewebauthn/browser` credentials
reach the actual server verifier and PostgreSQL. Coverage includes valid
registration/login, private key listing, password/verification/session/Origin
gates, cross-owner and replay rejection, expired login challenges, one concurrent
winner, revoked credentials, global ID conflicts, ten active slots, stable opaque
handles, bounded input, and signed UV-off/wrong-origin/counter-regression cases.
Negative signed fixtures are independently verified with only their deliberately
altered policy relaxed, proving the signature is valid before production rejects
the policy violation. CDP starts at counter 1, so the synced fixture initializes
the disposable stored counter to 0 and re-signs real assertions with the synthetic
fixture key. Synthetic private keys are never logged or saved.

Browser interaction tests cover no automatic options request, unsupported-device
password fallback, duplicate gestures, cancellation, a real registration followed
by server rejection without a fake success, and narrow-screen overflow. These UI
tests use explicit API response fixtures; cryptographic authority is covered in
the separate real verifier/database suite. SSR checks protect unverified-email
controls and completeness of all six native catalogues.

Intermediate fixture-only failures were corrected: initial PostgreSQL readiness
can throw until startup completes; an existing excluded virtual authenticator
cannot create a second key without simulating another device; standalone browser
bundling needs Next's process shim; and CDP registers at counter 1. Disk/daemon
pressure also caused a Docker startup timeout. Its exact newly created fixture
was removed. The final successful fixture was stopped and removed. Unknown and
historical containers were not changed. No live accounts, provider calls,
messages, secrets, gates, settings, billing, push, PR or deployment were used.

The full application suite/build and integrated account/recovery release review
remain with the root agent under the coordinated release instruction.
