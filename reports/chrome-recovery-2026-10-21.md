# Header, footer and home recovery — 21 October 2026

Owner feedback, current source and the Nixtio page's public information
architecture ground this repair. This is not a captured screenshot audit or
claim of exact visual cloning. Connected browser capture is unavailable.

## Causes and repairs

- The menu toggle rendered at desktop widths, while the primary menu was hidden
  below1100px. Keep the primary menu on laptop/desktop, label secondary navigation
  More, and show the hamburger only at900px and below.
- The primary contact action had become Book. Restore direct Let's talk contact
  action and a compact desktop contact launcher; don't require opening a card
  before reaching the actual contact page. No overlay on critical commerce/admin
  screens, and no miniature autoplay video in the launcher.
- Footer navigation was a single wrapping list plus several generations of
  global footer styles. Use a scoped module with named Explore/Connect/Help
  columns, an independent brand/social group, separate legal/preferences rows,
  narrow-screen reflow and visible social labels. Old global footer classes no
  longer apply to the new footer.
- The original BookingInvitation existed but was not mounted. Restore a quiet,
  consent-aware host introduction after engagement, with24h dismissal, one
  shared automatic interruption per session, no form/payment interruption and
  native modal scroll/media lifecycle. Owned film remains768×216 with containment.
- Campaign displays were still mounted; the live public campaign API returned
  no active campaigns. Do not invent an offer or activate unknown admin content.
  Repair the same native modal lifecycle and keep current eligibility/consent.
- Home FAQs had been reduced to a link. Restore inline native details/summary
  questions that work without JavaScript, while preserving published editor
  overrides and the dedicated FAQ route.
- Existing experiences, archive projects and collaborator logos were present
  but weakly labelled. Make featured work/full portfolio and factual archive
  relationships discoverable; no invented endorsements, testimonials or metrics.
- Add header entrance/scroll elevation and optional one-shot home section/image
  motion without hiding SSR content. Honor focus, reduced-motion and save-data
  preferences. Fix the later CSS rule that restarted the logo rail on keyboard
  focus; it now stays paused while focus is inside the rail.

## Verification

992 default tests pass,75 opt-in tests skipped. Typecheck passes. Changed-file
lint has no errors; existing image/effect/type warnings remain. Actual Cloudflare
build and bundled-Worker/live route checks are additional release gates, recorded
in the private release artifact directory rather than assumed from unit tests.

No payment implementation, provider credentials, auth rules, customer data,
active campaigns or editorial approvals are changed by this UI release.
Source review additionally caught and fixed stale campaign selection after
the last offer is disabled, organizer-auth launcher intrusion and a visible
More/Menu name mismatch. Legacy browser harness menu selectors were updated
and syntax-checked, but those browser scripts were not run in this environment.

## Not finished by this release

See unfinished-work-2026-10-21.md for the current evidence-based backlog.
Card retry identity, merchandise pre-payment reservation, durable post-payment
fulfilment repair and the other listed operations need separate risk-tested
changes. No claim that every prior project is complete.

Android/iOS/foldable/tablet rendering, actual keyboard/modal interactions and
provider/screen-reader behaviour still need connected rendered verification.
No physical device, capacity, accessibility compliance or visual-fidelity claim.
