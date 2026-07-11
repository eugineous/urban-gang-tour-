import type { Metadata } from 'next';
import NewEventForm from './NewEventForm';

export const metadata: Metadata = {
  title: 'Submit an Event | Urban Gang Tour Marketplace',
  robots: { index: false, follow: false },
};

export default function NewEventPage() {
  return <NewEventForm />;
}
