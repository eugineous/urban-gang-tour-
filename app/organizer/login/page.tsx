import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Organizer Login | Urban Gang Tour Marketplace',
  robots: { index: false, follow: false },
};

export default function OrganizerLoginPage() {
  return <LoginForm />;
}
