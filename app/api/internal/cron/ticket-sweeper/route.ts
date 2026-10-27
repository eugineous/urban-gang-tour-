import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { expireStaleReservations } from '@/lib/server/ticket-inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Internal-only sweep: expires abandoned checkout holds so capped tiers
// release seats without a callback ever arriving. Called by the Worker
// scheduled handler. Stays inert until UGT_CRON_SECRET is configured —
// never a public endpoint, never invents or sells anything.
export async function POST(req: Request) {
  const secret = process.env.UGT_CRON_SECRET || '';
  if (!secret) return NextResponse.json({ error: 'automation_not_configured' }, { status: 503, headers });
  if (!sameSecret(req.headers.get('x-ugt-cron') || '', secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers });
  }
  try {
    const expired = await expireStaleReservations();
    return NextResponse.json({ ok: true, expired }, { headers });
  } catch (error: unknown) {
    const unavailable = error instanceof Error && ['db_not_configured', 'database_unavailable'].includes(error.message);
    return NextResponse.json({ error: unavailable ? 'database_unavailable' : 'job_failed' }, { status: 503, headers });
  }
}
