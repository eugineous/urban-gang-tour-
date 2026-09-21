import type { Metadata } from 'next';
import { Suspense } from 'react';
import VerifyForm from './VerifyForm';

export const metadata: Metadata = { title: 'Verify email | Organizer | Urban Gang Tour', robots: { index: false } };

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
