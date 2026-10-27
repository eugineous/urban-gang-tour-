import {DocumentAmount,DocumentDate,DocumentLabel,DocumentStatus} from '@/app/_components/PrintDocumentButton';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {MessageText} from '@/ui/i18n/MessageText';
import {documentsMessages} from '@/ui/i18n/catalogues/documents';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { receiptLines } from '@/lib/server/receipt-lines';
import {PrintDocumentButton} from '@/app/_components/PrintDocumentButton';
import QRCode from 'qrcode';
import {ticketIsActive} from '@/lib/server/ticket-entitlement';
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

  const lines = await receiptLines(o);
  const paid = o.status === 'paid' || o.status === 'fulfilled';
  const failed = o.status === 'failed';
  const refunded=['refunded','partially_refunded'].includes(o.status);
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
  if (paid || (o.status==='partially_refunded'&&o.ticket_refund_policy==='allocated')) {
    try {
      const { ensureTickets } = await import('@/lib/server/tickets');
      tickets = o.status==='partially_refunded'?await (await import('@/lib/server/tickets')).ticketsForOrder(o.id):await ensureTickets(o);
      tickets=tickets.filter(ticket=>ticketIsActive({...ticket,order_status:o.status,ticket_refund_policy:o.ticket_refund_policy}));
    } catch (e) {
      console.error('[receipt-tickets]', e);
    }
  }

  const banner = paid
    ? { bg: isComp ? '#B7860B' : '#1F8A5B', label: isComp ? 'PAID · COMPLIMENTARY' : 'PAID' }
    : refunded ? {bg:'#B7860B',label:o.status==='refunded'?'FULL RETURN RECORDED':'PARTIAL RETURN RECORDED'} : failed
      ? { bg: '#C62828', label: 'NOT COMPLETED' }
      : { bg: '#B7860B', label: 'PENDING' };

  const qr=await QRCode.toString(`https://urbangangtour.co.ke/verify/order/${encodeURIComponent(id)}`,{type:'svg',margin:4,errorCorrectionLevel:'M'});
  return <section className="document-stage"><div className="no-print"><LanguageChooser path="/documents"/></div><article className="document-card receipt-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span>{refunded?<MessageText catalogue={documentsMessages} message="copy.order_record"/>:<MessageText catalogue={documentsMessages} message="copy.official_receipt"/>}</span></a><p className={`document-status ${paid?'valid':failed?'void':'pending'}`} role="status">{<DocumentLabel label={banner.label}/>}</p><h1>{refunded?<MessageText catalogue={documentsMessages} message="copy.your_order_and_return_record"/>:<MessageText catalogue={documentsMessages} message="copy.your_order_receipt"/>}</h1><dl className="document-details"><div><dt><MessageText catalogue={documentsMessages} message="copy.order"/></dt><dd>{o.id}</dd></div>{reference&&<div><dt><MessageText catalogue={documentsMessages} message="copy.payment_reference"/></dt><dd>{reference}</dd></div>}<div><dt><MessageText catalogue={documentsMessages} message="copy.date"/></dt><dd>{<DocumentDate value={when.toISOString()}/>}</dd></div><div><dt><MessageText catalogue={documentsMessages} message="copy.payment_method"/></dt><dd>{<DocumentLabel label={method}/>}</dd></div>{(o.name||phone)&&<div><dt><MessageText catalogue={documentsMessages} message="copy.billed_to"/></dt><dd>{o.name}{phone?` (${phone})`:''}</dd></div>}</dl><div className="receipt-lines">{lines.map((l,i)=><div key={i}><span>{l.name} × {l.qty}{l.unit&&!isComp?<small> @ {<DocumentAmount value={l.unit}/>}</small>:null}</span><strong>{isComp?<MessageText catalogue={documentsMessages} message="copy.free_2"/>:fmtKes(l.total)}</strong></div>)}</div><div className="receipt-total"><span>{isComp?<MessageText catalogue={documentsMessages} message="copy.complimentary"/>:<MessageText catalogue={documentsMessages} message="copy.total"/>}</span><strong>{<DocumentAmount value={isComp?0:Number(o.total)||0}/>}</strong></div>{isComp&&<p className="document-note"><span lang="en-KE">Issued free of charge. KES 0 due.</span></p>}{!paid&&!failed&&!refunded&&<p className="document-note" role="status"><MessageText catalogue={documentsMessages} message="copy.payment_has_not_been_confirmed_refresh_to_check_the_latest_server"/></p>}{refunded&&<p className="document-note" role="status"><MessageText catalogue={documentsMessages} message="copy.an_external_money_return_is_recorded_this_is_an_order_record"/></p>}{failed&&<p className="document-note" role="status"><MessageText catalogue={documentsMessages} message="copy.payment_was_cancelled_or_failed_check_your_provider_s_payment_record"/></p>}{tickets.length>0&&<section className="receipt-tickets"><h2><MessageText catalogue={documentsMessages} message="copy.your_tickets"/></h2><p><MessageText catalogue={documentsMessages} message="copy.each_ticket_admits_one_person"/></p>{tickets.map(t=><a key={t.code} href={`/t/${encodeURIComponent(t.code)}`}><MessageText catalogue={documentsMessages} message="copy.ticket_2"/> {t.position} <MessageText catalogue={documentsMessages} message="copy.of"/> {t.of_count} · {t.tier_name}{t.used_at?<MessageText catalogue={documentsMessages} message="copy.admitted"/>:''} →</a>)}<a href={`/tickets/${encodeURIComponent(id)}`}><MessageText catalogue={documentsMessages} message="copy.view_all_tickets"/></a></section>}<div className="receipt-qr" dangerouslySetInnerHTML={{__html:qr}}/><p className="document-note"><MessageText catalogue={documentsMessages} message="copy.scan_to_verify_the_order_status"/></p><address className="document-note">{BIZ.name}<br/>{BIZ.addr}<br/>{BIZ.box}<br/>{BIZ.phone} · {BIZ.email}</address><div className="current-actions no-print">{paid&&<a className="button" href={`/api/receipts/${encodeURIComponent(id)}/pdf`}><MessageText catalogue={documentsMessages} message="copy.download_receipt"/></a>}<PrintDocumentButton/></div><p className="document-note"><span lang="en-KE">Thank you for supporting the culture.</span></p></article></section>;
}
