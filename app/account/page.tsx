import type { Metadata } from 'next';
import AccountApp from './AccountApp';

export const metadata: Metadata = {
  title: 'My Account — Urban Gang Tour',
  description: 'Log in or create your Urban Gang account to pitch stories, track orders and stay close to the tour.',
  alternates: { canonical: 'https://urbangangtour.co.ke/account' },
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <main style={{ background: '#101011', minHeight: '70vh', padding: '56px 20px 110px' }}>
      <h1 style={{ fontFamily: "'Anton'", color: '#fff', textAlign: 'center', fontSize: 'clamp(36px,6vw,64px)', WebkitTextStroke: '2px #111', margin: '0 0 26px', textTransform: 'uppercase' }}>
        Your Urban Gang account
      </h1>
      <AccountApp />
    </main>
  );
}
