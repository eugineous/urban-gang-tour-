import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidate } from '@/lib/server/microcache';
import { invalidateCatalogCaches } from '@/lib/server/catalog';

/**
 * After any commercial mutation the public surfaces have to drop what they
 * were serving. ISR pages (/events, /events/[id]), the JSON-LD graph, the
 * sitemap, the in-isolate catalog used at checkout, and the site-data
 * microcache are four different caches — flushing one of them is how the
 * Control Room says "published" while the public page stays stale.
 */
export function bumpEventPublicTruth(eventId?: string | null): void {
  invalidateCatalogCaches();
  invalidate('site-events:all');
  invalidate('site-events:ticketed');
  invalidate('site-events:school');
  invalidate('site-events:past');
  invalidate('site-events:partner');
  invalidate('partner-portfolio');
  try {
    revalidatePath('/events');
    revalidatePath('/experience');
    revalidatePath('/');
    revalidatePath('/tour-stops');
    revalidatePath('/portfolio');
    revalidatePath('/blog', 'layout');
    revalidatePath('/sitemap.xml');
    // Immediate expiry preserves publish/hide behaviour; SWR could show a
    // withdrawn event once more after an admin has removed it.
    revalidateTag('sitemap', {expire:0});
    revalidateTag('events', {expire:0});
    if (eventId && /^[a-z0-9-]{1,80}$/.test(eventId)) {
      revalidatePath(`/events/${eventId}`);
    }
  } catch {
    // revalidatePath is a no-op outside a Next request context (unit tests).
  }
}
