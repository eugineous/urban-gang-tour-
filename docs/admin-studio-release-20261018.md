# Admin studio release — 18 October 2026 (Nairobi)

The owner explicitly instructed pushing, merging PR74 and deploying to the main
site after disclosure of the intermittent React hydration error. The request
authorizes this release, not future changes or any weakening of admin access.

Release marker: `admin-studio-release-20261018-v1`.
Target: existing `urban-gang-tour` Cloudflare Worker and both existing custom
domains. Preserve secrets, upload KV, self-reference, rate limiter and cron.
The service-worker namespace and release client advance together; no forced
reload is introduced while an administrator is editing.

Included: event publishing/discovery/categories, focused story and photo-library
workflows, and published page-copy editing for five existing pages. See API.md
and the reconstruction checkpoint for exact limits. This is not a complete
redesign of every operations module or proof of provider delivery.

Known risk: prior production-bundle UI runs intermittently raised React error
#418. Other complete runs passed. The cause is unresolved; a clean release check
must not be presented as proof of resolution. Retain normal error reporting.

Release checks must include tests, TypeScript, a normal Cloudflare build, frozen
Worker UI regressions, and post-deployment read-only checks on the main domain.
Never test a real payment, message or booking as a release smoke check.

Schema additions preserve existing data, revisions and image bytes. New schema
initialization happens through existing authenticated workflows, not a new public
bootstrap endpoint. Do not downgrade announced records, remove history or restore
an unversioned media writer to roll back. Use a compatible application correction
if necessary; older event CHECK definitions cannot safely accept announced rows.
