'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

const ERR: Record<string, string> = {
  invalid_token: 'This reset link is invalid or has already been used.',
  token_expired: 'This reset link has expired — request a fresh one.',
  too_many_requests: 'Too many attempts — wait a minute and try again.',
};

export default function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, say] = useToast();

  const submit = async () => {
    if (busy) return;
    if (password.length < 8) { say('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      const { data } = await api('/api/organizer/reset', { method: 'POST', body: JSON.stringify({ token, password }) });
      if (data.ok) setDone(true);
      else say(ERR[data.error] || 'Reset failed: ' + (data.error || 'unknown error'));
    } finally { setBusy(false); }
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>Set a new password</h1>
        <div style={card}>
          {!token ? (
            <p style={{ lineHeight: 1.6 }}>This page needs a reset link — request one from the <a href="/organizer/forgot" style={{ color: '#E6218C', fontWeight: 700 }}>forgot-password page</a>.</p>
          ) : done ? (
            <p style={{ lineHeight: 1.6 }}>Password updated — every other session is signed out. <a href="/organizer/login" style={{ color: '#E6218C', fontWeight: 700 }}>Log in</a>.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="org-reset-password" style={label}>New password (min 8 characters)</label>
                <input id="org-reset-password" style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="new-password" />
              </div>
              <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Set new password'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
