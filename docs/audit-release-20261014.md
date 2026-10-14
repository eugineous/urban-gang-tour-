# Audit fixes — 14 October 2026

The owner authorized implementation and deployment to urbangangtour.co.ke.
Release identifier: `audit-release-20261014-v1`.

## Customer experience

- `/shop` opens the live, owner-managed catalogue. `/shop/available` redirects to it.
- The Color Blast design archive remains at `/shop/lookbook`; its design bag cannot create a payment.
- Events has separate Urban Gang Tour and Kenya picks tabs. The independent feed initially shows nine cards and retains search, date/location/source filters, pagination and shareable URLs.
- Partnerships has its own page; `/the-gang` redirects to About.
- Home embeds only three news excerpts and three featured campaign films. The public news feed omits article bodies; article pages remain complete.
- Reels mounts at most three neighbouring players, preserving its swipe/keyboard navigation and existing media.

## Payment and security

- Unsigned M-Pesa callbacks acknowledge promptly and then authenticate the result by querying Daraja for a known recoverable checkout reference. They cannot independently confirm or decline a payment.
- Amount, receipt shape and state predicates protect settlement; uncertain outcomes remain reconciling. The existing scheduled recovery sweep retries orders older than two minutes and completes inventory, ticket and receipt work.
- Admin receipt printing uses DOM text nodes and disconnects its opener. Order content cannot become HTML or script.
- Public edge caching uses an explicit allowlist, a release-specific key and a 60-second lifetime. Authenticated, RSC, query-specific, customer, payment and live sale requests bypass it; responses setting cookies never enter it. Cache failures preserve page delivery.
- The deployed Cloudflare analytics auto-install should be disabled for this domain so optional reporting continues through the site's existing consent-gated collectors. No CSP analytics exception is introduced.

## Verification

Full unit suite: 67 files / 425 assertions passing. Next.js and OpenNext Cloudflare production builds complete.

Browser suites cover Galaxy S24, Galaxy A55, Android landscape and desktop, with fictional API fixtures for every mutation. Verified live-shop filtering and variants, persistent cart, guest checkout, interrupted-payment retry with idempotency, booking retry with retained inputs, card redirect, event tabs/search/pagination, bounded Reels players, safe receipt printing and portrait/landscape video sizing.

Production verification checks the release header, main/shop/alias routes, public caching versus private checkout, current catalogue, mobile rendering and analytics configuration. No real payment, booking enquiry or customer record is created by verification.

The existing Worker name, custom domains, secret bindings, media KV, self-service binding and cron schedule are retained. A rollback uses Cloudflare's preceding Worker deployment; cache keys are isolated by release identifier.
