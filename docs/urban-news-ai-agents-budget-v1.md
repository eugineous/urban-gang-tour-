# Urban News: low-cost newsroom agents, stage 1 (review required)

Date: 23 November 2026. No production deployment or paid provider calls are authorized by this branch.

## What already exists

The existing Control Room can store/delete managed Gemini, OpenAI and Qwen API credentials, switch the active model and approve private articles. QwenCloud is contacted only from the private server endpoint. Approved stories are the only ones eligible to become public. Public comments are NOT automatically posted.

## Safe agent division

1. Discovery: GDELT metadata and owned reporting tips. Zero model tokens. Never treat discovery as verification.
2. Evidence desk: people examine primary sources, rights, independent verification and rebuttal. Human authority.
3. Draft assistant: one bounded model request from checked excerpts only; Qwen Flash preferred for economics. Human approval required to publish.
4. SEO/packaging: deterministic metadata first. Later, bounded AI assistance, not auto-ranking claims.
5. Community-response desk: deterministic, zero-token suggestions with manual review/copy; sensitive and correction requests held for an editor.
6. Distribution: only previously approved material, opt-in targets, idempotency, consent and per-platform verification. NOT enabled by this release.
7. Cost and quality auditor: read-only budgets, state records, failed calls, corrections and human outcomes.

Avoid recursive multi-agent conversations. Use the existing PostgreSQL workflow and existing Cloudflare schedule; durable job steps should reserve limits before a provider request. The monthly budget control is not an invoice: each request reserves a conservative amount, including uncertain outcomes. Legacy dispatched runs without reservations are treated as 50 cents each for the current UTC month.

## Provider controls

Owner can toggle the Qwen/Gemini/OpenAI dispatch permissions independently, keep/delete each managed credential, select the single active provider and set a strict application reservation ceiling between USD 3.00 and USD 5.00 per UTC month. No automatic cross-provider fallback. Only Qwen is permitted by default for a fresh budget policy. Gemini and OpenAI remain configured as optional providers, but must be explicitly enabled before dispatch. Existing credentials are preserved. The owner may enable individual providers when desired.

The cost guard applies to this Urban News draft pipeline only. It is not a hard external billing limit, and it does not cover account usage from other apps, other sites, provider-side tools or earlier unmetered calls. Set QwenCloud Pay-as-you-go spending alerts in the provider console and reconcile actual bills regularly. Production API credentials remain private.

## Indicative per-dispatch reservations

| Provider / model | Reserved USD cents per dispatched article |
| --- | ---: |
| Qwen `qwen-flash` | 2 |
| Other allowlisted Qwen | 25 |
| Gemini | 25 |
| OpenAI | 50 |

These are intentionally *higher than expected usage costs*, not vendor rates. They require review against actual model charges and can cause early suspension even with money still available. The request builder refuses more than 48,000 JSON characters of checked evidence and caps draft output at 4,500 tokens. A provider may still charge more than the reserve, so billing alerts are mandatory.

Source references (as reviewed 23 Nov): [QwenCloud qwen-flash](https://docs.qwencloud.com/models/qwen-flash), [QwenCloud billing](https://docs.qwencloud.com/resources/bill-query), [AP newsroom AI guidelines](https://www.ap.org/the-definitive-source/announcements/ap-updates-newsroom-standards-for-artificial-intelligence/), [Reuters Institute BBC Eye agent reporting](https://reutersinstitute.politics.ox.ac.uk/news/how-bbc-eye-built-multi-agent-ai-system-sift-through-ten-thousand-russian-social-media-posts).

## Verification gates before deployment

- Run `npm ci`, `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run cf:build` against this branch.
- Run isolated PostgreSQL fixture tests for legacy tables, concurrent budget reservations, budget downgrade while prepared, provider disabling mid-run, token accounting, same-request replay, credential deletion and provider key rotation.
- Confirm that the API returns no keys or customer messages, controls are owner-only, and changing monthly controls does not mutate newsroom config revisions unexpectedly.
- Check that Qwen Flash supports this exact JSON-schema response contract with a deliberately authorized low-volume test. No real calls are performed by this branch.
- Inspect private news Control Room on mobile and desktop, verify one source-to-approved-story transaction and no automatic public reply.
- Reconcile provider invoices and application reservations. If a charge unexpectedly exceeds the reservation, suspend dispatch and correct cost policy before release.

Release by reviewed PR only. Do not auto-merge or deploy.

### Owner setup and first story

Open the [Urban News desk](https://urbangangtour.co.ke/admin?tab=Urban%20News) with the owner account. Under **Provider access and automation**, choose the credential provider before pasting its full key. Show/hide and discard apply to the current paste. A saved key is write-only. Remove deletes the managed copy. An environment key, if configured, is reported separately. Use the API switch to block new dispatches from either source. Revoke the original credential in its provider console if needed.

For QwenCloud Singapore select **QwenCloud** as the writing provider and **qwen-flash** as the model. Confirm provider terms, select automatic discovery/drafting as desired and save settings. NVIDIA uses the fixed NVIDIA hosted chat endpoint and the Nemotron 3.5 Lightning adapter; enable its switch explicitly. One encrypted credential per supported provider is retained. Provider rejection is reported on actual generation. Saving a key does not send a paid test.

**Open Kenya music brief** prepares a free, dated, editable story from Apple Music’s public Kenya most-played feed. It validates the source, market, timestamp and song identity. Repeated imports of the same song reopen the existing candidate. Verify the snapshot and publish the saved version, or select **Generate draft** to run the configured model. The chart never licenses an image. Discovery also imports entertainment leads from GDELT; those require checked facts before generation. An editor may correct a published article or retract it from the public site.

Use **Check model access** after saving a key. QwenCloud, OpenAI and Gemini use authenticated model metadata. NVIDIA exposes a public model catalogue, so its result confirms listing only. No check generates text or opens a billing plan.
