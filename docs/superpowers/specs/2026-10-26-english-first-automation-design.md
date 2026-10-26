# English-first language and maintenance automation

Status: design and both implementation plans approved by the owner on 26 October
2026, with autonomous subagent-driven execution authorized. Design/plan commits
contain no runtime implementation. Baseline: main `89f8d84` (merch retirement live).

Plans: `../plans/2026-10-26-native-interface-language.md` (Delivery A), then
`../plans/2026-10-26-maintenance-reliability.md` (Delivery B).

## Outcome and scope

The owner asks to complete the paused language and automation work. English must
be the first/default language. Selecting another language must change the site's
interface immediately and remember that explicit choice. Routine maintenance
should run without repeated human checking, while failures remain visible.

This is two independent deliveries: native customer-interface localization, then
maintenance monitoring and receipt-delivery correctness. Existing payment,
publishing, consent, inventory and authentication rules remain authoritative.
The retired p1–p14 products stay retired; Color Blast remains preview-only.

This does not authorize automatic financial retries, new campaigns, rewriting
approved editorial/legal content, new paid providers or worldwide sales claims.

## Current evidence

- `app/_components/LanguageChooser.tsx` saves `ugt-language-choice`, but a separate
  Go link opens Google. Application rendering does not subscribe to this choice.
- `lib/translation-options.ts` offers 194 external translation languages and
  prefers the browser language when no choice is saved. Only six authored local
  welcome pages exist: English, Kiswahili, French, Simplified Chinese, Russian
  and Spanish. These are not six full interface dictionaries.
- `app/layout.tsx` sends English HTML. `AppShell.tsx` keys its inner shell by path;
  the locale provider must sit above that boundary. Public Worker caches are
  keyed by URL/release, not visitor language (`worker-runtime.mjs`);
  `public-cache-policy.mjs` defines cache eligibility.
- Published website copy and articles have single source records
  (`lib/server/website-content.ts`, `app/_lib/blog.ts`). Their approvals and hashes
  must not be bypassed by a translation feature.
- `worker-runtime.mjs` dispatches five authenticated scheduled jobs but ignores
  response status/body. A local, fictional, in-memory probe returned HTTP503 for
  all five; all five scheduler promises fulfilled. No production call was made.
- `/api/health` is configuration/liveness information, not an operational probe.
  Editorial has its own private heartbeat; other jobs lack shared run monitoring.
- Receipt/contact outboxes already provide durable jobs, leases, frozen payloads,
  stable provider idempotency keys and bounded retry windows. Receipt acceptance
  currently permits a 2xx response without a provider ID; contact delivery rejects
  that ambiguity (`lib/server/email-outbox.ts`, `contact-email-outbox.ts`).

## Delivery A: native interface language

### Choice of approach

Use a small first-party client preference provider with checked message catalogues.
It fits the existing client-heavy interface, changes text without a redirect and
keeps shared server HTML/cache entries English and non-personalized.

Alternatives considered: server cookie/locale routing would require new cache and
SEO contracts; a translation proxy would expose page addresses and cannot safely
handle private forms. Neither is needed for this delivery. No DOM text replacement
or third-party translation script is introduced.

### Preference contract

- Supported native locale IDs: `en`, `sw`, `fr`, `zh-Hans`, `ru`, `es`.
- Resolve an explicit valid saved choice, otherwise English. Browser language,
  country and automatic detection must never override this rule.
- Use a versioned local preference, `ugt-interface-language-v1`. Migrate an old
  explicit choice only when it maps to a supported locale; `zh-CN` maps to
  `zh-Hans`. Unsupported, corrupt and automatic choices fall back to English.
  Do not destroy the old preference during migration. Persist a one-time
  `ugt-interface-language-migrated-v1` marker before importing it; if that cannot
  be persisted, use English and the storage-failure behavior below. Once migration
  is marked, an absent new choice means English, not another legacy import.
- Selection updates the in-memory store and rendered interface synchronously,
  with no Go button, network request, redirect or reload. Persistence is defensive:
  blocked storage must not prevent the current page changing language. State
  remains usable and an accessible notice explains that it cannot be remembered.
- Synchronize tabs via storage events; clearing the new preference means English.
  An application reset writes explicit English; external removal of the new key
  also resolves to English while retaining the migration marker. Clearing all
  site storage removes the legacy value too. Test migration, clear and reload.
  A browser languagechange event must not change the interface language.
- Provider lives above the pathname-keyed shell. Changing language must not
  remount forms, reset cart/checkout state, lose focus or rerun payment effects.
- Keep the chooser in existing footer/menu or local form utility locations, not
  the main header. Replace the misleading primary 194-language catalogue with
  the six actually implemented native choices. Do not claim all languages work.

### Rendering and messages

Server HTML and the initial hydration snapshot stay English. The browser applies
the saved explicit preference as soon as hydration permits; delayed/disabled JS
leaves useful English content. This does not promise zero English flash on reload.

