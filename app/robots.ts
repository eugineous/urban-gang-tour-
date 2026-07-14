import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /t/ + /tickets/ are bearer-token ticket pages (also meta-noindexed)
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/organizer', '/api/', '/t/', '/tickets/', '/v25-template.html'],
      },
    ],
    sitemap: [`${SITE.domain}/sitemap.xml`, `${SITE.domain}/news-sitemap.xml`],
    host: SITE.domain,
  };
}
