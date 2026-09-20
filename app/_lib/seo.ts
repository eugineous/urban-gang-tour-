import type { Metadata } from 'next';
import { ROUTES, SITE, routeByPath } from '@/lib/site';

// Build per-page Metadata from the central route table. Guarantees a UNIQUE
// title, description, canonical and OG image for every URL — no two pages
// share a canonical, which is what stops Google collapsing them as duplicates.
export function metadataForPath(path: string): Metadata {
  const r = routeByPath(path);
  if (!r) return {};
  const url = SITE.domain + (r.path === '/' ? '' : r.path);
  const og = r.og || SITE.defaultOg;
  const noindex = r.path === '/admin';
  return {
    title: r.title,
    description: r.description,
    alternates: {
      canonical: url,
      // RSS autodiscovery on every page - feed readers and aggregators find
      // /feed.xml from any entry point, not just /blog.
      types: { 'application/rss+xml': `${SITE.domain}/feed.xml` },
    },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title: r.title,
      description: r.description,
      url,
      images: [{ url: og }],
      locale: 'en_KE',
    },
    twitter: {
      card: 'summary_large_image',
      title: r.title,
      description: r.description,
      images: [og],
    },
  };
}

export const ALL_PATHS = ROUTES.map((r) => r.path);

// Admin SEO overrides (settings key "seo:<path>") merged over the defaults.
export async function metadataForPathDynamic(path: string): Promise<Metadata> {
  const base = metadataForPath(path);
  try {
    const { q, db } = await import('@/lib/server/db');
    if (db()) {
      const rows = await q(`SELECT value FROM settings WHERE key=$1`, ['seo:' + path]);
      const o = rows[0]?.value || {};
      // Settings are editable in the Control Room. Only accept strings here:
      // a malformed saved JSON value should never turn into an object in an
      // HTML metadata field, and every social card must describe the same
      // current page as its title and description.
      const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : undefined;
      const description = typeof o.description === 'string' && o.description.trim() ? o.description.trim() : undefined;
      if (title || description) {
        return {
          ...base,
          title: title || base.title,
          description: description || base.description,
          openGraph: {
            ...(base.openGraph as any),
            title: title || (base.openGraph as any)?.title,
            description: description || (base.openGraph as any)?.description,
          },
          twitter: {
            ...(base.twitter as any),
            title: title || (base.twitter as any)?.title,
            description: description || (base.twitter as any)?.description,
          },
        };
      }
    }
  } catch { /* fall back to defaults */ }
  return base;
}
