# Urban Gang Tour: merchandise storefront / drop release gate
**Review date:** 29 October 2026 | **Status:** Draft commercial and visual recommendations, NOT a live price change.

## Owner brief
- Compare Mkurugenzi's current and previous ranges for catalogue clarity and price accessibility. Borrow the *method* (consistent product-only photos, real dimensions, clean collection navigation, simple KES price display), never their names, print graphics, copyrighted assets or visual identity.
- Retain all 24 existing Color Blast product *concepts*, while keeping the earlier ten-colour original T-shirt study identifiable as an archive.
- Use exact licensed Urban Gang Tour/Color Blast artwork; never redraw the supplied logo from a generative approximation.
- Remove all invented Eugine and Lucy portraits from the customer-facing merchandise experience. Their actual likeness requires original approved portrait sources. Gallery panels should show products, measurements and fabric details instead.
- Do not imply that design previews are in stock or available to purchase. Prices, SKU eligibility and actual stock must continue to come from the existing server-side commerce database.

## Market reference snapshot
As checked on 29 October 2026 on https://mkurugenzi.ke/ : new Botanical T-shirts KES 1,800; older classic T-shirts KES 1,500; new hoodies KES 3,000; Aero caps KES 1,500; unisex sweat sets KES 6,500; women's sweat sets KES 6,750; tote KES 2,500. Some sale prices are temporary. These are competitor asking prices only, not our costs.

For local input-cost context, compare full-colour print methods and garment weights with suppliers; a vendor's generic T-shirt quote is NOT equivalent to our oversized all-over print. Reference sources: https://staryldesigns.co.ke/blog/tshirt-printing-cost-nairobi ; https://mocky.co.ke/blog/t-shirt-and-jersey-printing-prices-in-nairobi-2026-per-unit-breakdown

## Proposed pricing decision framework (not active)
| Category | Current site proposed online | Suggested tested retail target | Cost ceiling for 40% gross margin* |
| --- | ---: | ---: | ---: |
| Color Blast Oversized Tee | 1,800 | 1,800 | 1,080 |
| Color Blast Hoodie | 3,500 | 3,000 if feasible; otherwise 3,500 | 1,800 at 3,000 |
| Crewneck | 2,900 | 2,500 to 2,900 subject to sample | 1,500 at 2,500 |
| Baby Tee | 1,600 | 1,500 to 1,600 | 900 at 1,500 |
| Snapback | 1,400 | 1,400 to 1,500 | 840 at 1,400 |
| Bucket Hat | 1,400 | 1,400 to 1,500 | 840 at 1,400 |
| Canvas Tote | 1,100 | 1,100 to 1,500 | 660 at 1,100 |

*Unit cost ceiling excludes delivery charged separately; account for payment fees, returns, taxes, failed fulfilment and advertising before final approval. Gross margin is (retail price − landed unit cost)/retail price. For actual orders use current server-validated prices, never these suggestions.

Do not invent crossed-out discounts. Retain event-only prices only when actual event stock and logistics support them.

## New vs earlier editions
1. **Color Blast Current:** the 24 existing digital product concepts stay in the lookbook, openly marked sample pending, with current category filters and original licensed artwork. This is not 24 manufactured SKUs.
2. **Color Blast Original:** historical owner-supplied ten colourways retained as the original archive, shown using the already-present supplied-colourways.jpg. These do not become live products until individually approved.
3. **Future Color Blast Edition 02:** proposed premium essentials using genuine original brand artwork with cleaner print placement, more restrained garment colour choices, a size guide, and product-only photography. **No approved artwork or manufactured samples are assumed.** Do not deploy invented variants as sellable inventory.

## Photography acceptance criteria
- Each approved item: front, back, close-up of textile/print, measured fit, and optionally original authorised founder photo.
- Same background temperature, 4:5 image ratio, consistent garment geometry (no distorted bodies, altered faces, fake production texture).
- Export web-optimised product image and separately preserve printer's own high-resolution artwork master. Never use a low-resolution generated mockup as the manufacturing template.
- Each image's alt text identifies the actual item and whether the image is a concept rather than photographed stock.

## Release checklist
- [ ] Approve actual artwork versions and print method.
- [ ] Obtain two written Nairobi supplier quotes per launch garment with specifications and lead time.
- [ ] Approve physical samples, fit and size measurements.
- [ ] Fix or verify live /api/site-data/products availability on mobile networks and Cloudflare.
- [ ] Publish verified products, prices, variants and stock/lead time in the owner database.
- [ ] Test server-priced M-Pesa STK and card flow end to end using supported test facilities and valid idempotency/redirect.
- [ ] Test failed, cancelled, duplicate and late-payment callbacks, receipt, pickup/shipping quote, refunds and order status.
- [ ] Obtain founder portrait approvals and usage rights before showing founders on merchandise.
- [ ] Mobile checkout/accessibility audit at 320px, 390px, desktop and keyboard navigation.

**Release boundary:** This PR is visual-integrity and discoverability work only. Do not change production inventory, payment keys, checkout or deploy automatically.
