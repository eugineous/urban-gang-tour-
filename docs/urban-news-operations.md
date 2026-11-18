# Urban News operations and development

Urban Gang Tour now has a separate entertainment newsroom, alongside events and
merchandise. `/blog` remains the canonical Urban News route. Set
`URBAN_NEWS_ENABLED=true` to select the new public lane; false restores the legacy
public interface. Existing manuscripts remain stored privately in news mode.
This change does not create an Android binary or enable social broadcasting.

## Start development

Use Node 20.9+ and `npm ci`, then `npm run dev:doctor`. Copy `.env.local.example`
to `.env.local` only when configuring real development services. Keep it ignored.
`npm run dev` respects your configured lane; `npm run dev:news` explicitly selects
Urban News. Both select webpack, which supports this project’s custom loaders.
Asset synchronization preserves source timestamps so unchanged images need not
be recompressed on each startup. Use a separate development
database and existing authorized admin credentials for editing; there is no auth
bypass. The signing secret must be strong and at least 16 characters for encrypted
provider storage. Never paste production credentials into tests or chat.

`npm run dev:smoke` starts a temporary loopback development project, removes external
credentials from its environment, checks public pages and unauthenticated admin
boundaries, then removes its own build output and stops its own process. It neither
publishes stories nor contacts a model. Missing database/session/provider settings
are reported honestly by the doctor. With no database, public content uses empty
states and the private editor reports unavailable storage; it does not pretend to
save. Authenticated browser fixtures and disposable PostgreSQL tests cover saving.

## Manual editorial workflow

Open Control Room → Urban News. Content staff can add a source, edit a private
draft and request discovery/writing. Only the owner can install keys, change
automation settings, approve publication or retract a live story. The older Stories
and Newsroom modules preserve historical manuscripts and submitted pitches; they
cannot publish into this new lane.

1. Add your own source URL or use Find stories. Discovery only collects GDELT
   metadata and links; it does not grant rights or verify a claim.
2. Open the source and record a factual excerpt, publisher, independence and rights.
   Mark it checked only after reviewing it. Coverage country is Global or an ISO
   two-letter code; the publisher’s country is not the story’s location.
3. Write manually, or explicitly request Generate draft after configuring a provider
   and confirming the project’s terms. The model receives only checked evidence.
   Manual clicks work with scheduled automation off, within the same durable limits.
4. Check every paragraph and its claim/source links. Supply your own or licensed
   image through the image field, or leave it blank. Public pages use an owned brand
   placeholder; discovered publisher images are never copied automatically.
5. Save, then have the owner attest to facts, rights and attribution for that exact
   revision. Sensitive reporting needs additional notes; unknown risk cannot publish.
   Optional scheduling uses the editor device’s local time and the existing
   quarter-hour scheduler. Publication is not guaranteed to run at the exact second.

Private edits and Hold draft preserve the approved live version. A correction needs
its own note and new approval. Only Retract story removes the public version. A
concurrent-edit conflict retains typed text; reload/compare before replacing it.
Unsaved drafts stay in memory while switching Control Room modules and warn before
leaving the page; save before closing the browser. They are not a durable offline copy.

## Providers, limits and recovery

Find stories uses fixed-origin GDELT metadata. Google Gemini and optional OpenAI
provide text-only drafting; there is no Search Grounding syndication or arbitrary
URL scraper. API keys stay in server-only environment bindings or dedicated
AES-GCM encrypted database records, never public settings or browser storage.
Rotating the existing session signing secret makes old managed keys unreadable;
reinstall them afterward. Saving/removing a key pauses automatic drafting.

Default scheduled discovery and drafting are off. Confirm applicable provider terms
and quota/cost eligibility before enabling either. Defaults are 2 model drafts and
96 discovery requests per UTC day; owner limits are bounded at 100 and 96. Installing
a key alone authorizes no automatic provider dispatch. A free provider tier is not a
promise of unlimited free service or permanent availability.

Each provider job reserves its daily slot before one dispatch. Repeated tabs or
request IDs for the same saved input recover its stored result; an unknown sent
outcome is never automatically retried. Save a genuinely new revision to request
fresh writing after reviewing a failed result. A prepared reservation from an older
UTC day cannot dispatch. HTTP 429 triggers a 15-minute backoff. Provider failure
never withdraws an existing approved correction. The discovery inbox has 500 slots
for untouched candidates; existing drafted/reviewed/live material is never pruned.

Public pages expose source links, verification status, actual dates, AI disclosure
and correction notes, not private excerpts, review notes, keys or audit records.
Unconfirmed wording does not eliminate legal liability. Ranking, global access and
Google indexing are not guaranteed. Submit the existing sitemap in Search Console;
ordinary news articles are not eligible for Google’s job/livestream Indexing API.

## Release and checks

`npm test`, `npm run lint`, `npx tsc --noEmit --incremental false` and
`npm run cf:build` exercise the combined application. Opt into only disposable,
network-isolated SQL fixtures with `UGT_URBAN_NEWS_PG_FIXTURE=1` and the two
`urban-news-*-postgres.integration.test.ts` files. Never point these fixtures at
`DATABASE_URL`. Provider/browser tests intercept outbound requests.

The existing worker schedule now includes `/api/internal/cron/urban-news`, protected
by the existing cron secret. Preserve existing bindings and cron with a keep-vars
release; the only intentional new binding is the nonsecret news cutover flag.
Verify public eligibility, admin 401, old article 404, private cache controls, event
and shop access after deployment. No live test purchase or model call is required.
