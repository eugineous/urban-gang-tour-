import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Refund & Delivery Policy — Urban Gang Tour',
  description: 'Refunds, exchanges and delivery timelines for Urban Gang merch and ticket purchases paid via M-Pesa.',
  alternates: { canonical: 'https://urbangangtour.co.ke/refund-policy' },
};

export default function Page() {
  return <LegalPage title="Refund & Delivery Policy" updated="10 July 2026" sections={[
    { h: '1. Merch delivery', p: ['Nairobi pickup is free. Countrywide delivery uses reputable couriers, typically 1 to 4 business days after payment confirmation. Delivery fees, if any, are shown at checkout.'] },
    { h: '2. Merch refunds & exchanges', p: ['Wrong size or defective item? Contact us within 7 days of delivery at admin@urbangangtour.co.ke with your order number. Unworn items in original condition are exchanged, or refunded to the paying M-Pesa number within 7 business days of us receiving the return.'] },
    { h: '3. Failed or double payments', p: ['If M-Pesa deducts money but your order shows unpaid, or you are charged twice, send the M-Pesa confirmation SMS to admin@urbangangtour.co.ke. Verified cases are refunded to the paying number within 7 business days.'] },
    { h: '4. Ticket refunds', p: ['If an event is cancelled by us, tickets are refunded in full. If an event is postponed, tickets remain valid for the new date, or you may request a refund within 14 days of the announcement. Tickets are otherwise non-refundable but are transferable to another person.'] },
    { h: '5. How refunds are paid', p: ['All refunds go back to the M-Pesa number that made the payment. We never ask for your M-Pesa PIN.'] },
  ]} />;
}
