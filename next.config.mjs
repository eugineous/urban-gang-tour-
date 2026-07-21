/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      { source: '/news', destination: '/urban-news', permanent: true },
      { source: '/tickets', destination: '/events', permanent: true },
      { source: '/contact', destination: '/contact-us', permanent: true },
      { source: '/tour', destination: '/experience', permanent: true },
      { source: '/gang', destination: '/the-gang', permanent: true },
      { source: '/merch', destination: '/shop', permanent: true },
      // /v25-template.html is a raw client-side template fragment (unrendered
      // {{ mustache }} placeholders), fetched internally by V25App.tsx via
      // `fetch('/v25-template.html')` — that request never sets
      // sec-fetch-dest: document, only a real browser navigation does. Google
      // had indexed it directly as a broken-looking page; 301 real visitors
      // away from it while leaving the internal fetch() untouched.
      {
        source: '/v25-template.html',
        has: [{ type: 'header', key: 'sec-fetch-dest', value: 'document' }],
        destination: '/',
        permanent: true,
      },
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
      // 'unsafe-eval' is required: the v25 runtime (public/support.js) uses
      // `new Function(...)` to evaluate each template's logic class at boot
      // (see evalDcLogic) — confirmed by testing a real production build,
      // where without this the entire interactive app (cart, checkout,
      // tickets, admin) fails to boot. Not a dev-mode artifact, don't remove.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Google Identity Services makes its own credential/config fetches
      // directly from the client library (not just the script-src/frame-src
      // load) — Google's own CSP guidance requires connect-src to allow
      // accounts.google.com or the Sign-In button fails with a generic
      // "malformed request" error on Google's side. Missed in the original
      // evidence-gathering pass since a page-load check doesn't exercise it —
      // only an actual login attempt does.
      "connect-src 'self' https://accounts.google.com",
      "frame-src https://www.youtube.com https://accounts.google.com",
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
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
