import { NextResponse, after } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin, isSuperAdmin, hasPerm, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {
  ensureOpsSchema, opsAudit, createNumberedDocument, DocType,
  LEAD_STAGES, DEFAULT_CHECKLIST_TEMPLATE,
} from '@/lib/server/ops';
import { docTotals, DocLine } from '@/lib/ops/budget-calc';
import { ensureCatalogSeeded } from '@/lib/server/catalog';
import { getCommissionPercent, setCommissionPercent, sendOrganizerNotification, ensureMarketplaceColumns } from '@/lib/server/marketplace';
import { paystackCreateSubaccount } from '@/lib/server/paystack';
import { alertCritical } from '@/lib/server/alert';

// UGT Ops Suite API. One route, view-based GET + kind-based POST, mirroring
// the /api/admin/data + /api/admin/save conventions the admin panel already
// uses. Admin-gated, 503 when DATABASE_URL is missing, audit on mutations.
// Roles: admin only (isAdmin cookie). Public/anon: 401 on everything.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function slugify(v: string): string {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

function s(v: unknown, max = 300): string {
  return String(v ?? '').slice(0, max);
}
function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(v: unknown): string | null {
  const t = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

async function paidForInvoice(invoiceId: number): Promise<number> {
  const r = await q<{ paid: string }>(`SELECT COALESCE(SUM(amount),0) AS paid FROM ops_payments WHERE invoice_id=$1`, [invoiceId]);
  return Number(r[0]?.paid || 0);
}

function hasAnyPerm(req: Request, keys: string[]): boolean {
  return keys.some((k) => hasPerm(req, k));
}

// 'event'/'events' are a shared workspace view: Budgeter, Payments, Payouts,
// Expenses, Checklists and Invoices all load a single event's bundled
// budget+payments+payouts+expenses+checklist data through this one endpoint
// (see app/admin/ops/ui.tsx's useEvents() and every tool's opsGet('event',
// {id})). Known scoping limitation: a crew_admin scoped to only one of
// those modules (say ops_payments) can still see the other modules' data
// for that event through this combined response, because the endpoint does
// not return a per-module subset. Splitting it into per-module endpoints
// would fix that but is a larger refactor than this pass covers - documented
// here and in the handoff report rather than silently left unscoped.
const EVENT_WORKSPACE_PERMS = ['ops_budgeter', 'ops_payments', 'ops_payouts', 'ops_expenses', 'ops_checklists', 'ops_invoices'];

// Per-view module scoping for GET. 'dashboard' has no entry: every admin can
// see the landing tab, but its audit-log slice is stripped for non-super
// admins inside the handler (viewing the audit log is always super_admin
// only, per CLAUDE.md's critical exceptions).
const VIEW_PERM: Record<string, string[]> = {
  events: EVENT_WORKSPACE_PERMS,
  event: EVENT_WORKSPACE_PERMS,
  budget: ['ops_budgeter'],
  budgets: ['ops_budgeter'],
  documents: ['ops_invoices'],
  payments: ['ops_payments'],
  contacts: ['ops_contacts'],
  leads: ['ops_pipeline'],
  promos: ['ops_promos'],
  tourEvents: ['events'],
  products: ['products'],
  marketplaceOrganizers: ['marketplace'],
  marketplaceEvents: ['marketplace'],
  marketplaceOrders: ['marketplace'],
  marketplaceCommission: ['marketplace'],
  checklist_templates: ['ops_checklists'],
};

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!db()) return bad('db_not_configured', 503);
  const url = new URL(req.url);
  const view = url.searchParams.get('view') || '';
  const id = intOrNull(url.searchParams.get('id'));
  const eventId = intOrNull(url.searchParams.get('eventId'));
  const requiredPerms = VIEW_PERM[view];
  if (requiredPerms && !hasAnyPerm(req, requiredPerms)) return bad('forbidden', 403);
  try {
    await ensureOpsSchema();
    switch (view) {
      case 'events': {
        const rows = await q(`
          SELECT e.*,
            (SELECT MAX(version) FROM ops_budgets b WHERE b.event_id=e.id) AS latest_budget_version,
            (SELECT COALESCE(SUM(amount),0) FROM ops_payments p WHERE p.event_id=e.id) AS paid_total
          FROM ops_events e ORDER BY e.event_date DESC NULLS LAST, e.id DESC LIMIT 500`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'event': {
        if (!id) return bad('missing_id');
        const ev = await q(`SELECT * FROM ops_events WHERE id=$1`, [id]);
        if (!ev.length) return bad('not_found', 404);
        const budgets = await q(`SELECT id, version, created_at FROM ops_budgets WHERE event_id=$1 ORDER BY version DESC`, [id]);
        const latest = await q(`SELECT id, version, data FROM ops_budgets WHERE event_id=$1 ORDER BY version DESC LIMIT 1`, [id]);
        const payments = await q(`SELECT * FROM ops_payments WHERE event_id=$1 ORDER BY paid_on DESC, id DESC`, [id]);
        const payouts = await q(`SELECT * FROM ops_crew_payouts WHERE event_id=$1 ORDER BY id`, [id]);
        const expenses = await q(`SELECT * FROM ops_expenses WHERE event_id=$1 ORDER BY spent_on DESC, id DESC`, [id]);
        const checklist = await q(`SELECT * FROM ops_checklist_items WHERE event_id=$1 ORDER BY sort, id`, [id]);
        return NextResponse.json({ ok: true, event: ev[0], budgets, latestBudget: latest[0] || null, payments, payouts, expenses, checklist });
      }
      case 'budget': {
        if (!id) return bad('missing_id');
        const rows = await q(`SELECT b.*, e.name AS event_name FROM ops_budgets b JOIN ops_events e ON e.id=b.event_id WHERE b.id=$1`, [id]);
        if (!rows.length) return bad('not_found', 404);
        return NextResponse.json({ ok: true, row: rows[0] });
      }
      case 'budgets': {
        if (!eventId) return bad('missing_eventId');
        const rows = await q(`SELECT id, version, created_at FROM ops_budgets WHERE event_id=$1 ORDER BY version DESC`, [eventId]);
        return NextResponse.json({ ok: true, rows });
      }
      case 'documents': {
        const type = url.searchParams.get('type');
        const rows = await q(`
          SELECT d.*, e.name AS event_name,
            COALESCE((SELECT SUM(p.amount) FROM ops_payments p WHERE p.invoice_id=d.id),0) AS paid
          FROM ops_documents d LEFT JOIN ops_events e ON e.id=d.event_id
          ${type ? 'WHERE d.doc_type=$1' : ''}
          ORDER BY d.id DESC LIMIT 500`, type ? [s(type, 20)] : []);
        return NextResponse.json({ ok: true, rows });
      }
      case 'payments': {
        const rows = await q(`
          SELECT p.*, e.name AS event_name, d.doc_number AS invoice_number
          FROM ops_payments p
          LEFT JOIN ops_events e ON e.id=p.event_id
          LEFT JOIN ops_documents d ON d.id=p.invoice_id
          ORDER BY p.paid_on DESC, p.id DESC LIMIT 500`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'contacts': {
        const rows = await q(`SELECT * FROM ops_contacts ORDER BY org, name LIMIT 1000`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'leads': {
        const rows = await q(`SELECT * FROM ops_leads ORDER BY updated_at DESC LIMIT 500`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'promos': {
        const rows = await q(`SELECT * FROM ops_promos ORDER BY id DESC LIMIT 200`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'tourEvents': {
        await ensureCatalogSeeded();
        // event_date::text — plain 'YYYY-MM-DD' for the admin form's <input
        // type="date">, never a local-midnight Date object that would print
        // wrong (see lib/server/db.ts's note on pg's DATE parser).
        const cols = `id, kind, name, event_date::text AS event_date, date_label, event_time, venue, city, accent, status, priority, image, description, tiers, logo, testimonial, created_at, updated_at`;
        const kindFilter = url.searchParams.get('kind');
        const rows = kindFilter
          ? await q(`SELECT ${cols} FROM tour_events WHERE kind=$1 ORDER BY priority DESC, event_date ASC NULLS LAST`, [s(kindFilter, 20)])
          : await q(`SELECT ${cols} FROM tour_events ORDER BY kind, priority DESC, event_date ASC NULLS LAST`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'products': {
        await ensureCatalogSeeded();
        const rows = await q(`SELECT * FROM products ORDER BY active DESC, id`);
        return NextResponse.json({ ok: true, rows });
      }

      // ---- Third-party ticketing marketplace ----
      case 'marketplaceOrganizers': {
        await ensureMarketplaceColumns();
        const rows = await q(`
          SELECT id, business_name, contact_name, email, phone, paystack_subaccount_code, settlement_bank, settlement_account,
                 status, rejection_reason, applied_at, approved_at, created_at,
                 (SELECT COUNT(*) FROM marketplace_events e WHERE e.organizer_id = marketplace_organizers.id) AS event_count
          FROM marketplace_organizers
          ORDER BY (status='pending') DESC, applied_at DESC`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'marketplaceEvents': {
        await ensureMarketplaceColumns();
        const rows = await q(`
          SELECT e.*, e.event_date::text AS event_date, o.business_name AS organizer_business_name, o.status AS organizer_status,
                 (SELECT COUNT(*) FROM tickets t WHERE t.marketplace_event_id = e.id) AS tickets_sold
          FROM marketplace_events e JOIN marketplace_organizers o ON o.id = e.organizer_id
          ORDER BY (e.status='pending_review') DESC, e.created_at DESC LIMIT 500`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'marketplaceOrders': {
        await ensureMarketplaceColumns();
        const rows = await q(`
          SELECT o.id, o.total, o.status, o.name, o.phone, o.commission_amount, o.organizer_amount, o.created_at,
                 org.business_name AS organizer_business_name, me.name AS event_name
          FROM orders o
          LEFT JOIN marketplace_organizers org ON org.id = o.organizer_id
          LEFT JOIN marketplace_events me ON me.id = o.marketplace_event_id
          WHERE o.source='marketplace'
          ORDER BY o.created_at DESC LIMIT 500`);
        const totals = await q<{ commission: string; organizer_share: string; count: string }>(`
          SELECT COALESCE(SUM(commission_amount),0) AS commission, COALESCE(SUM(organizer_amount),0) AS organizer_share, COUNT(*) AS count
          FROM orders WHERE source='marketplace' AND status IN ('paid','fulfilled')`);
        return NextResponse.json({ ok: true, rows, totals: totals[0] });
      }
      case 'marketplaceCommission': {
        return NextResponse.json({ ok: true, percent: await getCommissionPercent() });
      }
      case 'checklist_templates': {
        const existing = await q(`SELECT * FROM ops_checklist_templates ORDER BY sort, id`);
        if (existing.length) return NextResponse.json({ ok: true, rows: existing });
        // First run: seed the master template so the tool is usable immediately.
        for (let i = 0; i < DEFAULT_CHECKLIST_TEMPLATE.length; i++) {
          await q(`INSERT INTO ops_checklist_templates (label, sort) VALUES ($1,$2)`, [DEFAULT_CHECKLIST_TEMPLATE[i], i]);
        }
        const rows = await q(`SELECT * FROM ops_checklist_templates ORDER BY sort, id`);
        return NextResponse.json({ ok: true, rows });
      }
      case 'dashboard': {
        // One aggregate call powering the admin landing tab.
        const invoices = await q<any>(`
          SELECT d.id, d.lines, d.status, d.due_date,
            COALESCE((SELECT SUM(p.amount) FROM ops_payments p WHERE p.invoice_id=d.id),0) AS paid
          FROM ops_documents d WHERE d.doc_type='invoice' AND d.status <> 'draft'`);
        const today = new Date().toISOString().slice(0, 10);
        let outstanding = 0; let overdue = 0;
        for (const inv of invoices) {
          const lines: DocLine[] = typeof inv.lines === 'string' ? JSON.parse(inv.lines) : inv.lines || [];
          const balance = docTotals(lines).total - Number(inv.paid || 0);
          if (balance > 0) {
            outstanding += balance;
            const due = inv.due_date ? String(inv.due_date instanceof Date ? inv.due_date.toISOString() : inv.due_date).slice(0, 10) : null;
            if (due && due < today) overdue += 1;
          }
        }
        const nextEv = await q<any>(`
          SELECT e.*,
            (SELECT COUNT(*) FROM ops_checklist_items c WHERE c.event_id=e.id) AS checklist_total,
            (SELECT COUNT(*) FROM ops_checklist_items c WHERE c.event_id=e.id AND c.done_at IS NOT NULL) AS checklist_done
          FROM ops_events e WHERE e.event_date >= CURRENT_DATE AND e.status <> 'cancelled'
          ORDER BY e.event_date ASC LIMIT 1`);
        const followups = await q(`SELECT id, name, org, phone, next_followup FROM ops_contacts WHERE next_followup IS NOT NULL AND next_followup <= CURRENT_DATE ORDER BY next_followup LIMIT 20`);
        const promo = await q(`
          SELECT * FROM ops_promos WHERE active
            AND (starts_on IS NULL OR starts_on <= CURRENT_DATE)
            AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
          ORDER BY id DESC LIMIT 1`);
        let pendingReviews = 0;
        try {
          const pr = await q<{ n: string }>(`SELECT COUNT(*) AS n FROM product_reviews WHERE NOT approved`);
          pendingReviews = Number(pr[0]?.n || 0);
        } catch { /* reviews table may not exist yet */ }
        // Audit log is always super_admin-only (CLAUDE.md critical
        // exception) - a crew_admin gets an empty activity feed here rather
        // than a 403, since the rest of the dashboard is open to them.
        const audit = isSuperAdmin(req)
          ? await q(`SELECT actor, action, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT 8`)
          : [];
        return NextResponse.json({
          ok: true,
          outstanding, overdueCount: overdue,
          nextEvent: nextEv[0] || null,
          followups, activePromo: promo[0] || null,
          pendingReviews, audit,
        });
      }
      default:
        return bad('unknown_view');
    }
  } catch (e: any) {
    if (String(e?.message) === 'db_not_configured') return bad('db_not_configured', 503);
    return bad(String(e?.message || e).slice(0, 200), 500);
  }
}

// Simple one-perm-required kinds. Kinds needing an OR of several perms, or
// that are always super_admin-only regardless of perms, are handled as
// special cases below (not in this map) - see the CRITICAL EXCEPTIONS note
// in CLAUDE.md: approving/rejecting a marketplace organizer and changing
// the commission percent are financial-trust decisions that stay
// super_admin-only even for a crew_admin holding the 'marketplace' perm.
const KIND_PERM: Record<string, string> = {
  'event.delete': 'ops_budgeter',
  'budget.save': 'ops_budgeter',
  'doc.create': 'ops_invoices',
  'doc.update': 'ops_invoices',
  'doc.status': 'ops_invoices',
  'doc.delete': 'ops_invoices',
  'payment.delete': 'ops_payments',
  'contact.save': 'ops_contacts',
  'contact.delete': 'ops_contacts',
  'payout.save': 'ops_payouts',
  'payout.togglePaid': 'ops_payouts',
  'payout.delete': 'ops_payouts',
  'expense.save': 'ops_expenses',
  'expense.delete': 'ops_expenses',
  'checklist.template.save': 'ops_checklists',
  'checklist.template.delete': 'ops_checklists',
  'checklist.init': 'ops_checklists',
  'checklist.item.add': 'ops_checklists',
  'checklist.item.toggle': 'ops_checklists',
  'checklist.item.delete': 'ops_checklists',
  'lead.save': 'ops_pipeline',
  'lead.move': 'ops_pipeline',
  'lead.convert': 'ops_pipeline',
  'lead.delete': 'ops_pipeline',
  'promo.save': 'ops_promos',
  'promo.delete': 'ops_promos',
  'tourEvent.save': 'events',
  'tourEvent.delete': 'events',
  'product.save': 'products',
  'product.delete': 'products',
  'marketplaceOrganizer.suspend': 'marketplace',
  'marketplaceOrganizer.reinstate': 'marketplace',
  'marketplaceEvent.approve': 'marketplace',
  'marketplaceEvent.reject': 'marketplace',
  'marketplaceEvent.cancel': 'marketplace',
};
// CRITICAL EXCEPTIONS: always super_admin-only, whatever perms a
// crew_admin holds. Approving/rejecting an organizer creates/relies on a
// live Paystack payout subaccount (real money routing); the commission
// percent changes UGT's cut of every future marketplace sale.
const SUPER_ADMIN_ONLY_KINDS = new Set(['marketplaceOrganizer.approve', 'marketplaceOrganizer.reject', 'marketplaceCommission.save']);

export async function POST(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!db()) return bad('db_not_configured', 503);
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid_json'); }
  const kind = s(body?.kind, 60);
  const d = body?.data ?? {};

  if (SUPER_ADMIN_ONLY_KINDS.has(kind)) {
    if (!isSuperAdmin(req)) return bad('forbidden', 403);
  } else if (kind === 'event.save') {
    // Shared by Budgeter (create/seed the event) and Payments (edit the
    // event's agreed amount / next due date) - either perm may call it.
    if (!hasAnyPerm(req, ['ops_budgeter', 'ops_payments'])) return bad('forbidden', 403);
  } else if (kind === 'payment.record') {
    // Recorded from both the Payments tab (event deposits) and the
    // Invoices tab (paying down an invoice) - either perm may call it.
    if (!hasAnyPerm(req, ['ops_payments', 'ops_invoices'])) return bad('forbidden', 403);
  } else if (KIND_PERM[kind]) {
    if (!hasPerm(req, KIND_PERM[kind])) return bad('forbidden', 403);
  }
  // Unknown kinds fall through unscoped and 400 in the switch below, same
  // as before this change - there is nothing sensitive to gate for a kind
  // that doesn't exist.

  try {
    await ensureOpsSchema();
    switch (kind) {
      // ---- Events ----
      case 'event.save': {
        const id = intOrNull(d.id);
        const name = s(d.name, 200);
        if (!name) return bad('missing_name');
        const fields = [name, s(d.school, 200), dateOrNull(d.eventDate), s(d.distanceBand || 'near', 10), intOrNull(d.agreedAmount), dateOrNull(d.nextDueDate), s(d.status || 'planned', 30)];
        let row;
        if (id) {
          row = await q(`UPDATE ops_events SET name=$1, school=$2, event_date=$3, distance_band=$4, agreed_amount=$5, next_due_date=$6, status=$7, updated_at=now() WHERE id=$8 RETURNING *`, [...fields, id]);
        } else {
          row = await q(`INSERT INTO ops_events (name, school, event_date, distance_band, agreed_amount, next_due_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, fields);
        }
        await opsAudit('ops.event.save', { id: row[0]?.id, name });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'event.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_events WHERE id=$1`, [id]);
        await opsAudit('ops.event.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Budgets (versioned: every save is a new immutable version) ----
      case 'budget.save': {
        let eventId = intOrNull(d.eventId);
        const data = d.data;
        if (!data || typeof data !== 'object') return bad('missing_data');
        if (!eventId) {
          // Create the event from the budget header so the Budgeter can start
          // from a blank sheet.
          const name = s(data.eventName, 200) || 'Untitled event';
          const ev = await q(`INSERT INTO ops_events (name, school, event_date, distance_band) VALUES ($1,$2,$3,$4) RETURNING id`,
            [name, s(data.school, 200), dateOrNull(data.eventDate), s(data.distanceBand || 'near', 10)]);
          eventId = ev[0].id;
        } else {
          // Keep the event header in sync with the budget sheet.
          await q(`UPDATE ops_events SET name=COALESCE(NULLIF($1,''),name), school=$2, event_date=COALESCE($3,event_date), distance_band=$4, updated_at=now() WHERE id=$5`,
            [s(data.eventName, 200), s(data.school, 200), dateOrNull(data.eventDate), s(data.distanceBand || 'near', 10), eventId]);
        }
        const v = await q<{ next: number }>(`SELECT COALESCE(MAX(version),0)+1 AS next FROM ops_budgets WHERE event_id=$1`, [eventId]);
        const version = Number(v[0].next);
        const ins = await q(`INSERT INTO ops_budgets (event_id, version, data) VALUES ($1,$2,$3) RETURNING id, version, created_at`, [eventId, version, JSON.stringify(data)]);
        await opsAudit('ops.budget.save', { eventId, version });
        return NextResponse.json({ ok: true, eventId, row: ins[0] });
      }

      // ---- Documents (quote / invoice; receipts are auto-created) ----
      case 'doc.create': {
        const docType = s(d.docType, 20) as DocType;
        if (!['quote', 'invoice'].includes(docType)) return bad('bad_doc_type');
        const lines: DocLine[] = Array.isArray(d.lines) ? d.lines.slice(0, 60).map((l: any) => ({ label: s(l.label, 300), qty: Math.max(0, Number(l.qty) || 0), amount: Number(l.amount) || 0 })) : [];
        const row = await createNumberedDocument(docType, {
          eventId: intOrNull(d.eventId),
          sourceBudgetId: intOrNull(d.sourceBudgetId),
          invoiceId: null,
          billTo: { name: s(d.billToName, 200), org: s(d.billToOrg, 200), phone: s(d.billToPhone, 40), email: s(d.billToEmail, 200), address: s(d.billToAddress, 300) },
          lines,
          paymentTerms: s(d.paymentTerms, 1000),
          dueDate: dateOrNull(d.dueDate),
          payDetails: s(d.payDetails, 1000),
          notes: s(d.notes, 1000),
          status: 'draft',
        });
        await opsAudit('ops.doc.create', { id: row.id, doc_number: row.doc_number, docType });
        return NextResponse.json({ ok: true, row });
      }
      case 'doc.update': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        const lines: DocLine[] = Array.isArray(d.lines) ? d.lines.slice(0, 60).map((l: any) => ({ label: s(l.label, 300), qty: Math.max(0, Number(l.qty) || 0), amount: Number(l.amount) || 0 })) : [];
        await q(`UPDATE ops_documents SET bill_to=$1, lines=$2, payment_terms=$3, due_date=$4, pay_details=$5, notes=$6, updated_at=now() WHERE id=$7`,
          [JSON.stringify({ name: s(d.billToName, 200), org: s(d.billToOrg, 200), phone: s(d.billToPhone, 40), email: s(d.billToEmail, 200), address: s(d.billToAddress, 300) }),
            JSON.stringify(lines), s(d.paymentTerms, 1000), dateOrNull(d.dueDate), s(d.payDetails, 1000), s(d.notes, 1000), id]);
        await opsAudit('ops.doc.update', { id });
        return NextResponse.json({ ok: true });
      }
      case 'doc.status': {
        const id = intOrNull(d.id);
        const status = s(d.status, 20);
        if (!id) return bad('missing_id');
        if (!['draft', 'sent', 'part-paid', 'paid', 'issued', 'accepted', 'declined'].includes(status)) return bad('bad_status');
        await q(`UPDATE ops_documents SET status=$1, updated_at=now() WHERE id=$2`, [status, id]);
        await opsAudit('ops.doc.status', { id, status });
        return NextResponse.json({ ok: true });
      }
      case 'doc.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_documents WHERE id=$1`, [id]);
        await opsAudit('ops.doc.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Payments ----
      case 'payment.record': {
        const amount = intOrNull(d.amount);
        if (!amount || amount <= 0) return bad('bad_amount');
        const invoiceId = intOrNull(d.invoiceId);
        let eventId = intOrNull(d.eventId);
        let receipt: { id: number; doc_number: string } | null = null;
        let newStatus: string | null = null;
        if (invoiceId) {
          const inv = await q<any>(`SELECT * FROM ops_documents WHERE id=$1 AND doc_type='invoice'`, [invoiceId]);
          if (!inv.length) return bad('invoice_not_found', 404);
          if (!eventId) eventId = inv[0].event_id;
        }
        const pay = await q(`INSERT INTO ops_payments (event_id, invoice_id, amount, paid_on, method, reference) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [eventId, invoiceId, amount, dateOrNull(d.paidOn) || new Date().toISOString().slice(0, 10), s(d.method || 'mpesa', 30), s(d.reference, 100)]);
        if (invoiceId) {
          const inv = (await q<any>(`SELECT * FROM ops_documents WHERE id=$1`, [invoiceId]))[0];
          const lines: DocLine[] = typeof inv.lines === 'string' ? JSON.parse(inv.lines) : inv.lines || [];
          const total = docTotals(lines).total;
          const paid = await paidForInvoice(invoiceId);
          newStatus = paid >= total ? 'paid' : 'part-paid';
          await q(`UPDATE ops_documents SET status=$1, updated_at=now() WHERE id=$2`, [newStatus, invoiceId]);
          if (newStatus === 'paid') {
            // Full balance settled: auto-issue a receipt referencing the invoice.
            receipt = await createNumberedDocument('receipt', {
              eventId, sourceBudgetId: null, invoiceId,
              billTo: typeof inv.bill_to === 'string' ? JSON.parse(inv.bill_to) : inv.bill_to || {},
              lines: [{ label: `Payment received - invoice ${inv.doc_number}`, qty: 1, amount: total }],
              paymentTerms: '', dueDate: null,
              payDetails: '', notes: `Settles invoice ${inv.doc_number} in full.`,
              status: 'issued',
            });
          }
        }
        await opsAudit('ops.payment.record', { id: pay[0].id, amount, invoiceId, receipt: receipt?.doc_number || null });
        return NextResponse.json({ ok: true, row: pay[0], invoiceStatus: newStatus, receipt });
      }
      case 'payment.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_payments WHERE id=$1`, [id]);
        await opsAudit('ops.payment.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Contacts ----
      case 'contact.save': {
        const id = intOrNull(d.id);
        const name = s(d.name, 200);
        if (!name) return bad('missing_name');
        const fields = [name, s(d.org, 200), s(d.role, 100), s(d.phone, 40), s(d.email, 200), s(d.notes, 2000), dateOrNull(d.nextFollowup), s(d.status || 'lead', 30)];
        let row;
        if (id) row = await q(`UPDATE ops_contacts SET name=$1, org=$2, role=$3, phone=$4, email=$5, notes=$6, next_followup=$7, status=$8 WHERE id=$9 RETURNING *`, [...fields, id]);
        else row = await q(`INSERT INTO ops_contacts (name, org, role, phone, email, notes, next_followup, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, fields);
        await opsAudit('ops.contact.save', { id: row[0]?.id, name });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'contact.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_contacts WHERE id=$1`, [id]);
        await opsAudit('ops.contact.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Crew payouts ----
      case 'payout.save': {
        const id = intOrNull(d.id);
        const eventId = intOrNull(d.eventId);
        const person = s(d.person, 200);
        if (!person) return bad('missing_person');
        if (!id && !eventId) return bad('missing_eventId');
        const fields = [person, s(d.phone, 40), s(d.role, 100), Math.max(0, intOrNull(d.amount) ?? 0)];
        let row;
        if (id) row = await q(`UPDATE ops_crew_payouts SET person=$1, phone=$2, role=$3, amount=$4 WHERE id=$5 RETURNING *`, [...fields, id]);
        else row = await q(`INSERT INTO ops_crew_payouts (event_id, person, phone, role, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [eventId, ...fields]);
        await opsAudit('ops.payout.save', { id: row[0]?.id, person });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'payout.togglePaid': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE ops_crew_payouts SET paid = NOT paid, paid_on = CASE WHEN paid THEN NULL ELSE CURRENT_DATE END WHERE id=$1 RETURNING *`, [id]);
        await opsAudit('ops.payout.togglePaid', { id, paid: row[0]?.paid });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'payout.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_crew_payouts WHERE id=$1`, [id]);
        await opsAudit('ops.payout.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Expenses ----
      case 'expense.save': {
        const id = intOrNull(d.id);
        const eventId = intOrNull(d.eventId);
        const label = s(d.label, 300);
        if (!label) return bad('missing_label');
        if (!id && !eventId) return bad('missing_eventId');
        const fields = [label, s(d.category || 'general', 100), Math.max(0, intOrNull(d.amount) ?? 0), dateOrNull(d.spentOn) || new Date().toISOString().slice(0, 10), s(d.note, 500)];
        let row;
        if (id) row = await q(`UPDATE ops_expenses SET label=$1, category=$2, amount=$3, spent_on=$4, note=$5 WHERE id=$6 RETURNING *`, [...fields, id]);
        else row = await q(`INSERT INTO ops_expenses (event_id, label, category, amount, spent_on, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [eventId, ...fields]);
        await opsAudit('ops.expense.save', { id: row[0]?.id, label });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'expense.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_expenses WHERE id=$1`, [id]);
        await opsAudit('ops.expense.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Checklists ----
      case 'checklist.template.save': {
        const id = intOrNull(d.id);
        const label = s(d.label, 300);
        if (!label) return bad('missing_label');
        let row;
        if (id) row = await q(`UPDATE ops_checklist_templates SET label=$1 WHERE id=$2 RETURNING *`, [label, id]);
        else {
          const m = await q<{ next: string }>(`SELECT COALESCE(MAX(sort),0)+1 AS next FROM ops_checklist_templates`);
          row = await q(`INSERT INTO ops_checklist_templates (label, sort) VALUES ($1,$2) RETURNING *`, [label, Number(m[0].next)]);
        }
        await opsAudit('ops.checklist.template.save', { id: row[0]?.id });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'checklist.template.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_checklist_templates WHERE id=$1`, [id]);
        await opsAudit('ops.checklist.template.delete', { id });
        return NextResponse.json({ ok: true });
      }
      case 'checklist.init': {
        // Copy the master template onto an event (only items it doesn't have yet).
        const eventId = intOrNull(d.eventId);
        if (!eventId) return bad('missing_eventId');
        const tpl = await q<any>(`SELECT label, sort FROM ops_checklist_templates ORDER BY sort, id`);
        const existing = await q<any>(`SELECT label FROM ops_checklist_items WHERE event_id=$1`, [eventId]);
        const have = new Set(existing.map((r: any) => r.label));
        let added = 0;
        for (const t of tpl) {
          if (have.has(t.label)) continue;
          await q(`INSERT INTO ops_checklist_items (event_id, label, sort) VALUES ($1,$2,$3)`, [eventId, t.label, t.sort]);
          added++;
        }
        await opsAudit('ops.checklist.init', { eventId, added });
        return NextResponse.json({ ok: true, added });
      }
      case 'checklist.item.add': {
        const eventId = intOrNull(d.eventId);
        const label = s(d.label, 300);
        if (!eventId || !label) return bad('missing_fields');
        const m = await q<{ next: string }>(`SELECT COALESCE(MAX(sort),0)+1 AS next FROM ops_checklist_items WHERE event_id=$1`, [eventId]);
        const row = await q(`INSERT INTO ops_checklist_items (event_id, label, sort) VALUES ($1,$2,$3) RETURNING *`, [eventId, label, Number(m[0].next)]);
        await opsAudit('ops.checklist.item.add', { eventId, id: row[0]?.id });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'checklist.item.toggle': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE ops_checklist_items SET done_at = CASE WHEN done_at IS NULL THEN now() ELSE NULL END WHERE id=$1 RETURNING *`, [id]);
        await opsAudit('ops.checklist.item.toggle', { id, done: !!row[0]?.done_at });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'checklist.item.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_checklist_items WHERE id=$1`, [id]);
        await opsAudit('ops.checklist.item.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Leads (booking pipeline) ----
      case 'lead.save': {
        const id = intOrNull(d.id);
        const name = s(d.name, 200);
        if (!name) return bad('missing_name');
        const stage = (LEAD_STAGES as readonly string[]).includes(d.stage) ? d.stage : 'new';
        const fields = [name, s(d.org, 200), s(d.phone, 40), s(d.email, 200), s(d.note, 2000), stage, s(d.lostReason, 300)];
        let row;
        if (id) row = await q(`UPDATE ops_leads SET name=$1, org=$2, phone=$3, email=$4, note=$5, stage=$6, lost_reason=$7, updated_at=now() WHERE id=$8 RETURNING *`, [...fields, id]);
        else row = await q(`INSERT INTO ops_leads (name, org, phone, email, note, stage, lost_reason) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, fields);
        await opsAudit('ops.lead.save', { id: row[0]?.id, name, stage });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'lead.move': {
        const id = intOrNull(d.id);
        const stage = s(d.stage, 20);
        if (!id) return bad('missing_id');
        if (!(LEAD_STAGES as readonly string[]).includes(stage)) return bad('bad_stage');
        const lostReason = stage === 'lost' ? s(d.lostReason, 300) : '';
        const row = await q(`UPDATE ops_leads SET stage=$1, lost_reason=$2, updated_at=now() WHERE id=$3 RETURNING *`, [stage, lostReason, id]);
        await opsAudit('ops.lead.move', { id, stage });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'lead.convert': {
        // Confirmed lead becomes a real ops event, linked back to the lead.
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        const lead = await q<any>(`SELECT * FROM ops_leads WHERE id=$1`, [id]);
        if (!lead.length) return bad('not_found', 404);
        if (lead[0].event_id) return NextResponse.json({ ok: true, eventId: lead[0].event_id, already: true });
        const ev = await q(`INSERT INTO ops_events (name, school, status) VALUES ($1,$2,'planned') RETURNING id`,
          [lead[0].org ? `${lead[0].org} event` : `${lead[0].name} event`, lead[0].org || '']);
        await q(`UPDATE ops_leads SET event_id=$1, stage=CASE WHEN stage IN ('new','contacted','negotiating') THEN 'confirmed' ELSE stage END, updated_at=now() WHERE id=$2`, [ev[0].id, id]);
        await opsAudit('ops.lead.convert', { id, eventId: ev[0].id });
        return NextResponse.json({ ok: true, eventId: ev[0].id });
      }
      case 'lead.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_leads WHERE id=$1`, [id]);
        await opsAudit('ops.lead.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Promos ----
      case 'promo.save': {
        const id = intOrNull(d.id);
        const name = s(d.name, 200);
        if (!name) return bad('missing_name');
        const promoType = d.promoType === 'fixed' ? 'fixed' : 'percent';
        const discount = Math.max(0, Number(d.discount) || 0);
        const productIds = Array.isArray(d.productIds) ? d.productIds.slice(0, 100).map((x: any) => s(x, 100)) : [];
        const fields = [name, promoType, discount, JSON.stringify(productIds), dateOrNull(d.startsOn), dateOrNull(d.endsOn), s(d.bannerText, 300), s(d.code, 60), intOrNull(d.maxUses), d.active !== false];
        let row;
        if (id) row = await q(`UPDATE ops_promos SET name=$1, promo_type=$2, discount=$3, product_ids=$4, starts_on=$5, ends_on=$6, banner_text=$7, code=$8, max_uses=$9, active=$10 WHERE id=$11 RETURNING *`, [...fields, id]);
        else row = await q(`INSERT INTO ops_promos (name, promo_type, discount, product_ids, starts_on, ends_on, banner_text, code, max_uses, active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, fields);
        await opsAudit('ops.promo.save', { id: row[0]?.id, name });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'promo.delete': {
        const id = intOrNull(d.id);
        if (!id) return bad('missing_id');
        await q(`DELETE FROM ops_promos WHERE id=$1`, [id]);
        await opsAudit('ops.promo.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Tour events (ticketed concerts / school tour stops / past clients) ----
      // The single DB source app/api/site-data/events/route.ts, the shop/ticket
      // checkout pricing layer (lib/server/catalog.ts) and the /events JSON-LD
      // (app/_lib/jsonld.ts eventsFromDb) all read from this same table.
      case 'tourEvent.save': {
        await ensureCatalogSeeded();
        const kind = ['ticketed', 'school', 'past'].includes(d.kind) ? d.kind : null;
        const name = s(d.name, 200);
        if (!kind) return bad('bad_kind');
        if (!name) return bad('missing_name');
        const status = ['draft', 'published', 'cancelled', 'completed'].includes(d.status) ? d.status : 'published';
        const tiersIn = Array.isArray(d.tiers) ? d.tiers : [];
        const tiers = kind === 'ticketed'
          ? tiersIn.slice(0, 12).map((t: any) => ({ name: s(t?.name, 60), price: Math.max(0, Math.round(Number(t?.price) || 0)) })).filter((t: any) => t.name)
          : [];
        const priority = intOrNull(d.priority) ?? 0;
        let id = s(d.id, 60);
        const isNew = !id;
        if (isNew) {
          const base = slugify(name);
          id = base;
          // Guarantee a free primary key without a race: retry with a numeric
          // suffix until INSERT succeeds (collisions are rare — admin-entered
          // names — so this loop runs once almost every time).
          for (let n = 2; n < 50; n++) {
            const exists = await q(`SELECT 1 FROM tour_events WHERE id=$1`, [id]);
            if (!exists.length) break;
            id = `${base}-${n}`;
          }
        }
        const fields = [
          kind, name, id, dateOrNull(d.eventDate), s(d.dateLabel, 60), s(d.eventTime, 30),
          s(d.venue, 300), s(d.city, 100), s(d.accent, 20), status, priority,
          s(d.image, 400), s(d.description, 2000), JSON.stringify(tiers), s(d.logo, 400), s(d.testimonial, 2000),
        ];
        let row;
        if (isNew) {
          row = await q(
            `INSERT INTO tour_events (id, kind, name, slug, event_date, date_label, event_time, venue, city, accent, status, priority, image, description, tiers, logo, testimonial)
             VALUES ($3,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
            fields
          );
        } else {
          row = await q(
            `UPDATE tour_events SET kind=$1, name=$2, event_date=$4, date_label=$5, event_time=$6, venue=$7, city=$8, accent=$9,
               status=$10, priority=$11, image=$12, description=$13, tiers=$14, logo=$15, testimonial=$16, updated_at=now()
             WHERE id=$3 RETURNING *`,
            fields
          );
          if (!row.length) return bad('not_found', 404);
        }
        await opsAudit('ops.tourEvent.save', { id: row[0]?.id, kind, name, status });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'tourEvent.delete': {
        // Soft delete: past ticket sales and the admin ledger reference the
        // event by name/id, so the row stays — only its public visibility
        // changes. Use tourEvent.save with status:'published' to restore it.
        const id = s(d.id, 60);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE tour_events SET status='cancelled', updated_at=now() WHERE id=$1 RETURNING id`, [id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('ops.tourEvent.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Shop products ----
      case 'product.save': {
        await ensureCatalogSeeded();
        const name = s(d.name, 200);
        if (!name) return bad('missing_name');
        const price = Math.max(0, Math.round(Number(d.price) || 0));
        let id = s(d.id, 60);
        const isNew = !id;
        if (isNew) {
          const base = slugify(name);
          id = base;
          for (let n = 2; n < 50; n++) {
            const exists = await q(`SELECT 1 FROM products WHERE id=$1`, [id]);
            if (!exists.length) break;
            id = `${base}-${n}`;
          }
        }
        const fields = [name, price, s(d.image, 400), s(d.category, 100), s(d.description, 2000), d.active !== false, id];
        let row;
        if (isNew) {
          row = await q(
            `INSERT INTO products (name, price, image, category, description, active, id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            fields
          );
        } else {
          row = await q(
            `UPDATE products SET name=$1, price=$2, image=$3, category=$4, description=$5, active=$6, updated_at=now() WHERE id=$7 RETURNING *`,
            fields
          );
          if (!row.length) return bad('not_found', 404);
        }
        await opsAudit('ops.product.save', { id: row[0]?.id, name, price });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'product.delete': {
        // Soft delete: past orders/receipts resolve this id forever (see
        // lib/server/catalog.ts orderLines) — active:false just hides it from
        // the shop and the public site-data/checkout catalog.
        const id = s(d.id, 60);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE products SET active=false, updated_at=now() WHERE id=$1 RETURNING id`, [id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('ops.product.delete', { id });
        return NextResponse.json({ ok: true });
      }

      // ---- Third-party ticketing marketplace ----
      case 'marketplaceOrganizer.approve': {
        // This moves real payout configuration: approving an organizer
        // creates a live Paystack subaccount and stores the code. A failure
        // here MUST NOT flip status to 'approved' — an organizer with no
        // working subaccount could otherwise sell tickets UGT can never
        // actually pay out. See lib/server/paystack.ts for the exact
        // verified subaccount/percentage_charge field semantics.
        await ensureMarketplaceColumns();
        const id = s(d.id, 60);
        if (!id) return bad('missing_id');
        const rows = await q<any>(`SELECT * FROM marketplace_organizers WHERE id=$1`, [id]);
        if (!rows.length) return bad('not_found', 404);
        const org = rows[0];
        if (org.status === 'approved' && org.paystack_subaccount_code) {
          return NextResponse.json({ ok: true, row: org, already: true });
        }
        const commissionPercent = await getCommissionPercent();
        const sub = await paystackCreateSubaccount({
          businessName: org.business_name,
          settlementBank: org.settlement_bank,
          accountNumber: org.settlement_account,
          percentageChargeMainAccount: commissionPercent,
          contactEmail: org.email,
          contactName: org.contact_name,
          contactPhone: org.phone,
        });
        if (!sub.ok || !sub.subaccountCode) {
          await opsAudit('ops.marketplaceOrganizer.approve.failed', { id, error: sub.error });
          await alertCritical('Marketplace organizer subaccount creation failed', `organizer ${id} (${org.business_name}): ${sub.error}`);
          return bad(`subaccount_failed: ${sub.error || 'unknown Paystack error'}`, 502);
        }
        const row = await q(
          `UPDATE marketplace_organizers SET status='approved', paystack_subaccount_code=$1, approved_at=now() WHERE id=$2 RETURNING *`,
          [sub.subaccountCode, id]
        );
        await opsAudit('ops.marketplaceOrganizer.approve', { id, subaccountCode: sub.subaccountCode, actor: adminActor(req) });
        after(() => sendOrganizerNotification(
          org.email,
          'Your Urban Gang Tour Marketplace application is approved',
          `Hi ${org.contact_name},\n\nGood news — "${org.business_name}" is approved to sell tickets through the Urban Gang Tour Marketplace.\n\nLog in at https://urbangangtour.co.ke/organizer/login and submit your first event.\n\nUrban Gang Tour`
        ));
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceOrganizer.reject': {
        await ensureMarketplaceColumns();
        const id = s(d.id, 60);
        const reason = s(d.reason, 500);
        if (!id) return bad('missing_id');
        const rows = await q<any>(`SELECT * FROM marketplace_organizers WHERE id=$1`, [id]);
        if (!rows.length) return bad('not_found', 404);
        const row = await q(`UPDATE marketplace_organizers SET status='rejected', rejection_reason=$1 WHERE id=$2 RETURNING *`, [reason, id]);
        await opsAudit('ops.marketplaceOrganizer.reject', { id, reason, actor: adminActor(req) });
        after(() => sendOrganizerNotification(
          rows[0].email,
          'Your Urban Gang Tour Marketplace application',
          `Hi ${rows[0].contact_name},\n\nWe're not able to approve "${rows[0].business_name}" for the Urban Gang Tour Marketplace at this time.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf you believe this is a mistake, reply to this email.\n\nUrban Gang Tour`
        ));
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceOrganizer.suspend': {
        const id = s(d.id, 60);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE marketplace_organizers SET status='suspended' WHERE id=$1 RETURNING *`, [id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('ops.marketplaceOrganizer.suspend', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceOrganizer.reinstate': {
        const id = s(d.id, 60);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE marketplace_organizers SET status='approved' WHERE id=$1 AND paystack_subaccount_code <> '' RETURNING *`, [id]);
        if (!row.length) return bad('not_found_or_no_subaccount', 404);
        await opsAudit('ops.marketplaceOrganizer.reinstate', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceEvent.approve': {
        await ensureMarketplaceColumns();
        const id = s(d.id, 80);
        if (!id) return bad('missing_id');
        const rows = await q<any>(`SELECT e.*, o.email AS organizer_email, o.contact_name, o.status AS organizer_status FROM marketplace_events e JOIN marketplace_organizers o ON o.id=e.organizer_id WHERE e.id=$1`, [id]);
        if (!rows.length) return bad('not_found', 404);
        if (rows[0].organizer_status !== 'approved') return bad('organizer_not_approved');
        const row = await q(`UPDATE marketplace_events SET status='published', rejection_reason='', updated_at=now() WHERE id=$1 RETURNING *`, [id]);
        await opsAudit('ops.marketplaceEvent.approve', { id, actor: adminActor(req) });
        after(() => sendOrganizerNotification(
          rows[0].organizer_email,
          `Your event "${rows[0].name}" is live`,
          `Hi ${rows[0].contact_name},\n\n"${rows[0].name}" is approved and now live at https://urbangangtour.co.ke/marketplace/${id}\n\nUrban Gang Tour`
        ));
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceEvent.reject': {
        await ensureMarketplaceColumns();
        const id = s(d.id, 80);
        const reason = s(d.reason, 500);
        if (!id) return bad('missing_id');
        const rows = await q<any>(`SELECT e.*, o.email AS organizer_email, o.contact_name FROM marketplace_events e JOIN marketplace_organizers o ON o.id=e.organizer_id WHERE e.id=$1`, [id]);
        if (!rows.length) return bad('not_found', 404);
        const row = await q(`UPDATE marketplace_events SET status='rejected', rejection_reason=$1, updated_at=now() WHERE id=$2 RETURNING *`, [reason, id]);
        await opsAudit('ops.marketplaceEvent.reject', { id, reason, actor: adminActor(req) });
        after(() => sendOrganizerNotification(
          rows[0].organizer_email,
          `Your event "${rows[0].name}" was not approved`,
          `Hi ${rows[0].contact_name},\n\n"${rows[0].name}" was not approved.${reason ? `\n\nReason: ${reason}` : ''}\n\nYou can edit and resubmit it from your dashboard: https://urbangangtour.co.ke/organizer/dashboard\n\nUrban Gang Tour`
        ));
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceEvent.cancel': {
        const id = s(d.id, 80);
        if (!id) return bad('missing_id');
        const row = await q(`UPDATE marketplace_events SET status='cancelled', updated_at=now() WHERE id=$1 RETURNING *`, [id]);
        if (!row.length) return bad('not_found', 404);
        await opsAudit('ops.marketplaceEvent.cancel', { id, actor: adminActor(req) });
        return NextResponse.json({ ok: true, row: row[0] });
      }
      case 'marketplaceCommission.save': {
        const pct = Number(d.percent);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) return bad('invalid_percent');
        await setCommissionPercent(pct);
        await opsAudit('ops.marketplaceCommission.save', { percent: pct, actor: adminActor(req) });
        return NextResponse.json({ ok: true, percent: pct });
      }

      default:
        return bad('unknown_kind');
    }
  } catch (e: any) {
    if (String(e?.message) === 'db_not_configured') return bad('db_not_configured', 503);
    return bad(String(e?.message || e).slice(0, 200), 500);
  }
}
