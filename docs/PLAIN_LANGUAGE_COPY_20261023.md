# Public copy review — 23 October 2026

## Scope

Make the existing public pages easier to scan. Keep the visual identity, current
CMS, authored news, source media and business facts. This is not a full-site
redesign or a claim that every workflow has been tested on a physical device.

## Evidence and decisions

The before review captured 17 public routes in Chromium at 390 px and 1440 px.
Screenshots and visible-copy snapshots are in the task artifacts directory
`/workspace/artifacts/ugt-copy-clarity-20261023`.

1. **Unclear page names.** “Discover your next best event experience” and
   “The experience” delay the answer to what a page contains. Use “Events &
   tickets” and “Events, hosting & production”. Existing URLs remain intact.
2. **Instructions competing with the work.** The portfolio introduction repeated
   carousel controls and used generic shelf titles. Keep the essential distinction
   between Urban Gang Tour records and the founders' earlier work; name shelves
   after their actual contents.
3. **Repeated catalogue warnings.** Every design card repeated the same sample,
   price and stock notice and saved-design link. Show one catalogue notice instead.
   Every design retains its own “not on sale” badge, proposed-price label and
   design-only action. Available products keep their real purchase controls.
4. **Repeated booking invitations.** Contact, footer and booking introductions
   repeated audience and quote instructions. Shorten the invitation, state the
   service, and keep the programme/date/quote confirmation boundary.
5. **Generic biographies.** Replace factory slogans with the presenters' actual
   television, hosting and production roles. Preserve names, credits and source
   media. Do not overwrite custom CMS biographies.

## Protected information

Privacy and cookie choices, school safeguarding consent, quote qualifications,
non-reservation notices, payment limitations, event dates/statuses, prices, stock,
source/attendance qualifications, existing news and legal policies are retained.
No production messages, payments or editorial writes are required by this release.

About and proof records now receive the existing server timestamp instead of
reading a fresh clock during render. This keeps initial event classification
consistent without changing event records or availability rules.

## Verification boundaries

Use unit tests for copy and retained safeguards; build and Worker checks for route
integrity; browser captures for text wrapping and horizontal page overflow. Verify
the actual production deployment separately after release. Local screenshots use
public API snapshots where available and cannot prove production database content
or completed checkout. Compare production before/after counts only when the same
content is present; a lower word count alone is not a measure of better copy.

The final release results belong in the accompanying task artifact
`RELEASE-VERIFIED.md`, not in an unverified completion claim here.
