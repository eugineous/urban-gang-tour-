import type { Metadata } from 'next';
import ForgotForm from './ForgotForm';

export const metadata: Metadata = { title: 'Reset password | Organizer | Urban Gang Tour', robots: { index: false } };

export default function ForgotPage() {
  return <ForgotForm />;
}
