import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Ticket Terms — Urban Gang Tour',
  description: 'Entry conditions, age guidance and refund rules for Urban Gang Tour events and campus raves.',
  alternates: { canonical: 'https://urbangangtour.co.ke/ticket-terms' },
};

export default function Page() {
  return <LegalPage title="Ticket Terms" updated="10 July 2026" sections={[
    { h: '1. Entry', p: ['A valid ticket (QR or reference) admits one person once. Tickets may be checked against ID at the gate. Copied tickets or tickets resold above face value may be refused.'] },
    { h: '2. Conduct & safety', p: ['Security screening applies. No weapons, illegal substances, or outside alcohol. Follow crew and venue instructions at all times; we may refuse entry or remove anyone endangering others, without refund.'] },
    { h: '3. Age', p: ['School events follow the host institution rules. Campus and public events may have age guidance shown on the event listing.'] },
    { h: '4. Filming', p: ['Events are filmed for Urban News on PPP TV Kenya and our social platforms. Entry constitutes consent to appear in crowd footage.'] },
    { h: '5. Changes & refunds', p: ['Line-ups and times may change. Cancelled events are refunded in full; postponed events follow the Refund Policy. Weather delays at outdoor events do not automatically qualify for refunds.'] },
  ]} />;
}
