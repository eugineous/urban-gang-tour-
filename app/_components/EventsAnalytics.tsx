'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { viewItemList, viewItem } from '@/lib/analytics';

/**
 * Fires page-view analytics for the Events funnel. Mount once per page.
 * /events → view_item_list; /events/[slug] → view_item.
 */
export default function EventsAnalytics({ eventSlug, eventNames }: { eventSlug?: string; eventNames?: Array<{ slug: string; name: string }> }) {
  const pathname = usePathname();

  useEffect(() => {
    if (eventSlug) {
      viewItem(eventSlug, eventNames?.find((e) => e.slug === eventSlug)?.name || eventSlug);
    } else if (eventNames && eventNames.length > 0) {
      viewItemList(eventNames.map((e, i) => ({ ...e, position: i + 1 })));
    }
  }, [pathname, eventSlug, eventNames]);

  return null;
}
