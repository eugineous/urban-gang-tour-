'use client';

import { useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

export default function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, say] = useToast();

  const submit = async () => {
    setBusy(true);
    const { data } = await api('/api/organizer/forgot', { method: 'POST', body: JSON.stringify({ email }) });
    setBusy(false);
    if (data.ok) setSent(true);
    else say('Request failed: ' + (data.error || 'unknown error'));
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>Reset password</h1>
        <div style={card}>
          {sent ? (
            <p style={{ lineHeight: 1.6 }}>If that address belongs to an organizer account, a reset link is on its way (expires in 1 hour).</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="org-forgot-email" style={label}>Account email</label>
                <input id="org-forgot-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="email" />
              </div>
              <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? 'Sending…' : 'Send reset link'}</button>
              <div style={{ fontSize: 12, color: '#888' }}><a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>Back to login</a></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
