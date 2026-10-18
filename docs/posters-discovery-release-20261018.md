# Poster feedback and unified discovery release

Owner-authorized merge and main-site deployment, 18 October 2026.
Marker: `posters-shop-discovery-20261018-v1`.

This bounded release improves field-specific partner-poster validation and private
draft retention, combines live merchandise and clearly non-sale design previews
in one discovery grid, separates Services / Events / Our work navigation, reads
completed school work from current public records, adds product sharing and
clarifies payment-status presentation. It does not change payment initiation,
inventory reservations, provider configuration, artwork bytes or commercial facts.
The source-led positioning brief is in `site-purpose-and-positioning-20261018.md`;
it is not an authorization to overwrite owner-managed page copy.

Pre-release source checks: 775 tests passed, eight opt-in integration cases skipped;
TypeScript, Cloudflare build and dry run passed. Release packaging reruns the
checks after synchronizing the Worker/service-worker/client marker. Existing
dependency build warnings are recorded, not suppressed.

Preserve the existing Worker, both custom domains, secret bindings, media KV,
rate limiter, self-reference and dashboard-managed fifteen-minute cron. No schema
migration or production content writes are required. Never submit real orders,
charges, messages or bookings as smoke checks. Compare public IDs and binding
metadata before/after deployment and check unauthenticated admin reads stay 401.

Known remaining risks: intermittent Gallery React #418 hydration reports have not
been resolved; M-Pesa retry identity is process-local; ticket capacity reservation
is not atomic; card initiation replay protection needs separate work. Source and
HTTP fixture checks are not real Android, authenticated save or provider-delivery
verification. Work next on durable M-Pesa attempt recovery, then reservations,
then publishing/Gallery reliability, with separate regression evidence.
