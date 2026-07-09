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
