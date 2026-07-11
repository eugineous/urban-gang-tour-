import type { Metadata } from 'next';
import EditEventForm from './EditEventForm';

export const metadata: Metadata = {
  title: 'Edit Event | Urban Gang Tour Marketplace',
  robots: { index: false, follow: false },
};

export default function EditEventPage() {
  return <EditEventForm />;
}
