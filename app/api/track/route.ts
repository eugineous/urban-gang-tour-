import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';

// Lightweight first-party page-view counter (fed by consented beacon).
export async function POST(req: Request) {
  if (!db()) return NextResponse.json({ ok: false });
  try {
    const { path } = await req.json();
    if (typeof path === 'string' && path.startsWith('/') && path.length < 100) {
      await q(
        `INSERT INTO traffic (day, path, hits) VALUES (CURRENT_DATE, $1, 1)
         ON CONFLICT (day, path) DO UPDATE SET hits = traffic.hits + 1`,
        [path.split('?')[0]]
      );
    }
  } catch { /* never block the page on analytics */ }
  return NextResponse.json({ ok: true });
}
