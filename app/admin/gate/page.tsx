import type { Metadata } from 'next';
import GateApp from './GateApp';

export const metadata: Metadata = {
  title: 'Gate Scanner | Urban Gang Tour',
  robots: { index: false, follow: false },
};

// QR gate check-in for event staff. Same ugt_admin session as the Control
// Room - unauthenticated visitors are pointed to /admin to sign in.
export default function GatePage() {
  return <GateApp />;
}
