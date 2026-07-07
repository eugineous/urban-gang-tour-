const BASE_URL = 'https://urbangangtour.co.ke';

export default function robots() {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
