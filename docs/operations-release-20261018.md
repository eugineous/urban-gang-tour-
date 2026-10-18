# Operations release evidence and remaining gates

Scope: current owner-authorized operational repairs, not a new visual identity.
Release marker: `checkout-operations-mobile-20261018-v1`.

## Independent checks

- Regression suite: 790 passing; 30 opt-in integration cases skipped in default
  invocation. Separate real PostgreSQL runs pass 22 M-Pesa/reservation cases.
- Those database cases exercise 20 competing requests, independent connections,
  crashes/replays, lost provider acknowledgement, last-seat contention and paid
  orders awaiting ticket mint. Provider responses are fixtures, not real charges.
- Real local workerd + persistent SQLite limiter: 40,000 public-read decisions
  accepted in 49,406 ms, p95 205 ms, concurrency 100. Equivalent 48,577/min for
  the limiter ONLY. Also 1,000 purchase-budget decisions accepted; credential
  concurrency permits exactly five of twenty and persists across runtime restart.
- This is NOT a 40,000/min whole-site/payment capacity certification. Database,
  cold-start, PDF, provider and distributed-region capacity still need staging
  traffic and telemetry. No live load test or customer transaction was performed.
- TypeScript, source lint, Next/OpenNext build and deployment dry run are release
  gates. Evidence lives under `/workspace/artifacts/ugt-source-audit-20261018`.

## Page-family checks and boundaries

| Family | Checked now | Remaining independent proof |
| --- | --- | --- |
| Public navigation | Native modal semantics, shared URLs, responsive CSS, Suspense loading | Connected Android/browser keyboard/touch and unusual-size screenshots |
| Shop / checkout | Opaque attempt persistence, recovery ownership, server quotes, status links | Real provider sandbox, card-rail durable initiation, order fulfilment drill |
| Tickets / documents | Atomic capacity, paid/voided guards, private PDFs, existing QR contracts | Device scan, actual production-shaped PDF/print and partial-refund allocation |
| Stories / Gallery | Dirty-photo guard, explicit chronology, Nairobi scheduling, outage response | Authenticated save/publish, bulk upload and historical Gallery hydration reproduction |
| Booking / contacts | Stable request reference, duplicate-content conflict, reply-draft separation, normalized contact actions | Configured Gmail acceptance/delivery and WhatsApp provider end-to-end |
| Consent / advertising | Immediate choice, rejection, preferences, pause gates and existing campaign permissions | Real touch/screen-reader review and campaign disable propagation in-browser |
| Video | Viewport-gated muted playback, native controls, consent/reduced-motion/data-saving priority | Actual Android autoplay policy, manual pause/unmute and multiple-player transitions |
| Discovery | Server-rendered metadata sweep, deliberate alias redirects, favicon/social defaults, 404 | Search-engine/social cache refresh and complete dynamic-record content review |

The historical Gallery hydration issue is not declared resolved without a
reproduction and visual check. Source tests do not prove all buttons/screens work.
Missing event dates, artwork permissions or payment confirmations are never
invented. Server logs no longer emit notification recipient identifiers as routine
debug messages. Existing monitoring errors remain for diagnosis.

## Next strategic gates

1. Provider sandbox reconciliation and card replay protection before calling all
   payment rails certified. Keep uncertain provider outcomes non-replayable.
2. Authorized production-shaped staging load at 667 requests/sec, with endpoint
   mix, p95/p99, error rate, DB locks/connections, cold-cache and provider budgets.
3. Authenticated Android/Gallery publishing capture and real browser console review.
4. Durable admin draft recovery across refresh/module changes, with explicit
   retention/clear controls; current in-memory drafts must not be called durable.

Deployment must preserve Cloudflare bindings, cron, content IDs and login gates.
Read-only before/after checks record that separately. No backdoors are included.
