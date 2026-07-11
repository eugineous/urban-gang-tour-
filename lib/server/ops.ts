// Server helpers for the UGT ops suite: idempotent schema, gapless document
// numbering and audit logging. Every ops API route calls ensureOpsSchema()
// lazily; all callers must tolerate db()==null and answer 503, never crash.
import { db, q } from './db';

export const OPS_SCHEMA = `
CREATE TABLE IF NOT EXISTS ops_events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  school TEXT DEFAULT '',
  event_date DATE,
  distance_band TEXT DEFAULT 'near',
  agreed_amount INT,
  next_due_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_budgets (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES ops_events(id) ON DELETE CASCADE,
  version INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, version)
);
CREATE TABLE IF NOT EXISTS ops_doc_counters (
  doc_type TEXT NOT NULL,
  year INT NOT NULL,
  counter INT NOT NULL DEFAULT 0,
  PRIMARY KEY(doc_type, year)
);
CREATE TABLE IF NOT EXISTS ops_documents (
  id SERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL,
  doc_number TEXT UNIQUE NOT NULL,
  event_id INT REFERENCES ops_events(id) ON DELETE SET NULL,
  source_budget_id INT,
  invoice_id INT,
  bill_to JSONB DEFAULT '{}',
  lines JSONB DEFAULT '[]',
  payment_terms TEXT DEFAULT '',
  due_date DATE,
  pay_details TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_payments (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES ops_events(id) ON DELETE SET NULL,
  invoice_id INT REFERENCES ops_documents(id) ON DELETE SET NULL,
  amount INT NOT NULL,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'mpesa',
  reference TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  org TEXT DEFAULT '',
  role TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  next_followup DATE,
  status TEXT DEFAULT 'lead',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_crew_payouts (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES ops_events(id) ON DELETE CASCADE,
  person TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_on DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_expenses (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES ops_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  amount INT NOT NULL DEFAULT 0,
  spent_on DATE DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_checklist_templates (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_checklist_items (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES ops_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  org TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  note TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new',
  lost_reason TEXT DEFAULT '',
  event_id INT REFERENCES ops_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops_promos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  promo_type TEXT NOT NULL DEFAULT 'percent',
  discount NUMERIC NOT NULL DEFAULT 0,
  product_ids JSONB DEFAULT '[]',
  starts_on DATE,
  ends_on DATE,
  banner_text TEXT DEFAULT '',
  code TEXT DEFAULT '',
  max_uses INT,
  uses INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, actor TEXT, action TEXT, detail JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
-- Public catalog source of truth: tour events (ticketed concerts, school tour
-- stops, past-client showcase) and shop products. Collapses what used to be
-- four hardcoded copies (public/v25-template.html, lib/server/catalog.ts,
-- lib/server/tickets.ts, app/_lib/jsonld.data.json) into one admin-editable
-- table each. See lib/server/catalog.ts for the cached read layer every
-- checkout route uses, and app/api/admin/ops/route.ts for the CRUD (kinds
-- tourEvent.save/tourEvent.delete/product.save/product.delete).
CREATE TABLE IF NOT EXISTS tour_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('ticketed','school','past')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  event_date DATE,
  date_label TEXT DEFAULT '',
  event_time TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  city TEXT DEFAULT '',
  accent TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled','completed')),
  priority INT NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  tiers JSONB DEFAULT '[]',
  logo TEXT DEFAULT '',
  testimonial TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INT NOT NULL,
  image TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Third-party ticketing marketplace: any outside event organizer can sign up,
-- submit an event, and — once approved — sell tickets through
-- urbangangtour.co.ke with UGT taking an automatic commission per ticket via
-- a Paystack subaccount split. Distinct from tour_events (UGT's own shows).
-- See lib/server/organizer-session.ts (separate light auth), lib/server/
-- paystack.ts (subaccount + split helpers) and app/api/marketplace/checkout
-- (server-priced, split-configured Paystack initialize).
CREATE TABLE IF NOT EXISTS marketplace_organizers (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  paystack_subaccount_code TEXT DEFAULT '',
  settlement_bank TEXT DEFAULT '',
  settlement_account TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  rejection_reason TEXT DEFAULT '',
  applied_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_events (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES marketplace_organizers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE,
  venue TEXT DEFAULT '',
  city TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  tiers JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','rejected','cancelled','completed')),
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Gallery / photo wall admin uploads: collapses the hardcoded this.GALLERY
-- literal in public/v25-template.html into an admin-editable table, same
-- pattern as tour_events/products above. url points either at a real Vercel
-- Blob file (new admin uploads, see @vercel/blob in app/api/admin/gallery)
-- or at a public/assets/ path (photos seeded from the original literal never
-- need to be re-uploaded). See lib/server/gallery.ts for the seed + read
-- layer and app/api/site-data/gallery/route.ts for the public read side.
--
-- NOTE: this table already existed in production (id SERIAL, url, caption,
-- category, width, height, created_at, all NOT NULL — an orphaned column set
-- from an earlier attempt at this feature that never shipped app code, 0
-- rows, zero other references anywhere in this repo). CREATE TABLE IF NOT
-- EXISTS below matches that live shape (so a fresh DB and prod agree); the
-- ALTER TABLE statements just below reconcile the rest — sort_order is new,
-- and width/height are relaxed to nullable since this app never captures
-- pixel dimensions on upload — same additive-only convention as
-- lib/server/db.ts's posts.social_posted_at column add, never a destructive
-- change against a table that might carry real rows.
CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  category TEXT DEFAULT '',
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE gallery_photos ALTER COLUMN width DROP NOT NULL;
ALTER TABLE gallery_photos ALTER COLUMN height DROP NOT NULL;
ALTER TABLE gallery_photos ALTER COLUMN category SET DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_photos_url ON gallery_photos (url);
-- Indexes for the ops suite's real query patterns (event drill-downs, invoice
-- payment sums, lead pipeline, follow-up dashboard, audit trail). Applied
-- automatically by ensureOpsSchema(). ops_budgets(event_id) is covered by the
-- UNIQUE(event_id, version) constraint index.
CREATE INDEX IF NOT EXISTS idx_ops_documents_event_id ON ops_documents (event_id);
CREATE INDEX IF NOT EXISTS idx_ops_documents_doc_type ON ops_documents (doc_type);
CREATE INDEX IF NOT EXISTS idx_ops_payments_event_id ON ops_payments (event_id);
CREATE INDEX IF NOT EXISTS idx_ops_payments_invoice_id ON ops_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ops_leads_stage ON ops_leads (stage);
CREATE INDEX IF NOT EXISTS idx_ops_leads_updated_at ON ops_leads (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_contacts_org_name ON ops_contacts (org, name);
CREATE INDEX IF NOT EXISTS idx_ops_contacts_next_followup ON ops_contacts (next_followup);
CREATE INDEX IF NOT EXISTS idx_ops_events_event_date ON ops_events (event_date);
CREATE INDEX IF NOT EXISTS idx_ops_checklist_items_event_id ON ops_checklist_items (event_id);
CREATE INDEX IF NOT EXISTS idx_ops_crew_payouts_event_id ON ops_crew_payouts (event_id);
CREATE INDEX IF NOT EXISTS idx_ops_expenses_event_id ON ops_expenses (event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_events_kind_status_priority ON tour_events (kind, status, priority DESC, event_date);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);
CREATE INDEX IF NOT EXISTS idx_marketplace_organizers_status ON marketplace_organizers (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_status_date ON marketplace_events (status, event_date);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_organizer_id ON marketplace_events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort_order ON gallery_photos (sort_order);
`;

