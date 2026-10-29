# Browser access and search visibility — 28 October 2026

Read-only production observations: 2026-10-28, 22:55–23:00 UTC. These are
observations from this execution environment, not promises about every browser,
country, search result or future crawl.

## Findings

- Direct public HTTPS access works in the sampled requests. Edge, Brave-compatible
  Chromium, Firefox, Safari, Samsung Internet, Opera, Bingbot, YandexBot and
  Baiduspider user-agent headers all received HTTP 200 for the homepage. Each
  response used `https://urbangangtour.co.ke` as canonical, without a robots
  `noindex` meta tag or `X-Robots-Tag` header. A user-agent header does not run
  the corresponding browser, verify a genuine crawler or certify rendering.
- Brave Search already exposes site URLs: the ordinary public domain query
  `urbangangtour.co.ke` returned `/blog/lari` and
  `/blog/school-talent-shows-kenya`. The quoted brand query `"Urban Gang Tour"`
  instead exposed the GitHub repository in the inspected results. Therefore
  "Brave cannot access the website" and "the site is entirely absent from Brave"
  are not supported conclusions. Brand-query visibility can still be weak.
- Bing returned unrelated results for the quoted brand and domain queries in
  the inspected first page. This is evidence of poor discovery for those queries,
  not proof that Bing has indexed no site URLs. No authenticated Bing inspection
  result or crawl log was available.
- Yandex's public queries redirected to its CAPTCHA; inspection stopped there.
  DuckDuckGo returned an HTTP 202 JavaScript shell without inspectable results.
  Neither engine's index status was established. The research web tool also
  could not open these search result pages; ordinary public HTTPS responses were
  used where accessible. No CAPTCHA, challenge, paid API or access-control bypass
  was used.
- A real crawler preference restriction exists outside the application:
  Cloudflare prepends managed robots rules explicitly disallowing `Baiduspider`
  and `PetalBot`, among other crawlers. This can deter compliant crawlers even
  though the origin's wildcard group allows public pages. It does not establish
  an HTTP firewall denial: the sampled Baiduspider-header request returned 200.

Public query URLs inspected:

- `https://www.bing.com/search?q=%22Urban%20Gang%20Tour%22`
- `https://www.bing.com/search?q=urbangangtour.co.ke`
- `https://search.brave.com/search?q=%22Urban%20Gang%20Tour%22`
- `https://search.brave.com/search?q=urbangangtour.co.ke`
- `https://yandex.com/search/?text=%22Urban%20Gang%20Tour%22`
- `https://yandex.com/search/?text=urbangangtour.co.ke`
- `https://duckduckgo.com/?q=%22Urban%20Gang%20Tour%22`
- `https://duckduckgo.com/?q=urbangangtour.co.ke`

## Public crawl signals

`/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml` and `/image-sitemap.xml`
returned HTTP 200 with text/XML content types. Robots advertises all three
sitemaps. `/about`, `/blog` and `/partners` returned 200 with their own canonicals
and no sampled noindex directive. Homepage HTML includes WebSite and breadcrumb
structured data; blog HTML also includes the news publisher and collection data.
Schema presence alone does not establish rich-result eligibility.

HTTP bare/www home requests redirect 308 to HTTPS on the corresponding host.
HTTPS www serves 200 with the bare-domain canonical. No access failure was
reproduced in those chains.

The main sitemap contained 181 distinct URLs, including 119 articles. The public
`/api/site-data/posts` feed also contained 119 articles; their canonical URL sets
matched exactly. None had a future publication instant (legacy date-only values
interpreted at Nairobi midnight). No sampled sitemap URL exposed an account,
admin, API, checkout, payment, receipt, ticket-token or tracking route, or retired
`/shop/p1`–`/shop/p14` product. The RSS feed is capped at 50 entries, so it is not
an exhaustive comparator. The image sitemap contained 144 page URL groups; the
news sitemap was empty, which is valid when no eligible NewsArticle is within
its 48-hour window. Analytical guides remain excluded from the news-only feed.

Existing source gates were preserved: all article sitemaps consume
`getBlogPosts()` and its approval/revision/hash/publication-time predicate;
product discovery selects `active` records; event discovery uses public lifecycle
states and valid partner details. No unpublished URL was requested or submitted.

## Cloudflare evidence and bounded options

