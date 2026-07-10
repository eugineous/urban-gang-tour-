# Urban Gang Tour — Claude Code Handoff

**Live site:** https://urbangangtour.co.ke/
**Working preview (this rebuild):** https://urban-gang-tour-next.vercel.app
**Branch:** `next-multiroute-seo`

## Current state (DONE in this rebuild)

Next.js App Router, one real route per page, SSR/SSG per route, full per-page SEO,
and v25's complete markup + interactivity restored.

- 14 routes: `/`, `/about`, `/the-gang`, `/experience`, `/book`, `/events`, `/shop`,
  `/gallery`, `/urban-news`, `/blog`, `/blog/[slug]`, `/partners`, `/contact-us`, `/admin`
- Each route server-renders unique `<head>`: title, description, canonical, OG image.
  No two pages share a canonical.
- `app/sitemap.ts` (every URL incl. each blog slug) + `app/robots.ts`.
- Per-page JSON-LD split: Organization + WebSite (all), Event (`/events`),
  Product (`/shop`), Person (`/the-gang`), NewsArticle (`/urban-news`, `/blog`),
  BreadcrumbList (all). Banned word "battles" scrubbed.
- Real `<a href>` nav (header, footer, pure-HTML mobile menu).
- **Full v25 interactivity**: each route server-renders an SEO shell, then boots
  v25's real dc-runtime (`public/support.js` + `public/v25-template.html`, React
  self-hosted in `public/vendor/`) to that route's page — restoring hero-video
  autoplay, in-page tab bars, cart, ticket flow, forms, and the admin Control Room.

### Architecture notes
- `assets/` → `public/assets/` at build via `scripts/sync-assets.mjs`.
- Runtime boot: `app/_components/V25App.tsx` sets `window.__UGT_PAGE` + `window.__resources`
  (local React), injects the template, loads `support.js`, then hides `#ssr-shell`.
- To re-capture the SEO shells after a v25 change: `scratchpad/cap/capture.mjs`.
  To rebuild the client template: `scratchpad/cap/build-runtime.py`.

## ⚠️ Secrets — ROTATE

The Vercel token, GitHub PAT, and Google OAuth client secret were shared in plaintext
chat. Rotate all three:
- Vercel: Account Settings → Tokens
- GitHub: Settings → Developer Settings → Personal Access Tokens
- Google: Cloud Console → Credentials

All keys live in environment variables, server-side only. Never commit or paste secrets.

---

## P1 — Make the demo real (backend)

- M-Pesa Daraja: `/api/orders`, `/api/mpesa/stkpush`, `/api/mpesa/callback` (`lib/mpesa.ts`, `lib/orders.ts` exist)
- Contact form → `/api/bookings` → persists → admin Bookings Inbox (`lib/bookings.ts`)
- Admin Control Room wired to real routes, gated behind real server-side auth (not the demo password)
- 3 missing backends, one Postgres table each: tour stops, blog/newsroom queue, crew admins & permissions
- Move hardcoded arrays (tour stops, blog posts, merch prices, ticket events) into DB
- Confirmation emails/receipts on payment (`lib/gmail.ts` exists; Resend optional)

## P1 — Security & correctness
- All secrets in env vars, server-side only.
- Rate limit public endpoints — IP/fingerprint-based (login, signup, bookings, orders).
- Schema-based input validation on every input: type checks, length limits, reject unexpected fields.
- Server-side validation of every price/payment amount. Never trust the browser.
- Payment edge cases with clear on-screen state: STK cancelled, timeout, insufficient funds, double-submit.
- Idempotency on order creation.
- Orders ledger reconcilable against the M-Pesa statement.
- Real auth provider for `/admin`. Row Level Security on every table if using Supabase.

## P2 — Legal (Kenya)
- Privacy Policy, Terms, cookie/consent (Data Protection Act 2019).
- Refund + delivery policy pages (required for M-Pesa). Visible business contact. Ticket terms at checkout.

## P2 — Performance
- Next `<Image>`, lazy-load gallery + YouTube embeds.
- **Compress the two hero MP4s (faststart) + poster-image fallback** — they are 21MB/12MB and
  currently buffer slowly; this is the top perf item.
- Move 77MB media out of git into Blob/CDN. CDN/caching headers, font preload, code-split, Lighthouse budget.

