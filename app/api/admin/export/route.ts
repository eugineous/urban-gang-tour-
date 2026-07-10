import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';

const KINDS: Record<string, string> = {
  orders: `SELECT id, total, status, name, email, phone, mpesa_receipt, created_at FROM orders ORDER BY created_at DESC`,
  bookings: `SELECT id, name, org, email, phone, type, status, created_at FROM bookings ORDER BY created_at DESC`,
  subscribers: `SELECT email, created_at FROM subscribers ORDER BY created_at DESC`,
};

export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response('unauthorized', { status: 401 });
  if (!db()) return new Response('db not configured', { status: 503 });
  const kind = new URL(req.url).searchParams.get('kind') || 'orders';
  const sql = KINDS[kind];
  if (!sql) return new Response('unknown kind', { status: 400 });
  const rows = await q(sql);
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
