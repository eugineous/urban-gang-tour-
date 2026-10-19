# Private reply recovery release

This is a continuation of the authorized operations work, not a visual identity
change or a claim that all external verification is complete.

## Operating contract

- Booking and Gmail reply text is saved privately in the database after editing
  pauses. The interface says saved only after an acknowledgement. Unsaved text
  retains a navigation warning; failed loads/saves keep local typing and offer
  retry. Drafts survive refresh only after a confirmed save.
- Draft ownership is the verified staff actor, not a caller-supplied identity.
  Booking module permission and owner-only Gmail permission remain server-enforced.
  Text is not persisted in browser localStorage or exposed in public feeds.
- Each update compares the version read. A stale tab conflicts instead of
  overwriting another tab. Lost acknowledgements can acknowledge identical text.
- Clear erases text and leaves a content-free version tombstone. Delayed saves
  cannot resurrect the cleared content. Clear does not cancel a sent email.
- The send reference is stable across saves, edits and reopening tabs. Provider
  uncertainty cannot become a fresh send automatically. New references follow
  explicit clearing/new writing; changed text under an attempted reference
  remains subject to the existing server-side send conflict.
- Older tab-local send references are carried into the first durable draft.
  Accepted sends clear only the matching draft, not newer typing. Unconfirmed
  cleanup retains the saved draft and stable reference for safe recovery.
- Booking rows are isolated from the shared module list and the editor remains
  mounted across module changes. Status-update failures unlock controls and show
  feedback instead of leaving an unhandled request.

## Evidence

805 default regression tests pass; 35 opt-in integration cases are skipped in
that invocation. Separate focused run: 23 pass, including five real PostgreSQL
tests. Those verify twenty competing writes, actor/channel isolation, lost-ack
retries, clear/restart/no-resurrection, stable send references and legacy handoff.
Controller/UI contract tests cover late loads/acks, preserved typing, errors,
conflicts and provider-uncertain sends. They are not real Android screenshots.
TypeScript and changed-source lint have no errors; existing warnings remain.

Use the final Cloudflare build/dry run before merging. Preserve bindings, cron,
content IDs and access boundaries and perform read-only live checks after deploy.
Evidence: `/workspace/artifacts/ugt-admin-draft-recovery-20261019`.

## Remaining external gates

The available tools still do not provide the supported browser-control session
or real payment sandbox credentials. Android/authenticated Gallery verification,
provider acceptance/delivery and production-shaped mixed-load capacity remain
unverified. The previous 40,000-request result measures only the limiter, not the
whole site. Card-rail replay certification also remains separate. Do not replace
these gates with a claim that the entire project is finished.
