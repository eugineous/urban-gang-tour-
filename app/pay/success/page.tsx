import type { Metadata } from 'next';
import { stripe, stripeConfigured } from '@/lib/server/stripe';
import { paystackVerify } from '@/lib/server/paystack';

export const metadata: Metadata = {
  title: 'Payment Received | Urban Gang Tour',
  description: 'Your Urban Gang Tour merch payment went through. We are preparing your order.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

// Card checkout landing page. Stripe redirects here with ?session_id=cs_...;
// Paystack with ?ref=ORD-... (plus its own trxref/reference params). The
// webhooks are the source of truth for marking orders paid; this page only
// confirms visually (and shows the amount when the transaction is readable).
export default async function PaySuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; ref?: string; reference?: string; trxref?: string }>;
}) {
  const { session_id, ref: refParam, reference, trxref } = await searchParams;
  let amount = '';
  let ref = '';
  try {
    if (session_id && /^cs_[a-zA-Z0-9_]{8,200}$/.test(session_id) && stripeConfigured()) {
      const session = await stripe()!.checkout.sessions.retrieve(session_id);
      if (session.payment_status === 'paid' && typeof session.amount_total === 'number') {
        amount = 'KES ' + Math.round(session.amount_total / 100).toLocaleString();
        ref = session.client_reference_id || '';
      }
    } else {
      const psRef = [refParam, reference, trxref].find((v) => v && /^ORD-[A-Z0-9-]{4,40}$/.test(v));
      if (psRef) {
        const v = await paystackVerify(psRef);
        if (v.ok && v.paid) {
          amount = 'KES ' + Math.round(v.amountKes || 0).toLocaleString();
          ref = psRef;
        }
      }
    }
  } catch { /* degrade to the generic confirmation */ }

  return (
    <main style={{ background: '#111', minHeight: '70vh', padding: '90px 22px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Permanent Marker'", color: '#E6218C', fontSize: 22, transform: 'rotate(-2deg)' }}>
        asante sana
      </div>
      <h1 style={{ fontFamily: "'Anton'", color: '#fff', fontSize: 'clamp(44px,9vw,96px)', margin: '10px 0 8px', textTransform: 'uppercase', WebkitTextStroke: '2px #E6218C' }}>
        Payment received
      </h1>
      {amount ? (
        <p style={{ color: '#FFD400', fontFamily: "'Anton'", fontSize: 26, margin: '0 0 6px' }}>
          {amount}{ref ? ` · Ref ${ref}` : ''}
        </p>
      ) : null}
      <p style={{ color: '#eee', fontWeight: 600, fontSize: 18, maxWidth: 560, margin: '0 auto 26px' }}>
        We are preparing your order. Nairobi pickup or countrywide delivery, we will reach out on your contact details.
      </p>
      <div style={{ display: 'inline-flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="/shop"
          style={{ background: '#E6218C', color: '#fff', fontFamily: "'Anton'", fontSize: 18, padding: '15px 26px', border: '3px solid #fff', borderRadius: 14, boxShadow: '5px 5px 0 #E6218C44', display: 'inline-block', textDecoration: 'none' }}
        >
          BACK TO THE SHOP
        </a>
        <a
          href="/"
          style={{ background: '#FFD400', color: '#111', fontFamily: "'Anton'", fontSize: 18, padding: '15px 26px', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #E6218C', display: 'inline-block', textDecoration: 'none' }}
        >
          BACK HOME
        </a>
      </div>
    </main>
  );
}
