import type { Metadata } from 'next';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Sell Tickets Through UGT | Urban Gang Tour Marketplace',
  description: 'Apply to sell your event tickets through the Urban Gang Tour Marketplace — we collect payment and pay you out automatically per ticket, minus our commission.',
  robots: { index: false, follow: false },
};

export default function OrganizerSignupPage() {
  return <SignupForm />;
}
