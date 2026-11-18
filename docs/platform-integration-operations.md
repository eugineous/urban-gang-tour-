# Reader, media and discovery integration

Urban Gang Tour remains the company; Urban News is its reporting lane. This
release restores owned media around the news-first homepage without publishing
legacy manuscripts or inventing local coverage. Original event films are labelled
as archive material, separate from reviewed reporting.

## Public entrances

- `/blog`: current approved public reporting and explicit archive filters.
- `/for-you`: Kenya-first edition; explicit device choices personalize the browser.
- `/news-preferences`: guest reading choices and optional authenticated account sync.
- `/watch`: existing non-adult films plus the reviewed public Instagram archive;
  website-published MP4/YouTube uploads also appear. Native playback remains manual
  where browser permission, reduced motion, focus mode or Data Saver disallows
  autoplay. YouTube still requires an explicit click.
- `/search`: bounded grouped search over public reporting, discoverable events,
  active products, original films, published website films and genuine profiles.
  Results are limited to8per group and5000source rows per group. Search does not
  invoke a model or fetch third-party articles. Search pages are noindex and quiet
  for optional reporting/campaigns so query strings are not sent to GA.
- Existing Events, central Home, Shop and Contact dock entrances remain; Watch,
  personal edition and reading preferences are available in the full menu. The
  mobile search control now opens shared search. Tickets remain in account/help
  navigation and the existing guest-first `/my-tickets` entrance.

## Preferences and privacy

Home market, followed markets, topics and interface language are explicit choices.
No IP-derived residence or identity merging is performed. The initial market
registry is a controlled pilot registry, not a claim of staffed country desks.
The six existing interface languages do not translate article text.

Guest choices use `ugt-news-preferences-v1`; unavailable storage is labelled
session-only. Reset clears reading selections while preserving the selected
interface language. Neither action changes cookie, marketing or email consent.

Account sync is deliberate. Load account choices before saving them; loading does
not silently apply them to the device. The private API uses the existing validated
buyer identity, an additive foreign-keyed table, versioned compare-and-swap and
an account/version-bound ETag. `If-Match` prevents a form loaded for one account
being saved into another after a session change.409retains local edits and asks
for deliberate reload; expired sessions still permit guest use.

The Control Room market preview starts in Kenya, reads public summaries only and
never saves browser/account preferences. It resolves unavailable/timed-out reads
with a retry action. Publication permission is unchanged.

## Development and rollback

Run `npm run dev:doctor` to inspect prerequisites without printing credentials.
`npm run dev:news` starts the actual Next webpack development server in news mode.
`npm run dev:smoke` uses copied source and a temporary credential-free environment
and verifies real public routes and private API rejection. It creates no accounts,
messages, provider requests or paid resources. Database/session/cron configuration
is required for their respective authenticated/SQL/scheduled features; missing
credentials are not replaced with demo authority.

Use the normal reviewed PR and `wrangler deploy --keep-vars` process. Preserve all
existing bindings, provider flags and cron. The news cutover remains reversible
through its existing flag; a code rollback must retain account preference rows
rather than deleting customer choices. Old media/gallery URLs remain valid.

## Remaining strategy work

These are separate deliverables; this foundation does not claim them operational:

| Area | Existing foundation | Next proof/dependency |
| --- | --- | --- |
| Return visits | Country/topic choices and personal edition | Saved stories/follows with explicit persistence and a useful return path |
| Notifications | Existing consented email/event preferences | A notification center; real opt-in push requires actual owner VAPID/platform credentials and delivery receipts |
| Discovery | Existing GDELT/manual source review and bounded drafting | Curated regional source registry, source provenance and editorial quality measurements; no automatic approval |
| Acquisition | Existing campaigns, placements and referral helpers | Honest promotional kits and consent-aware attribution; no unsolicited messages or fabricated communities |
| Distribution | Current source links, RSS and public article metadata | Approved social variants and bounded queues; actual platform scopes/terms before dispatch |
| Commerce | Existing Paystack-only guest commerce and readiness gates | Merchant/feed configuration and independently verified settlement readiness; no fabricated inventory or gate bypass |
| Native | Browser-installed PWA and shared mobile/private flows | A separately built Android binary, owned signing/store configuration and real device validation |
| Measurement | Consent-aware existing reporting | Defined baseline/conversion experiments; no invented traffic, search ranking or revenue claims |

Native, social distribution, memberships and marketplace readiness require their
own scoped implementation and validation. This list records unfinished work; it
is not a substitute for implementing those later phases.
