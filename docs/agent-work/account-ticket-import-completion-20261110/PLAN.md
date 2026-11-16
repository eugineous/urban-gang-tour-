# Account, ticket and import completion

Goal: close the documented loose ends while preserving existing accounts,
financial truth, public brand and publication rights. Owner says finish them;
the standing consolidated directive explicitly rejects repeated approval loops.
Execution is inline, test-first, with one independent final branch review.

## Design and constraints

- Keep guest ticket links first. Never claim accounts by matching unverified
  contact strings, names or IP. Stable users.id remains the account identity.
- Normalize Kenyan phone inputs, reserve new normalized identifiers with a
  database uniqueness boundary, and leave legacy ambiguous records intact.
- Add authenticated email ownership verification with hashed expiring one-use
  tokens and bound destination/user. Recovery proves email control and revokes
  old sessions; new passwords use the same minimum. Phone-only users can add a
  verified recovery email or retain one-use recovery credentials; never pretend
  an unconfigured SMS provider can verify a phone number.
- Optional passkeys must use a maintained WebAuthn verifier with exact RP/origin,
  user-verification, one-use challenges and protected registration/deletion.
- Guest order attachment requires a valid private order capability plus account
  authentication; never steals an already-claimed order or changes payment state.
- History is paged with stable cursors. Downloads are bounded pages rather than
  unlimited synchronous data; no new fake async queue or unbounded export claim.
- Shared rate controls add normalized-identity budgets while retaining network
  protection. Any higher shared-network allowance must still bound credential
  guesses for one identity; no cookie-based bypass or plain identifiers in keys.
- Ticket sales stay closed until real isolated SQL/fake-provider acceptance of
  capacity, duplicate/late callbacks, receipt/QR and refund/scan invariants.
- Instagram uses the same gallery catalogue. Preserve original captions and
  deduplication, owner-only source/rights/publication gates, never bypass logins
  or rate limits. Website video storage must really be configured before claiming
  migration. R2 activation/billing and deployment-secret repair need owner setup.
- No production financial/account-creation/message tests, credential changes,
  destructive migrations or mass record merging. Normal PR/keep-vars deployment.

## Dependency-ordered work

1. Reproduce and repair the46 red regressions: correct real semantic H1 bug;
   update obsolete palette/payment-copy checks; repair document-less hook fixture
   without removing behavioral payment assertions. Files: homepage/hero, affected
   eight tests. Run those focused tests before/after; do not mask failures.
2. Account identifiers/passwords/proof: shared normalization and schema, native
   auth, verification/recovery endpoints and compact account controls. Tests:
   normalization/malformed cases, duplicate concurrent inserts, ambiguous legacy
   phones, token expiry/replay/cross-user use, revoked sessions, provider failure.
3. Account history and safe guest-order attachment: customer-account queries,
   account API/UI, capability access helper. Tests: auth, pagination boundaries,
   stable ordering, bounded downloads, wrong capability and already-owned order.
4. Passkeys/abuse controls: exact-origin verified WebAuthn, no trusting browser
   success; shared identity+network budgets. Tests: origin/challenge/UV/replay,
   credential ownership, invalid payloads, distributed credential limits.
5. Ticket acceptance: run disposable network-none SQL fixtures, repair actual
   invariants found; retain sales gate if provider-specific launch proof missing.
6. Instagram import/storage: prove source/dispatch/storage separately, fix owned
   URL handling and actionable admin states, implement only verified storage
   configuration. Report operator dependencies instead of declaring them done.
7. Integration: one full suite, lint/types/build/built-browser checks, independent
   review and one correction pass, normal PR/keep-vars release; live read-only
   checks with binding/cron comparison. Record any unresolved blocker precisely.

Each task follows observed RED → minimal fix → focused GREEN. Logs live in
/workspace/artifacts/ugt-full-audit-20261103/completion-*. Later interfaces are
refined against source before implementation, not invented provider protocols.

## Review focus

Shared phone/email variants and concurrent signup; legacy accounts lacking proof;
stolen/replayed verification and order capabilities; shared-carrier NAT budgets;
provider/storage uncertainty without duplicate charges or false published state.

## Progress

- Base:178293478ee33de7d6ff5cdac2a8f817c7a85fca; clean feature branch.
- Ruling: delegated Astra/Flash routing resources unavailable; implement inline,
  no claim of verified worker routing. Owner's no-loop directive overrides plan
  approval rituals, not security/production authority boundaries.
- Tasks1–5 implemented, integrated and independently reviewed. Real isolated SQL,
  actual Chromium WebAuthn and signed negative fixtures prove critical boundaries.
  The review's ticket lock inversion was reproduced then corrected; all44 owned
  ticket SQL cases pass. The separate production ticket launch flag remains off.
- Task6: owned public /p and /reel normalization repaired. Existing archive and
  publication choices preserved. Storage migration remains blocked; user now
  requests an R2 alternative. Supabase$0 dedicated-project organization choice
  is pending. Discovery coverage/admin dispatch remain separate setup concerns.
- Task7: types, lint, Next/OpenNext build, keep-vars dry run and12 built-browser
  views pass. Final release-source suite passes2619 tests in305 files, with262
  environment-specific cases skipped. Normal PR merge, deployment and live
  settings comparison follow; actual release IDs are recorded on the PR.
