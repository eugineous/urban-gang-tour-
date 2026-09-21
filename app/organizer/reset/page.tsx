import type { Metadata } from 'next';
import { Suspense } from 'react';
import ResetForm from './ResetForm';

export const metadata: Metadata = { title: 'Set a new password | Organizer | Urban Gang Tour', robots: { index: false } };

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
