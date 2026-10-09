import type { Metadata } from 'next';
import AccountApp from './AccountApp';

export const metadata: Metadata = {
  title: 'My Account — Urban Gang Tour',
  description: 'Log in or create your Urban Gang account to pitch stories and manage your profile.',
  alternates: { canonical: 'https://urbangangtour.co.ke/account' },
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <main className="modern-page">
      <p className="eyebrow">Your Urban Gang account</p><h1>Your account.</h1>
      <AccountApp />
    </main>
  );
}
