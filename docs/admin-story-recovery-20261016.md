# Story recovery and restored local browser verification

16 October 2026, Africa/Nairobi. Follow-up to `admin-rebuild-20261016.md`.
This is not the entire admin redesign. The owner subsequently authorized the
current update for main-site deployment on 16 October 2026; production completion
must be established by the release record, not inferred from this plan.

## Browser clarification

The owner's earlier workaround remains available: installed Chromium plus the
repository's Playwright scripts. At the owner's request, independent local
browser verification was resumed. These tests use fictional intercepted API
responses, not an inherited personal Chrome profile or owner authentication.
The connected Browser app's control tool remains absent. That prevents access
to the owner's existing browser session, not all independent UI testing.

The importer now passes its real browser regression on Galaxy S24 and desktop.
The first run exposed labels containing their select/textarea text, which made
the exact accessible name unstable. The event selector and poster-caption
labels now have explicit separate label/control associations.

## Story storage and recovery

- Private copies autosave after 1.5 seconds of inactivity. A confirmed server
  acknowledgement is required before the editor's public-save action enables.
- The existing live post is not touched by autosave. Choosing Published in a
  private copy remains only an intention until the existing explicit Save story
  action succeeds through the publishing gate.
- Copies and immutable revisions live in separate tables. Nothing expires or
  is silently discarded. The recovery list shows the most recent 100 copies
  and up to 100 revisions; older stored revisions are not purged.
- Copies are scoped to the current authenticated actor, including for owners.
  The shared owner access-code identity is `admin`, not a separate identity for
  each human using that code. Individual Google accounts provide distinct actors.
- Draft writes use a revision compare-and-swap and create the revision in the
  same SQL statement. A repeat of the identical write can reconcile a response
  lost after commit; a changed or foreign version conflicts instead.
- Failed autosave stops automatic retries, keeps the editor text and exposes
  Retry. A conflicting copy can be forked explicitly with Save as a new copy.
- Closing before acknowledgement warns about the unsaved changes. Reload
  recovery is promised only for acknowledged copies, not unconfirmed keystrokes.
- A recovered earlier revision becomes a new copy rather than rewriting history.
- Normal story writes now require the exact version returned by the story list.
  The insert/update is also conditionally guarded at write time, including the
  crew permission restrictions, so a second editor cannot win a race silently.
- Omitted publication flags now mean unpublished, not automatically public.
- Remove moves the complete post row to recoverable storage and writes its audit
  event atomically. The same version guard protects newer edits.
- Restore is restricted to the owner or removing administrator. It always creates
  an unpublished draft and cannot overwrite a reused slug. The source Trash row
  is retained if restoration conflicts. No permanent-purge button is introduced.
- Save/remove invalidate the newsroom readers and revalidate public article,
  index, feed and sitemap paths. Other isolates/clients retain the existing cache
  policies; no globally instantaneous removal claim is made.

The tables are additive and bootstrap on authenticated use. No hosted migration
or customer/business-record operation was executed for this review. No original
post, media file, order, email or WhatsApp message was deleted or sent.

## API

`/api/admin/story-workspace` requires a currently verified `content` permission.
Every mutation also requires the existing strict Origin check. All responses use
`private, no-store`. Payloads are capped at 170,000 bytes; unexpected fields,
invalid IDs/revisions, invalid dates and malformed editable content are rejected.

- `GET`: own saved-copy summaries and permitted Trash summaries.
- `GET ?id=<UUID>`: own copy and recent revision metadata.
- `GET ?id=<UUID>&revision=<integer>`: own earlier content with the current copy
  revision retained for concurrency handling. The UI forks it as a new copy.
- `POST {action:"saveDraft",id,revision,content}`: compare-and-swap private save.
- `POST {action:"restoreStory",slug}`: restore as an unpublished post.

`POST /api/admin/save` story writes accept only editable fields and require
`expectedVersion` (null for a new record, exact `version` for an existing one).
`deletePost` is retained as a compatibility action name but now requires
`expectedVersion` and performs recoverable removal. Stale clients must reload.

## Verification

- 659 automated tests in 94 files pass, including 15 new draft/publishing tests.
- TypeScript, whitespace checks and scoped lint on new modules/tests pass.
- Importer: 10 local browser assertions on Galaxy S24 and desktop.
- Story recovery: 24 local browser assertions on Galaxy S24, A55 and desktop:
  autosave without a live write, reload/reopen, failure retention, publication
  disabled until saved, retry, stale publication rejection, removal and Restore.
- These browser services are intercepted fictional fixtures. They verify the
  client flow, not SQL execution or real provider connections. SQL/auth tests
  use mocks. A subsequent isolated Postgres 16 run passed six real integration
  checks: revision/retry/actor isolation, publishing SQL and stale versions,
  removal-between-read/write, Trash/Restore publication guards, reused-slug
  protection, and atomic rollback when snapshot storage fails. The opt-in suite
  requires the exact fictional container name and verifies it has no network.
- Fresh screenshots were saved in `/workspace/artifacts/event-brief-import-20261016`
  and `/workspace/artifacts/story-recovery-20261016`. The S24 saved-copy screen
  was inspected. These are independent Chromium Android Chrome emulations,
  not a physical Samsung device, Android OS emulator or Samsung Internet test.

The owner authorized publishing before their own signed-in review. The release
keeps existing password/Google login and role guards; no credentials are reset,
no production sessions are minted, and no authentication bypass is introduced.

Remaining work: signed-in owner acceptance,
selected full-shell redesign, albums/category management beyond simple fields,
other editor autosaves, and actual configured provider checks. No full redesign,
universal accessibility compliance or real delivery
verification is claimed.
