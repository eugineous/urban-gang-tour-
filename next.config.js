/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    // Every page is now a real Next.js route - the old dc-runtime (public/support.js,
    // React/Babel loaded from unpkg.com at runtime, in-browser transpilation via
    // `new Function`) has been fully retired along with the last public/*.dc.html
    // file. 'unsafe-eval' and unpkg.com are dropped because nothing needs them
    // anymore; re-add only if a future page brings back client-side eval.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
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

// Every marketing page is a real Next.js route under app/ now. The old
// dc-runtime (public/*.dc.html, client-side Babel transpilation) is fully
// retired; these redirects just catch anyone with an old filename URL
// bookmarked or indexed and send them to the real route.
const LEGACY_REDIRECTS = [
  { source: "/Home.dc.html", destination: "/" },
  { source: "/Blog.dc.html", destination: "/blog" },
  { source: "/The%20Gang.dc.html", destination: "/the-gang" },
  { source: "/Events.dc.html", destination: "/events" },
  { source: "/Contact.dc.html", destination: "/contact-us" },
  { source: "/Shop.dc.html", destination: "/shop" },
  { source: "/Book.dc.html", destination: "/book" },
  { source: "/About.dc.html", destination: "/about" },
  { source: "/Partners.dc.html", destination: "/partners" },
  { source: "/Experience.dc.html", destination: "/experience" },
  { source: "/Gallery.dc.html", destination: "/gallery" },
  { source: "/Urban%20News.dc.html", destination: "/urban-news" },
  // Promo Reel was retired outright (internal shot-list/creative-brief
  // document, not real public content) rather than migrated - both its old
  // filename and its old clean slug now land on the real photo/video gallery.
  { source: "/Promo%20Reel.dc.html", destination: "/gallery" },
  { source: "/promo-reel", destination: "/gallery" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
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
      ...LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: true })),
    ];
  },
  images: {
    domains: [
      "img.youtube.com", // VideoHero poster frame on the homepage
    ],
  },
};

module.exports = nextConfig;
