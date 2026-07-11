import { q, db } from '@/lib/server/db';
import { isAdmin, hasPerm } from '@/lib/server/session';
import { ensureOpsSchema } from '@/lib/server/ops';

const OPS_KINDS = new Set(['invoices', 'payments', 'contacts', 'expenses', 'payouts']);

// Every kind mirrors exactly what its equivalent admin list already shows -
// never a superset of fields a specific module intentionally hides.
const KINDS: Record<string, string> = {
  orders: `SELECT id, total, status, name, email, phone, mpesa_receipt, created_at FROM orders ORDER BY created_at DESC`,
  bookings: `SELECT id, name, org, email, phone, type, status, created_at FROM bookings ORDER BY created_at DESC`,
  subscribers: `SELECT email, created_at FROM subscribers ORDER BY created_at DESC`,
  // Same columns the admin Orders tab's inline ticket list resolves from -
  // tickets already store event_id/tier_name directly, no join needed.
  tickets: `SELECT code, order_id, event_id, tier_name, holder, position, of_count, used_at, created_at FROM tickets ORDER BY created_at DESC`,
  // Same shape as the Invoices ops tab: doc_number, event, bill-to contact,
  // total/paid computed the same way (from lines + ops_payments), status.
  invoices: `
    SELECT d.doc_number, e.name AS event, d.bill_to->>'name' AS bill_to_name, d.bill_to->>'org' AS bill_to_org,
      d.bill_to->>'email' AS bill_to_email, d.bill_to->>'phone' AS bill_to_phone,
      COALESCE((SELECT SUM((elem->>'qty')::numeric * (elem->>'amount')::numeric) FROM jsonb_array_elements(d.lines) elem), 0) AS total,
      COALESCE((SELECT SUM(p.amount) FROM ops_payments p WHERE p.invoice_id = d.id), 0) AS paid,
      d.status, d.due_date, d.created_at
    FROM ops_documents d LEFT JOIN ops_events e ON e.id = d.event_id
    WHERE d.doc_type = 'invoice' ORDER BY d.id DESC`,
  // Same shape as the Payments ops tab (event money deposits + invoice
  // payments) - not to be confused with crew payouts, exported separately below.
  payments: `
    SELECT p.id, e.name AS event, d.doc_number AS invoice_number, p.amount, p.paid_on, p.method, p.reference, p.created_at
    FROM ops_payments p LEFT JOIN ops_events e ON e.id = p.event_id LEFT JOIN ops_documents d ON d.id = p.invoice_id
    ORDER BY p.paid_on DESC, p.id DESC`,
  contacts: `SELECT id, name, org, role, phone, email, notes, next_followup, status, created_at FROM ops_contacts ORDER BY org, name`,
  expenses: `
    SELECT e.id, ev.name AS event, e.label, e.category, e.amount, e.spent_on, e.note, e.created_at
    FROM ops_expenses e LEFT JOIN ops_events ev ON ev.id = e.event_id ORDER BY e.spent_on DESC, e.id DESC`,
  // Crew payouts already have a per-event CSV button in the Payouts ops tab
  // (client-side, one event at a time) - this kind covers the same columns
  // unified across every event, for consistency with every other export here.
  payouts: `
    SELECT p.id, ev.name AS event, p.person, p.phone, p.role, p.amount, p.paid, p.paid_on, p.created_at
    FROM ops_crew_payouts p LEFT JOIN ops_events ev ON ev.id = p.event_id ORDER BY p.created_at DESC`,
};

// Every export kind maps to the module it's exported from (see the
// corresponding admin tab/ops tool) - a crew_admin can only export the
// CSVs their perms already let them view on-screen.
const KIND_PERM: Record<string, string> = {
  orders: 'orders',
  bookings: 'bookings',
  subscribers: 'people',
  tickets: 'orders',
  invoices: 'ops_invoices',
  payments: 'ops_payments',
  contacts: 'ops_contacts',
  expenses: 'ops_expenses',
  payouts: 'ops_payouts',
};

export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response('unauthorized', { status: 401 });
  const kind = new URL(req.url).searchParams.get('kind') || 'orders';
  if (!hasPerm(req, KIND_PERM[kind] || '__none__')) return new Response('forbidden', { status: 403 });
  if (!db()) return new Response('db not configured', { status: 503 });
  const sql = KINDS[kind];
  if (!sql) return new Response('unknown kind', { status: 400 });
  let rows: any[];
  try {
    if (OPS_KINDS.has(kind)) await ensureOpsSchema();
    rows = await q(sql);
  } catch (e: any) {
    return new Response(String(e?.message || e).slice(0, 200), { status: 500 });
  }
  if (!rows.length) return new Response('no data', { status: 200 });
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="ugt-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
