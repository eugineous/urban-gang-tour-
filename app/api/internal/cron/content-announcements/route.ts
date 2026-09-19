import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { dispatchDueArticleAnnouncements } from '@/lib/server/content-automation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Internal-only endpoint called by the Worker scheduled handler. It is not a
// public publishing API and stays inert until a Cloudflare secret is present.
export async function POST(req: Request) {
  const secret = process.env.UGT_CRON_SECRET || '';
  if (!secret) return NextResponse.json({ error: 'automation_not_configured' }, { status: 503 });
  if (!sameSecret(req.headers.get('x-ugt-cron') || '', secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const outcome = await dispatchDueArticleAnnouncements();
    return NextResponse.json({ ok: true, ...outcome });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error).slice(0, 200) }, { status: 500 });
  }
}
