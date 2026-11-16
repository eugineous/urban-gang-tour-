# Completion checkpoint — 16 November 2026

## Current release integration

- HEAD7038f0c includes accepted history5d5b2fb, claim UId7ea233,
  passkeys1ccb175 and owned-ticket7038f0c bundles. Root identity/recovery/UI,
  regression repairs and API contracts remain uncommitted pending release.
- Account security is integrated: verified email, optional native passkeys,
  safe guest-order claim, independently paginated history and bounded exports.
  Password reset commits encrypted delivery before acknowledgement and atomically
  consumes the token, increments sessions and revokes passkeys/challenges while
  preserving the permanent account handle. Recovery shared/local budgets align.
- First full integration run:2626 passed/250 skipped/4 failed. All four focused
  corrections now pass54 tests: two real-SQL/WebAuthn cases needed a realistic
  per-test contention budget; multilingual checkout click needed15s browser
  timeout; wallet fixture needed new verification/passkey GET responses.
  Second full run:2629 passed/251 skipped, one Android eight-browser-launch case
  exceeded30s under simultaneous build/SQL load. Budget is now60s; the same
  assertions pass in20.9s on focused rerun. No production layout code changed.
  Final source run completion-release-suite.log passes:305 files/2619 tests,
  16 files/262 environment-specific cases skipped, no failures, exit0.
  Passkey real-SQL suite now explicitly opts in with
  UGT_CUSTOMER_PASSKEY_PG_FIXTURE=1, matching the other isolated SQL suites;
  all11 cases already passed in the actual full run, with real browser signatures.
- Independent read-only reviewer completed the entire tracked/untracked range.
  No Critical; one Important lock inversion between stale ticket send retry and
  provider authorization persistence. Real synchronized SQL reproduced PostgreSQL
  deadlock in completion-ticket-lock-red.log. Claim now filters state='prepared'
  before locking the attempt. All44 owned-ticket SQL cases passed, no skips,
  in completion-ticket-final-sql-green.log (independent network-none sessions).
  Minor event checkout M-Pesa wording corrected to match requested provider rails.
- Real workerd AES-GCM/password hashing/WebAuthn-option probe passes. Persistent
  SQLite limiter proves5/20 concurrent credential admissions, counter survives
  runtime restart and2000 venue requests accepted. This is limiter-only evidence,
  not whole-app or million-customer capacity certification. Types pass; scoped
  lint0 errors/139 warnings. Production Next/OpenNext build and keep-vars dry run
  pass. Built-browser nine guest/login/signup views and three fictional signed-in
  account-security views pass320/390/1440, no overflow/browser errors/live writes.
- Release marker:account-ticket-reliability-20261112-v1. Release candidate checks
  pass; normal PR merge/CLI keep-vars deployment and live checks follow this
  checkpoint. Actual deployment IDs/evidence belong to the release PR record.
- Cloudflare settings baseline captured:55 bindings, cron */15 * * * *.
  No PAYSTACK_TICKETS_ENABLED activation, provider/credential/billing change,
  real order/account/message/financial test or historical record merge.
- R2 read again returnsCF10042, enable in dashboard. User now requests another
  storage service. Supabase discovery found only two inactive unrelated projects;
  new dedicated project quoted$0/month in Eugine Micah Website. Organization
  choice requested because create_project requires it. Do not reuse unrelated
  projects or claim a destination/migration exists before setup and real proof.
- Instagram /p and /reel normalization repair remains owner-verified. Existing
  GitHub archive/schedule/publication choices preserved. Bulk logged-out discovery
  coverage and admin dispatch token remain independent blockers, even if storage
  is replaced. Specific public retrieval succeeded previously; no login bypass.

Review rulings: production merchant/webhook acceptance remains outside authorized
test scope and ticket launch stays closed. Production schema/release checks are
root's responsibility. Million-user capacity is unproven. Media setup is a real
operator dependency; preserve existing archive and publication gates.

The notes below describe the earlier implementation checkpoint and are superseded
by this section where they differ.

Root repo:/workspace/ugt-main-release-20261012
Branch:codex/account-ticket-import-completion-20261110; base1782934.
Latest local commit5d5b2fb is accepted history bundle cherry-picked from4cadfa7.
Other root changes are UNCOMMITTED. Production remains PR132, guest ticket UI.

## Implemented locally, not deployed

-46 regressions reproduced.37 checkout hook failures repaired by supplying its
  document EventTarget fixture; old card-only copy/palette assertions corrected.
  Actual dual-H1 fixed: mobile visual h2 aria-level1, same styling/data selector;
  desktop keeps nativeH1. Mobile screen-only overrides fixed. FAQ test now scopes
  inert restriction to FAQ, not intentional duplicated decorative video strip.