Use a typed English source catalogue, complete equivalents for the other five
languages, safe interpolation and cardinal plural rules. Keep feature catalogues
with their route/components; include all six variants for the currently loaded
feature so changing language does not wait for a translation fetch. Do not load
every route's catalogue into the shared shell. Missing messages fall back safely
to English and fail coverage checks; never render a missing-key token to users.

Translate factory headings, navigation, help/consent controls, accessible names,
placeholders, validation/status messages and customer actions on these surfaces:

- Homepage, business/client/work pages, FAQ and public discovery controls.
- Events/calendar, news/gallery controls and sharing controls.
- Shop/lookbook/design-bag, cart/checkout and account/ticket HTML controls.
- Booking/contact forms, customer sign-in and public accessibility/help controls.

Audit the full route inventory during implementation and bind each surface to its
catalogue/tests. Native interface coverage is not complete if a listed surface
silently retains factory English outside the declared fallback conditions.

Business names, people, article text, CMS copy, campaign content, customer inputs,
references, amounts and legal bodies are data, not translation keys. Preserve
them exactly and mark original-language blocks correctly. When viewing an
untranslated article/legal body in another interface language, clearly identify
the available original rather than imply that the body was translated.

Set the document's language to the active interface after hydration. Preserve
stable real links and canonical URLs, consent values, roles and security checks.
Existing `/welcome/{language}` content routes and their metadata remain intact;
visiting one does not silently rewrite the global saved interface preference.
No new hreflang claims are added for English-only source pages.

Private staff dashboards, server email/PDF templates and minimal Worker outage
pages remain English in this delivery. English-only screens retain the correct
English language declaration without clearing the saved customer preference.
External provider screens remain provider-controlled, not claimed as translated
by this app. Native customer forms never use a proxy.

### Region-aware presentation

Use the selected interface language for dates/numbers. Browser-provided region
and time-zone settings may be used as presentation hints, not proof of location.
No GPS, external IP lookup or extra personal-data collection is required.

Actual event venue/time-zone and date-only event days remain authoritative. Show
Kenya event times with their zone; do not silently shift a venue date to a visitor's
previous day. Prices still identify KES and use the same underlying numeric amount.
Do not infer shipping, overseas operations, card eligibility or M-Pesa availability
from language/region. Existing server/provider settings decide those matters.

## Delivery B: maintenance monitoring and receipt correctness

### Monitored scheduled jobs

Preserve the existing five jobs, secret, bindings and 15-minute schedule. Wrap
dispatch in a bounded monitor that checks HTTP success and the route's structured
success contract, not merely whether fetch resolved. Inspect each existing reply
contract when binding its count projection. Apply these meanings:

| Job | Successful execution versus attention |
| --- | --- |
| Content announcements | The deliberate `automation_disabled` gate is disabled, not an outage. With the switch on, missing channel configuration is blocked; `held>0` requires attention, never automatic resend. |
| Ticket sweeper | A validated `expired` count describes the sweep only. Missing DB or a failed sweep is unavailable, not an empty success. |
| Payment reconciliation | Validate checked/paid/declined/unresolved/skipped counts. Unresolved/skipped records remain visible attention; a customer decline is not a scheduler outage or proof that payment recovery is complete. |
| Email delivery | Project receipt/contact outcomes into bounded counts. Any `module_errors`, blocked, failed or unknown acceptance remains visible, even when other jobs succeeded. Acceptance is not inbox delivery. |
| Editorial | Report released/held counts and staged-operation conflicts. Gated drafts remain held; do not release them to make the monitor green. Expired completed operator manifests are not automatic retries. |

Counts must be bounded nonnegative integers; arrays become counts, never saved IDs.
Cap response bytes at 64KiB before JSON parsing. Unknown fields/results cannot
turn a job healthy. Known deliberate disablement is recognized explicitly, not
by treating arbitrary HTTP503 replies as disabled.

Correct the existing false-empty dependency contracts as part of this delivery:
reconciliation must not turn an absent DB or failed SELECT into success with no
work, and ticket sweeping must not report zero when no DB exists. Propagate those
conditions into a sanitized unavailable cron reply, while preserving genuine
empty success and every settlement/reservation predicate. A preliminary DB ping
alone is insufficient: the actual work query can fail after the ping. Test all
callers affected by the helper error contract. This is not paid-order replay or
a change to reconciliation selection/scheduling.

Store one bounded completion record per allowlisted job in existing private KV,
under `operations/cron/v1/{job}`. Record job name, scheduled slot, start/end times, duration,
outcome, safe count summaries and a finite error code only. Never store raw
responses, customer/order IDs, email addresses, tokens or driver errors there.
Write at completion/timeout, avoiding rapid repeated writes to the same KV key.

