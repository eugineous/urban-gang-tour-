import type { Metadata } from 'next';
import { LegalPage } from '@/app/_components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service — Urban Gang Tour',
  description: 'The terms that govern use of urbangangtour.co.ke, bookings, accounts, tickets and merch orders.',
  alternates: { canonical: 'https://urbangangtour.co.ke/terms' },
};

export default function Page() {
  return <LegalPage title="Terms of Service" updated="10 July 2026" sections={[
    { h: '1. Agreement', p: ['By using urbangangtour.co.ke, creating an account, booking the tour, or buying tickets or merch, you agree to these terms and our Privacy Policy. These terms are governed by the laws of Kenya.'] },
    { h: '2. Bookings', p: ['Submitting a booking enquiry is a request, not a confirmed event. Dates are confirmed in writing after our team agrees scope, logistics and fees with your institution or brand.'] },
    { h: '3. Orders & payments', p: ['Prices are in Kenyan Shillings (KES). Payment is via M-Pesa. An order is confirmed only when payment is confirmed by Safaricom. All prices are validated on our servers at checkout.'] },
    { h: '4. Tickets', p: ['Tickets admit one person per ticket, subject to venue capacity and entry conditions. See the Ticket Terms page for refunds and entry rules.'] },
    { h: '5. Accounts', p: ['Keep your password private. You are responsible for activity on your account. We may suspend accounts used for abuse, fraud or unlawful content.'] },
    { h: '6. Content you submit', p: ['Story pitches and blog submissions must be your own work. By submitting, you licence us to edit and publish them across Urban Gang Tour and Urban News platforms with credit.'] },
    { h: '7. Our content', p: ['The Urban Gang Tour name, logo, photos and videos are our property or used with permission. Personal, non-commercial sharing with credit is welcome; commercial use needs written consent.'] },
    { h: '8. Liability', p: ['The site is provided "as is". To the maximum extent permitted by Kenyan law, we are not liable for indirect losses arising from use of the site. Nothing limits liability that cannot be limited by law.'] },
    { h: '9. Contact', p: ['Questions: admin@urbangangtour.co.ke — Urban Gang Tour, Nairobi, Kenya.'] },
  ]} />;
}
