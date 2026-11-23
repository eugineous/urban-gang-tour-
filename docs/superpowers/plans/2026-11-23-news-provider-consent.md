# Provider consent repair execution
Spec:docs/superpowers/specs/2026-11-23-news-provider-consent-design.md
Base reviewed Qwen head:98d350441925ac7c85df9250499c7475948845d3.
Inline author fix pass after fresh review; no second review seat/re-review.

1.RED:browser pasted-key→selector swap and unsaved provider generation; real SQL
stale save after key pause/concurrent config CAS/paused scheduled dispatch; fake
scheduler snapshot-switch/manual wrong-provider/late dispatch conflict (no HTTP).
2.Add config state/revision migration and CAS/key-pause atomic updates. Add bound
draft dispatcher rejecting late revision/consent changes before any paid request.
3.Update automation/API with server-chosen manual/scheduled authorization and
explicit expected snapshot. Preserve durable terminal replay and quotas.
4.Update desk saved-vs-edited state, clear credential on selector change, conflict
feedback/reload, explicit activation and exact provider/model generation payload.
5.Run RED→GREEN cases, existing provider/store SQL, API/browser/automation/cron,
full suite, types/lint. Fix actual failures; no production credentials/model calls.
6.Build/dryrun/packaged browser/normal PR+attach/exact-head+keep-vars/live verification;
preserve all bindings/cron and catalogue. Wider strategy remains active afterward.

Review focus:provider recipient and key identity; monotonic revision on every pause;
no stale reactivation; atomic consent check at durable dispatch; scheduled-vs-manual
distinction; old-day/unknown/terminal replay invariants; preservation of typed edits.
