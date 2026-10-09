import type { Metadata } from 'next';
import { stripe, stripeConfigured } from '@/lib/server/stripe';
import PaymentStatus from './PaymentStatus';

export const metadata: Metadata = {
  title: 'Check your payment | Urban Gang Tour',
  description: 'Check payment confirmation and open your order documents.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

// Card checkout landing page. Stripe redirects here with ?session_id=cs_...;
// Paystack with ?ref=ORD-... (plus its own trxref/reference params). The
// webhooks are the source of truth for marking orders paid; this page only
// resolves the order reference, then polls recorded settlement before confirming.
export default async function PaySuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; ref?: string; reference?: string; trxref?: string }>;
}) {
  const { session_id, ref: refParam, reference, trxref } = await searchParams;
  let ref = [refParam, reference, trxref].find(v => v && /^ORD-[A-Z0-9-]{4,40}$/.test(v)) || '';
  try {
    if (!ref && session_id && /^cs_[a-zA-Z0-9_]{8,200}$/.test(session_id) && stripeConfigured()) {
      const session = await stripe()!.checkout.sessions.retrieve(session_id);
      if (/^ORD-[A-Z0-9-]{4,40}$/.test(session.client_reference_id || '')) ref = session.client_reference_id || '';
    }
  } catch { /* do not imply success when a provider is unavailable */ }

  return (
    <main className="modern-page"><p className="eyebrow">Your payment</p>
      {ref ? <PaymentStatus orderId={ref}/> : <><h1>Check your payment</h1><p>This link does not identify an order. Open the order link from checkout, your email or your account to confirm payment.</p><a href="/account" >Find my order</a></>}
      <div className="modern-actions" style={{marginTop:32}}><a className="button" href="/shop">Continue shopping</a><a href="/">Back home</a></div>
    </main>
  );
}
