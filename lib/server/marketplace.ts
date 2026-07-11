// Shared server helpers for the third-party ticketing marketplace: any
// outside event organizer signs up, submits an event, gets approved by UGT
// admin, and sells tickets through urbangangtour.co.ke — UGT takes an
// automatic commission per ticket via a Paystack subaccount split. Distinct
// from lib/server/catalog.ts's tour_events (UGT's own shows) — never touch
// that table from here.
import { q, db } from './db';
import { ensureOpsSchema } from './ops';

// ---------------------------------------------------------------------------
// Self-healing column additions on the pre-existing orders/tickets tables —
// same ALTER TABLE ADD COLUMN IF NOT EXISTS convention every other route in
// this codebase already uses (see app/api/paystack/checkout/route.ts's
// ensureColumns, lib/server/tickets.ts's ensureTable).
// ---------------------------------------------------------------------------
let columnsReady = false;
export async function ensureMarketplaceColumns(): Promise<void> {
  if (columnsReady) return;
  await ensureOpsSchema();
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal'`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS organizer_id TEXT`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS marketplace_event_id TEXT`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount INT`);
  await q(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS organizer_amount INT`);
  await q(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS marketplace_event_id TEXT`);
  columnsReady = true;
}

// ---------------------------------------------------------------------------
// Commission — admin-editable, `settings` key 'marketplace_commission_percent',
// defaults to 8 until the owner changes it. Same settings key/value pattern
// as every other settings-backed toggle in this codebase (see
// lib/server/alert.ts's alert_email).
// ---------------------------------------------------------------------------
const DEFAULT_COMMISSION_PERCENT = 8;

export async function getCommissionPercent(): Promise<number> {
  try {
    if (!db()) return DEFAULT_COMMISSION_PERCENT;
    const rows = await q<{ value: any }>(`SELECT value FROM settings WHERE key='marketplace_commission_percent'`);
    if (!rows.length) return DEFAULT_COMMISSION_PERCENT;
    const n = Number(rows[0].value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_COMMISSION_PERCENT;
  } catch {
    return DEFAULT_COMMISSION_PERCENT;
  }
}

export async function setCommissionPercent(pct: number): Promise<void> {
  const n = Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
  await q(
    `INSERT INTO settings (key, value) VALUES ('marketplace_commission_percent',$1)
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`,
    [JSON.stringify(n)]
  );
}

export function computeSplit(totalKes: number, commissionPercent: number): { commissionAmount: number; organizerAmount: number } {
  const commissionAmount = Math.round(totalKes * (commissionPercent / 100));
  return { commissionAmount, organizerAmount: totalKes - commissionAmount };
}

// ---------------------------------------------------------------------------
// Marketplace event read layer (public checkout / browse — always re-priced
// server-side from this table, never from client-sent tier prices).
// ---------------------------------------------------------------------------
export interface MarketplaceTier { name: string; price: number }
export interface MarketplaceEventRow {
  id: string;
  organizer_id: string;
  name: string;
  event_date: string | null;
  venue: string;
  city: string;
  description: string;
  image: string;
  tiers: MarketplaceTier[];
  status: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
  organizer_business_name?: string;
  organizer_subaccount_code?: string;
  organizer_status?: string;
}

function parseTiers(v: unknown): MarketplaceTier[] {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr.map((t: any) => ({ name: String(t.name), price: Number(t.price) || 0 })) : [];
  } catch {
    return [];
  }
}

export async function getPublishedMarketplaceEvents(): Promise<MarketplaceEventRow[]> {
  await ensureMarketplaceColumns();
  const rows = await q<any>(
    `SELECT e.*, e.event_date::text AS event_date, o.business_name AS organizer_business_name, o.paystack_subaccount_code AS organizer_subaccount_code, o.status AS organizer_status
       FROM marketplace_events e JOIN marketplace_organizers o ON o.id = e.organizer_id
      WHERE e.status='published' AND (e.event_date IS NULL OR e.event_date >= CURRENT_DATE - INTERVAL '1 day')
      ORDER BY e.event_date ASC NULLS LAST, e.created_at DESC`
  );
  return rows.map((r: any) => ({ ...r, tiers: parseTiers(r.tiers) }));
}

export async function getMarketplaceEventById(id: string): Promise<MarketplaceEventRow | null> {
  await ensureMarketplaceColumns();
  const rows = await q<any>(
    `SELECT e.*, e.event_date::text AS event_date, o.business_name AS organizer_business_name, o.paystack_subaccount_code AS organizer_subaccount_code, o.status AS organizer_status
       FROM marketplace_events e JOIN marketplace_organizers o ON o.id = e.organizer_id
      WHERE e.id=$1`,
    [id]
  );
  if (!rows.length) return null;
  return { ...rows[0], tiers: parseTiers(rows[0].tiers) };
}

export function slugify(v: string): string {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

// Marketplace event ids are prefixed 'mkt-' so they can never collide with
// (or be confused with) UGT's own tour_events ids in the shared tickets.
// event_id column / item line ids ('ticket:<eventId>:<tierIdx>').
export async function freeMarketplaceEventId(name: string): Promise<string> {
  const base = 'mkt-' + slugify(name);
  let id = base;
  for (let n = 2; n < 50; n++) {
    const exists = await q(`SELECT 1 FROM marketplace_events WHERE id=$1`, [id]);
    if (!exists.length) return id;
    id = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function freeOrganizerId(businessName: string): Promise<string> {
  const base = 'org-' + slugify(businessName);
  let id = base;
  for (let n = 2; n < 50; n++) {
    const exists = await q(`SELECT 1 FROM marketplace_organizers WHERE id=$1`, [id]);
    if (!exists.length) return id;
    id = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Shared Resend fetch (same convention as lib/server/receipt-email.ts /
// lib/server/alert.ts) for organizer-facing transactional notices (approval,
// rejection). Never throws — a failed notification email must never block
// the admin action that triggered it.
export async function sendOrganizerNotification(to: string, subject: string, text: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.BOOKINGS_FROM || 'Urban Gang Tour <admin@urbangangtour.co.ke>', to, subject, text }),
    });
  } catch (e) {
    console.error('[organizer-notification]', e);
  }
}
