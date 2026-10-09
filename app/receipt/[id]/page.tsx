import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { orderLines } from '@/lib/server/catalog';
import {PrintDocumentButton} from '@/app/_components/PrintDocumentButton';
import QRCode from 'qrcode';
import { maskPhone } from '@/lib/server/receipt-email';

// Printable order receipt. Roles: public (anon) - the unguessable ORD- id is
// the bearer; the page shows no PII beyond the buyer name and a masked phone.
// Server-rendered on every request (payment status must be live), noindexed.

export const dynamic = 'force-dynamic';

const ID_RE = /^ORD-[A-Z0-9-]{4,40}$/;

const BIZ = {
  name: 'Urban Gang Tour',
  addr: 'Chelezo Apartments, Kindaruma Road, Floor 15 Door 2, Kilimani, Nairobi',
  box: 'P.O. Box 6431 - 00622, Juja',
  phone: '+254 799 886247',
  email: 'admin@urbangangtour.co.ke',
  web: 'urbangangtour.co.ke',
};

export const metadata: Metadata = {
  title: 'Receipt | Urban Gang Tour',
  description: 'Your Urban Gang Tour order receipt.',
  robots: { index: false, follow: false },
};

function fmtKes(n: number): string {
  return 'KES ' + Number(n || 0).toLocaleString('en-US');
}

async function getOrder(id: string) {
  try {
    const { q, db } = await import('@/lib/server/db');
    if (!db()) return null;
    const rows = await q(`SELECT * FROM orders WHERE id=$1`, [id]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId || '');
  if (!ID_RE.test(id)) notFound();
  const o = await getOrder(id);
  if (!o) notFound();

  const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
  const lines = orderLines(items || []);
  const paid = o.status === 'paid' || o.status === 'fulfilled';
  const failed = o.status === 'failed';
  const isComp = o.pay_method === 'comp';
  const method = isComp ? 'Complimentary (no charge)' : o.pay_method === 'card' ? 'Card' : 'M-Pesa';
  const reference = String(o.mpesa_receipt || o.paystack_ref || o.stripe_payment_intent || '');
  const phone = maskPhone(String(o.phone || ''));
  const when = o.created_at ? new Date(o.created_at) : new Date();
  const dateStr =
    when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) +
    ', ' +
    when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) +
    ' EAT';

  // e-tickets strip: paid ticket orders link every /t/<code>. ensureTickets is
  // the lazy-mint safety net - a paid order viewed here can never lack tickets.
  let tickets: import('@/lib/server/tickets').TicketRow[] = [];
  if (paid || o.status === 'fulfilled') {
    try {
      const { ensureTickets } = await import('@/lib/server/tickets');
      tickets = await ensureTickets(o);
    } catch (e) {
      console.error('[receipt-tickets]', e);
    }
  }

  const banner = paid
    ? { bg: isComp ? '#B7860B' : '#1F8A5B', label: isComp ? 'PAID · COMPLIMENTARY' : 'PAID' }
    : failed
      ? { bg: '#C62828', label: 'NOT COMPLETED' }
      : { bg: '#B7860B', label: 'PENDING' };

  const qr=await QRCode.toString(`https://urbangangtour.co.ke/verify/order/${encodeURIComponent(id)}`,{type:'svg',margin:4,errorCorrectionLevel:'M'});
  return <section className="document-stage"><article className="document-card receipt-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span>Official receipt</span></a><p className={`document-status ${paid?'valid':failed?'void':'pending'}`} role="status">{banner.label}</p><h1>Your order receipt.</h1><dl className="document-details"><div><dt>Order</dt><dd>{o.id}</dd></div>{reference&&<div><dt>Payment reference</dt><dd>{reference}</dd></div>}<div><dt>Date</dt><dd>{dateStr}</dd></div><div><dt>Payment method</dt><dd>{method}</dd></div>{(o.name||phone)&&<div><dt>Billed to</dt><dd>{o.name}{phone?` (${phone})`:''}</dd></div>}</dl><div className="receipt-lines">{lines.map((l,i)=><div key={i}><span>{l.name} × {l.qty}{l.unit&&!isComp?<small> @ {fmtKes(l.unit)}</small>:null}</span><strong>{isComp?'FREE':fmtKes(l.total)}</strong></div>)}</div><div className="receipt-total"><span>{isComp?'Complimentary':'Total'}</span><strong>{isComp?'KES 0':fmtKes(Number(o.total)||0)}</strong></div>{isComp&&<p className="document-note">Issued free of charge. KES 0 due.</p>}{!paid&&!failed&&<p className="document-note" role="status">Payment has not been confirmed. Refresh to check the latest server status before attempting another purchase.</p>}{failed&&<p className="document-note" role="status">Payment was cancelled or failed. Check your provider’s payment record before retrying.</p>}{tickets.length>0&&<section className="receipt-tickets"><h2>Your tickets</h2><p>Each ticket admits one person.</p>{tickets.map(t=><a key={t.code} href={`/t/${encodeURIComponent(t.code)}`}>Ticket {t.position} of {t.of_count} · {t.tier_name}{t.used_at?' · Admitted':''} →</a>)}<a href={`/tickets/${encodeURIComponent(id)}`}>View all tickets</a></section>}<div className="receipt-qr" dangerouslySetInnerHTML={{__html:qr}}/><p className="document-note">Scan to verify the order status.</p><address className="document-note">{BIZ.name}<br/>{BIZ.addr}<br/>{BIZ.box}<br/>{BIZ.phone} · {BIZ.email}</address><div className="current-actions no-print"><a className="button" href={`/api/receipts/${encodeURIComponent(id)}/pdf`}>Download receipt</a><PrintDocumentButton/></div><p className="document-note">Thank you for supporting the culture.</p></article></section>;
}
