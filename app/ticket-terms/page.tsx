import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Ticket Terms — Urban Gang Tour',
  description: 'Entry conditions, age guidance, media permissions and refund rules for Urban Gang Tour and Campus Rev events.',
  alternates: { canonical: 'https://urbangangtour.co.ke/ticket-terms' },
};

export default function Page() {
  return <LegalPage title="Ticket Terms" updated="11 October 2026" sections={[
    { h: '1. Entry', p: ['A valid ticket (QR or reference) admits one person once. Tickets may be checked against ID at the gate. Copied tickets or tickets resold above face value may be refused.'] },
    { h: '2. Conduct & safety', p: ['Security screening applies. No weapons, illegal substances, or outside alcohol. Follow crew and venue instructions at all times; we may refuse entry or remove anyone endangering others, without refund.'] },
    { h: '3. Age', p: ['School events follow the host institution rules. Campus and public events may have age guidance shown on the event listing.'] },
    { h: '4. Photography and filming', p: ['An event may include photography or filming as explained in its listing and venue notices. Contact the organizer before attending if you have a media concern. Attendance alone does not establish permission to publish an identifiable child. School productions require appropriate institutional and parental or guardian arrangements. Broadcast inclusion is agreed for each production; it is not guaranteed by buying a ticket.'] },
    { h: '5. Changes & refunds', p: ['Line-ups and times may change. Cancelled events are refunded in full; postponed events follow the Refund Policy. Weather delays at outdoor events do not automatically qualify for refunds.'] },
  ]} />;
}
