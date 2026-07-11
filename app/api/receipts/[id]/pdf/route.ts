import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { maskPhone } from '@/lib/server/receipt-email';
import { ensureTickets } from '@/lib/server/tickets';
import { renderReceiptPdf } from '@/lib/tickets/pdf';
import { getLogoDataUri } from '@/lib/ops/pdf';

// Downloadable PDF twin of the /receipt/[id] web receipt. Public bearer
// route - the unguessable ORD- id is the bearer, same model as the web page.
// Rate-limited against id-enumeration attempts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_RE = /^ORD-[A-Z0-9-]{4,40}$/;

function safeName(x: string): string {
  return x.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'receipt';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit('rcpt-pdf:' + clientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId || '');
  if (!ID_RE.test(id)) return new NextResponse('Not found', { status: 404 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  try {
    const rows = await q<any>('SELECT * FROM orders WHERE id=$1', [id]);
    const o = rows[0];
    if (!o) return new NextResponse('Not found', { status: 404 });

    let tickets: { code: string; position: number; ofCount: number; tierName: string }[] = [];
    if (o.status === 'paid' || o.status === 'fulfilled') {
      try {
        const rawTix = await ensureTickets(o);
        tickets = rawTix.map((t) => ({ code: t.code, position: t.position, ofCount: t.of_count, tierName: t.tier_name }));
      } catch (e) {
        console.error('[receipt-pdf-tickets]', e);
      }
    }

    const logo = await getLogoDataUri();
    const buf = await renderReceiptPdf(o, logo, maskPhone(String(o.phone || '')), tickets);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName('UGT-Receipt-' + id)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[receipt-pdf]', e);
    return NextResponse.json({ error: 'pdf_failed' }, { status: 500 });
  }
}
