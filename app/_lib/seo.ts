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
    alternates: { canonical: url },
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
      if (o.title || o.description) {
        return {
          ...base,
          title: o.title || base.title,
          description: o.description || base.description,
          openGraph: { ...(base.openGraph as any), title: o.title || (base.openGraph as any)?.title, description: o.description || (base.openGraph as any)?.description },
        };
      }
    }
  } catch { /* fall back to defaults */ }
  return base;
}
