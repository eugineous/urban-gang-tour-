import { hasDb, q } from '@/lib/server/db';
import { formatEventDate } from '@/lib/server/catalog';
import { INDEXABLE_EVENT_STATUSES } from '@/lib/server/event-lifecycle';
import { resolveManyEventTruths, type EventTruth } from '@/lib/server/event-truth';
import { getBlogPosts, type BlogPost } from '@/app/_lib/blog';

export type HomepageEvent = {
  slug: string;
  name: string;
  event_date: string;
  event_time: string;
  venue: string;
  city: string;
  accent: string;
  image: string;
  status: string;
  truth: EventTruth;
};

export type HomepageProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
};

export type HomepagePhoto = {
  id: number;
  url: string;
  caption: string;
  alt_text: string;
};

export type HomepageSection<T> = {
  status: 'ready' | 'empty' | 'degraded';
  items: T[];
};

export type HomepageView = {
  events: HomepageSection<HomepageEvent>;
  products: HomepageSection<HomepageProduct>;
  photos: HomepageSection<HomepagePhoto>;
  posts: HomepageSection<BlogPost>;
};

async function readSection<T>(read: () => Promise<T[]>): Promise<HomepageSection<T>> {
  try {
    const items = await read();
    return { status: items.length ? 'ready' : 'empty', items };
  } catch {
    return { status: 'degraded', items: [] };
  }
}

async function readEvents(): Promise<HomepageEvent[]> {
  const rows = await q<Omit<HomepageEvent, 'truth'>>(
    `SELECT slug, name, event_date::text, event_time, venue, city, accent, image, status
     FROM tour_events
     WHERE status = ANY($1)
       AND slug != ''
       AND (event_date >= CURRENT_DATE OR status IN ('postponed','rescheduled'))
     ORDER BY priority DESC, event_date ASC NULLS LAST
     LIMIT 4`,
    [[...INDEXABLE_EVENT_STATUSES]],
  );
  const truths = await resolveManyEventTruths(rows.map((row) => row.slug));
  const bySlug = new Map(truths.map((truth) => [truth.slug, truth]));
  return rows.flatMap((row) => {
    const truth = bySlug.get(row.slug);
    return truth ? [{ ...row, truth }] : [];
  });
}

async function readProducts(): Promise<HomepageProduct[]> {
  return q<HomepageProduct>(
    `SELECT id, name, price, image, category
     FROM products
     WHERE active
     ORDER BY id
     LIMIT 3`,
  );
}

async function readPhotos(): Promise<HomepagePhoto[]> {
  return q<HomepagePhoto>(
    `SELECT id, url, caption, alt_text
     FROM gallery_photos
     WHERE published = true
     ORDER BY sort_order ASC, id ASC
     LIMIT 5`,
  );
}

async function readPosts(): Promise<BlogPost[]> {
  return getBlogPosts();
}

export async function getHomepageView(): Promise<HomepageView> {
  // No database is a degraded state, not an empty commercial catalogue.
  // The page may still render its static brand and booking surface, but it
  // must not imply that no events or products exist.
  if (!hasDb()) {
    return {
      events: { status: 'degraded', items: [] },
      products: { status: 'degraded', items: [] },
      photos: { status: 'degraded', items: [] },
      posts: { status: 'degraded', items: [] },
    };
  }

  const [events, products, photos, posts] = await Promise.all([
    readSection(readEvents),
    readSection(readProducts),
    readSection(readPhotos),
    readSection(readPosts),
  ]);

  return { events, products, photos, posts };
}

export function eventDateLabel(event: HomepageEvent): string {
  return formatEventDate(event.event_date);
}