// Digital ticket ledger: one row per admission, minted the moment an order
// with ticket lines is confirmed paid. Codes are authenticated on the server:
// New: TKT-<22 random chars>-<12-char HMAC tag keyed with SESSION_SECRET>, drawn
// from an unambiguous alphabet (no 0/O/1/I), so forged codes fail the server HMAC check. Never distribute the signing
// secret to gate devices. Admission also requires a paid, unused database row.
//
// Roles: minting runs server-side only (payment webhooks + the ticket pages'
// lazy-mint path). Reads are keyed by the unguessable code / ORD- id, same
// bearer model as /receipt/[id]. Marking a ticket used is admin-gated
// (POST /api/tickets/verify).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { getTicketedEvents, getTicketTiers } from './catalog';
import { getMarketplaceEventById } from './marketplace';

// 32 chars, no 0/O/1/I. 32 divides 256, so byte % 32 is bias-free.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^TKT-(?:[A-HJ-NP-Z2-9]{22}-[A-HJ-NP-Z2-9]{12}|[A-HJ-NP-Z2-9]{10}-[A-HJ-NP-Z2-9]{4})$/;

const SECRET = () => {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('ticket_signing_secret_not_configured');
  return 'dev-secret-change-me';
};

// Display metadata per event (date/time/venue/city/accent), looked up
// against the same DB-backed, cached tour_events read as pricing (see
// lib/server/catalog.ts getTicketedEvents()) — so ticket pages/PDFs always
// show the current admin-edited event name/date/venue, not a frozen copy.
// If live metadata is unavailable, callers get no metadata rather than a
// superseded venue or schedule.
//
// marketplaceEventId (present on a ticket row's marketplace_event_id column)
// redirects resolution to the third-party marketplace_events table instead —
// the same ticket page/PDF/gate scanner works for both without duplicating
// any of that rendering code (see lib/server/marketplace.ts).
export async function getEventMeta(
  eventId: string,
  marketplaceEventId?: string | null
): Promise<{ date: string; time: string; venue: string; city: string; accent: string } | undefined> {
  if (marketplaceEventId) {
    try {
      const ev = await getMarketplaceEventById(marketplaceEventId);
      if (ev) {
        const dateStr = ev.event_date ? new Date(ev.event_date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'TBA';
        return { date: dateStr, time: '', venue: ev.venue || '', city: ev.city || '', accent: '#E6218C' };
      }
    } catch { /* fall through */ }
    return undefined;
  }
  const events = await getTicketedEvents();
  const ev = events.find((e) => e.id === eventId);
  if (ev) return { date: ev.date, time: ev.time, venue: ev.venue, city: ev.city, accent: ev.accent };
  return undefined;
}

export async function getEventName(eventId: string, marketplaceEventId?: string | null): Promise<string> {
  if (marketplaceEventId) {
    try {
      const ev = await getMarketplaceEventById(marketplaceEventId);
      if (ev) return ev.name;
    } catch { /* fall through */ }
    return 'Marketplace Event';
  }
  const tiers = await getTicketTiers();
  return tiers[eventId]?.name || 'Urban Gang Tour Event';
}

function chars(buf: Buffer, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % 32];
  return s;
}

function tagFor(rand: string): string {
  return chars(createHmac('sha256', SECRET()).update('tkt:' + rand).digest(), rand.length === 10 ? 4 : 12);
}

export function mintCode(): string {
  // 110 random bits plus a 60-bit authentication tag. Legacy tickets remain valid.
  const rand = chars(randomBytes(22), 22);
  return `TKT-${rand}-${tagFor(rand)}`;
}

// Format + HMAC tag check. Constant-time on the tag so the check leaks nothing.
export function codeAuthentic(code: string): boolean {
  if (typeof code !== 'string' || !CODE_RE.test(code)) return false;
  const [, rand, tag] = code.split('-');
  try {
    const want = tagFor(rand);
    return timingSafeEqual(Buffer.from(tag), Buffer.from(want));
  } catch { return false; }
}

