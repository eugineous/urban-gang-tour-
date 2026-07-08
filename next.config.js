/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    // unsafe-eval + unpkg.com are load-bearing, not leftover: every public/*.dc.html
    // page loads React/ReactDOM/Babel from unpkg.com at runtime and Babel-transpiles
    // the inline dc-script block via `new Function` (see public/support.js, aka
    // dc-runtime). Removing either one white-screens every marketing page - do not
    // "clean this up" without first replacing dc-runtime's in-browser transpilation.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Clean-URL slug -> the real static file in public/. Kept as one map so
// rewrites (slug serves the file) and redirects (old filename URL -> slug)
// can't drift apart.
// Pages migrated off this map are real Next.js routes under app/ instead:
// each one gets full server rendering with no runtime Babel transpilation.
// The matching .dc.html file stays on disk during the migration but is no
// longer routed to - see the extra redirects below.
// Migrated so far: blog (app/blog/), the-gang (app/the-gang/).
const DC_PAGES = {
  about: "About.dc.html",
  book: "Book.dc.html",
  "contact-us": "Contact.dc.html",
  events: "Events.dc.html",
  experience: "Experience.dc.html",
  gallery: "Gallery.dc.html",
  partners: "Partners.dc.html",
  "promo-reel": "Promo Reel.dc.html",
  shop: "Shop.dc.html",
  "urban-news": "Urban News.dc.html",
};

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      // "/" is a real Next.js route (app/page.tsx) - no rewrite needed.
      // Home.dc.html still exists on disk during the migration but is no
      // longer routed to; direct hits redirect below.
      ...Object.entries(DC_PAGES).map(([slug, file]) => ({
        source: `/${slug}`,
        destination: `/${encodeURIComponent(file)}`,
      })),
    ];
  },
  async redirects() {
    return [
      // Send every *.vercel.app host (the production alias, the
      // -roylandz-media alias, and every preview-deployment URL) to the
      // real domain - the brand should never be visibly "hosted on vercel".
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<sub>.*)\\.vercel\\.app" }],
        destination: "https://urbangangtour.co.ke/:path*",
        permanent: true,
      },
      { source: "/Home.dc.html", destination: "/", permanent: true },
      { source: "/Blog.dc.html", destination: "/blog", permanent: true },
      { source: "/The%20Gang.dc.html", destination: "/the-gang", permanent: true },
      ...Object.entries(DC_PAGES).map(([slug, file]) => ({
        source: `/${encodeURIComponent(file)}`,
        destination: `/${slug}`,
        permanent: true,
      })),
    ];
  },
  images: {
    domains: [
      "upload.wikimedia.org",
      "commons.wikimedia.org",
      "ppptv-v2.vercel.app",
      "ichef.bbci.co.uk",
      "www.standardmedia.co.ke",
      "deadline.com",
      "variety.com",
      "cdn.standardmedia.co.ke",
      "www.kenyans.co.ke",
      "naibuzz.com",
      "notjustok.com",
      "static01.nyt.com",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...existing, "axios", "undici", "cheerio"];
    }
    return config;
  },
};

module.exports = nextConfig;
