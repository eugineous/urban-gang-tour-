# Documents, receipts and staff notices — 28 October 2026

## Delivered

The existing registry had 38 active formats and 56 HTML masters. It already
covered invoices/receipts, certificates, tickets/passes/wristbands, letters,
briefs, accreditation/releases/consent, budget/run sheet, proposals/agreement,
staff/brand collateral, newsletters/signatures and promotional artwork.
The registry now has 42 active formats and 57 HTML masters: four operational
draft types share the new `57-operational-record.html` template.

| Added type | Honest operational meaning |
| --- | --- |
| Delivery note | Preparation copy; no dispatch, receipt or delivery confirmation |
| Purchase order | Purchase request draft; no approval, purchase or payment record |
| Credit note | Proposed adjustment; no invoice change or refund confirmation |
| Customer statement | Manually entered summary; no live or reconciled ledger claim |

Each requires attributable source/preparer information when stored, computes
amounts on the server, escapes entered text and rejects unsupported payment,
signature and approval fields. The white print surface says STAFF-ENTERED DRAFT
and Not a tax document. These formats carry no verification QR; the public
verification page returns not-found even if a manual draft record is final.
No document issuance, business event or ledger mutation was performed in QA.

Admin receipt actions now download the existing authoritative PDF rather than
rendering financial evidence from browser order rows. Pending, failed, refunded
and partially refunded orders cannot request a paid receipt. Server failures,
HTML responses, network failures and browser download failures leave an
actionable message and receipt-page fallback. The server independently requires
paid/fulfilled status. Browser download start is reported as requested, not as
proof that the browser saved a file.

Receipt PDF/web/ticket-list access shares `receipt-access.ts`: a newly issued
strong reference is a bearer capability; weak legacy references require the
owning signed-in buyer or authenticated staff with orders permission before an
order query. PDF responses and sensitive receipt/ticket pages use private,
no-store/no-referrer protections. This does not make strong bearer links public
marketing links; holders must continue to protect them.

AdminApp, DocGen and the existing operations feedback wrapper use the shared
accessible dismissible notice. Important messages have no automatic expiry;
the close control has a 44px target and long messages wrap on mobile. Final
cleanup moved the existing current-tab ref sync into an effect and marked the
promo upload function as an event callback, clearing two React compiler lint
errors without changing upload behavior.

## Verified evidence

- Focused command: `npx vitest run --no-cache` with the 13 receipt/document,
  notice, PWA/release and offline-retry files. Result: **64 passed / 13 files**.
  Log: `/workspace/artifacts/ugt-documents-20261028/focused-tests.log`.
- `node scripts/audit-doc-templates.mjs`: exit 0; 57 masters, 42 active types,
  zero registry issues, zero template issues and zero missing assets. Its stale
  expected master count was updated from 56 to 57 after the added template.
  Log: `/workspace/artifacts/ugt-documents-20261028/template-audit.log`.
- `node scripts/documents-operations-regression.mjs`: exit 0. The real server
  renderer produced four in-memory PREVIEW / LOCAL QA / NOT ISSUED drafts;
  native local Chromium printed each as one A4 page with seven example rows,
  white background, decoded owned logo, readable extracted draft/tax warnings,
  and content above the footer. PDFs/HTML/PNGs and measurements are in
  `/workspace/artifacts/ugt-documents-20261028/`; `documents-proof.json` records
  the checks. No database was configured or queried by this proof. The delivery
  note and customer statement screenshots were visually inspected.
- Scoped ESLint: exit 0, **zero errors**, 165 style/type warnings remain across
  the selected document/PWA source files. Full JSON is
  `/workspace/artifacts/ugt-documents-20261028/tasks23-eslint.json`.
- The offline retry regression was observed failing on the old handler-only
  button, then passing after conversion to a native home link. See PWA report.

The sample PDFs are Chromium print proofs of server-rendered drafts. They are
not issued documents, tax certificates, paid receipts, authenticated admin
download acceptance, or proof of the existing client raster export path. No
production document or payment was created. Integrated types/full suite,
Cloudflare build, authenticated Worker browser checks and release belong to the
coordinator's combined verification.
