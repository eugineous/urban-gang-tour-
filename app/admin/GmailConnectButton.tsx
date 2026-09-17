'use client';

import { useState } from 'react';

const button: React.CSSProperties = {
  background: '#111', color: '#FFD400', fontWeight: 800, fontSize: 13,
  padding: '10px 14px', border: '2px solid #111', borderRadius: 10,
  boxShadow: '3px 3px 0 #21C7E6', cursor: 'pointer',
};

export default function GmailConnectButton({
  clientId,
  onConnected,
}: {
  clientId: string;
  onConnected?: (email: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const connect = () => {
    setError('');
    const google = (window as any).google?.accounts?.oauth2;
    if (!clientId) {
      setError('Google OAuth is not configured on the server.');
      return;
    }
    if (!google) {
      setError('Google is still loading. Try again in a moment.');
      return;
    }
    setBusy(true);
    const client = google.initCodeClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.modify',
      ux_mode: 'popup',
      include_granted_scopes: true,
      prompt: 'consent',
      callback: async (response: any) => {
        if (!response?.code) {
          setBusy(false);
          setError(response?.error || 'Google did not return an authorisation code.');
          return;
        }
        const result = await fetch('/api/admin/gmail/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XmlHttpRequest',
          },
          body: JSON.stringify({ code: response.code }),
        });
        const data = await result.json().catch(() => ({}));
        setBusy(false);
        if (!result.ok) {
          setError(data.error === 'missing_refresh_token'
            ? 'Google did not issue offline access. Remove Urban Gang Tour from your Google Account permissions, then connect again.'
            : `Could not connect Gmail: ${data.error || result.status}`);
          return;
        }
        onConnected?.(data.email || '');
      },
      error_callback: (response: any) => {
        setBusy(false);
        setError(response?.type === 'popup_closed' ? 'Connection cancelled.' : 'Google connection failed.');
      },
    });
    client.requestCode();
  };

  return (
    <div>
      <button type="button" style={{ ...button, opacity: busy ? .65 : 1 }} disabled={busy} onClick={connect}>
        {busy ? 'Connecting Gmail…' : 'Connect Gmail'}
      </button>
      {error && <div role="alert" style={{ color: '#A11212', fontSize: 12, marginTop: 8, maxWidth: 520 }}>{error}</div>}
    </div>
  );
}

