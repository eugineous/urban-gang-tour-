import type { Metadata } from 'next';
import AdminApp from './AdminApp';

export const metadata: Metadata = {
  title: 'Control Room — Urban Gang Tour',
  robots: { index: false, follow: false },
};

// Real database-backed Control Room (replaces the v25 demo admin).
// Not linked anywhere publicly — direct URL access only.
export default function AdminPage() {
  return <AdminApp />;
}
