import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { codeAuthentic, getTicket } from '@/lib/server/tickets';
import { renderTicketPdf } from '@/lib/tickets/pdf';
import { getLogoDataUri } from '@/lib/ops/pdf';

// Downloadable PDF twin of the /t/[code] web ticket. Public bearer route -
// same trust model as the web page: the TKT- code is unguessable AND its
// HMAC tag is format-checked BEFORE any DB read, so a garbage/forged code
// never touches the database. Codes are unguessable but this is still a
// public link, so it's rate-limited against enumeration attempts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeName(x: string): string {
  return x.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'ticket';
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!rateLimit('tkt-pdf:' + clientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  }
  const { code: raw } = await params;
  const code = decodeURIComponent(raw || '').toUpperCase().slice(0, 40);
  if (!codeAuthentic(code)) return new NextResponse('Not found', { status: 404 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  try {
    const t = await getTicket(code);
    if (!t) return new NextResponse('Not found', { status: 404 });

    const logo = await getLogoDataUri();
    const buf = await renderTicketPdf({
      code: t.code,
      eventId: t.event_id,
      tierName: t.tier_name,
      holder: t.holder,
      position: t.position,
      ofCount: t.of_count,
      createdAt: t.created_at,
      orderId: t.order_id,
      payMethod: t.pay_method,
      marketplaceEventId: t.marketplace_event_id,
      logo,
    });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName('UGT-Ticket-' + code)}.pdf"`,
        // Was no-store: every repeat download (or bot re-fetch) of the same
        // ticket re-ran the full @react-pdf/renderer layout pass from
        // scratch - real CPU, for bytes that never change once issued.
        // Cached by the exact URL (the unguessable code), so this doesn't
        // change who can reach it - same bearer-token trust model as the
        // page itself, just skipping re-render on repeat hits to the same
        // code.
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (e: any) {
    console.error('[ticket-pdf]', e);
    return NextResponse.json({ error: 'pdf_failed' }, { status: 500 });
  }
}
