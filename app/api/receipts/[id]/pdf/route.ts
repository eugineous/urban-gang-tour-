import { NextResponse } from 'next/server';
import { hasDb } from '@/lib/server/db';
import { accessibleReceiptOrder } from '@/lib/server/receipt-access';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { maskPhone } from '@/lib/server/receipt-email';
import { ensureTickets } from '@/lib/server/tickets';
import { renderReceiptPdf } from '@/lib/tickets/pdf';
import { getLogoDataUri } from '@/lib/ops/pdf';

// Downloadable PDF twin of the /receipt/[id] web receipt. Public bearer
// route for new strong random references. Historical weaker references require
// a database-validated buyer owner or active orders-admin session, as on the web page.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_RE = /^ORD-[A-Z0-9-]{4,40}$/;
const PRIVATE_HEADERS={'Cache-Control':'private, no-store','Cloudflare-CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer'};

function safeName(x: string): string {
  return x.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'receipt';
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit('rcpt-pdf:' + clientIp(req), 20, 60_000, req)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429,headers:PRIVATE_HEADERS });
  }
  const { id: rawId } = await params;
  const id = rawId || '';
  if (!ID_RE.test(id)) return new NextResponse('Not found', { status: 404,headers:PRIVATE_HEADERS });
  if (!hasDb()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503,headers:PRIVATE_HEADERS });

  try {
    const o = await accessibleReceiptOrder(req,id);
    if (!o) return new NextResponse('Not found', { status: 404,headers:PRIVATE_HEADERS });
    if(!['paid','fulfilled'].includes(o.status))return NextResponse.json({error:'payment_not_confirmed'},{status:409,headers:PRIVATE_HEADERS});

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
        // Personalized artifacts must not enter shared CDN caches.
        ...PRIVATE_HEADERS,
      },
    });
  } catch (e: any) {
    console.error('[receipt-pdf]', e);
    return NextResponse.json({ error: 'pdf_failed' }, { status: 500,headers:PRIVATE_HEADERS });
  }
}
