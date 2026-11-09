# Merchandise image consistency

Homepage and cart used the catalogue's generic artwork PNG while the shop used
product-specific studio previews. A shared display component now selects the
same preview for homepage, cart and checkout, using the selected colour where
available. Checkout summaries include thumbnails. Other catalogue photographs
retain their existing source. Product data, pricing and inventory are unchanged.

The homepage regression reproduced the original placeholder before correction.
Tests cover all 24 Color Blast products, selected-colour rendering and ordinary
catalogue photo fallback. Full suite: 2434 passed, 191 explicit skips. Focused
checkout/discovery/catalogue and edge-release checks also passed; typecheck and
changed-file lint completed with no errors. Production build and browser release
evidence are retained separately. Release marker: merch-images-20261104-v1.
