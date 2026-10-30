// Ticket inventory: remaining = capacity - sold - unexpired holds.
// Counters stored on a row will drift under concurrent checkout; this file
// is the authoritative calculation. Capacity is OPTIONAL. A missing capacity
// means inventory is not tracked for that tier — we do not invent a number.

import { q, qSchema,db, hasDb } from './db';
import { randomUUID } from 'node:crypto';
import {ensureMpesaAttemptSchema} from './mpesa-attempts';
import {isEventSellable} from './event-lifecycle';
import type {PoolClient} from '@neondatabase/serverless';

export const RESERVATION_TTL_MS = 15 * 60_000;
let inventorySchema:Promise<void>|undefined;
export function ensureTicketInventorySchema(){
 if(!inventorySchema)inventorySchema=(async()=>{
  await qSchema(`CREATE TABLE IF NOT EXISTS ticket_reservations(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,tier_index INT NOT NULL,qty INT NOT NULL,order_id TEXT NOT NULL,status TEXT DEFAULT 'held',expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
   CREATE INDEX IF NOT EXISTS idx_ticket_reservations_event ON ticket_reservations(event_id,tier_index,status,expires_at);
   CREATE INDEX IF NOT EXISTS idx_ticket_reservations_order ON ticket_reservations(order_id);
   ALTER TABLE tickets ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
   CREATE INDEX IF NOT EXISTS idx_orders_ticket_items ON orders USING gin(items jsonb_path_ops) WHERE status IN ('paid','fulfilled','partially_refunded');`);
  await ensureMpesaAttemptSchema();
 })().catch(error=>{inventorySchema=undefined;throw error});
 return inventorySchema;
}
// A paid order occupies capacity even before its asynchronous ticket mint.
// Both aggregates share ONE MVCC snapshot, so a concurrent settlement cannot
// fall between a sold query and a hold query and temporarily disappear.
export const CAPACITY_COUNTS_SQL=`SELECT
 (SELECT COALESCE(SUM(CASE WHEN EXISTS(SELECT 1 FROM tickets t WHERE t.order_id=o.id AND t.event_id=$1 AND t.tier_name=$3)
  THEN (SELECT COUNT(*) FROM tickets t WHERE t.order_id=o.id AND t.event_id=$1 AND t.tier_name=$3 AND t.voided_at IS NULL)
  ELSE (SELECT COALESCE(SUM((line->>'qty')::int),0) FROM jsonb_array_elements(o.items) line WHERE line->>'id'=$5) END),0)::text
  FROM orders o WHERE o.status IN ('paid','fulfilled','partially_refunded') AND o.items @> jsonb_build_array(jsonb_build_object('id',$5::text))) AS sold,
 (SELECT COALESCE(SUM(r.qty),0)::text FROM ticket_reservations r JOIN orders o ON o.id=r.order_id
  WHERE r.event_id=$1 AND r.tier_index=$2 AND r.order_id<>$4 AND r.status='held'
   AND o.status IN ('pending','unknown','reconciling','created','initiated')
   AND (r.expires_at>now() OR o.status IN ('unknown','reconciling') OR o.mpesa_ref IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM mpesa_checkout_attempts a WHERE a.order_id=o.id AND a.state='prepared'))) AS reserved`;
