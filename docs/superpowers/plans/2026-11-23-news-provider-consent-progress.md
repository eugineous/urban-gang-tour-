# SDD ledger — plan: docs/superpowers/plans/2026-11-23-news-provider-consent.md

Base reviewed Qwen feature98d350441925ac7c85df9250499c7475948845d3.
Checkout/worktree:/workspace/ugt-news-archive-20261116.
Branch:codex/qwen-news-provider-20261123. Execution:inline author fix pass.

Pre-flight:config-state/CAS/key-pause revision feeds API and desk; bound dispatch
consumes the same saved provider/model/revision and server-chosen operation mode.
Both mutations and dispatch use the existing budget lock, schema migrations use
qSchema's shared bootstrap lock. Browser never supplies a scheduled permission.

Ruling:upgrade bounded adapter work to versioned provider consent after concrete
review races; standing owner authorization covers necessary reversible security
repairs without another approval loop. Cost if wrong:larger private API migration,
old admin tabs must reload before settings/generation; no automatic model calls.
Ruling:retain completed review as the one fresh review and fix its Important
findings with RED→GREEN proofs plus whole-suite/build validation. No re-review seat.
Cost if wrong:less independent scrutiny of the fix itself; reproductions are gate.
Ruling:defer Minor legacy function_call response metadata rejection. No function
executes; current parser accepts only validated private draft text. Cost if wrong:
unsupported mixed metadata can accompany otherwise-valid text until later hardening.
Ruling:do not certify live key/model availability/charges or production migration
from mocks and isolated SQL. Owner activation requires actual account evidence.
Cost if wrong:Qwen cannot be advertised as live until owner key/configuration works.

Task1:complete. Browser key-recipient and unsaved-settings regressions written;
SQL stale-save/CAS/paused-dispatch/generic-bypass and automation snapshot/late-
dispatch regressions written. RED observed:2browser and7server/SQL failures before product repair.
Fixture follow-up:full suite2946pass/291skip/2shopfixturefail; diagnostic proved
process-is-undefined from bare fixture missing Next env transform, fixed fixture-
only. No production shim. Green recorded in shop-fixture-green.log.
Tasks2–4:complete. Separate saved config/revision, CAS under budget lock, atomic
key-pause revision updates, server-bound recipient and mode, scheduled pause fence,
password clear on recipient change, explicit settings reload/conflict and matched
manual-generation payload. Lowered daily-limit repro RED→GREEN at dispatch.
Ruling:retain a consent-blocked reservation as prepared with an explicit blocked
result rather than terminal failure. It is known not sent and may resume only
under fresh valid consent in the same budget day; dispatch clears that result and
unknown/dispatched work remains unreclaimable. Cost if wrong:reserved capacity
stays occupied; old-day work needs deliberate fresh editorial revision.
Ruling:check actual non-prepared draft count under the same lock before dispatch
after a daily-limit decrease. Cost if wrong:conservative failure/unknown attempts
count toward the cap, so the owner may need a higher explicit limit.
Evidence:55/55targeted tests passed including19realSQL cases and10browser cases.
Types0errors; scoped lint0errors/1existing test-any warning. No live provider calls.
Task5:complete. Fresh post-review full suite:2963passed/291skipped;347files
passed/19skipped,366total;exit0. Dev doctor confirms runtime/dependencies ready;
local DB/session/cron credentials absent as expected, no demo authority. API.md
records version-bound config/generation and key-pause response contracts.
Task6:production build/packaged verification/release pending.
