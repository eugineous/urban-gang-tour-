# Automatic updates and cart restoration

Ready updates apply after a short idle period on visible public pages. Shop,
cart, checkout, account and staff routes defer updates; unsaved form input and
offline state also defer them. Automatic reloads are limited to once per release
per tab. The global online update card is removed; manual recovery remains on
the app page. Offline feedback remains dismissible.

Cart and header subscribers reread saved state after browser history restoration
and tab visibility changes. Opening payment does not clear a basket; existing
provider-verified settlement and matching-purchase clearing remain unchanged.
The screenshots alone do not establish that cart loss occurred in one browser
session or origin. This repair addresses a missing history/visibility refresh.

The cart header is compact, checkout labels pickup/delivery before payment,
homepage text has a slightly stronger scrim without blur, and international
payment guidance accurately states current Paystack card-only availability.
Terms are unchecked by default; a checked screenshot alone does not establish
preselection.

Tests exercise automatic reload/basket preservation, protected/dirty-form guards,
history/visibility resync, checkout validation and existing payment settlement
effects. No live financial charge, refund or customer message is a test. Release:
auto-update-cart-20261109-v1. Built/live browser and deployment evidence remain
in private release artifacts.
