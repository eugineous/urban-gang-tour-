# Eventify-referenced mobile website and PWA

Owner request: phone UI based on Dribbble shot27650927, Event Discovery &
Ticket Booking Mobile App UI by SHEIKH NAEEM. This changes the existing UGT
renderer, not a separate app or native binary.

## Scope

- Mobile editorial home: white canvas, large black/magenta title, monochrome
  owned-host illustration, two rounded artwork cards and mint action strips.
- Mobile light header: working menu, centered logo, visible cart and search
  linking to the real event search field.
- Rounded four-tab navigation: Home, Events, Shop and My tickets. Menu overlays,
  payment/checkout, private operations, receipts and issued-ticket pages retain
  their focused existing controls instead of adding competing navigation.
- Dark event panels, real-date badge, magenta event typography and prominent
  original artwork. Postponed and undated events get no fabricated date badge.
- Existing issued-ticket screen uses dark card styling with a white QR panel;
  ticket authorization, statuses, printing and entitlement are unchanged.
- Existing desktop MOOKH/Nixtio, shop/mannequin catalogue and all real routes,
  six languages, cart persistence and Paystack safeguards remain in place.

## Assets and integrity

The portrait derivative is generated from the owned Eugine Micah photograph
M230. Master and honest provenance are in `assets/mobile/`; the asset sync copies
them into the deployment. Lucy's card uses an existing owned photograph. No
reference artist, ape illustration, event promises, demo tickets or fake QR/barcode
was imported. All links lead to actual UGT discovery, booking, shop and account
destinations. Payment methods, ticket sales gates, credentials, ledger and public
CMS records were not modified.

## Evidence

Focused tests cover navigation/exclusions, real destinations and dates, shared
controls, cart/checkout and ticket integrity. Local Chromium captures at390×844
and1440×844 check mobile/desktop visibility, decoded illustration, menu close,
cart/checkout boundaries, JavaScript errors and horizontal overflow. Real event
component rendering uses an actual public archive record, clearly still marked
as an archive. See the latest mobile section of `design-qa.md` for visual
comparison, limitations and final release checks. No financial transaction or
customer message was used for testing.
