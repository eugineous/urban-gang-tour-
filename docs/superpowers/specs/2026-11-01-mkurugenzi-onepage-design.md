# UGT one-page storefront and honest checkout

## Intent and source

Owner asks to recreate Mkurugenzi's public UI/UX as one UGT page, using microcards
instead of module lists, real posts, and a functional shop. Preserve existing
commerce backends and UGT identity; do not create another hosted app. Standing
instruction is autonomous execution without repeated approval questions.

Public source captured at1440x1000 and390x844,7desktop/29mobile scroll captures,
DOM/style/font/link evidence in private ugt-mkurugenzi-20261101/reference.
Observed structure: logo/search/account/cart masthead; centered navigation;
landscape image hero; three category image cards; compact product grid; floating
mobile Home/Search/Shop/WhatsApp/More bar; footer/contact. Source desktop uses
Poppins controls, Playfair product titles and Bebas hero. UGT retains its own
Inter/fonts/media/colour tokens; no third-party commercial assets are embedded.
Source's large empty masthead spacing is intentionally compacted to respect the
owner's established no-dead-space and fast-entry requirements. This is an
adaptation of captured patterns, not a claim of pixel-identical branded copying.

## Front door

- Reuse shared shell, sharp lightly shaded/cropped video and actual CMS hero
  copy. Compact masthead/search and navigation lead to one-page sections.
- Replace long service/module listings with image microcards linking actual
  Events, Gallery, Clients, Book, Vendors/Partners, About and other existing
  public destinations. No private admin routes or invented article associations.
- Embed the live collection in the homepage, using the existing authoritative
 24product catalogue, genuine variants and cart. Existing /shop remains a direct
  collection destination; detail/cart/checkout/status/receipt routes remain.
- Show latest published post summaries as microcards, preserving titles, image
  provenance, dates and canonical /blog URLs. No new publication or YouTube work.
- Search, sorting, options, add-to-cart, cart count, module links and mobile
  controls must work. All controls keep keyboard/focus/44px/reduced-motion support.
- Public-only CSS; preserve mobile admin, documents/white print and native
  English-first/six-language behavior. No new dependencies, paid APIs or host.

## Commerce correctness

Current reads prove24made-to-order products; pickup is configured free and team-
confirmed, delivery disabled. Do not fabricate stock or delivery/manufacturing
dates. Paystack is deliberatelyfalse; other provider configuration is not yet
verified. Public options expose only existing configuration-derived booleans,
never raw credentials or a claim of live merchant approval. No provider calls.

Checkout fails closed when method options are unavailable. Display only usable
methods and explain when no online method is configured. Retain cart, quote,
existing-order recovery and contact path; do not create an order on a disabled
method or redirect uncertain attempts into another payment. Event card gates
remain unchanged. Saved attempts remain visible independent of current choice.

Missing/stale variations must require explicit repair from current catalogue
labels. Never guess colour from a legacy size, change quantity/personalization
or silently choose another product. Cart changes synchronize between components
and browser tabs without feedback loops or clearing saved lines on mount.
Server prices, stock/personalization/fulfillment validation and existing recovery
remain authoritative; UI success is never payment confirmation.

## Acceptance and boundaries

Focused RED/GREEN tests for method combinations/error states, saved attempt
visibility, variant repair and shared carts; component tests for microcards,
public post gates and SSR catalogue. Source/prototype screenshots at matching
desktop/mobile sizes, phone/tablet/desktop interactions and no overflow/startup
errors. One full suite/types/changed lint, real Cloudflare build/frozen browser,
fresh review, normalPRmerge/keep-vars deployment and metadata/live read checks.
No real charges/STKs/refunds/transfers/customer messages or live test writes.

Payment activation is not included: it requires authoritative destination
signing/subscriptions, merchant/channel/settlement and ledger-write readiness.
