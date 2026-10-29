# Vendor documents — final QA

29 October 2026. Continued the existing implementation; preserved the approved copy, design, owner logo and unrelated uncommitted work. Source is frozen and the direct Next development server on 4186 is stopped. The root agent owns the final combined suite/build/release.

Deliverables:

- `public/downloads/vendor-application.pdf`: exactly two A4 pages, 19 blank text fields and seven unchecked checkboxes. Package 1 — Main Vendor: KES 30,000–45,000. Package 2 — Minor Vendor: KES 10,000–15,000. The event-specific quote/acceptance boundaries remain explicit.
- `public/downloads/sponsorship-partnership-pack.pdf`: exactly two A4 pages, six blank brief fields; four scoped discussion opportunities and outputs/outcomes guidance. Quote only; no promised attendance, reach, sales, editorial coverage or exclusivity.
- `/vendors`: numbered package labels, complete six-language guidance and existing direct downloads/email/booking paths. The PDF language is explicitly disclosed as English. `/partners` retains its vendor entry and direct partnership-pack download.
- Official-source findings and limits are recorded in [vendor-research.md](vendor-research.md).

QA corrections:

- jsPDF initializes checkbox stored values to `/On`. The prior form set only the visible appearance to `/Off`; structural inspection revealed the disagreement. Stored value, default value and appearance are now explicitly `/Off`. The new regression guard failed on `/V /On` before the fix and passes after it.
- The shared `dl > div` flex rule caused the longer labels and fee amounts to compete for width. A vendor-only override restores the intended label-above-price arrangement. The browser guard reproduced fee wrapping before the fix; each complete fee range now fits on one line at all checked sizes.
- The browser script waits for actual page/language/font readiness rather than network idleness, because existing local campaign/event-data retries continue without configured development data. The partner-page vendor assertion is scoped to its section CTA; the legitimate new footer link is preserved.

Verification completed:

| Check | Result |
| --- | --- |
| `node scripts/generate-vendor-documents.mjs --check` | Pass; both committed-to-be PDFs exactly match deterministic regeneration. |
| `node node_modules/vitest/vitest.mjs run --no-cache __tests__/vendor-documents.test.ts __tests__/booking-intent.test.ts` | Pass: 14 tests, two files. |
| Focused ESLint on vendor page, message catalogue and vendor tests | Pass, exit 0. |
| `node scripts/check-vendor-documents.mjs` against native Next dev 4186 | Pass: English at 360×800, 820×1100 and 1440×1000; Swahili, French, Simplified Chinese, Russian and Spanish at 360×800. Canonical/indexability, reflow, single-line prices, keyboard focus and 44px download target verified. No page runtime errors. |
| Actual native downloads at all three English viewports | Both filenames and downloaded bytes match the local PDFs; direct responses are HTTP 200 with PDF content type. |
| Partner and booking paths | Section CTA and direct pack link present; `type=sponsorship` selects Sponsorship, `type=partnership` selects Partnership. No form was submitted. |
| Independent `pdfinfo`, pypdf and PyMuPDF inspection | Both files are unencrypted two-page A4 AcroForms. All 32 fields are blank; widget rectangles and text are inside the pages. No JavaScript, automatic execution, file launch, embedded payload or submission action. Explicit website/email URI links remain; jsPDF's OpenAction is only a page-view destination. |
| Rendered proof | All four PDF pages and responsive screenshots inspected. Numbered labels, correct fees, field boundaries, tables and footers fit without clipping. |

PDF SHA-256:

```text
vendor-application.pdf
4aa80bf981db6a352483b6dd382ea63c400cd3e996e52f863f78d0e09133147f
sponsorship-partnership-pack.pdf
8a43b28ad82c74f6c0bab79a3741fb6518c59b6bafe48491ce8b48b0c9dce9e7
```

Proof files are outside Git at `/workspace/artifacts/ugt-vendor-documents-20261029` (four PDF-page PNGs and eight responsive screenshots). The browser script defaults there; `VENDOR_CHECK_OUT` and `VENDOR_CHECK_BASE` override output and local origin.

Limits: browser proof used desktop Chromium with emulated viewports, not physical devices or every PDF reader. The PDFs are not tagged; the native HTML provides the accessible application guidance. Existing local campaign/event data requests returned 503 and did not prevent the verified vendor routes/downloads. No production submissions, messages, financial actions, new backend, dependencies, permits, certification claims, commits or deployment occurred in this QA pass. No full suite or full build was run by this worker.