Distinguish success, deliberate disablement, blocked/unconfigured, failed,
timeout/unknown and stale monitoring. Use a 180-second observation deadline;
a timeout does not prove the underlying job had no effects. Record the observation
once; a late response cannot replace timeout/unknown or reset freshness. Missing
credentials, self-reference or missing/unreadable monitoring state is unavailable.
Known monitoring writes failing must be logged with a safe finite code, not ignored.
No job is automatically replayed by the monitor. Existing natural scheduled
runs and the jobs' own idempotency rules remain unchanged.

Expose an authenticated, rate-limited, super-admin-only GET status surface, with
private/no-store responses on every branch. Read at most the five bounded records;
malformed/missing records are unknown, not successful empty history. No new public
write endpoint or admin trigger is introduced. Protect the KV namespace using
the existing private-media allowlist.

A run is fresh for at most 35 minutes from its start, not late completion. Reject
invalid/future timestamps and impossible time ordering. Also compare its scheduled
slot with the latest expected UTC quarter-hour: allow five minutes for dispatch,
execution and KV visibility, then mark a missing latest result unknown even if an
older success is still fresh. Within that grace period show awaiting latest result,
not current-run success. This prevents an old record masking a new failed write.
Show last outcome and age separately. The summary describes monitored jobs only,
not overall financial correctness; retain the financial-recovery advisory below.
Operational health remains distinct from public liveness.
Keep the public health contract compatible, but describe its configured values
as configuration rather than verified payment/email availability.

### Email monitoring and acceptance

Add private aggregate counts and oldest-due age across the complete receipt and
contact queues, not just the newest 100 jobs. Database failure is an unavailable
module, not zero pending work. Keep existing bounded job lists and permissions.
Show legacy accepted records lacking provider IDs as a review count only; do not
requeue or reinterpret historical accepted messages automatically.

Use the existing admin card styles and 44px targets. Refresh the visible panel
every 60 seconds and on return to the tab; pause while hidden/unmounted, avoid
overlapping requests and preserve manual refresh. Clear private state on loss of
authorization. Do not send alerts or messages to new destinations.

For new receipt attempts, require a nonempty provider ID matching the same bounded
acceptance rule used for contacts. Malformed 2xx acknowledgements become
`provider_acceptance_unconfirmed`, never accepted. Reporting accepted also requires
the lease-owned acceptance UPDATE to return a matched row. Lost lease or failed
persistence is unconfirmed/retriable with the existing key/window, not proof of
durable acceptance and not permission to start another operation. Keep the original payload,
provider key, lease, attempt cap, backoff and 20-hour safe retry window. After that
window, require operator review. Provider acceptance still does not mean inbox
delivery. No live receipt/STK/charge/refund/message is sent as a test.

### Financial recovery boundary

The audit also found paid-order consequences can fail after the paid state commits
(`reconcile.ts`, M-Pesa/Paystack callbacks), and the oldest unresolved payment
records can monopolize reconciliation batches. These are material financial
reliability issues, not fixed by a health dashboard.

Before changing them, require a separate transaction/recovery design: an atomic
settlement/consequence journal, refund-safe idempotent ticket/inventory steps,
fair bounded scheduling, and explicit treatment of historical orders/communications.
Do not scan old paid orders and resend receipts, recharge, reopen refunded orders,
invent stock or treat insufficient inventory as resolved. Surface these gaps as
remaining work until that financial design and its concurrency tests are accepted.

## Acceptance and release gates

For A, test fresh French-browser visits remaining English; immediate switching
through all six choices; saved choice across routes/reload; explicit English reset;
cross-tab/clear events (including legacy French migration, clear, reload remaining
English); corrupt/blocked/partially writable storage; unchanged forms/cart amounts;
correct plurals and language attributes; no translation-service traffic. Check
long French/Russian and Chinese layouts, keyboard/focus and mobile/desktop widths.
Capture screenshots before claiming visual success. Private content must never
enter a translation request. Authored text and publication approvals stay unchanged.

For B, test all five HTTP failures, invalid/oversized JSON/contracts, disabled versus
blocked/attention, missing DB and configured-but-failing work queries, timeout/late
completion, start-based freshness/latest-slot grace, future timestamps, per-job
isolation, KV write/read failure and sanitized output.
Verify public/crew denial and super-admin access without forged production sessions.
Test queue aggregates with older failures beyond the list limit, polling lifecycle,
malformed receipt acknowledgement, failed acceptance persistence/lost lease,
stable retry payload/key and expired safe window.
Use mocked providers and the isolated PostgreSQL fixture where needed.

After written-design approval, produce a dependency-ordered implementation plan
and have the owner select execution before product code. Verification then uses
focused red/green tests, the integrated suite, TypeScript, lint, the actual bundled
Worker and responsive browser checks. Compare authored content, commerce settings,
retirement state and private access controls against the baseline.

Use the standing tested feature-branch/PR/Cloudflare release path. Preserve bindings
and cron, verify the live release and report any remaining declared exclusions.
No zero-failure, global network reach, inbox-delivery, translation-quality certificate
or search-indexing guarantee follows from these changes.
