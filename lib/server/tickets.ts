// Digital ticket ledger: one row per admission, minted the moment an order
// with ticket lines is confirmed paid. Codes are self-authenticating offline:
// TKT-<10 random chars>-<4-char HMAC tag keyed with SESSION_SECRET>, drawn
// from an unambiguous alphabet (no 0/O/1/I), so gate staff can sanity-check a
// code with no network and forged codes die at the HMAC check.
//
// Roles: minting runs server-side only (payment webhooks + the ticket pages'
// lazy-mint path). Reads are keyed by the unguessable code / ORD- id, same
// bearer model as /receipt/[id]. Marking a ticket used is admin-gated
// (POST /api/tickets/verify).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { TICKET_TIERS } from './catalog';

// 32 chars, no 0/O/1/I. 32 divides 256, so byte % 32 is bias-free.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^TKT-[A-HJ-NP-Z2-9]{10}-[A-HJ-NP-Z2-9]{4}$/;

const SECRET = () => process.env.SESSION_SECRET || 'dev-secret-change-me';

// Display metadata per event - mirrors the v25 template's MAIN_EVENTS exactly
// (date/time/venue/city/accent). Prices/tiers stay in catalog.ts.
export const EVENT_META: Record<
  string,
  { date: string; time: string; venue: string; city: string; accent: string }
> = {
  'xp-dance': { date: 'Sat 16 Aug 2026', time: '2:00 PM', venue: 'KICC Grounds', city: 'Nairobi', accent: '#E6218C' },
  'festival-colours': { date: 'Sat 20 Sep 2026', time: '11:00 AM', venue: 'Uhuru Gardens', city: 'Nairobi', accent: '#21C7E6' },
  'campus-rave': { date: 'Fri 3 Oct 2026', time: '4:00 PM', venue: 'Carnivore Grounds', city: 'Nairobi', accent: '#FFD400' },
};

export function eventName(eventId: string): string {
  return TICKET_TIERS[eventId]?.name || 'Urban Gang Tour Event';
}

function chars(buf: Buffer, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % 32];
  return s;
}

function tagFor(rand: string): string {
  return chars(createHmac('sha256', SECRET()).update('tkt:' + rand).digest(), 4);
}

export function mintCode(): string {
  const rand = chars(randomBytes(10), 10);
  return `TKT-${rand}-${tagFor(rand)}`;
}

// Format + HMAC tag check. Constant-time on the tag so the check leaks nothing.
export function codeAuthentic(code: string): boolean {
  if (typeof code !== 'string' || !CODE_RE.test(code)) return false;
  const [, rand, tag] = code.split('-');
  const want = tagFor(rand);
  return timingSafeEqual(Buffer.from(tag), Buffer.from(want));
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
  tableReady = true;
}

function ticketLinesOf(order: any): { id: string; qty: number; name?: string }[] {
  let items: any;
  try {
    items = typeof order?.items === 'string' ? JSON.parse(order.items) : order?.items;
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  return items.filter(
    (it) => it && typeof it.id === 'string' && it.id.startsWith('ticket:') && Number(it.qty) > 0
  );
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
  if (!lines.length) return [];
  await ensureTable();

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
      const tierName =
        TICKET_TIERS[eventId]?.tiers[Number(tierIdx)]?.name ||
        String(line.name || '').split(' - ').pop() ||
        'General';
      for (let i = 0; i < Number(line.qty); i++) {
        pos += 1;
        const r = await client.query(
          `INSERT INTO tickets (code, order_id, event_id, tier_name, holder, position, of_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [mintCode(), order.id, eventId, tierName, holder, pos, ofCount]
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
// mint time) with the same server secret, so a gate device that has
// SESSION_SECRET baked in (but no live internet link that moment) can
// recompute the HMAC and confirm the PDF's printed facts were not edited
// after issuance. It does NOT know about later state (used_at, refunds) -
// only a live scan against the DB catches those. Same pattern as
// signToken/verifyToken in session.ts, but with no expiry (a ticket's
// authenticity should not expire) and its own HMAC context string so it can
// never be replayed as a session cookie or vice versa.
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
  const [body, sig] = String(blob || '').split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', SECRET()).update('tktsig:' + body).digest('base64url');
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as TicketBlobPayload;
  } catch {
    return null;
  }
}
