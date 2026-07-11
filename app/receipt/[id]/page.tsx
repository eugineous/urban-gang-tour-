import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { orderLines } from '@/lib/server/catalog';
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
  const paid = o.status === 'paid';
  const failed = o.status === 'failed';
  const method = o.pay_method === 'card' ? 'Card' : 'M-Pesa';
  const reference = String(o.mpesa_receipt || o.paystack_ref || o.stripe_payment_intent || '');
  const phone = maskPhone(String(o.phone || ''));
  const when = o.created_at ? new Date(o.created_at) : new Date();
  const dateStr =
    when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }) +
    ', ' +
    when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) +
    ' EAT';

  const banner = paid
    ? { bg: '#1F8A5B', label: 'PAID' }
    : failed
      ? { bg: '#C62828', label: 'NOT COMPLETED' }
      : { bg: '#B7860B', label: 'PENDING' };

  const anton = "'Anton','Arial Black',sans-serif";
  const grotesk = "'Space Grotesk',Arial,sans-serif";

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1ea', padding: '32px 14px', fontFamily: grotesk, color: '#111' }}>
      <style>{`@media print { body { background: #fff !important; } .no-print { display: none !important; } .receipt-card { box-shadow: none !important; } }`}</style>
      <div className="receipt-card" style={{ maxWidth: 620, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 18, overflow: 'hidden', boxShadow: '10px 10px 0 #111' }}>
        <div style={{ background: '#111', padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" style={{ height: 46, width: 'auto' }} />
            <div>
              <div style={{ fontFamily: anton, fontSize: 12, letterSpacing: '.06em', color: '#FFD400', textTransform: 'uppercase' }}>Urban Gang Tour</div>
              <div style={{ fontFamily: anton, fontSize: 22, color: '#fff', textTransform: 'uppercase', lineHeight: 1.1 }}>Official Receipt</div>
            </div>
          </div>
          <div style={{ background: banner.bg, color: '#fff', borderRadius: 100, padding: '7px 16px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{banner.label}</div>
        </div>
        <div style={{ height: 5, background: '#E6218C' }} />
        <div style={{ padding: '22px 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 5, fontSize: 13.5, color: '#555' }}>
            <span>Receipt / Order No.</span>
            <span style={{ fontWeight: 700, color: '#111', textAlign: 'right' }}>{o.id}</span>
            {reference ? (
              <>
                <span>Payment reference</span>
                <span style={{ fontWeight: 700, color: '#111', textAlign: 'right' }}>{reference}</span>
              </>
            ) : null}
            <span>Date</span>
            <span style={{ color: '#111', textAlign: 'right' }}>{dateStr}</span>
            <span>Payment method</span>
            <span style={{ color: '#111', textAlign: 'right' }}>{method}</span>
            {o.name ? (
              <>
                <span>Billed to</span>
                <span style={{ color: '#111', textAlign: 'right' }}>{o.name}{phone ? ` (${phone})` : ''}</span>
              </>
            ) : phone ? (
              <>
                <span>Phone</span>
                <span style={{ color: '#111', textAlign: 'right' }}>{phone}</span>
              </>
            ) : null}
          </div>
          <div style={{ marginTop: 18 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px dashed #ccc', fontSize: 14 }}>
                <span>
                  {l.name} &times; {l.qty}
                  {l.unit ? <span style={{ color: '#888' }}> @ {fmtKes(l.unit)}</span> : null}
                </span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtKes(l.total)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, background: '#FFD400', border: '2px solid #111', borderRadius: 10, padding: '12px 14px' }}>
            <span style={{ fontFamily: anton, fontSize: 15, textTransform: 'uppercase' }}>Total</span>
            <span style={{ fontFamily: anton, fontSize: 22 }}>{fmtKes(Number(o.total) || 0)}</span>
          </div>
          {!paid && !failed ? (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#8a6d1a', background: '#fff8dd', border: '2px solid #B7860B', borderRadius: 10, padding: '10px 14px' }}>
              This order has not been confirmed yet. If you completed payment, this page updates automatically once M-Pesa confirms - refresh in a moment.
            </div>
          ) : null}
          {failed ? (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#8a1c1c', background: '#fdecec', border: '2px solid #C62828', borderRadius: 10, padding: '10px 14px' }}>
              Payment was cancelled or failed. No money left your account? You can order again from the shop or events page.
            </div>
          ) : null}
        </div>
        <div style={{ borderTop: '2px dashed #ccc', padding: '16px 26px', fontSize: 11.5, color: '#666', lineHeight: 1.7 }}>
          <strong style={{ color: '#111' }}>{BIZ.name}</strong>
          <br />
          {BIZ.addr}
          <br />
          {BIZ.box} &middot; {BIZ.phone}
          <br />
          {BIZ.email} &middot; {BIZ.web}
        </div>
        <div style={{ background: '#111', color: '#FFD400', textAlign: 'center', padding: 12, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Thank you for supporting the culture
        </div>
      </div>
      <div className="no-print" style={{ maxWidth: 620, margin: '16px auto 0', textAlign: 'center' }}>
        <a
          href="#print"
          style={{ display: 'inline-block', background: '#E6218C', color: '#fff', textDecoration: 'none', fontFamily: anton, fontSize: 15, padding: '12px 26px', border: '3px solid #111', borderRadius: 12, boxShadow: '5px 5px 0 #111', textTransform: 'uppercase' }}
        >
          Print this receipt
        </a>
        <script dangerouslySetInnerHTML={{ __html: `document.currentScript.previousElementSibling.addEventListener('click',function(e){e.preventDefault();window.print();});` }} />
      </div>
    </div>
  );
}
