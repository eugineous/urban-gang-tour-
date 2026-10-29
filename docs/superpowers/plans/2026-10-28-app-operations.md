# App and operations Implementation Plan

> For agentic workers: use subagent-driven-development with disjoint task scopes.

**Goal:** Complete existing PWA, made-to-order shop/tracking, business documents,
payment readiness and scheduled artwork in one verified release.
**Architecture:** Reuse existing Next/OpenNext app, DB ledger, private cron operator,
PDF suite and native locales. No parallel commerce or notification backend.
**Spec:** docs/agent-work/app-operations/DESIGN.md
**Tech Stack:** Next.js, React, TypeScript, PostgreSQL, Cloudflare Worker/KV/R2.

## Global Constraints
Preserve authentication, roles, data privacy, consent, native languages and hero.
No live financial/message tests, fake credentials, stock or paid/tax/delivery claims.
Use displayed standard collection prices; retire p1–p14 permanently as before.
Publication artwork is image-only, exact-record guarded and journalled.
Use the existing isolated worktree and tested PR/normal merge/keep-vars release.

## Review Focus
- Repeated made-to-order variant sales must remain available; tracked stock limits
  and settlement idempotency must still hold.
- Forged/weak order refs or wrong-owner tracking cannot leak address/contact data.
- Blocked PDF download and unpaid order receipt must show safe, actionable feedback.
- Offline/update/install notices must not discard an active checkout/form or cache
  private responses; denial of storage/install must not break navigation.
- Scheduled artwork conflicts/held stories must not publish text or alter schedules;
  absent payment credentials must never present a working provider.

## Task 1 — Commerce, production tracking and activation
**Files:** lib/server/{inventory,ops,public-products,catalog,checkout-fulfillment}.ts,
existing product/detail/cart/fulfillment UI and relevant API; new focused collection
activation module/tests. Own these files; coordinate shared provider files first.
**Interfaces:** add explicit made_to_order metadata to authoritative DB product
and all availability readers; staff controls record real production/delivered steps.
- [ ] Add failing tests e.g. `expect(secondMadeToOrderSale.available).toBe(true)`;
  tracked unavailable variants still reject and duplicate settlement is a no-op.
- [ ] Implement made-to-order end to end, standard-price exact collection activation
  with existing real variants, no inventory movements pretending stock existed.
- [ ] Extend actual tracker and add entry links from paid confirmation/receipt mail.
  Assert public JSON excludes address/contacts/notes and weak references reject.
- [ ] Run commerce/security focused tests; report changed paths and evidence.

## Task 2 — Admin documents, receipts and notices
**Files:** app/admin/{AdminApp.tsx,docs/DocGen.tsx,ops/ui.tsx}, lib/server/docgen.ts,
new scoped shared admin notice component/CSS, receipt helper and focused tests.
**Interfaces:** use existing authenticated `/api/receipts/[id]/pdf`, not new ledger.
- [ ] Write failing tests for unpaid receipt and failed download feedback.
- [ ] Replace old raw-ID print receipt with existing guarded branded PDF path.
- [ ] Unify persistent dismissible status/error notices, 44px close targets,
  mobile reflow; no automatic important-error dismissal.
- [ ] Inventory registry and add missing useful manual operational formats (delivery
  note/purchase order/credit note/customer statement) only as clearly staff-entered
  drafts/attestations, with safe consistent PDF design and no fake verification.
- [ ] Run receipt/document/registry/security and notice tests; report evidence.

## Task 3 — Existing PWA install, connectivity and update experience
**Files:** app/_components/InstallableApp.tsx, new app/app route/client/scoped CSS,
public/manifest.json, public/sw.js, shell/footer only with coordination and tests.
- [ ] Add failing service-worker private-cache/install/update tests.
- [ ] Build explicit install entry with Android/browser prompt, iOS instructions,
  installed/unsupported/offline states and useful shop/tracker/tickets links.
