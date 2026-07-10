import type { MetadataRoute } from 'next';
import { ROUTES, SITE } from '@/lib/site';
import { getBlogPosts } from './_lib/blog';

// Lists every crawlable URL, including each /blog/[slug]. /admin is excluded
// (noindex). robots.ts points crawlers here.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = ROUTES.filter((r) => r.path !== '/admin').map((r) => ({
    url: SITE.domain + (r.path === '/' ? '' : r.path),
    lastModified: now,
    changeFrequency: r.changefreq,
    priority: r.priority,
  }));

  const posts = (await getBlogPosts()).map((p) => ({
    url: `${SITE.domain}/blog/${p.slug}`,
    lastModified: new Date(p.dateModified),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...pages, ...posts];
}
