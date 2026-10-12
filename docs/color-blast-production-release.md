# Color Blast production release — 12 October 2026

The owner explicitly requested deployment of the work already created to `urbangangtour.co.ke`. Additional pose, camera-angle and creative iterations are deferred.

- Release the existing reconstruction foundation plus the ready Color Blast collection through a feature branch, reviewed pull request, merge and Cloudflare Worker deployment.
- `/shop` presents 24 proposed designs, existing generated studio boards, supplied colourways, untouched source artwork, completed Eugine/Lucy model previews and accessible enlargement.
- Model previews remain AI-styled concepts, not photographs of manufactured stock or verified measurements. Zoom enlarges existing pixels; it is not microscopic fabric evidence.
- Keep the three original supplied photographs unchanged. Print-master SHA-256: `dd19a4dfc21d03b8c03acbec71ddddcd7fc04a3d6d56db903844851abb8fae79`.
- New selections use the separate `ugt-design-preview-cart-v1` design bag at `/shop/design-bag`, with proposed totals and no checkout or payment action. Never migrate these unverified SKUs into the purchase cart or seed inventory.
- Owner-managed live merchandise remains available through `/shop/available`; non-Color-Blast product pages, `/cart`, checkout, payment APIs, authentication and private customer data remain server-backed.
- Preserve the existing production Worker bindings, secrets, cron and custom domains. No private Sites runtime or review fixtures are copied into production.
- Prior production catalogue reads returned HTTP 503 before this release; this is an existing dependency limitation, not verified sellable inventory.
- Rollback version recorded before release: `4cc2e798-c2ff-47bb-9933-126fbc16ba6d`.

Verification: unit tests, TypeScript, Cloudflare build, production-runtime responsive browser checks, then read-only custom-domain and authentication checks. Never create real payment orders during release verification.
