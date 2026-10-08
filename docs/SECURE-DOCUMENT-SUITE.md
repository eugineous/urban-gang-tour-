# Secure compact document suite

Owner authorised production deployment on 9 October 2026 Nairobi time. No R2 or Vercel is used.

## Print system
Nine original vector ticket templates: festival, summer, electric, wave, comic, headliner, minimal, campus, premium. Four receipt looks and A5 invoice samples. Ticket page is 139.7 × 50.8 mm; receipt is 80 mm wide with content-based height. PDFs use text and vector QR modules, not screenshots. Approved logo is embedded as a small print asset to avoid network downloads. Decorative guilloche and microtext aid brand recognition; they are not authentication.

## Issuance and verification
New order links use 90 random bits plus a timestamp; legacy links remain valid. Server-issued codes use 110 random bits and a 60-bit HMAC tag; existing shorter tickets remain valid. Full HMAC-SHA256 issuance proof is embedded in the PDF metadata. Payment status and atomic single-use database admission remain authoritative. Downloads preserve ticket identity; a new paid admission creates a new ID. No client receives the signing key. Missing production secrets fail closed.

QR destinations are /verify/ticket/CODE and /verify/order/ORDER. Public verification shows status without customer contacts or admin links. Scanning does not consume entry. Gate staff consume through authenticated /api/tickets/verify. The staff-only /api/admin/tickets/CODE/holder endpoint requires gate permission, is rate limited, has private no-store responses and logs access. Physical copies of valid tickets cannot be prevented; one-time admission blocks reuse after first entry.

## Organizer branding
Approved organizer portal: /organizer/dashboard/designs. Saves use PUT /api/organizer/events/ID/design. Every write includes organizer ownership in SQL and strictly validates fields. Cannot alter price, order status or admission through branding. Photos/logos are resized locally and stored with the owned event. PNG/JPEG only after preparation; SVG markup and unapproved fields rejected. Plain-background removal runs locally; complex scene cutouts require a prepared transparent PNG.

Admin sample studio: /admin/docs/designs, authenticated with documents permission. Samples are explicitly invalid; issuance remains under the existing paid-order/document workflow. Existing invoice, quote, proposal, budget and reporting documents remain available in /admin/docs.

## Delivery and privacy
Paid/fulfilled orders with a valid supplied email receive receipt and ticket PDF attachments through the existing Resend payment-confirmation flow. Gmail can receive these messages; Gmail mailbox OAuth is a separate admin integration. Payment replay uses a Resend idempotency key; explicit buyer resends use a separate minute-bucket key. Resend failure is logged without reversing payment. Durable delivery retries are still an operational follow-up; no live customer email was sent during validation. Shop receipts do not require an event. Checkout shows required terms/privacy acknowledgement. Secure HttpOnly sessions are used; no hidden fingerprinting or location collection is introduced. Personalized PDFs are never shared-cacheable.

## Email library
Six editable service-message layouts: purchase confirmation, booking enquiry, dispatch, refund, invoice and welcome. Preview text is fictional; making a template available does not enable a new notification trigger. The existing payment email remains connected to actual callback handlers. Marketing campaigns need opt-in and unsubscribe; these samples are transactional.

## Release validation
216 tests across 30 Vitest files passed. Cloudflare production build completed without an R2 binding. The packager's pre-existing color-string copy warning was inspected: the emitted dependency index is byte-identical to the installed source. Nine PDF samples decode to their individual review record URLs and measure approximately 51 KB with the small approved logo. Single-page ticket sizes and independent shop receipts were verified. Private flow tests passed at 390/820/1440 px, including saved Reels, new/stable sample identities, duplicate gate rejection, organizer orders, inventory and all Control Room review workspaces. The actual production organizer studio passed branded downloads, save interaction, email previews and no-overflow/console-error checks at the same widths; anonymous admin studio requests redirect to login. No live charge, admission or customer email was created during tests.