- [ ] Add restrained accessible connectivity/update notices. Never unsolicited push
  permissions or automatic reload while entering a form/payment.
- [ ] Add manifest shortcuts; preserve private/API exclusions and safe cache bounds.
- [ ] Run service-worker/installed-app tests and local responsive browser proof.

## Task 4 — Scheduled artwork and neutral public caption
**Files:** lib/{story-artwork.ts,server/story-artwork.ts,server/editorial-library.ts},
editorial caption presentation, exact operator tests; private artifacts only.
- [ ] Test future approved scheduled target eligibility, held/conflict/expiry rejection,
  exact-record atomic image-only mutation and no public release before due.
- [ ] Extend private operator inspection/application for scheduled images, keep max10
  exact targets per batch, truthful provenance, expiry/journal and idempotency.
- [ ] Normalize synthetic visible caption to Editorial illustration; alt describes
  image rather than advertising generator. Do not change article text/status/date.
- [ ] Inspect current private eligibility, generate appropriate commissioned imagery,
  validate/hash/upload/readback assets, then exact guarded batches after deployment.

## Task 5 — Payment readiness and Pesapal preparation
**Files:** new server-only Pesapal adapter/config/readiness/tests and docs. Existing
Daraja/checkout mutations only after coordinating Task1 ownership.
- [ ] Test absent credentials, wrong amount/currency/reference, forged/duplicate
  callbacks and provider uncertainty before success/idempotent fulfillment.
- [ ] Reuse authoritative ledger/provider boundaries. If a full secure Pesapal
  checkout cannot meet all acceptance cases, deliver verified config readiness/
  adapter and keep provider disabled rather than ship a misleading live option.
- [ ] Document exact credential/callback/activation procedure without any secrets.

## Integration and completion
- [ ] One combined full test suite, types, changed-file lint, Cloudflare build.
- [ ] Local actual Worker phone/tablet/desktop/installed-app/customer-flow/PDF checks.
- [ ] Independent whole-branch review; consolidate corrections once.
- [ ] Normal PR merge + Cloudflare keep-vars deploy with binding/cron snapshots.
- [ ] Exact catalogue/artwork data application and read-only live checks; report
  actual activation limits and missing credentials, not "everything perfect".

## Owner-added Task 6 — Vendor and partner documents
**Files:** new app/vendors route/scoped UI, scripts/generate-vendor-documents.mjs,
public/downloads/vendor-application.pdf and sponsorship-partnership-pack.pdf,
new focused tests, /partners CTA and lib/site.ts route entry.
- [ ] Research official food hygiene/local permits/marketing/measurement sources;
  record actual applicability and avoid implied WHO/UN/ICC certification.
- [ ] Generate exactly2 A4 pages for vendor applications with editable fields,
  Main Vendor KES30–45k and Minor Vendor KES10–15k, useful operational/evidence/
  declaration/privacy fields and explicit application-not-acceptance terms.
- [ ] Provide a separate2-page sponsor/partner opportunity and enquiry pack with
  scoped activation/measurement options, no invented fees/audience/benefits.
- [ ] Verify PDF page counts/fields/text/geometry and responsive public download
  journey. Reuse existing private email/enquiry channels, no new PII endpoint.

## Owner-added Task 7 — Browser and search visibility
**Files:** app/sitemap.ts, focused public-sitemap test, evidence report.
- [ ] Compare canonical/noindex/robots/sitemap/public-page HTTPS responses;
  distinguish header-only evidence from a real browser engine test.
- [ ] Check ordinary public search results and official engine guidance without
  CAPTCHA bypass or external registration/submission.
- [ ] Fix reproduced missing indexable /app sitemap entry; preserve future/private/
  retired-product gates. Record Brave's actual UGT results and Bing uncertainty.
- [ ] Document managed Baidu/Petal restrictions and category-control limits; do
  not weaken all AI-training protection under the claim of a narrow crawler fix.