- Newlib/shared/customer-identity.ts normalizes Kenyan phone variants and email,
  never Gmail aliases. Newlib/server/customer-identity.ts installs nonunique
  canonical lookup indexes plus transactionally locked INSERT/UPDATE trigger
  rejecting new collisions while preserving historical rows. qSchema now accepts
  static SQL arrays to keep PL/pgSQL bodies intact within locked transaction.
- Native auth normalizes inputs, requires8 chars for signup, preserves6-char
  legacy logins/exact old phone when canonical collisions exist, catches23505.
- Email verification:8-digit codes,15min expiry,5 guesses,1min persisted cooldown,
  HMAC proof, encrypted AES-GCM queued payload, idempotent provider retries/leases.
  app/api/account/verification GET/POST requires active buyer; send requires
  current password and cannot replace existing email; phone-only can add first
  recovery email after proof. API never returns raw code. Existing email cron
  processes security jobs independently from receipt/contact queues.
- AccountSecurity component/native6locale messages/scoped compact CSS implemented
  and inserted in AccountApp. Browser proves explicit send/confirm and retention
  after invalid code. Native signupUImin8 andnew8-character localized error.
- Google cannot silently link unverified native email; unique row and proof
  required before minting user cookie. Fallback UI still says use password/help.
- Shared guard native network budget120 plus normalized-identity8 (recovery5)
  across IPs; signed subject for verification/passkey guarded paths, no device
  cookie authority. Endpoint native local network cap120 and per-identity8.
  Recovery local IP5 remains to align; passkey route not yet implemented.
- Instagram standard /p and /reel share links normalized as candidates; extractor
  ownership checks remain independent.19 relevant tests pass. No storage migration.
- History bundle5d5b2fb accepted:30orders/200tickets/20requests, independent strict
  canonical keysets, microsecond timestamps, bounded page exports, native6locale
  AccountPurchases. Root just integrated AccountApp cursor forwarding/component
  and removed duplicate old export/request map. Integration test run pending.
- @simplewebauthn/server14.1.0 and browser14.0.0 installed exact (25 packages),
  package/lock changed; passkeys not yet implemented. Don't call them complete.

## Evidence (all under /workspace/artifacts/ugt-full-audit-20261103)

- completion-identity-green.log20 tests incl3 realPG identity/race cases.
- completion-email-proof-green.log6 realPG tests: uniqueness, encrypted queues,
  concurrent confirmation1winner, cross-user/guess lock/expiry/reset/cooldown.
- completion-native-auth-green.log33 tests; completion-account-ui-integration.log10.
- completion-security-ui-green.log38; completion-google-link-green.log10;
  completion-identity-rate-green.log78. Sets overlap, not additive unique totals.
- completion-core-batch-green.log18files running/completed; inspect tail before
  claiming all green. Only previous timeout was brand browser5sec; now budget20s.
- completion-history-integration.log: running; existing customer-account-security
  test expects ticketparams[7], now rightful[7,null,null], update its contract.

## Parallel bundles / exact resume

- /root/account_history_completion completed; commit4cadfa7 clean isolated
  /workspace/ugt-account-history-completion-20261111. Accepted+integrated5d5b2fb.
  It passed12 tests (5realPG), lint0; no need to re-dispatch/repeat whole work.
- /root/ticket_launch_evidence performed496 focused tests across43files, incl
  73realPG +1fixture-safety. Root fixed two stale fixture guards/mocks. Then new
  writer assignment in /workspace/ugt-ticket-paystack-completion-20261110,
  branchcodex/paystack-ticket-completion-20261110 at1782934. Initial write attempt
  hit usage limit without changes; resumed11Nov. Don't poll healthy worker.
  It owns Paystack ticket/inventory/settlement/event UI only, no root/auth/pkg.
  No live/gate/config/credential changes; returns commits for high-assurance review.
- /root/instagram_completion_evidence finished diagnosis only: read external
  completion-instagram-diagnosis-20261110.md. R2CF10042, GitHub dispatch missing
  token, scheduled runner public discovery failed but specific posts and local
  bounded discovery succeeded. Existing archive/publicationfalse preserved.

Next: finish AccountApp history integration regression; implement optional native
passkeys using maintained verifier (real Chromium virtual authenticator + PG),
not custom signature crypto. RPurbangangtour.co.ke, exactHTTPSorigins root/www,
UVrequired, residentkeyrequired, five-minute one-use owner-cookie-bound challenges,
verified email + password reauth for registration/revocation. Immutable random
stored userhandle, cap10active credentials via unique slot; session-version bound
registration; replay/counter/revocation-safe login; reset revokes passkeys. Browser
login optional; no Google requirement. Then safe guest-order capability claim,
durable reset queue, importer actionable setup/website storage recheck, combined
full suite/types/lint/build, independent final review, normalPR/keep-vars deploy.

Don't claim millions scale certification or provider ticket finality. No actual
customer/order mutations, charges, STKs or emails in testing. Don't touch the
historical stopped Docker container or other worktrees. Keep all55bindings/cron.
