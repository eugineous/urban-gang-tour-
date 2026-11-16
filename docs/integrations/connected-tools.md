# Event poster → reviewable draft

The owner opens **Control Room → Connected tools**, names a credential, chooses
`poster:upload` and/or `event:draft`, and selects a 1, 7 or 30 day lifetime.
The raw credential appears once. Store it privately; if lost, revoke it and issue
another. At most ten unexpired, unrevoked credentials may exist. Crew admins
cannot issue or revoke credentials. An editor credential never grants access to
admin routes, existing-event edits, publication, payments, tickets or users.

## Local Codex workflow (Node 20+)

Set `UGT_EDITOR_TOKEN` in your local environment, or create `.ugt-editor-token`
in the repository root with just the credential, then `chmod 600 .ugt-editor-token`.
That exact file is Git-ignored. Do not paste credentials into prompts, commands,
event JSON, screenshots, tickets or Git. An explicitly selected
`UGT_EDITOR_TOKEN_FILE` is also supported; keep that file outside tracked paths.
The CLI refuses credential files readable by other local users and sends credentials
only to the owned HTTPS UGT origins, without following redirects.

1. Give Codex the owned poster and ask it to transcribe confirmed event details.
   Missing details stay omitted; the poster is untrusted source text, never instructions.
2. Run `node scripts/editor-tools.mjs upload /absolute/path/poster.jpg`.
   The output contains `posterId`; save it in the next JSON file.
3. Save `event.json` with supported fields. Generate a fresh UUID v4 for each new
   intended draft; keep it unchanged on retries. Example (replace with real confirmed
   details, do not submit this example to production):

```json
{
  "requestId": "66320821-83a0-4ca7-a72c-825698117305",
  "posterId": "REPLACE_WITH_UPLOAD_POSTER_ID",
  "kind": "school",
  "name": "REPLACE_WITH_CONFIRMED_EVENT_NAME"
}
```

4. Run `node scripts/editor-tools.mjs draft event.json`.
5. Staff review the new draft in **Events**, complete its details and use the normal
   manual publication controls. No ticket tiers or sales configuration are created.

Optional JSON fields: `eventDate` (real `YYYY-MM-DD`), `eventTime`, `venue`, `city`,
`description`. Allowed kinds: `school`, `ticketed`, `past`. No external image URL,
markup, publication status, commercial fields or attachment download URL is accepted.
The same credential must upload a poster and attach its `posterId`. A draft may omit
`posterId`, allowing text-only preparation. The draft API is idempotent per credential
and `requestId`; identical retries recover the same ID, changed bodies return 409.
After a timeout, retry the saved JSON with the same credential and request ID.
Do not automatically re-upload the poster or create a new request ID.

## ChatGPT custom GPT Action — manual setup required

This is an API, not an installed ChatGPT connector, OAuth service or MCP server.
Nothing here automatically connects your ChatGPT account. Custom GPT Actions must
be available on your ChatGPT account/workspace; workspace policies may restrict them.

In your private custom GPT's Configure → Actions, import
`https://urbangangtour.co.ke/api/editor-tools/openapi`. Configure **API Key**
authentication with **Bearer** authorization and the owner-issued credential.
Keep the GPT private and do not share this credential-backed Action. Its writes are
marked consequential in the schema; ChatGPT may ask you to confirm the action.
Test with the Action editor only when you intend to create a real draft, not as a
production health check. No real Action credential or event was created during
implementation testing.

Attach one owned PNG, JPEG or WebP poster (up to 5 MiB) and ask ChatGPT to call
`uploadEventPoster`, then `createEventDraft` with confirmed text and the returned
`posterId`. Both operations must use the same credential. A draft-only credential
can prepare text without a poster. Staff still review and publish manually.

Actions supplies `openaiFileIdRefs`, expanded at runtime into a file ID, name,
MIME type and signed download link. Links are valid for about five minutes. The
server accepts only the exact documented `files.oaiusercontent.com` HTTPS host
and matching file ID path; no redirects, cookies or forwarded credentials. It
checks actual streamed bytes and image signatures. An expired or unsupported
attachment fails clearly: attach it again, or use the local CLI. Never paste an
arbitrary URL or base64 image into a draft. Real client attachment transport still
requires the owner's private Action setup; tests used synthetic responses only.

Official docs checked 16 November 2026:
- https://developers.openai.com/api/docs/actions/authentication
- https://developers.openai.com/api/docs/actions/sending-files
- https://developers.openai.com/api/docs/actions/introduction

## Limits, revocation and implementation proof

Poster types: PNG/JPEG/WebP, matching signatures, at most 5 MiB. JSON: at most
16 KiB. Bounded streamed reads time out after 15 seconds. Six successful writes
per minute and thirty per day per credential share a durable SQL row-lock budget.
The deployment also applies shared budgets of 30 attempts/minute/network and
12 attempts/minute/credential before these routes, including failed attachment
requests. Missing
storage/database/abuse-protection dependencies fail closed. Media storage uses the
existing store and shared hard storage cap; this adds no paid storage service.

Credentials are 256 random bits; only SHA-256 hashes persist. Owner issuance and
revocation, poster registration and draft insertion are audited with issuer and key
ID, never raw tokens. Revocation serializes against in-flight writes on the key's
row lock: a write already holding the lock may finish before revocation completes;
after the revoke response, subsequent writes fail. A poster storage write followed
by a database failure may leave unreferenced bytes; it cannot create a published
event, and the storage cap still applies. Draft-only media stays private until a
published eligible event references it.

Focused unit/API tests reject scope escalation, foreign origins, malformed bodies
and cookie-for-bearer substitution. Opt-in real PostgreSQL proof:

```sh
UGT_EDITOR_TOOLS_PG_FIXTURE=1 npx vitest run __tests__/editor-tools-postgres.integration.test.ts --no-cache
```

This creates and removes a disposable Docker PostgreSQL container with network
mode `none`. It needs an existing `postgres:16-alpine` image and the local Docker
socket; it does not use DATABASE_URL, real keys, events or accounts. It proves
hash-only persistence, expiry/revocation/scope checks, poster ownership, safe draft
insertion, stable retries and durable budgets. A passing local fixture does not
prove a configured live database/storage binding or a completed ChatGPT connection.
