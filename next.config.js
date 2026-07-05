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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self'",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
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
