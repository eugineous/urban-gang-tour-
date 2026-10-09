import type { MetadataRoute } from 'next';
import publicDesignRoutes from '@/data/public-page-routes.json';
import { ROUTES, SITE } from '@/lib/site';
import { getBlogPosts } from './_lib/blog';
import { hasDb, q } from '@/lib/server/db';
import { INDEXABLE_EVENT_STATUSES } from '@/lib/server/event-lifecycle';

// Product and ticket URLs are owner-managed database records. The sitemap
// must read them at request time instead of capturing a build-time snapshot.
export const dynamic = 'force-dynamic';

// Tag-based revalidation: when admin publishes a new post or event, call
// revalidateTag('sitemap') to flush the cached sitemap response immediately.
// revalidate=0 means "never cache between requests", but the tag still lets
// an on-demand flush from the admin pipeline skip even the SSG grace period.
export const revalidate = 0;

// Lists every crawlable URL, including each /blog/[slug]. /admin is excluded
// (noindex). robots.ts points crawlers here.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Google only uses lastmod when it is consistently accurate. Static route
  // definitions do not expose a source-of-truth modification timestamp, so
  // omit it rather than claiming every page changed whenever the sitemap was
  // requested. Database-owned records below retain their real updated_at.
  const pages = ROUTES.filter((r) => r.path !== '/admin' && r.path !== '/account').map((r) => ({
    url: SITE.domain + (r.path === '/' ? '' : r.path),
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
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Each active product has a canonical purchase page. Product markup belongs
  // on these single-product URLs, not on the catalogue listing.
  let products: MetadataRoute.Sitemap = [];
  if (hasDb()) {
    try {
      const rows = await q<{ id: string; updated_at: string }>(
        `SELECT id, updated_at::text AS updated_at FROM products
         WHERE active ORDER BY id`
      );
      products = rows.map((product) => ({
        url: `${SITE.domain}/shop/${encodeURIComponent(product.id)}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    } catch {
      products = [];
    }
  }

  // Event rich results need one canonical URL for each real ticketed event.
  // Only active, indexable lifecycle states are exposed here; completed
  // ticket-holder pages can still render by URL without becoming discovery
  // inventory.
  // A transient DB issue leaves the established sitemap intact.
  let ticketedEvents: MetadataRoute.Sitemap = [];
  if (hasDb()) {
    try {
      const rows = await q<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at::text AS updated_at FROM tour_events
         WHERE kind='ticketed'
           AND status = ANY($1)
           AND slug != ''
           AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled'))
         ORDER BY event_date ASC`,
        [[...INDEXABLE_EVENT_STATUSES]]
      );
      ticketedEvents = rows.map((event) => ({
        url: `${SITE.domain}/events/${encodeURIComponent(event.slug)}`,
        lastModified: event.updated_at ? new Date(event.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    } catch {
      ticketedEvents = [];
    }
  }

  const newPages = publicDesignRoutes.map(path=>({url:SITE.domain+(path==='/'?'':path),changeFrequency:'monthly' as const,priority:0.6}));
  return [...new Map([...pages,...authors,...posts,...products,...ticketedEvents,...newPages].map(page=>[page.url,page])).values()];
}
