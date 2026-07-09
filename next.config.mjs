/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Legacy eslint config in the repo isn't for this app; don't let it block builds.
  eslint: { ignoreDuringBuilds: true },
  // v25 assets live in /assets and are copied into /public/assets at build time
  // by scripts/sync-assets.mjs so we never have to move 77MB of media in git.
  // afterFiles rewrite: only fires when no real file exists at /assets/*.
  // On production (public/assets present) it never triggers; on the isolated
  // preview (no media uploaded) it proxies images/video from the live domain.
  async rewrites() {
    return [
      { source: '/assets/:path*', destination: 'https://urbangangtour.co.ke/assets/:path*' },
    ];
  },
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
