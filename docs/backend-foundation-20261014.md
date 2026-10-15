# Backend foundation release — 15 October 2026

Branch: `backend/security-foundation-20261014`.
User authorized completion and deployment to the main site after verification.
Release identifier: `backend-foundation-20261014-v1`.

## Implemented

- Bounded signed-token parsing, strict expiry/claim checks and trusted origins.
- Bounded credential JSON bodies; fail-closed Google admin directory checks.
- Registered, revocable one-day admin sessions. Owner Security controls list and
  revoke sessions; password changes invalidate other password sessions. A
  credential-bound 14-minute emergency owner recovery session is available only
  after the configured backup code is verified when registry storage fails.
  Existing ticket signing keys are preserved.
- Shared persistent SQLite Durable Object abuse counters: IP-only credential
  budgets, broad public/checkout budgets suitable for a shared venue network.
  Credentials, purchases and writes fail closed on limiter failure; public reads
  retain their existing local guards. Only CF-Connecting-IP is trusted.
- Admin Campaigns: draft/live/scheduled/paused banners and pop-ups, optimistic
  version conflicts, atomic audit writes, owned image URLs and internal links.
  Nairobi scheduling, priority, dismissal cooldown and session caps. Deal
  publication requires an active checkout promo; visuals do not create discounts.
- Public campaigns refresh every ten seconds with a fifteen-second maximum
  publication lease. Outages expire/hide campaigns, not indefinitely stale ads.
  Dialogs respect cookie preferences and avoid payment/account/booking pages.
  No sample campaigns are published.
- Fresh database pricing for quotes/payments; removed merchandise or ticket
  tiers cannot remain sellable from a process-local catalogue cache.
- Private no-store headers, no powered-by header, same-origin form CSP and
  staged one-day HSTS. Anonymous public caching remains intact.

## Verification

550 tests across 80 files and TypeScript passed. The production Next/OpenNext
Cloudflare build and Wrangler dry-run passed. Pre-existing package/font parser
warnings remain; this is not a warning-free build claim.

The route inventory covers 101 routes / 130 exported handlers. Static guard
names are a review index, not proof of every branch. The compiled local smoke
test checks 51 protected admin handlers: anonymous requests denied with
no-store responses and no powered-by header.

Real workerd/SQLite testing accepted exactly five of twenty concurrent login
attempts, preserved counters across a new runtime, and accepted 1,000 purchase
plus 4,000 public-read requests from a shared venue network. These checks use
isolated fixtures, not production customers.

Browser regression fixtures exercise mobile/landscape/desktop campaign geometry,
Escape dismissal, session caps, sensitive-page suppression and admin save/pause.
They do not create real campaigns, payments or notifications.
The campaign fixture passed 18 assertions across four viewports; mobile admin
save/pause also passed. Commerce fixtures passed at widths 390, 820 and 1440.
The full locally packaged Worker accepted five invalid-password attempts and
returned 429 on the sixth, proving the real wrapper/export/binding connection.

## Deployment and rollback

Use the tested feature branch, PR review/merge, then `wrangler deploy --keep-vars`.
Keep the existing KV, self-reference service, secrets and cron schedule.
The first release adds migration `backend-shared-rate-v1` and SQLite class
`SharedRateLimiter`. Do not blindly roll back to an old Worker lacking that
class/binding after the migration: prepare a forward rollback retaining the
class/export/binding and additive database tables while reverting application
changes. Do not delete the class, counters or tables as a rollback shortcut.
Do not rotate SESSION_SECRET: existing ticket credentials depend on it.

## Remaining operational limits

No application is unhackable. Owner MFA/provider-console setup, actual database
grant review, restore drills, alerts and independent penetration testing remain
separate operational work; this release does not claim those are complete.
Existing durable email outbox/reconciliation jobs are preserved, not replaced.
The unclear “person/router” request does not authorize a new payment provider.
Existing providers and URL routing are preserved.
`/reels` is retained; history has not established a separate missing
`/release` page. No speculative replacement or redirect is introduced.