At `2026-10-28T22:59:42.391Z`, the 2,937-byte decoded UTF-8 robots response had
SHA-256 `629fe0c437b35d2ffbf9c39674e7b669c014aa14ea1edabe7f89cb97f4b123e4`.
The 1,341-byte block from `# BEGIN Cloudflare Managed content` through
`# END Cloudflare Managed Content` had SHA-256
`721ae6e2ce52c06c982018009435ba8a71a49c5348b05ce6d1f3c159b7bc76ae`.
Response status was 200; content type was `text/plain; charset=utf-8`.

Read-only API inspection resolved the active `urbangangtour.co.ke` zone and
successfully read `GET /zones/{zone_id}/bot_management`:

```json
{
  "ai_search": "disabled",
  "ai_user": "disabled",
  "ai_training": "disallow",
  "ai_bots_protection": "only_on_ad_pages",
  "is_robots_txt_managed": true,
  "bot_preference_sync_enabled": true,
  "cf_robots_variant": "off",
  "fight_mode": false,
  "enable_js": false,
  "content_bots_protection": "disabled",
  "crawler_protection": "disabled"
}
```

The custom-firewall entrypoint GET returned Cloudflare error 10003: no
`http_request_firewall_custom` entrypoint ruleset. This does not rule out every
other security mechanism, bot-source-IP rule or geography-specific restriction.
Read permission is established; write permission was not tested.

[Cloudflare's managed robots documentation](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
explains the prepended content and Bot Preference Sync. Training disallow can
generate robots rules and edge blocking, with mixed-use crawlers excluded from
the training edge block. Search and Agent policies are separate. The live Search
policy is already disabled, so changing it would not repair these directives.

[The official update API](https://developers.cloudflare.com/api/resources/bot_management/methods/update/)
is `PUT /zones/{zone_id}/bot_management` and requires **Bot Management Write**.
Its documented controls are category-wide; no field selectively omits only
Baiduspider/PetalBot from managed robots. Disabling training policy or managed
sync broadly would change the existing training preference. That was not done.

[Per-crawler Allow/Block controls](https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/)
control access through WAF rules; they are not documented as a selective rewrite
of managed robots directives. No matching custom firewall block was found to
remove. An eventual deliberate policy change needs to preserve training
restrictions and verify the final robots response as well as access. No duplicate
user-agent workaround, broad AI allow, dashboard write, Worker binding or cron
change was made.

## Local repair and verification

The new public `/app` install/help page has its own canonical and indexable
metadata, confirmed by its implementer, but was absent from sitemap output.
Added `/app` to the existing standalone public-page list. A regression test first
failed because the URL was absent, then passed with exactly one canonical entry
and private account/order journeys excluded. `/vendors` is registered separately
by its owner in `ROUTES`, which this sitemap already consumes.

Focused verification: 36 tests passed across `public-sitemap`, `search-discovery`,
`editorial-feed-times`, `discovery-metadata` and `ticketing-guide`. The existing
Vite CJS deprecation notice appeared; no test failed. Scoped ESLint and diff
whitespace checks passed. The root agent owns combined build/review/deployment;
the local addition has not been described as deployed here.

## Engine guidance and remaining dependency

[Microsoft Bing guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)
recommend canonical sitemaps, crawlable links, accurate modification dates and
IndexNow. These make content discoverable; they do not guarantee visibility.
Authenticated URL Inspection/Site Explorer evidence is needed to establish an
actual Bing exclusion cause. The direct help page is a JavaScript shell in this
environment; its guideline text was available through the research index.

[Brave's crawler documentation](https://search.brave.com/help/brave-search-crawler)
says it has its own crawler, does not advertise a distinct crawler user agent,
and will not crawl content unavailable to Googlebot. A Brave browser header
therefore cannot verify Brave Search crawling. Its indexed domain results above
are stronger evidence of existing discovery than a browser-header simulation.

[IndexNow's official FAQ](https://www.indexnow.org/faq)
explains that submissions inform crawl scheduling and do not guarantee immediate
indexing. The existing publication integration was left intact; no test pings,
repeated submissions or private URLs were sent.

[Yandex's sitemap guidance](https://yandex.com/support/webmaster/en/indexing-options/sitemap)
supports discovery through robots sitemap directives or Webmaster registration.
Existing directives already satisfy the former. No Bing/Yandex account
registration, new credential, manual engine submission or external message was
performed. Search inclusion, relevance and ranking remain engine-controlled;
none of these checks certifies worldwide availability or ranking.