export type TicketRow = {
  code: string;
  order_id: string;
  event_id: string;
  tier_name: string;
  holder: string;
  position: number;
  of_count: number;
  used_at: string | Date | null;
  used_by: string;
  created_at: string | Date;
  marketplace_event_id: string | null;
};

// The table ships in SCHEMA (applied via /api/admin/setup), but every runtime
// path also self-heals so a paid order can never lack tickets just because
// setup was not re-run after deploy.
let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  const pool = db();
  if (!pool) throw new Error('db_not_configured');
  await pool.query(`CREATE TABLE IF NOT EXISTS tickets (
    code TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_id TEXT NOT NULL,
    tier_name TEXT NOT NULL, holder TEXT DEFAULT '', position INT NOT NULL,
    of_count INT NOT NULL, used_at TIMESTAMPTZ, used_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets (order_id)`);
  // pay_method is added lazily by the card checkout routes too - self-heal
  // here as well so getTicket's join below can never fail on a fresh DB that
  // has only ever seen M-Pesa orders.
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'mpesa'`);
  // Marketplace threading: nullable so every pre-existing UGT ticket row is
  // untouched. When set, this ticket belongs to a third-party
  // marketplace_events row rather than a tour_events one - see getEventMeta/
  // getEventName above and lib/server/marketplace.ts.
  await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS marketplace_event_id TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS organizer_id TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS marketplace_event_id TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount INT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS organizer_amount INT`);
  tableReady = true;
}

type TicketLine = { id: string; qty: number; name?: string };

