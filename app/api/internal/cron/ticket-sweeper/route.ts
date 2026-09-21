import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { expireStaleReservations } from '@/lib/server/ticket-inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  if (!secret) return NextResponse.json({ error: 'automation_not_configured' }, { status: 503 });
  if (!sameSecret(req.headers.get('x-ugt-cron') || '', secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const expired = await expireStaleReservations();
    return NextResponse.json({ ok: true, expired });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 200) }, { status: 500 });
  }
}
