// Commercial truth resolver — the single authoritative source for event
// availability across every surface (homepage cards, /events, /events/[slug],
// checkout, SEO). No surface may maintain its own availability rules.
//
// The resolver derives truth from: lifecycle status, sale window, and ticket
// capacity. It never invents availability — unknown capacity means unknown
// availability, not "in stock".

import { q, hasDb } from './db';
import { isEventSellable, isPubliclyVisible, isEventIndexable } from './event-lifecycle';
import {ticketCapacity, parseTierInventory } from './ticket-inventory';

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
    per_order_min: number;
    per_order_max: number;
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
      id: string; slug: string; name: string; status: string; tiers: string;
      event_date:string|null;venue:string|null;
      sales_start_at: string | null; sales_end_at: string | null;
    }>(
      `SELECT id, slug, name, status, tiers, event_date::text AS event_date,venue,sales_start_at::text AS sales_start_at,
              sales_end_at::text AS sales_end_at
       FROM tour_events WHERE slug=$1 AND kind='ticketed' LIMIT 1`,
      [slug]
    );
    const row = rows[0];
    if (!row) return null;

    const status = row.status;
    if (!isPubliclyVisible(status)) return null;

    const tiers = parseTierInventory(row.tiers);
    const date=row.event_date||'';
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00+03:00'):null;
    const scheduleReady=!!String(row.venue||'').trim()&&!!parsed&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date&&Date.parse(date+'T23:59:59+03:00')>=Date.now();
    const sellable = scheduleReady&&isEventSellable({ status, kind: 'ticketed', tiers });

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
        const {sold,reserved} = await ticketCapacity(row.id,index,tier.name);
        const remaining = Math.max(0, tier.capacity - sold - reserved);
        return {
          ...tier,
          remaining,
          sellable: sellable && (saleWindowOpen === null || saleWindowOpen) && remaining >= tier.per_order_min,
        };
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
      isSellable: tierTruth.some(tier => tier.sellable),
      isSoldOut: status === 'sold_out' || (status==='published'&&scheduleReady&&totalRemaining !== null && totalRemaining <= 0),
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
