# Commerce / Task 1 handoff — 28 October 2026

Resumed the existing implementation on `codex/app-operations-sweep-20261028`
in `/workspace/ugt-main-release-20261012`; preserved all other workers' changes.
No commit, full build/suite, production write, payment, order, message or provider
request was made by this worker. Root owns combined verification/review/release
and any subsequent explicitly authorized live activation.

## Implemented behavior

- Authoritative `made_to_order` metadata is mutually exclusive with tracked
  stock. Public catalogue/detail/controls label manufacture after payment and
  publish no ready-stock quantity. Settlement still validates genuine variants,
  creates fulfillment work, and uses `merch_order_settlements` for durable replay
  protection without an inventory movement for made-to-order items. Existing
  stock-tracked product/variant limits and historical movement receipts remain.
- Checkout rejects an omitted variant when that product has active server
  variants, and continues to price actual active variants on the server. The
  existing active-only price catalogue and delivery-fee resolver were retained.
- Staff can record `in_production` and `delivered`; delivered requires an actual
  delivery/courier/other handover method. Only delivered/collected finish handover,
  rather than dispatch alone. Staff save + history + order completion use one SQL
  statement under the eligible paid-order lock. Open-work counts now follow the
  same states: dispatched remains open, delivered/collected/cancelled close it.
- Private tracking remains separate from payment and exposes no customer
  contacts, address or staff notes. Receipt email/payment confirmation link to
  the existing protected tracker. The client clears old progress when changing
  order/reloading and ignores a superseded response finishing after abort.
- Activated Color Blast catalogue/detail views preserve illustration provenance.
  The shop's featured link uses the loaded active made-to-order product when
  present; the initial/inactive shell preserves the existing design-preview
  presentation. No homepage/channel or new design work was performed.
- `color-blast-activation.ts` imports only the exact 24 current `cb-*` identities
  and 187 existing variants at current displayed STANDARD prices, never event
  prices. All are made-to-order with personalization disabled and no opening
  stock. Targets must be absent; changed/existing identities conflict. A bounded
  six-hour-maximum exact manifest expires before/finally within the database
  transaction. Products, variants and immutable request receipt commit together.
  Replay never overwrites a later staff change. There is no product UPDATE/UPSERT
  or legacy `p1`–`p14` activation path.

The editorial worker confirmed the existing `applyStagedColorBlastActivation`
hook and authenticated cron integration in their staging/cron tests. This worker
did not edit `editorial-library.ts` or the cron route.

## Owned source paths

`lib/server/{inventory,ops,public-products,merch-variants,receipt-email}.ts`,
`lib/server/color-blast-activation.ts`, `lib/shared/merch-fulfillment.ts`,
`lib/shop-discovery.ts`, `app/api/admin/ops/route.ts`,
`app/admin/ops/{Products,MerchDesk}.tsx`,
`app/_components/{CustomerFulfillment,LiveCommerce,ProductPurchase,ShopCatalogueView}.tsx`,
`app/_components/merch/ColorBlastPurchaseGallery.tsx`,
`app/shop/[id]/page.tsx`, `app/pay/success/{page,PaymentStatus}.tsx`,
and `ui/i18n/catalogues/{commerce,account}.ts`.

Focused coverage is in `__tests__/{color-blast-activation,inventory-transaction,
verified-merch-variants,made-to-order-presentation,merch-fulfillment-states,
customer-fulfillment-client,public-products,shop-catalogue-view,
checkout-fulfillment,receipt-delivery}.test.ts` plus the existing compatibility
tests listed below. The shared admin API includes other workers' edits; do not
replace it from an old snapshot.

## Verification evidence

1. Initial resumed focused run: **21 files / 268 tests passed**, exit 0,
   `--no-cache --maxWorkers=2`, 22:48 UTC. Files: color-blast-activation,
   inventory-transaction, verified-merch-variants, made-to-order-presentation,
   merch-fulfillment-states, public-products, shop-catalogue-view, shop-discovery,
   approved-product-page, catalog-availability, catalog-freshness,
   checkout-fulfillment, checkout-quote, checkout-recovery-client,
   merch-personalization, receipt-delivery, legacy-product-worker-guard,
   legacy-merch-retirement, product-presentation, homepage-public-products,
   discovery-metadata-products. Expected failure-path diagnostic output appeared
   in catalog-availability; the legacy worker fixture also logged its existing
   public-cache-write warning while its assertions passed.
2. New regression tests reproduced **three failures before fixes**: the old
   tracker stayed visible for a new order, an aborted parsed response overwrote
   newer progress, and the activated hero still linked to a not-on-sale lookbook.
   After the minimal fixes: **4 files / 27 tests passed**, exit 0, 22:53 UTC.
3. Final compatibility run: **10 files / 76 tests passed**, exit 0,
   `--no-cache --maxWorkers=2`, 22:54 UTC. Actual complete log:
   `/workspace/artifacts/ugt-app-operations-20261028/commerce-final-focused.log`.
   Command file arguments:
   `__tests__/{customer-fulfillment-client,shop-catalogue-view,
   made-to-order-presentation,merch-fulfillment-states,card-fulfillment,
   payment-recovery-fulfillment,settlement-integrity,payment-callback-boundary,
   receipt-fulfillment-lines,product-cache-retirement}.test.ts`.
   Provider/database/email effects in these tests are mocked; no live tests.
4. Changed-commerce ESLint: exit 0, **0 errors / 40 warnings**. The complete log
   is `/workspace/artifacts/ugt-app-operations-20261028/commerce-eslint.log`.
   Warnings include existing `any`, image/link and effect-state patterns; this is
   not a claim of warning-free lint. Commerce `git diff --check` passed.
5. The private helper passed `node --check` and an actual offline execution.
   Additional assertions verified phase-only preview/apply differences, exact
   24 targets/187 variants, matching collection hash, private directory/file
   modes, refusal to overwrite an existing output directory, and rejection of
   validity over 360 minutes without output creation.

No physical-device, rendered-browser, full integrated type/build, live database
transaction or deployed-catalogue verification is claimed here. Root retains
those combined release checks. Counts above overlap and must not be added.

## Private activation operator handoff

- Instructions:
  `/workspace/artifacts/ugt-app-operations-20261028/COLOR-BLAST-ACTIVATION.md`
- Preparation-only helper:
  `/workspace/artifacts/ugt-app-operations-20261028/prepare-color-blast-activation.cjs`
- Offline sample output / exact standard-price review:
  `/workspace/artifacts/ugt-app-operations-20261028/activation-helper-offline-check-20261028/review.json`
- Current approved collection hash:
  `c277e87c6e5f59bef882e0ea4f754e1d10bbe4798d145dc99913c73c1d05e0c9`

The helper evaluates the actual checked-out builder with all storage imports
blocked and writes a new private local directory only. Generate fresh manifests
after source/release review. Existing authenticated cron consumes
`catalogue-activation/pending-v1`; private result key is
`catalogue-activation/status-v1`. Preview must show eligible 24 / activated 0 /
conflicts 0 / not expired for the exact request before staging its apply phase.
Any conflict or expiry stops activation; no overwrite or stock invention follows.
