import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { reconcileStuckOrders } from '@/lib/server/reconcile';
import { processPaymentEffects } from '@/lib/server/payment-effects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Internal-only payment reconciliation: recovers orders stuck in
// pending/unknown when a provider callback never arrived (Daraja
// stkpushquery, Paystack verify). Guarded like every other internal cron.
export async function POST(req: Request) {
  const secret = process.env.UGT_CRON_SECRET || '';
  if (!secret) return NextResponse.json({ error: 'automation_not_configured' }, { status: 503, headers });
  if (!sameSecret(req.headers.get('x-ugt-cron') || '', secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers });
  }
  try {
    // Recovery of already-recorded work does not depend on new provider
    // verification being enabled or succeeding. Never scan/backfill paid rows.
    const effects = await processPaymentEffects();
    const outcome = await reconcileStuckOrders();
    return NextResponse.json({ ok: true, ...outcome, effects }, { headers });
  } catch (error: unknown) {
    const unavailable = error instanceof Error && ['db_not_configured', 'database_unavailable'].includes(error.message);
    return NextResponse.json({ error: unavailable ? 'database_unavailable' : 'job_failed' }, { status: 503, headers });
  }
}