export async function ticketCapacity(eventId:string,tierIndex:number,tierName:string){
 // Public availability reads must never acquire schema locks or run migrations.
 // Authorized reservation/mutation paths bootstrap separately. Missing schema
 // rejects this read, so the truth resolver cannot advertise invented seats.
 const rows=await q<{sold:string;reserved:string}>(CAPACITY_COUNTS_SQL,[eventId,tierIndex,tierName,'','ticket:'+eventId+':'+tierIndex]);
 return {sold:Number(rows[0]?.sold||0),reserved:Number(rows[0]?.reserved||0)};
}

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
  if(!hasDb())throw Error('db_not_configured');
  await ensureTicketInventorySchema();const pool=db();if(!pool)throw Error('db_not_configured');
  let client:PoolClient|undefined;
  try{
   client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='5s'");
   // Event-row lock serializes tier capacity checks. The count statement runs
   // AFTER this lock, with a fresh READ COMMITTED snapshot (not a stale CTE).
   const event=await client.query('SELECT id,kind,status,event_date::text,venue,tiers,sales_start_at::text,sales_end_at::text FROM tour_events WHERE id=$1 FOR UPDATE',[opts.eventId]);
   const row=event.rows[0],tiers=parseTierInventory(row?.tiers),tier=tiers[opts.tierIndex],now=Date.now();
   if(!row||!tier||tier.capacity===null||!isEventSellable({kind:row.kind,status:row.status,tiers})||!row.venue?.trim()||!row.event_date||!Number.isFinite(Date.parse(row.event_date+'T23:59:59+03:00'))||Date.parse(row.event_date+'T23:59:59+03:00')<now||row.sales_start_at&&(!Number.isFinite(Date.parse(row.sales_start_at))||Date.parse(row.sales_start_at)>now)||row.sales_end_at&&(!Number.isFinite(Date.parse(row.sales_end_at))||Date.parse(row.sales_end_at)<=now))throw Error('event_not_sellable');
   const orders=await client.query('SELECT status,items FROM orders WHERE id=$1 FOR UPDATE',[opts.orderId]);
   const order=orders.rows[0],lines=typeof order?.items==='string'?JSON.parse(order.items):order?.items;
   if(!order||!['pending','unknown','reconciling'].includes(order.status)||!Array.isArray(lines)||lines.filter(line=>line.id==='ticket:'+opts.eventId+':'+opts.tierIndex).reduce((n,line)=>n+Number(line.qty),0)!==opts.qty)throw Error('reservation_conflict');
   const prior=await client.query('SELECT * FROM ticket_reservations WHERE order_id=$1 FOR UPDATE',[opts.orderId]);
   if(prior.rows.length>1||prior.rows.some(r=>r.event_id!==opts.eventId||Number(r.tier_index)!==opts.tierIndex||Number(r.qty)!==opts.qty||r.status==='consumed'))throw Error('reservation_conflict');
   const counts=await client.query(CAPACITY_COUNTS_SQL,[opts.eventId,opts.tierIndex,tier.name,opts.orderId,'ticket:'+opts.eventId+':'+opts.tierIndex]);
   const check=canSellQty({...tier,qty:opts.qty,sold:Number(counts.rows[0]?.sold||0),reserved:Number(counts.rows[0]?.reserved||0)});if(!check.ok)throw Error(check.reason);
   const id=prior.rows[0]?.id||'RSV-'+randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
   if(prior.rows.length)await client.query("UPDATE ticket_reservations SET status='held',expires_at=now()+interval '15 minutes' WHERE id=$1",[id]);
   else await client.query("INSERT INTO ticket_reservations(id,event_id,tier_index,qty,order_id,status,expires_at) VALUES($1,$2,$3,$4,$5,'held',now()+interval '15 minutes')",[id,opts.eventId,opts.tierIndex,opts.qty,opts.orderId]);
   await client.query('COMMIT');return id;
  }catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}
  finally{client?.release();await pool.end().catch(()=>{})}
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
  if (!hasDb()) throw new Error('db_not_configured');
  await ensureTicketInventorySchema();
  const rows = await q<{ id: string }>(
    `UPDATE ticket_reservations r SET status='expired'
      WHERE r.status='held' AND r.expires_at <= now() AND EXISTS(
       SELECT 1 FROM orders o WHERE o.id=r.order_id AND (o.status IN ('declined','timed_out','failed','refunded') OR
        o.status='pending' AND o.mpesa_ref IS NULL AND EXISTS(SELECT 1 FROM mpesa_checkout_attempts a WHERE a.order_id=o.id AND a.state='prepared'))
      ) RETURNING r.id`,
  ).catch(() => { throw new Error('database_unavailable'); });
  return rows.length;
}
