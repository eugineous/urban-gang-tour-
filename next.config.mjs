import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Provide simulated Cloudflare bindings during local development.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Send complete metadata and page HTML in the initial document to every
  // visitor. A streamed Suspense placeholder needs JavaScript to become the
  // real page, which made otherwise server-rendered routes look blank.
  htmlLimitedBots: /.*/,
  // Legacy eslint config in the repo isn't for this app; don't let it block builds.
  eslint: { ignoreDuringBuilds: true },
  // @react-pdf/renderer (pdfkit inside) ships font data that breaks if webpack
  // tries to bundle it; keep it external so Node resolves it normally.
  serverExternalPackages: ['@react-pdf/renderer'],
  // v25 assets live in /assets and are copied into /public/assets at build time
  // by scripts/sync-assets.mjs so we never have to move 77MB of media in git.
  // 301s: friendly aliases + legacy URLs → canonical routes
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/news', destination: '/blog', permanent: true },
      // /urban-news retired 2026-07-21 in favor of /blog, which now carries
      // the real redesigned Urban News page (real posts, real tour dates,
      // real traffic-based trending) instead of the old static v25 capture.
      { source: '/urban-news', destination: '/blog', permanent: true },
      { source: '/tickets', destination: '/events', permanent: true },
      { source: '/contact', destination: '/contact-us', permanent: true },
      { source: '/tour', destination: '/experience', permanent: true },
      { source: '/gang', destination: '/the-gang', permanent: true },
      { source: '/merch', destination: '/shop', permanent: true },
      { source: '/v25-template', destination: '/', permanent: true },
      { source: '/v25-template.html', destination: '/', permanent: true },
    ];
  },
  // NOTE: the old preview-era rewrite that proxied missing /assets/* to the
  // live domain was removed: on production it proxied to ITSELF, so any
  // missing asset produced a 508 request loop instead of a clean 404.
  async headers() {
    // Security headers were entirely missing sitewide (checked 2026-07-14) —
    // this site takes real payments and has an admin login, so basic
    // clickjacking/XSS/MIME-sniffing hardening matters. CSP is scoped to what
    // the app actually loads client-side (checked against the real code, not
    // guessed): Google Sign-In script, Google Fonts, a YouTube embed. Paystack
    // checkout is a full-page redirect (see app/api/paystack/checkout/route.ts),
    // never an embedded script/iframe, so it needs no CSP allowance at all.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval' " : ""}https://accounts.google.com https://www.googletagmanager.com`,
      // accounts.google.com is here too: the GIS button loads its own
      // stylesheet (https://accounts.google.com/gsi/style) separately from
      // the script - found live while testing the connect-src fix above.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Google Identity Services makes its own credential/config fetches
      // directly from the client library (not just the script-src/frame-src
      // load) — Google's own CSP guidance requires connect-src to allow
      // accounts.google.com or the Sign-In button fails with a generic
      // "malformed request" error on Google's side. Missed in the original
      // evidence-gathering pass since a page-load check doesn't exercise it —
      // only an actual login attempt does.
      // GA4's gtag.js reports hits to google-analytics.com (and regional
      // subdomains like region1.google-analytics.com) plus analytics.google.com
      // - tested against a real config with NEXT_PUBLIC_GA_MEASUREMENT_ID set,
      // not guessed, learning from the connect-src gap Google Sign-In hit today.
      "connect-src 'self' https://accounts.google.com https://*.google-analytics.com https://*.analytics.google.com https://urban-gang-tour-events.euginemicah.workers.dev",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      { source: '/admin/gate', headers: [{key:'Permissions-Policy',value:'camera=(self), microphone=(), geolocation=()'}] },
      { source: '/verify/:path*', headers: [{key:'Cache-Control',value:'private, no-store'},{key:'Referrer-Policy',value:'no-referrer'}] },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
