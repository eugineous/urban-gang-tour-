import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Refund & Delivery Policy — Urban Gang Tour',
  description: 'Refunds, exchanges and delivery guidance for Urban Gang merch and ticket purchases.',
  alternates: { canonical: 'https://urbangangtour.co.ke/refund-policy' },
};

export default function Page() {
  return <LegalPage title="Refund & Delivery Policy" updated="11 October 2026" sections={[
    { h: '1. Merch delivery', p: ['Any collection or delivery option available for an order is shown at checkout or confirmed with you before fulfilment. Contact admin@urbangangtour.co.ke with your order number if you need help with a delivery or collection arrangement.'] },
    { h: '2. Merch refunds & exchanges', p: ['Wrong size or defective item? Contact us within 7 days of delivery at admin@urbangangtour.co.ke with your order number. We will confirm the return arrangement and available exchange or refund with the original payer.','For a name-printed product, contact us promptly if you need to change your instructions before production starts. Personalization does not remove your rights concerning defects or an incorrectly fulfilled order. Approved refunds use the original payment provider or an agreed verified return method.'] },
    { h: '3. Failed or duplicate payments', p: ['If a payment succeeds but your order shows unpaid, or you believe you were charged twice, contact admin@urbangangtour.co.ke with your order number and payment confirmation. We will investigate verified cases with the relevant payment provider.'] },
    { h: '4. Ticket refunds', p: ['If an event is cancelled by us, tickets are refunded in full. If an event is postponed, tickets remain valid for the new date, or you may request a refund within 14 days of the announcement. Tickets are otherwise non-refundable but are transferable to another person.'] },
    { h: '5. How refunds are paid', p: ['Where a refund is approved, we will confirm the return method with the original payer. We never ask for your M-Pesa PIN or card details.'] },
  ]} />;
}