## P2 — Inventory / fulfilment / reliability
- Merch stock/size/sell-out state; order→fulfilment status for buyers.
- Ticket capacity limits, unique QR validation at the gate.
- Sentry + uptime alerts, automated DB backups, staging before production.

## P3 — Quality, growth, PWA, i18n, search, SEO depth, admin depth, testing, trust
- A11y pass (alt/focus/keyboard/contrast); GA4 events; error boundaries.
- Newsletter/WhatsApp capture; Google Search Console + Bing; Google Business Profile.
- New service worker with cache versioning; add-to-home-screen; offline page; test on low-end Android/3G.
- Swahili/English toggle; +254 phone validation; KES formatting; EAT timezone.
- Site search; shop/gallery filters; related-content links; form states; optimistic UI; toasts.
- hreflang; auto-regen sitemap; image sitemap; FAQ/VideoObject schema; 301s from old URLs.
- Admin: CSV export; search/filter/pagination; bulk actions; audit log; staff notifications; dashboard charts.
- Unit tests on payment/price math; E2E checkout; CI blocks broken builds; typecheck + lint in CI.
- Testimonials/logos/press/FAQ/impact page; optional buyer accounts.

---

## Housekeeping
Removed dead files (`nextjs-update/`, `sw.js`, `CrewRotator.dc.html`, old `.dc.html`) where present.

## PARKED — WhatsApp / Meta API (resume anytime)
Meta app **"Urban Gang Tour"** already created: App ID `1338478978482580`,
business portfolio "Eugine Micah", WhatsApp + Facebook Login attached.
Resume at: developers.facebook.com → My Apps → Urban Gang Tour → WhatsApp →
**Step 1: Try it out** → copy Temporary access token + Phone number ID →
Vercel env vars `META_WA_TOKEN`, `META_WA_PHONE_ID`, `META_WA_SELF` → redeploy.
For production messaging: Step 3 Business verification (takes days — start early).
NOTE: the public wa.me chat widget needs NONE of this — set the number in
Control Room → Comms and it goes live immediately.

## WhatsApp Business Platform - state as of 2026-07-10

Meta app: Urban Gang Tour (app id 1338478978482580), business id 701875228088222.
- DONE: webhook configured and verified (callback https://urbangangtour.co.ke/api/whatsapp/webhook, verify token in Vercel env WHATSAPP_VERIFY_TOKEN). Webhook route: app/api/whatsapp/webhook/route.ts; senders: lib/whatsapp.ts.
- DONE: app submission fields (icon, privacy https://urbangangtour.co.ke/privacy-policy, terms /terms, category Entertainment, namespace urbangangtour, app domain). Ineligible-for-submission banner cleared.
- DONE: env WHATSAPP_PHONE_NUMBER_ID=1257991034055153, WHATSAPP_WABA_ID=1350859730410865 (production+development).
- WABA "Eugine Micah" (1350859730410865) is PENDING REVIEW at Meta; phone +254 799 886247 NOT REGISTERED until review passes. Subscribe-webhooks toggle disabled until then.
- OWNER STEPS REMAINING:
  1. Wait for WABA review, then Register the phone (Use cases > WhatsApp > Step 2) and flip Subscribe webhooks ON.
  2. App secret: Settings > Basic > App secret > Show (password wall) -> set as Vercel env WHATSAPP_APP_SECRET (required before inbound webhooks process).
  3. Generate a permanent access token (Business settings > System users) -> Vercel env WHATSAPP_ACCESS_TOKEN.
  4. Add payment method (needed for business-initiated messages) and complete Business verification, then publish the app.

## Rollback

Vercel keeps every previous deployment immutable, so rolling back is instant and needs no rebuild. In the Vercel dashboard open the project, go to Deployments, pick the last known-good deployment marked READY, open its overflow menu and choose Promote to Production (or use Instant Rollback from the current production deployment's menu). Production traffic switches to the old build immediately; the bad deployment stays available for debugging.

To make the rollback stick in git, revert the offending commit on main: `git revert <sha>` (or `git revert <oldest-sha>..<newest-sha>` for a range), push the revert through the normal branch-and-preview flow, and let Vercel deploy it. Never force-push main; the revert commit keeps history intact and the next deploy matches what production is already serving.
