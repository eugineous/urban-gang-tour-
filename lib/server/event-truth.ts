// Commercial truth resolver — the single authoritative source for event
// availability across every surface (homepage cards, /events, /events/[slug],
// checkout, SEO). No surface may maintain its own availability rules.
//
// The resolver derives truth from: lifecycle status, sale window, and ticket
// capacity. It never invents availability — unknown capacity means unknown
// availability, not "in stock".

import { q, hasDb } from './db';
import { isEventSellable, isPubliclyVisible, isEventIndexable } from './event-lifecycle';
import { soldCount, reservedCount, parseTierInventory } from './ticket-inventory';

export type EventTruth = {
  slug: string;
  name: string;
  status: string;
  isPublic: boolean;
  isIndexable: boolean;
  isSellable: boolean;
  isSoldOut: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isPostponed: boolean;
  isRescheduled: boolean;
  saleWindowOpen: boolean | null; // null = no sale window configured
  tiers: Array<{
    name: string;
    price: number;
    capacity: number | null;
    remaining: number | null;
    sellable: boolean;
  }>;
  totalRemaining: number | null;
  minPrice: number | null;
};

/**
 * Resolve the full commercial truth for one event by slug.
 * Returns null when the event does not exist or is not publicly visible.
 */
export async function resolveEventTruth(slug: string): Promise<EventTruth | null> {
  if (!hasDb() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    const rows = await q<{
      slug: string; name: string; status: string; tiers: string;
      sales_start_at: string | null; sales_end_at: string | null;
      capacity: number | null;
    }>(
      `SELECT slug, name, status, tiers, sales_start_at::text AS sales_start_at,
              sales_end_at::text AS sales_end_at, capacity
       FROM tour_events WHERE slug=$1 AND kind='ticketed' LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return null;

    const status = row.status;
    if (!isPubliclyVisible(status)) return null;

    const tiers = parseTierInventory(row.tiers);
    const sellable = isEventSellable({ status, kind: 'ticketed', tiers });

    // Sale window check
    let saleWindowOpen: boolean | null = null;
    if (row.sales_start_at || row.sales_end_at) {
      const now = Date.now();
      const start = row.sales_start_at ? new Date(row.sales_start_at).getTime() : null;
      const end = row.sales_end_at ? new Date(row.sales_end_at).getTime() : null;
      saleWindowOpen = (start === null || now >= start) && (end === null || now <= end);
    }

    // Per-tier remaining capacity
    const tierTruth = await Promise.all(
      tiers.map(async (tier, index) => {
        if (tier.capacity === null) {
          return { ...tier, remaining: null, sellable: false };
        }
        const sold = await soldCount(slug, tier.name);
        const reserved = await reservedCount(slug, index);
        const remaining = Math.max(0, tier.capacity - sold - reserved);
        return { ...tier, remaining, sellable: sellable && remaining > 0 };
      })
    );

    const totalRemaining = tierTruth.every((t) => t.remaining === null)
      ? null
      : tierTruth.reduce((sum, t) => sum + (t.remaining || 0), 0);

    const minPrice = tierTruth.length > 0
      ? Math.min(...tierTruth.map((t) => t.price))
      : null;

    return {
      slug: row.slug,
      name: row.name,
      status,
      isPublic: true,
      isIndexable: isEventIndexable(status),
      isSellable: sellable && (saleWindowOpen === null || saleWindowOpen),
      isSoldOut: status === 'sold_out' || (totalRemaining !== null && totalRemaining <= 0),
      isCompleted: status === 'completed',
      isCancelled: status === 'cancelled',
      isPostponed: status === 'postponed',
      isRescheduled: status === 'rescheduled',
      saleWindowOpen,
      tiers: tierTruth,
      totalRemaining,
      minPrice,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve truth for multiple events (batch). Used by the discovery page
 * and homepage cards so they share the same availability rules as checkout.
 */
export async function resolveManyEventTruths(slugs: string[]): Promise<EventTruth[]> {
  const results = await Promise.all(slugs.map((s) => resolveEventTruth(s)));
  return results.filter((r): r is EventTruth => r !== null);
}
