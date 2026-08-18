# Urban Gang Tour

Ticketing and events website for Urban Gang Tour ("From Potential to Purpose"), live at
[urbangangtour.co.ke](https://urbangangtour.co.ke/). Public-facing pages (events, tickets,
shop, gallery, blog, partners, about) plus an admin Control Room for managing orders,
tickets, promos, products, invoices, payments, and content.

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Routing/SEO:** one folder per page, each route server-renders its own metadata
  (title/description/canonical/OG) and JSON-LD. `app/sitemap.ts` + `app/robots.ts`.
- **Runtime:** each route server-renders an SEO shell, then boots the existing
  client-side "v25" SPA runtime (`app/_components/V25App.tsx` + `public/support.js` +
  `public/v25-template.html`) on top of it, restoring the full interactive experience
  (hero video, tab bars, cart, ticket flow, forms, admin Control Room). This is a
  deliberate architecture — see `CLAUDE.md` before changing v25's markup/CSS.
- **Database:** PostgreSQL via `pg` (`lib/server/db.ts`)
- **Payments:** Stripe (card), Paystack (card, Kenya), M-Pesa Daraja STK Push
  (`lib/server/mpesa.ts`, `app/api/mpesa/*`, `app/api/stripe/*`, `app/api/paystack/*`)
- **Tickets:** PDF generation (`@react-pdf/renderer`, `jspdf`), QR code generation and
  scanning (`qrcode`, `jsqr`) — `lib/tickets/`
- **Auth:** Google Sign-In (Google OAuth) for the primary admin account, plus a backup
  `ADMIN_ACCESS_CODE` login and scoped `crew_admin` roles — see the access control
  matrix in `CLAUDE.md`
- **Storage:** Vercel Blob (`@vercel/blob`) for uploaded assets
- **Other integrations:** WhatsApp Business Platform messaging (`lib/whatsapp.ts`),
  Meta (Facebook/Instagram) auto-posting (`lib/meta-social.ts`)
- **Hosting:** Vercel, auto-deploys from `main`

## Project structure

```
app/            Next.js App Router routes (one folder per page) + API routes (app/api/*)
app/admin/      Admin Control Room (orders, tickets, promos, products, invoices, comms, docs)
lib/server/     Server-only modules: db, sessions/auth, mpesa, tickets, catalog, ops, notify
lib/tickets/    Ticket PDF + QR generation
lib/ops/        Operational helpers
public/         Static assets, the v25 runtime template/vendor bundle, doc templates
scripts/        Build/dev tooling (asset sync, favicon gen, hydration checks, etc.)
```

See `API.md` for the full endpoint contract and `HANDOFF.md` for the current roadmap
and known follow-ups.

## Running locally

Requires Node.js 18+ and a PostgreSQL database.

```bash
npm install
cp .env.local.example .env.local   # fill in the values you need (see below)
npm run dev
```

The app runs at `http://localhost:3000`. `predev`/`prebuild` automatically sync
`assets/` into `public/assets/` (`scripts/sync-assets.mjs`).

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in only what you're working on —
most features degrade gracefully without their keys set. Notably:

- `DATABASE_URL` — Postgres connection string
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_SHORTCODE` / `MPESA_PASSKEY`
- `SESSION_SECRET` — required in production, signs admin/user session cookies
- `ADMIN_ACCESS_CODE` — backup super-admin login for the Control Room
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `WHATSAPP_*` — WhatsApp Business Platform (Meta)

**Never commit real values for any of these.** `.env*` is gitignored except the
`.env.local.example` template.

## Building

```bash
npm run build
npm run start   # serve the production build locally
npm run lint
```

## Deployment

The site auto-deploys to Vercel on every push to `main` (see `vercel.json`,
`.vercelignore`). Feature branches get their own Vercel preview deployment — the
workflow is: branch → preview → review → merge to `main` (no direct pushes to `main`).
Environment variables are configured in the Vercel project settings, not committed.

## Further reading

- `CLAUDE.md` — architecture rules, security requirements, access control matrix
- `API.md` — full API endpoint contract
- `HANDOFF.md` — roadmap, current state, and outstanding follow-ups
