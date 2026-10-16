# Event save and publishing feedback

This scoped correction follows the owner's report that partner-event details
were entered but the interface repeated a generic publishing warning.

## Changes

- Shared server/form readiness checks identify individual missing fields instead
  of asking for all partner details again. Existing public-validation rules are
  preserved; no organiser, role, artwork or commercial facts are invented.
- The editor acknowledges entered details, shows unsaved changes, focuses missing
  fields and keeps errors visible. Quick status changes explicitly show the
  current saved status until the server confirms a transition.
- A successful HTTP response alone is insufficient. Save/status operations must
  return `ok` and a matching event row before the interface clears the editor.
- Inputs are disabled during a pending save. Edits during image uploads remain
  possible and are retained. Bounded network failures keep entries and describe
  an unconfirmed outcome rather than claiming a successful save.
- Existing-record saves send the loaded timestamp, including microseconds. A
  concurrent modification returns 409 instead of overwriting the newer version.
- Incomplete, previously private partner events can be saved as private drafts
  without requiring a public transition.

## Verification and limits

`scripts/event-publication-feedback-regression.mjs` uses fictional, intercepted
admin API responses on localhost with Galaxy S24 and desktop Chromium profiles.
It checks exact blockers, entered details, upload races, incomplete HTTP
acknowledgements, input locking, publication, private drafts and stale saves.
`scripts/event-brief-import-regression.mjs` checks the existing paste/import flow.
Neither test creates a production session or publishes customer content.

The uploaded reconstruction documents remain project context for the wider
roadmap. This fix does not implement their full information architecture,
progressive announcement policy, media library or complete admin redesign.
No production credentials, media, business records or payment settings change.
