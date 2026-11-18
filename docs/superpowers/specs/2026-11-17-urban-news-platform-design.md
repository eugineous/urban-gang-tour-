# Urban News platform

The owner explicitly requests the next phase and confirms **Urban Gang Tour +
Urban News**. The product becomes a global entertainment newsroom, events/ticketing
destination and merchandise shop. Existing host profiles and magenta identity stay.
Android-first is retained as a subsequent native target using this final structure.

## Architecture and cutover

Extend the existing Next.js/Neon/Cloudflare application. Reuse the /blog canonicals,
article renderer, public media gates, RSS/news sitemap and admin authentication.
URBAN_NEWS_ENABLED=true selects the new public lane and homepage; false retains
the old application for rollback. Never delete old posts/manuscripts. In news mode,
the old rows are a private archive and old article URLs are genuine noindex404s.
Provider keys and automation settings are separate from this public cutover.

Use private urban_news_candidates, revisions/audit, evidence and provider-run
records. Publish an approved snapshot into posts with an urban_news_id marker,
revision and public-only payload. These rows are not editorial_managed: the old
managed library has a one-article-per-day unique index. Both legacy public
eligibility and generic content/social mutations must exclude the new marker.
News-mode public eligibility accepts only published, live, revision/hash-approved,
due Urban News snapshots. No private evidence excerpts or credentials are public.

Editing a live story creates a private new revision while keeping its approved
version public. Publication checks expected draft revision/hash and expected live
revision, atomically updates the projection and audit, and returns409on a race.
Corrections require an explanatory note; retraction independently removes public
eligibility. Failed generation/publication preserves the current approved version.

## Editorial policy

Coverage: celebrity, music, screen, creators, style, sport and culture; politics
is outside routine discovery. Exceptional public-interest crossover requires
editorial review. Write original, accessible English with visible sources and
clear confirmed/attributed/developing status. Do not fabricate quotes or timelines.
Observation time is not event time. Rewriting or saying unconfirmed does not
guarantee accuracy or remove legal risk.

Source URLs, publishers, timestamps, bounded excerpts, rights status, independence
keys and claim/evidence references travel with each revision. Discovered metadata
alone is not checked evidence or image permission. Never copy entire publisher
articles/photos, bypass access restrictions or invent corroboration. Only owned
or expressly licensed images can publish; otherwise use existing owned brand art.

Automate discovery, canonicalization/deduplication, clustering and structured draft
generation. Provider output never approves itself. Publication requires owner
review against the exact revision/hash, source/rights/attribution checks and
additional notes for sensitive reporting. Sensitive/unknown/incomplete claims
cannot self-publish from automation. Scheduled release may publish only an exact,
unchanged, explicitly owner-reviewed revision, including attributed/sensitive
reporting only after the required source checks and review notes. Never infer
approval from AI labels. Holding a private correction preserves the live version;
only the owner retraction command withdraws a current public projection.
Do not expose private personal information or unsupported allegations.

## Providers and budgets

GDELT DOC2 supplies discovery metadata from its fixed HTTPS endpoint. One bounded
request per normal scheduler invocation, overlapping recent windows, maximum50
results, canonical URL deduplication, 8-second header/body deadline and bounded
response. Respect429/backoff and show unavailable/stale state honestly. Metadata
licensing does not confer publisher image/article reuse rights. Retain at most500
unpublished discovery candidates, preserving any drafted/reviewed/live records.

Google Gemini is a text-only private editorial adapter, not a public chat or Google
Search Grounding syndication service. Optional OpenAI text adapter uses its fixed
official endpoint. No arbitrary provider base URLs, tool calls, fetched prompts or
source-directed actions. Validate structured output, evidence IDs, finish/safety
state, size and copied-text limits before saving a private draft. Insufficient
evidence becomes a held item. Model success never establishes a fact check.

Provider/model eligibility and terms must be explicitly configured before use;
Google quotas/regions/age and free-tier data-use restrictions are not assumed away.
Keys may be entered only by super-admin into dedicated AES-GCM encrypted storage
derived from the existing SESSION_SECRET context, or supplied by server secrets.
GET returns booleans/provider/model only. No key is stored through generic settings,
returned to the browser, included in prompts/URLs/logs or sent to another provider.

Durable daily budget reservations precede dispatch. Default LLM limit2/day,
discovery96/day, at most1provider request per job. A dispatched uncertain job is
not automatically resent. Installing a key does not enable automation. Discovery
and drafting are opt-in; manual private editing/review remain usable without a key.
No paid service/account/automatic upgrade is created. No live tests spend tokens.

## Admin and public experience

Content staff can research, edit and request drafts. Super-admin configures keys,
automation, approvals/publication and retraction. Existing Newsroom pitches stay
distinct as tips; the new Urban News desk shows inbox, evidence, revisions, review,
publication, provider readiness and recent bounded operational failures. Every
write uses strict Origin, permission, rate/stream limits and expected revisions.
Ordinary settings/history responses never reveal private keys.

The homepage leads with real eligible news, then upcoming events and the existing
compact two-column phone shop preview. No fake stories, dates, reader counts or
breaking banners fill an empty feed. Retain founder/booking/contact destinations
as secondary navigation. Mobile navigation adds News while keeping Home central,
Events/Shop/Contact accessible and a prominent My tickets header action.

Use current Inter/magenta/neutral primitives and Charles Unslop craft: actual source
links, readable density,44pxcontrols, stable loading/error/empty state geometry,
native dialogs and reduced motion. Preserve all private-route tracking exclusions.
Public article source/verification/correction/disclosure panels and editorial-policy
page explain what was checked; never promise immunity from litigation.

## SEO, operation and development

Use NewsArticle JSON-LD, truthful publication/modification dates and one canonical
per article. Feeds, sitemap,48-hour/1,000-entry news sitemap, image eligibility and
edge404/503guards use the same new-lane predicate. Indexing hints do not guarantee
Google/Google News/Baidu ranking or country access. No misuse of Google's Indexing
API, which is restricted to jobs and qualifying livestreams.

Add a protected urban-news job to the existing quarter-hour scheduler, preserving
all old jobs/bindings. Old library approval manifests cannot make archived stories
public in news mode. No social crossposting is introduced; it is the owner's
explicit next phase. Provider/readiness failures appear in the admin and health
status without secret/error payload leakage.

Verify npm dev startup on loopback and a read-only smoke/doctor path. No credentials
or fake production accounts are needed to see honest public empty/readiness states.
Use isolated SQL/API/browser fixtures for actual writes, source/provider failures,
deduplication, budget fencing, approval/correction/retraction races and secret
boundaries. One final integrated build/review/normal PR/keep-vars deployment; no
live charges/messages/publication or model calls as tests.

Sources: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
https://gdeltproject.org/about.html
https://aistudio.google.com/docs/terms
https://aistudio.google.com/docs/structured-output
https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
https://developers.google.com/search/docs/essentials/spam-policies#scaled-content
