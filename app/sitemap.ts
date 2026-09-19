import type { MetadataRoute } from 'next';
import { ROUTES, SITE } from '@/lib/site';
import { getBlogPosts } from './_lib/blog';
import { hasDb, q } from '@/lib/server/db';
import { ensureCatalogSeeded } from '@/lib/server/catalog';

// Product and ticket URLs are owner-managed database records. The sitemap
// must read them at request time instead of capturing a build-time snapshot.
export const dynamic = 'force-dynamic';

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

  // Plain RSC pages that live outside the dc-runtime ROUTES registry
  // (like /blog/[slug], they define their own metadata in-file).
  const authors = ['eugine-micah', 'lucy-ogunde'].map((slug) => ({
    url: `${SITE.domain}/author/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Each active product has a canonical purchase page. Product markup belongs
  // on these single-product URLs, not on the catalogue listing.
  let products: MetadataRoute.Sitemap = [];
  if (hasDb()) {
    try {
      await ensureCatalogSeeded();
      const rows = await q<{ id: string; updated_at: string }>(
        `SELECT id, updated_at::text AS updated_at FROM products
         WHERE active ORDER BY id`
      );
      products = rows.map((product) => ({
        url: `${SITE.domain}/shop/${encodeURIComponent(product.id)}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    } catch {
      products = [];
    }
  }

  // Event rich results need one canonical URL for each real ticketed event.
  // Only published events with a confirmed upcoming date are exposed here.
  // A transient DB issue leaves the established sitemap intact.
  let ticketedEvents: MetadataRoute.Sitemap = [];
  if (hasDb()) {
    try {
      await ensureCatalogSeeded();
      const rows = await q<{ id: string; updated_at: string }>(
        `SELECT id, updated_at::text AS updated_at FROM tour_events
         WHERE kind='ticketed' AND status='published' AND event_date >= CURRENT_DATE
         ORDER BY event_date ASC`
      );
      ticketedEvents = rows.map((event) => ({
        url: `${SITE.domain}/events/${encodeURIComponent(event.id)}`,
        lastModified: event.updated_at ? new Date(event.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    } catch {
      ticketedEvents = [];
    }
  }

  return [...pages, ...authors, ...posts, ...products, ...ticketedEvents];
}