export const LEAD_STAGES = ['new', 'contacted', 'negotiating', 'confirmed', 'contracted', 'completed', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

// Seeded once into ops_checklist_templates when the table is empty; fully
// editable afterwards in the Checklists tool.
export const DEFAULT_CHECKLIST_TEMPLATE = [
  'Confirm date and venue with school',
  'Sign agreement / MOU',
  'Collect deposit',
  'Book sound (partner or full PA)',
  'Book stage boards',
  'Confirm crew list and rates',
  'Buy colours and paints',
  'Print banner and branding',
  'Arrange first aid standby',
  'Confirm music: headliner + supporting acts',
  'Buy awards and gifts',
  'Book crew transport',
  'Collect final payment',
  'Pay crew',
  'Post-event report and photos',
];

let ensured: Promise<void> | null = null;

export function ensureOpsSchema(): Promise<void> {
  if (!db()) return Promise.reject(new Error('db_not_configured'));
  if (!ensured) {
    ensured = q(OPS_SCHEMA).then(() => undefined).catch((e) => {
      ensured = null; // allow retry on next request
      throw e;
    });
  }
  return ensured;
}

export async function opsAudit(action: string, detail: unknown): Promise<void> {
  try {
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin',$1,$2)`, [action, JSON.stringify(detail ?? {})]);
  } catch {
    // audit failures must never block the mutation itself
  }
}

const DOC_PREFIX: Record<string, string> = { quote: 'Q', invoice: 'INV', receipt: 'RCT' };

export type DocType = 'quote' | 'invoice' | 'receipt';

export interface NewDocFields {
  eventId: number | null;
  sourceBudgetId: number | null;
  invoiceId: number | null;
  billTo: unknown;
  lines: unknown;
  paymentTerms: string;
  dueDate: string | null;
  payDetails: string;
  notes: string;
  status: string;
}

// Gapless, race-safe numbering: UGT-Q-2026-001 etc. The counter increment
// and the document insert share ONE transaction, so a failed insert rolls
// the counter back and no number is ever burned. Concurrent requests
// serialize on the counter row lock taken by UPDATE.
export async function createNumberedDocument(docType: DocType, f: NewDocFields): Promise<{ id: number; doc_number: string }> {
  const pool = db();
  if (!pool) throw new Error('db_not_configured');
  const prefix = DOC_PREFIX[docType];
  if (!prefix) throw new Error('bad_doc_type');
  const year = new Date().getFullYear();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ops_doc_counters (doc_type, year, counter) VALUES ($1,$2,0) ON CONFLICT (doc_type, year) DO NOTHING`,
      [docType, year]
    );
    const r = await client.query(
      `UPDATE ops_doc_counters SET counter = counter + 1 WHERE doc_type=$1 AND year=$2 RETURNING counter`,
      [docType, year]
    );
    const docNumber = `UGT-${prefix}-${year}-${String(r.rows[0].counter).padStart(3, '0')}`;
    const ins = await client.query(
      `INSERT INTO ops_documents (doc_type, doc_number, event_id, source_budget_id, invoice_id, bill_to, lines, payment_terms, due_date, pay_details, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, doc_number`,
      [docType, docNumber, f.eventId, f.sourceBudgetId, f.invoiceId, JSON.stringify(f.billTo ?? {}), JSON.stringify(f.lines ?? []), f.paymentTerms || '', f.dueDate || null, f.payDetails || '', f.notes || '', f.status || 'draft']
    );
    await client.query('COMMIT');
    return ins.rows[0];
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
