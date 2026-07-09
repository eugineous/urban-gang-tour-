# Urban Gang Tour — Next.js multi-route migration

This rebuilds the single-page v25 site (`index.html` + `support.js`) into a
Next.js App Router app where **every page is its own server-rendered, indexable
URL**, while keeping v25's exact markup and styling (zero visual drift).

## What changed (and why)

| Before (v25) | After |
|---|---|
| 1 URL (`/`), all "pages" are JS state swaps | 14 real routes, one folder per page |
| Body rendered client-side after load | Each route **server-renders** v25's exact captured markup |
| One shared `<title>`/canonical | **Unique** title, description, canonical, OG per page |
| All JSON-LD in one `<head>` | JSON-LD **split** onto the right page (Product→/shop, Event→/events, Person→/the-gang, NewsArticle→/urban-news + /blog) |
| No sitemap/robots | `app/sitemap.ts` (every URL incl. each blog slug) + `app/robots.ts` |
| `<button onClick>` nav | Real `<a href>` nav (header, footer, pure-HTML mobile menu) |

Routes: `/`, `/about`, `/the-gang`, `/experience`, `/events`, `/shop`,
`/gallery`, `/urban-news`, `/blog`, `/blog/[slug]`, `/partners`, `/book`,
`/contact-us`, `/admin` (noindex).

## How fidelity is preserved

- `app/globals.css` = v25's exact `<style>` block, verbatim.
- `app/_components/iconSprite.ts` = v25's SVG icon sprite, verbatim.
- `app/_components/{header,footer}Html.ts` = v25 header/footer markup, with nav
  `<button onClick>` rewritten to real `<a href>`.
- `app/_rendered/*.html` = each page's **rendered** v25 DOM, captured headlessly
  (Chromium driving the real `support.js`), lifted verbatim into the route via
  `app/_components/RenderedPage.tsx`. Regenerate with `scratchpad/cap/capture.mjs`.
- `assets/` is copied to `public/assets/` at build by `scripts/sync-assets.mjs`
  (keeps 77MB of media out of the app diff).

## Landing this in GitHub

The provided fine-grained token only has `metadata:read`, so it could clone but
**not push**. To push this branch, grant the token (or a new one) **Contents:
Read and write** on `eugineous/urban-gang-tour-`, then:

```bash
git push -u origin next-multiroute-seo
```

Open a PR, review the Vercel **preview** deployment, then merge to `main` to go
live. (This session deployed an isolated preview to the `urban-gang-tour-next`
Vercel project so nothing on `urbangangtour.co.ke` was touched.)

## Phase 2 — interactivity + backend (credential-gated)

The captured pages look identical to v25 but their interactive buttons (cart,
checkout, booking form, admin) are inert in this static-faithful phase. Wiring
them needs YOUR accounts/credentials (cannot be done autonomously):

- **M-Pesa (Daraja):** production Consumer Key/Secret, Passkey, Shortcode →
  Vercel env vars. Existing `lib/mpesa.ts`, `lib/orders.ts` become `/api` routes.
- **Database:** provision Postgres/Supabase → `DATABASE_URL`. `lib/db.ts` exists.
- **Admin auth (Google OAuth):** client ID/secret + consent screen + redirect
  URIs in Google Cloud Console. Gate `/admin` server-side.
- **Google Search Console:** submit `https://urbangangtour.co.ke/sitemap.xml`.

Never commit secrets — all of the above go in Vercel Project → Settings → Environment Variables.
