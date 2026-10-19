# Responsive and language continuation

## Repairs

International/welcome/accessibility pages use container widths, zero-minimum
children and auto-fit tracks bounded by 100%, not three viewport-only columns.
Long words, buttons and language names wrap. Admin repeat tracks no longer impose
180–320px floors on smaller containers. Flexible inbox headers are parent-bounded;
admin splits stack before squeezing editors; narrow topbars use a zero-minimum
brand column. Tables keep scrolling; blanket overflow:hidden does not conceal UI.

The language control is 44px on narrow screens. Shop, Cart, language and menu fit
the compact header design; Book remains in the menu. Desktop navigation yields
below 1100px. The native dialog bounds width/height and scrolls searchable choices.
Native language names are generated only after opening, avoiding ICU hydration
differences and hundreds of hidden server-rendered controls.

## Language scope

Google Cloud's published NMT table fetched 19 October contains 194 rows, stored
with source and retrieval date. These are catalogue choices, not 194 translated
local routes, all consumer Google Translate features or all languages on earth.
UNESCO describes more than 7,000 spoken languages. Country, language and script
are not interchangeable; this chooser uses language names rather than flags.

Saved choice takes precedence over navigator.languages, including Chinese
region/script matching. Only the language code is stored. Six local welcomes
remain; other choices offer Google Translate for public information pages.
Actual Google availability/translation quality varies by language and region.

No automatic external redirect, embedded Google script or pre-click third-party
request is added. Query/hash tokens and private, staff, commerce, ticket-holder,
booking and contact-form pages are excluded. Private forms can use the visitor's
browser translation. The handoff is **not** full in-app automatic translation.
That requires configured provider credentials, budget and reviewed content.

Google widget guidance limits eligibility to specified non-commercial/public
services. A search snippet indicated an October 2026 retirement, but the retrieved
article body did not expose that update; this work does not depend on that date
or on a legacy widget remaining supported.

## Verification limits

Browser setup was rechecked: no supported Browser js/cloud CUA tool is callable.
Do not substitute an unrelated app preview or call source contracts device tests.
Unit/static rendering, TypeScript/build and Worker HTTP checks are possible;
they do not measure actual reflow, touch, browser keyboard or pixel overflow.

Required rendered matrix, **all unexecuted**:

| Profile | Example CSS viewports | Remaining checks |
| --- | --- | --- |
| Android / folded Z Fold | 280×653, 344×882, 360×800 | header, controls, dialog, editor width |
| iOS Safari | 375×812, 390×844, 844×390 | safe areas, keyboard, scroll/focus |
| Unfolded Z Fold | 690×829, 768×1024 | resizing, stacking, rotation |
| Tablet | 768×1024, 1024×768 | sidebar, editor, dialog height |
| Laptop / desktop | 1280×800, 1440×900, 1920×1080 | menu/actions, reading width, tables |
| Zoom / assistive technology | 200–400%, 320px reflow | focus, announcements, no clipped controls |

No physical-device, emulator, screenshot or screen-reader pass is claimed.
The owner's overflow reports are accepted as defects; rendered sign-off remains
required after these source repairs.

References:

- https://docs.cloud.google.com/translate/docs/languages#nmt
- https://support.google.com/translate/answer/2534559?hl=en
- https://developers.google.com/search/blog/2020/05/google-translates-website-translator
- https://www.unesco.org/en/languages-education
- Editorial integration: editorial-issue81-readiness-20261019.md.
