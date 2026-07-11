import type { Metadata } from 'next';
import Dashboard from './Dashboard';

export const metadata: Metadata = {
  title: 'Organizer Dashboard | Urban Gang Tour Marketplace',
  robots: { index: false, follow: false },
};

export default function OrganizerDashboardPage() {
  return <Dashboard />;
}
