# Versioned provider consent and dispatch

Owner authorizes continuing the app and secure QwenCloud Singapore integration.
A fresh review exposed existing cross-provider/concurrent-owner races. This is an
upgrade from a bounded adapter to a small architectural consent fix. Continue
within the standing authorization; do not ask to authorize the same repair again.
No actual key/model call/billing/account change is permitted as a test.

A pasted credential belongs to the selected credential provider. Changing that
selector clears the field; no draft or unrelated secret may follow the selector.

Keep strict UrbanNewsConfig's seven fields. Add a separate {config,revision}
state with a BIGINT revision, defaults revision0 before a row exists. The additive
migration initializes existing config rows at1 and retains all old JSON/ciphertext.
Config saves require expectedRevision and compare-and-swap under the same budget
advisory transaction used by key writes. Every key save/delete pauses drafting and
increments config revision atomically, returning that exact paused state. Stale
settings writes return409 and retain form edits until explicit settings reload.

The desk tracks saved config/revision separately from local form edits. Manual
Generate is unavailable for unsaved/stale settings. Requests bind expected config
revision, provider and model; the server independently compares the saved state.
The browser cannot select a scheduled mode. Scheduled jobs carry the snapshot
that was enabled when selected, rather than silently substituting a later provider.

Immediately before a draft run becomes dispatched, hold the existing budget lock
and validate current config revision/provider/model/terms. Scheduled mode also
requires draftingEnabled. A mismatch retains an explicitly blocked prepared
reservation without provider I/O. It may resume only with fresh authorized configuration on
the same budget day; uncertain/already-dispatched work remains unretried.
Discovery's generic dispatcher cannot be used to dispatch a model draft. A pause
fences work that has not reached durable dispatch; already dispatched work can
still finish. Do not claim cancellation of an in-flight external request.

Keep terminal response replay, per-day reservation limits, checked evidence,
private revisions, publication authority and all commerce/customer data unchanged.
Actual provider/account/charge readiness remains owner-verified on activation.
