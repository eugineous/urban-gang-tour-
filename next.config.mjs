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
    return [
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
