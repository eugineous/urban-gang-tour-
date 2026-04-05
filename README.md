# PPP TV Auto Poster

Automated news-to-social pipeline for PPP TV Kenya. Scrapes the PPP TV website directly, generates branded 1080×1350 (4:5) portrait images in the style of Rap TV / WorldStar, and posts to Instagram and Facebook — fully automated via a Cloudflare Worker cron every 10 minutes.

---

## How it works

1. **Cloudflare Worker** fires every 10 minutes
2. Scrapes `ppptv-v2.vercel.app` directly (no RSS) — gets the ONE latest article
3. Checks **Cloudflare KV** — if already posted, skips
4. Calls Vercel `/api/automate` (authenticated with `AUTOMATE_SECRET`)
5. Vercel generates a branded 4:5 image + formats captions
6. Posts to **Instagram** and **Facebook** via Graph API

---

## Image template design

Inspired by Rap TV, WorldStar, and Polymarket's social graphics:

- **4:5 ratio** — 1080×1350px (optimal for Instagram feed + Facebook)
- **Full-bleed photo** — article thumbnail fills the entire frame, cropped to top (faces)
- **Gradient overlay** — transparent at top, fades to solid black at ~85% down. Photo bleeds through the transition naturally
- **Category pill** — white background, black bold text, rounded corners, sits at the gradient start
- **Headline** — Bebas Neue (the exact font used by Rap TV). All caps, ultra-tight leading (0.92). Key nouns/names in PPP TV red-orange (`#E8401C`), connectors in white
- **Subtitle** — small italic, 72% white opacity
- **PPP TV logo** — top-left, crown + "PPP" white + "TV" gold + "KENYA" tagline, semi-transparent dark backing

### Brand colors (from PPP TV logo)

| Color      | Hex       | Usage                          |
| ---------- | --------- | ------------------------------ |
| Red-orange | `#E8401C` | Accent words in headline       |
| Gold       | `#F5A623` | "TV" in logo, crown icon       |
| White      | `#FFFFFF` | Connector words, logo text     |
| Black      | `#000000` | Background, category pill text |

### Font

**Bebas Neue** — the industry-standard condensed display font for news graphics. All-caps, zero descenders, ultra-tight tracking. Same font used by Rap TV, WorldStarHipHop, and major news stations globally.

---

## Stack

| Layer            | Tech                                          |
| ---------------- | --------------------------------------------- |
| App / API        | Next.js 14 on Vercel                          |
| Cron trigger     | Cloudflare Worker (every 10 min)              |
| Deduplication    | Cloudflare KV (`SEEN_ARTICLES`)               |
| Image generation | Satori + Sharp (1080×1350 JPEG)               |
| Social posting   | Meta Graph API (Instagram + Facebook)         |
| Scraping         | Direct HTML scrape (no RSS, no external deps) |

---

## Project structure

```
src/
  app/
    page.tsx                  # Dashboard UI with live preview
    api/
      automate/route.ts       # Main POST endpoint (called by CF Worker)
      dry-run/route.ts        # Test scraper + image gen without posting
      preview-image/route.ts  # Preview image template in browser
  lib/
    scraper.ts                # Direct HTML scraper (ppptv-v2.vercel.app)
    image-gen.ts              # Satori + Sharp — 4:5 Bebas Neue template
    formatter.ts              # Caption formatter with hashtags
    publisher.ts              # Instagram + Facebook Graph API
    dedup.ts                  # Cloudflare KV deduplication
    types.ts                  # Shared TypeScript interfaces
cloudflare/
  worker.js                   # Cloudflare Worker with 10-min cron
  wrangler.toml               # Worker config + KV binding
```

---

## Environment variables

Set in Vercel project settings:

| Variable                 | Description                                |
| ------------------------ | ------------------------------------------ |
| `AUTOMATE_SECRET`        | Shared secret between CF Worker and Vercel |
| `INSTAGRAM_ACCESS_TOKEN` | Meta long-lived user access token          |
| `INSTAGRAM_ACCOUNT_ID`   | Instagram Business Account ID              |
| `FACEBOOK_ACCESS_TOKEN`  | Meta page access token                     |
| `FACEBOOK_PAGE_ID`       | Facebook Page ID                           |
| `SUPABASE_URL`           | Supabase project URL (for Knowledge Base)  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `PPP_SITE_URL`           | Primary PPP TV site (RSS) feed base URL    |
| `PPPTV_WORKER_URL`       | Cloudflare worker feed fallback            |
| `GEMINI_API_KEY`         | Google Gemini API key for headlines        |
| `NVIDIA_API_KEY`         | NVIDIA NIM key for captions                |

---

## Cloudflare Worker secrets

```bash
wrangler secret put VERCEL_APP_URL   # https://auto-news-station.vercel.app
wrangler secret put AUTOMATE_SECRET  # same as Vercel env var
```

---

## Testing without social tokens

Preview the image template in browser:

```
GET /api/preview-image
GET /api/preview-image?title=YOUR+HEADLINE&category=CELEBRITY
GET /api/preview-image?title=HEADLINE&category=NEWS&imageUrl=https://...
```

Dry run (scrape + image gen, no posting):

```
GET /api/dry-run
```

---

## Dashboard

Live at `https://auto-news-station.vercel.app`

- Click "Fetch Live Articles + Preview Images" to pull real articles
- Click any article card to see the generated 4:5 image
- Click the image to open fullscreen lightbox
- Shows caption character counts for Instagram and Facebook
