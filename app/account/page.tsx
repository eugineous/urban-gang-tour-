import type { Metadata } from 'next';
import AccountApp from './AccountApp';

export const metadata: Metadata = {
  title: 'My Account — Urban Gang Tour',
  description: 'Manage your Urban Gang Tour purchases, tickets, receipts, account access and privacy requests.',
  alternates: { canonical: 'https://urbangangtour.co.ke/account' },
  robots: { index: false, follow: true },
  referrer: 'no-referrer',
};

export default function AccountPage() {
  return (
    <main className="modern-page">
      <p className="eyebrow">Your Urban Gang account</p><h1>Your account.</h1>
      <AccountApp />
    </main>
  );
}
