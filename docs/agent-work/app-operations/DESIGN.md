# App and operations completion — 28 October 2026

## Outcome and scope
Make the existing UGT PWA, made-to-order customer journey and mobile staff tools
useful end to end. This is a coordinated completion pass, not a new runtime.
The owner requests autonomous execution; do not restart approval questionnaires.

## Evidence and chosen approach
Existing Next/OpenNext app has a manifest/service worker, Daraja, Paystack/Stripe,
server-priced checkout, private order tracking and 38 document/creative formats.
The current 24 Color Blast products are static previews; the public DB catalogue
is empty. Existing standard displayed prices are reused under the owner's new
instruction to sell this manufacturable collection. Event prices are not used.
Alternatives rejected: native-app rebuild (unnecessary new platform); pretending
previews are stock (false); unlimited template proliferation (not operational).

## Contracts
1. Explicit made-to-order products never consume or fabricate stock. Tracked
   stock keeps existing transactional limits. Products/variants/prices remain
   server authoritative. Retired p1–p14 stay inactive. New catalogue activation
   is exact, expiring, repeatable, authenticated and journalled; changed/conflicting
   rows abort rather than overwrite. No live financial test or provider call.
2. Tracking records actual staff production/handover/delivery states, not estimates
   or carrier location. Payment status remains separate. Preserve signed-in
   ownership/strong bearer-reference rules and public contact/address redaction.
3. Daraja and future Pesapal use server-only credentials and existing ledger.
   Readiness is honest. Missing credentials disable the option. Amount/currency/
   reference verification, durable idempotency and reconciliation precede success.
4. Admin receipts reuse the guarded selectable-text/vector-QR PDF endpoint. Add
   useful operational document formats only; manual documents are clearly drafts
   or staff attestations, never independent proof of payment/tax/delivery.
5. In-app notices are accessible, dismissible and mobile-sized; important errors
   persist until dismissed. No unsolicited push permission or fake notification.
   Install/update/offline UI preserves active forms/payment and private caching.
6. Artwork targets only current approved scheduled records and explicitly selected
   public records for visible-caption normalization. Preserve all text/dates/status/
   schedules/approval/social flags. Store truthful synthetic provenance and present
   a neutral "Editorial illustration" caption. Historical 64 candidates need
   private live inspection before image-only compare-and-swap publication.

## Visual direction
Reuse .21st design context: warm stone/cream, ink, restrained UGT magenta/yellow/
cyan, existing typography and icon library; 44px minimum touch targets. Small
status/timeline accents, not an additional white-label app or oversized cards.
Print stays white/legible. English initial language and existing locale persist.

## Verification and release
Each independent bundle supplies RED/GREEN focused tests and no shared-file
collisions. One integrated full suite, types, changed-file lint, Cloudflare build,
local actual Worker browser/installed-app checks and security review precede a
normal PR merge and keep-vars deployment. Snapshot/preserve bindings and cron.
No claim of universal perfection, physical-device QA or live payment acceptance.
Missing provider credentials remain a disclosed activation dependency.