function ticketLinesOf(order: any): TicketLine[] | null {
  let items: any;
  try {
    items = typeof order?.items === 'string' ? JSON.parse(order.items) : order?.items;
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const ticketItems = items.filter((it) => it && typeof it.id === 'string' && it.id.startsWith('ticket:'));
  const lines: TicketLine[] = [];
  for (const item of ticketItems) {
    const [prefix, eventId, tierIndex, ...extra] = item.id.split(':');
    const qty = Number(item.qty);
    // A paid order must never mint a partial or rounded ticket entitlement.
    // Non-ticket merchandise remains irrelevant here, but every ticket line
    // must have the exact server-created `ticket:<event>:<tier>` shape.
    if (
      prefix !== 'ticket' ||
      !eventId ||
      !/^\d+$/.test(tierIndex || '') ||
      extra.length ||
      !Number.isSafeInteger(qty) ||
      qty < 1
    ) return null;
    lines.push({ id: item.id, qty, name: typeof item.name === 'string' ? item.name : undefined });
  }
  return lines;
}

// Idempotent mint: if the order is paid, contains ticket lines, and has no
// tickets yet, mint qty tickets per line (position/of_count span the whole
// order). Returns the order's tickets either way. A per-order advisory lock
// makes a webhook mint racing a lazy page mint safe.
export async function ensureTickets(order: any): Promise<TicketRow[]> {
  const pool = db();
  if (!pool || !order?.id) return [];
  const status = String(order.status || '');
  if (status !== 'paid' && status !== 'fulfilled') return [];
  const lines = ticketLinesOf(order);
  if (!lines?.length) return [];
  await ensureTable();
  const marketplaceEventId: string | null = order.marketplace_event_id || null;
  // Marketplace orders resolve tier names from marketplace_events.tiers
  // instead of the tour_events-backed catalog — the eventId embedded in the
  // 'ticket:<eventId>:<tierIdx>' line id is the marketplace event's own id
  // (prefixed 'mkt-', see lib/server/marketplace.ts freeMarketplaceEventId)
  // in that case, so no collision with a real tour_events id is possible.
  const tierMap = marketplaceEventId ? null : await getTicketTiers();
  let marketplaceTiers: { name: string; price: number }[] = [];
  if (marketplaceEventId) {
    const ev = await getMarketplaceEventById(marketplaceEventId);
    marketplaceTiers = ev?.tiers || [];
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['tickets:' + order.id]);
    const existing = await client.query('SELECT * FROM tickets WHERE order_id=$1 ORDER BY position', [order.id]);
    if (existing.rows.length) {
      await client.query('COMMIT');
      return existing.rows as TicketRow[];
    }
    const ofCount = lines.reduce((n, l) => n + Number(l.qty), 0);
    const holder = String(order.name || '').slice(0, 100);
    const minted: TicketRow[] = [];
    let pos = 0;
    for (const line of lines) {
      const [, eventId, tierIdx] = String(line.id).split(':');
      const tierName = marketplaceEventId
        ? marketplaceTiers[Number(tierIdx)]?.name || String(line.name || '').split(' - ').pop() || 'General'
        : tierMap![eventId]?.tiers[Number(tierIdx)]?.name || String(line.name || '').split(' - ').pop() || 'General';
      for (let i = 0; i < Number(line.qty); i++) {
        pos += 1;
        const r = await client.query(
          `INSERT INTO tickets (code, order_id, event_id, tier_name, holder, position, of_count, marketplace_event_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [mintCode(), order.id, eventId, tierName, holder, pos, ofCount, marketplaceEventId]
        );
        minted.push(r.rows[0] as TicketRow);
      }
    }
    await client.query('COMMIT');
    console.log('[tickets] minted', minted.length, 'for', order.id);
    return minted;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function ticketsForOrder(orderId: string): Promise<TicketRow[]> {
  const pool = db();
  if (!pool) return [];
  await ensureTable();
  const r = await pool.query('SELECT * FROM tickets WHERE order_id=$1 ORDER BY position', [orderId]);
  return r.rows as TicketRow[];
}

// One ticket joined with its order's live payment status (the /t/[code] page
// must reflect refunds/pending states, not the state at mint time). Also
// carries pay_method so pages/PDFs can show a COMPLIMENTARY marker for
// admin-issued free tickets without a second query.
export async function getTicket(
  code: string
): Promise<(TicketRow & { order_status: string; pay_method: string }) | null> {
  const pool = db();
  if (!pool) return null;
  await ensureTable();
  const r = await pool.query(
    `SELECT t.*, COALESCE(o.status,'') AS order_status, COALESCE(o.pay_method,'') AS pay_method
       FROM tickets t LEFT JOIN orders o ON o.id = t.order_id
      WHERE t.code=$1`,
    [code]
  );
  return (r.rows[0] as TicketRow & { order_status: string; pay_method: string }) || null;
}

// ---------------------------------------------------------------------------
// Offline-verifiable signature blob for the downloadable PDF ticket.
//
// The TKT- code itself is already tamper-evident (HMAC tag above) and the
// live gate scan (/api/tickets/verify) is what actually stops fraud - it
// checks the code against the database, so reuse/revocation/refunds are
// always caught. This blob is an ADDITIONAL, genuinely redundant layer: it
// signs a snapshot of the ticket's core facts (code, order, event, tier,
// mint time) with a server-only secret. Do not distribute SESSION_SECRET to
// gate devices. Gate devices use authenticated online verification; this
// proof can be checked by trusted server tooling and never grants admission.
export type TicketBlobPayload = { c: string; o: string; e: string; t: string; i: string };

export function signedTicketBlob(t: { code: string; order_id: string; event_id: string; tier_name: string; created_at: string | Date }): string {
  const payload: TicketBlobPayload = {
    c: t.code,
    o: t.order_id,
    e: t.event_id,
    t: t.tier_name,
    i: new Date(t.created_at).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET()).update('tktsig:' + body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyTicketBlob(blob: string): TicketBlobPayload | null {
  if (String(blob || '').split('.').length !== 2) return null;
  const [body, sig] = String(blob || '').split('.');
  if (!body || !sig) return null;
  let expect: string;
  try { expect = createHmac('sha256', SECRET()).update('tktsig:' + body).digest('base64url'); } catch { return null; }
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (
      !payload ||
      typeof payload.c !== 'string' ||
      !codeAuthentic(payload.c) ||
      typeof payload.o !== 'string' ||
      !payload.o ||
      typeof payload.e !== 'string' ||
      !payload.e ||
      typeof payload.t !== 'string' ||
      !payload.t ||
      typeof payload.i !== 'string' ||
      !Number.isFinite(Date.parse(payload.i))
    ) return null;
    return payload as TicketBlobPayload;
  } catch {
    return null;
  }
}
