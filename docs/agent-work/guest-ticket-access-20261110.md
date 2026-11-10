# Guest-first tickets — 10 November 2026

## Bounded change

The owner requests frictionless ticket access, permanent native accounts,
premium layouts and an honest account/ticket/gallery loose-end review.
This release implements the low-risk entrance/UI part, not a new identity system.

- `/my-tickets` accepts existing private UGT ticket/receipt/confirmation links
  and strong order references. It navigates only to existing server entitlement
  pages. Invalid/external/personal-identifier input gets local actionable feedback.
  Shape acceptance never means payment, ownership or signature acceptance.
- My tickets in header/menu/footer, mobile dock and app hub uses this entrance.
  Sign in and Create account remain optional. Direct signup opens signup mode.
- Account page becomes a compact, scoped layout with a guest-ticket shortcut.
  Existing credentials, password rules, recovery and account records are unchanged.
- All six native locales, keyboard/focus, stable validation action placement,
  pre-hydration safety and Android wide-viewport fallback are covered. No new
  design dependency: the unavailable 21st CLI is replaced by existing project
  tokens/primitives and actual browser inspection, not a new template.
- The new private entrance is excluded from analytics/marketing/update prompts,
  public caching and offline navigation caching. It stores no pasted references.

## Verification and review

Evidence lives outside the repository at
`/workspace/artifacts/ugt-full-audit-20261103/guest-ticket-*`.

Parser/navigation tests failed before implementation; component/direct-signup
tests failed before implementation; the Android fallback failed before the CSS
repair. Browser fixture tests exercise the actual component and styles without
production purchases, account creation, entitlement access or customer messages.
Dev browser checks cover 320/390/1440px for guest/login/signup (nine screens),
invalid-input focus, no overflow and correct menu links. Production build/live
results and release metadata must be recorded after those commands complete.

Final pre-release evidence:147 focused UI/navigation tests passed;94 account,
receipt, rate and cache boundary tests passed (overlapping sets, not additive).
Scoped lint has zero errors and22 warnings. Next standalone build and OpenNext
packaging both exited0, as did Wrangler dry-run with keep-vars.

The combined suite is **not green**:2509 passed,46 failed,191 skipped across301
files. The prior report had45 failures. The extra is the earlier Paystack-copy
change invalidating a card-only warning expectation; its test and production
files have zero diff from this branch's base. The other failures remain the
37 document-less checkout-hook cases, old homepage/H1/copy/palette contracts and
the premium-shell source parser. Do not hide these failures or claim database
integration/load/financial tests ran when skipped.

Local production CSRF correctly rejects localhost Origin. Its canonical-origin
read-only session probe returns user:null. Local built browser layout checks
therefore fixture only the logged-out session response; live checks use the
real session endpoint on the canonical domain. App CSRF is not changed.
The final built-browser run exited0 for all nine screens at320/390/1440px,
including private headers, invalid-reference handling, no overflow and no
customer/account mutation. Screenshots were inspected at phone and desktop.

One independent read-only review found no critical issue. Its important finding
was the menu/footer translation key still bound to `/account`; this is corrected
with a failing-then-passing regression. Its minor app-hub stale destination/copy
is also corrected in all six locales. No second implementation agent or review
cycle is needed. Root remains responsible for build, combined tests and release.

## Explicit non-completion boundaries

- Guest order auto-claim, verified contact linking, passkeys, phone normalization
  and uniqueness, password-policy alignment, phone-only recovery and account
  pagination are not implemented here. Never infer the same person from names,
  shared IPs or unverified email/phone input.
- Existing shared Durable Object rate limiting is retained; registered users
  are not concurrency, and there is no evidence certifying 1–20 million users.
- Ticket-sales/finality/capacity gates remain closed as configured. This release
  does not prove a live paid ticket/receipt/scan lifecycle.
- Existing Instagram index already joins the media catalogue. Source extraction,
  incomplete archive and unenabled R2 remain separate blockers; no migration or
  bulk automatic publication is silently performed.
- Existing failing legacy tests and broken optional automatic deployment checks
  must be disclosed, not converted into false green release claims.

## Preferred next account model

Guest checkout and private ticket links first. Optional stable internal Urban
Gang account ID with a verified email and passkey, plus secure recovery; Google
is optional, not the identity foundation. Preserve existing accounts and require
proof of control before adding identifiers or claiming guest purchases. Design
and test the migration, recovery and abuse model before enabling new protocols.
