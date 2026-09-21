import { q, db } from '@/lib/server/db';
import { hasPerm, verifyAdminSession } from '@/lib/server/session';
import { ensureOpsSchema } from '@/lib/server/ops';

const OPS_KINDS = new Set(['invoices', 'payments', 'contacts', 'expenses', 'payouts']);

// Parameterized query builder for each export kind.
// Each kind returns { sql: string; countSql: string; baseParams: unknown[] }
// so we can append search/date/pagination params without string interpolation.
// `?` positions are 1-indexed PostgreSQL style ($1, $2, ...).

function s(v: unknown, max = 300): string {
  return String(v ?? '').slice(0, max);
}

function safeDateOrNull(v: string | null): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10)) ? v.slice(0, 10) : null;
}

interface QueryParts {
  cols: string;
  from: string;
  where: string[];
  orderBy: string;
  params: unknown[];
}

function buildKindQuery(kind: string, search: string | null, from: string | null, to: string | null): QueryParts | null {
  const p: unknown[] = [];
  const w: string[] = [];

  const push = (v: unknown) => { p.push(v); return `$${p.length}`; };

  switch (kind) {
    case 'orders': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(id::text ILIKE ${pat} OR COALESCE(name,'') ILIKE ${pat} OR COALESCE(email,'') ILIKE ${pat} OR COALESCE(phone,'') ILIKE ${pat})`);
      }
      if (from) w.push(`created_at >= ${push(from)}`);
      if (to)   w.push(`created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'id, total, status, name, email, phone, mpesa_receipt, created_at',
        from: 'orders',
        where: w,
        orderBy: 'created_at DESC',
        params: p,
      };
    }
    case 'bookings': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(id::text ILIKE ${pat} OR COALESCE(name,'') ILIKE ${pat} OR COALESCE(org,'') ILIKE ${pat} OR COALESCE(email,'') ILIKE ${pat})`);
      }
      if (from) w.push(`created_at >= ${push(from)}`);
      if (to)   w.push(`created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'id, name, org, email, phone, type, status, created_at',
        from: 'bookings',
        where: w,
        orderBy: 'created_at DESC',
        params: p,
      };
    }
    case 'subscribers': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`email ILIKE ${pat}`);
      }
      if (from) w.push(`created_at >= ${push(from)}`);
      if (to)   w.push(`created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'email, created_at',
        from: 'subscribers',
        where: w,
        orderBy: 'created_at DESC',
        params: p,
      };
    }
    case 'tickets': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(code ILIKE ${pat} OR COALESCE(holder,'') ILIKE ${pat} OR COALESCE(order_id::text,'') ILIKE ${pat})`);
      }
      if (from) w.push(`created_at >= ${push(from)}`);
      if (to)   w.push(`created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'code, order_id, event_id, tier_name, holder, position, of_count, used_at, created_at',
        from: 'tickets',
        where: w,
        orderBy: 'created_at DESC',
        params: p,
      };
    }
    case 'invoices': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(d.doc_number ILIKE ${pat} OR d.bill_to->>'name' ILIKE ${pat} OR d.bill_to->>'org' ILIKE ${pat} OR d.bill_to->>'email' ILIKE ${pat})`);
      }
      if (from) w.push(`d.created_at >= ${push(from)}`);
      if (to)   w.push(`d.created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: `d.doc_number, e.name AS event, d.bill_to->>'name' AS bill_to_name, d.bill_to->>'org' AS bill_to_org,
          d.bill_to->>'email' AS bill_to_email, d.bill_to->>'phone' AS bill_to_phone,
          COALESCE((SELECT SUM((elem->>'qty')::numeric * (elem->>'amount')::numeric) FROM jsonb_array_elements(d.lines) elem), 0) AS total,
          COALESCE((SELECT SUM(p.amount) FROM ops_payments p WHERE p.invoice_id = d.id), 0) AS paid,
          d.status, d.due_date, d.created_at`,
        from: `ops_documents d LEFT JOIN ops_events e ON e.id = d.event_id`,
        where: [`d.doc_type = 'invoice'`, ...w],
        orderBy: 'd.id DESC',
        params: p,
      };
    }
    case 'payments': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(e.name ILIKE ${pat} OR d.doc_number ILIKE ${pat} OR p.reference ILIKE ${pat})`);
      }
      if (from) w.push(`p.paid_on >= ${push(from)}`);
      if (to)   w.push(`p.paid_on < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'p.id, e.name AS event, d.doc_number AS invoice_number, p.amount, p.paid_on, p.method, p.reference, p.created_at',
        from: `ops_payments p LEFT JOIN ops_events e ON e.id = p.event_id LEFT JOIN ops_documents d ON d.id = p.invoice_id`,
        where: w,
        orderBy: 'p.paid_on DESC, p.id DESC',
        params: p,
      };
    }
    case 'contacts': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(name ILIKE ${pat} OR org ILIKE ${pat} OR email ILIKE ${pat} OR phone ILIKE ${pat})`);
      }
      if (from) w.push(`created_at >= ${push(from)}`);
      if (to)   w.push(`created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'id, name, org, role, phone, email, notes, next_followup, status, created_at',
        from: 'ops_contacts',
        where: w,
        orderBy: 'org, name',
        params: p,
      };
    }
    case 'expenses': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(e.label ILIKE ${pat} OR ev.name ILIKE ${pat} OR e.category ILIKE ${pat})`);
      }
      if (from) w.push(`e.spent_on >= ${push(from)}`);
      if (to)   w.push(`e.spent_on < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'e.id, ev.name AS event, e.label, e.category, e.amount, e.spent_on, e.note, e.created_at',
        from: `ops_expenses e LEFT JOIN ops_events ev ON ev.id = e.event_id`,
        where: w,
        orderBy: 'e.spent_on DESC, e.id DESC',
        params: p,
      };
    }
    case 'payouts': {
      if (search) {
        const pat = push(`%${search}%`);
        w.push(`(p.person ILIKE ${pat} OR p.phone ILIKE ${pat} OR ev.name ILIKE ${pat})`);
      }
      if (from) w.push(`p.created_at >= ${push(from)}`);
      if (to)   w.push(`p.created_at < (${push(to)}::date + interval '1 day')`);
      return {
        cols: 'p.id, ev.name AS event, p.person, p.phone, p.role, p.amount, p.paid, p.paid_on, p.created_at',
        from: `ops_crew_payouts p LEFT JOIN ops_events ev ON ev.id = p.event_id`,
        where: w,
        orderBy: 'p.created_at DESC',
        params: p,
      };
    }
    default:
      return null;
  }
}

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
  if (!(await verifyAdminSession(req))) return new Response('unauthorized', { status: 401 });
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || 'orders';
  if (!hasPerm(req, KIND_PERM[kind] || '__none__')) return new Response('forbidden', { status: 403 });
  if (!db()) return new Response('db not configured', { status: 503 });

  // Optional filter params
  const search = s(url.searchParams.get('search') || '', 200) || null;
  const from   = safeDateOrNull(url.searchParams.get('from'));
  const to     = safeDateOrNull(url.searchParams.get('to'));
  const limit  = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('limit') || '500', 10) || 500));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

  const parts = buildKindQuery(kind, search, from, to);
  if (!parts) return new Response('unknown kind', { status: 400 });

  const whereClause = parts.where.length ? `WHERE ${parts.where.join(' AND ')}` : '';

  // Count query uses the same WHERE but no pagination
  const countSql = `SELECT COUNT(*) AS n FROM ${parts.from} ${whereClause}`;

  // Data query adds LIMIT/OFFSET params after the existing where params
  const dataParams = [...parts.params, limit, offset];
  const limitParam  = `$${dataParams.length - 1}`;
  const offsetParam = `$${dataParams.length}`;
  const dataSql = `SELECT ${parts.cols} FROM ${parts.from} ${whereClause} ORDER BY ${parts.orderBy} LIMIT ${limitParam} OFFSET ${offsetParam}`;

  let rows: any[];
  let totalCount: number;
  try {
    if (OPS_KINDS.has(kind)) await ensureOpsSchema();
    const [dataRows, countRows] = await Promise.all([
      q(dataSql, dataParams),
      q<{ n: string }>(countSql, parts.params),
    ]);
    rows = dataRows;
    totalCount = Number(countRows[0]?.n || 0);
  } catch (e: any) {
    return new Response(String(e?.message || e).slice(0, 200), { status: 500 });
  }

  if (!rows.length) {
    return new Response('no data', {
      status: 200,
      headers: { 'X-Total-Count': String(totalCount!) },
    });
  }

  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    const raw = String(v ?? '');
    const safe = /^[=+\-@]/.test(raw) ? "'" + raw : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(','), ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="ugt-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'X-Total-Count': String(totalCount!),
    },
  });
}
