// Ticket inventory: remaining = capacity - sold - unexpired holds.
// Counters stored on a row will drift under concurrent checkout; this file
// is the authoritative calculation. Capacity is OPTIONAL. A missing capacity
// means inventory is not tracked for that tier — we do not invent a number.

import { q, hasDb } from './db';
import { randomUUID } from 'node:crypto';

export const RESERVATION_TTL_MS = 15 * 60_000;

export type TierInventory = {
  name: string;
  price: number;
  capacity: number | null;
  per_order_min: number;
  per_order_max: number;
};

export function parseTierInventory(raw: unknown): TierInventory[] {
  const arr = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const name = String((t as { name?: unknown }).name || '').trim();
      const price = Math.round(Number((t as { price?: unknown }).price));
      if (!name || !Number.isSafeInteger(price) || price < 0) return null;
      const capRaw = (t as { capacity?: unknown }).capacity;
      const capacity =
        capRaw === null || capRaw === undefined || capRaw === ''
          ? null
          : Number.isSafeInteger(Number(capRaw)) && Number(capRaw) >= 0
            ? Number(capRaw)
            : null;
      const min = Math.max(1, Math.round(Number((t as { per_order_min?: unknown }).per_order_min) || 1));
      const max = Math.max(min, Math.round(Number((t as { per_order_max?: unknown }).per_order_max) || 20));
      return { name, price, capacity, per_order_min: min, per_order_max: Math.min(max, 20) };
    })
    .filter((t): t is TierInventory => !!t);
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function remainingCapacity(opts: {
  capacity: number | null;
  sold: number;
  reserved: number;
}): number | null {
  if (opts.capacity === null) return null;
  return opts.capacity - Math.max(0, opts.sold) - Math.max(0, opts.reserved);
}

export function canSellQty(opts: {
  capacity: number | null;
  sold: number;
  reserved: number;
  qty: number;
  per_order_min: number;
  per_order_max: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(opts.qty) || opts.qty < 1) return { ok: false, reason: 'invalid_qty' };
  if (opts.qty < opts.per_order_min) return { ok: false, reason: 'below_min' };
  if (opts.qty > opts.per_order_max) return { ok: false, reason: 'above_max' };
  const remaining = remainingCapacity(opts);
  if (remaining === null) return { ok: true };
  if (remaining < opts.qty) return { ok: false, reason: remaining <= 0 ? 'sold_out' : 'insufficient_inventory' };
  return { ok: true };
}

export async function soldCount(eventId: string, tierName: string): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await q<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM tickets t
       JOIN orders o ON o.id = t.order_id
      WHERE t.event_id=$1 AND t.tier_name=$2
        AND o.status IN ('paid','fulfilled')
        AND t.voided_at IS NULL`,
    [eventId, tierName],
  );
  return Number(rows[0]?.n || 0);
}

export async function reservedCount(eventId: string, tierIndex: number): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await q<{ n: string }>(
    `SELECT COALESCE(SUM(qty),0)::text AS n FROM ticket_reservations
      WHERE event_id=$1 AND tier_index=$2 AND status='held' AND expires_at > now()`,
    [eventId, tierIndex],
  );
  return Number(rows[0]?.n || 0);
}

export async function assertTicketAvailable(opts: {
  eventId: string;
  tierIndex: number;
  tier: TierInventory;
  qty: number;
}): Promise<void> {
  const sold = await soldCount(opts.eventId, opts.tier.name);
  const reserved = await reservedCount(opts.eventId, opts.tierIndex);
  const check = canSellQty({
    capacity: opts.tier.capacity,
    sold,
    reserved,
    qty: opts.qty,
    per_order_min: opts.tier.per_order_min,
    per_order_max: opts.tier.per_order_max,
  });
  if (!check.ok) throw new Error(check.reason);
}

export async function holdTickets(opts: {
  eventId: string;
  tierIndex: number;
  qty: number;
  orderId: string;
}): Promise<string | null> {
  if (!hasDb()) return null;
  const id = 'RSV-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
  await q(
    `INSERT INTO ticket_reservations (id, event_id, tier_index, qty, order_id, status, expires_at)
     VALUES ($1,$2,$3,$4,$5,'held', now() + interval '15 minutes')`,
    [id, opts.eventId, opts.tierIndex, opts.qty, opts.orderId],
  );
  return id;
}

export async function consumeReservation(orderId: string): Promise<void> {
  if (!hasDb()) return;
  await q(
    `UPDATE ticket_reservations SET status='consumed' WHERE order_id=$1 AND status='held'`,
    [orderId],
  );
}

export async function releaseReservation(orderId: string): Promise<void> {
  if (!hasDb()) return;
  await q(
    `UPDATE ticket_reservations SET status='released' WHERE order_id=$1 AND status='held'`,
    [orderId],
  );
}

export async function expireStaleReservations(): Promise<number> {
  if (!hasDb()) return 0;
  const rows = await q<{ id: string }>(
    `UPDATE ticket_reservations SET status='expired'
      WHERE status='held' AND expires_at <= now()
      RETURNING id`,
  );
  return rows.length;
}
