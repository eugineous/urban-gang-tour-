import type { Metadata } from 'next';
import AdminApp from './AdminApp';

export const metadata: Metadata = {
  title: 'Control Room — Urban Gang Tour',
  robots: { index: false, follow: false },
};

// Google OAuth configuration is supplied by the Worker at request time.
// Without this, Next can prerender /admin during the build (before Wrangler
// secrets exist) and permanently bake an empty client id into the page.
export const dynamic = 'force-dynamic';

// Real database-backed Control Room (replaces the v25 demo admin).
// Not linked anywhere publicly — direct URL access only.
export default function AdminPage() {
  return (
    <AdminApp
      googleClientId={process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}
    />
  );
}
