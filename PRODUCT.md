# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Young people discovering Kenyan culture and events; schools and institutions booking a tour stop; supporters, partners, and buyers following the work and its merch.

## Product Purpose

Urban Gang Tour is Kenya's youth talent-search, mentorship, and awards-concert tour. The public site helps visitors discover the movement, attend or follow events, book a school stop, explore the gallery and news, and shop verified merchandise.

## Positioning

The tour connects live cultural events, youth talent, institutional bookings, and community storytelling in one public experience rather than treating them as separate campaigns.

## Operating Context

The experience is primarily mobile web, often used on variable mobile connections. Visitors navigate through public pages; booking and checkout remain real, server-backed workflows. The admin workspace is separate and out of this redesign scope.

## Capabilities and Constraints

- Next.js App Router with real crawlable URLs and per-route metadata.
- Preserve public content, links, media, booking, catalogue, ticket and checkout flows.
- Keep public and admin access boundaries intact; no secrets or private contact information in public UI.
- A phone-first experience needs visible bottom navigation, safe-area clearance, touch-friendly controls and reduced-motion support.

## Brand Commitments

- Urban Gang Tour, Kenya; voice: energetic, youth-led, cultural, direct.
- Preserve existing official logo, event imagery, gallery media and verified social links. Public founder storytelling is limited to Eugine Micah and Lucy Ogunde; operational collaborators are not presented as a public "crew" directory.
- The user explicitly requested a maximalist, media-led public experience rather than a minimalist website.

## Evidence on Hand

- Public media under `public/assets/`, including event, crew, gallery and video assets.
- Existing public routes and verified links in the App Router.
- Existing structured data, booking, shop, gallery and event flows.

## Product Principles

1. Put the culture and real people before generic web chrome.
2. Make the next visitor action obvious without hiding exploration.
3. Keep every public route usable on a phone, not only the homepage.
4. Use visual density to create momentum while preserving readable, accessible paths.

## Accessibility & Inclusion

Keyboard-accessible navigation and overlays; labelled controls; visible focus; 44px touch targets; readable type and contrast; reduced-motion support; no meaningful information conveyed only by colour.
