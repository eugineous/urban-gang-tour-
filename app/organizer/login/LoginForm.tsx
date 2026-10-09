'use client';

import {GoogleSignIn} from '@/app/_components/GoogleSignIn';
import { useState } from 'react';
import { shell, wrap, card, btnMagenta, inp, label, h1, api, useToast, Toast } from '../ui';

const ERR: Record<string, string> = {
  wrong_credentials: 'Wrong email or password.',
  application_pending: 'Your application is still under review — we’ll email you once a decision is made.',
  application_rejected: 'Your application was not approved. Contact admin@urbangangtour.co.ke for details.',
  account_suspended: 'Your organizer account is suspended. Contact admin@urbangangtour.co.ke.',
  too_many_requests: 'Too many attempts — wait a minute and try again.',
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api('/api/organizer/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data.ok) window.location.href = '/organizer/dashboard';
      else say(ERR[data.error] || 'Login failed: ' + (data.error || 'unknown error'));
    } finally { setBusy(false); }
  };

  return (
    <div style={shell}>
      <div style={{ ...wrap, maxWidth: 420 }}>
        <Toast msg={toast} />
        <h1 style={h1}>Organizer login</h1>
        <div style={card}><GoogleSignIn endpoint="/api/organizer/google" onSuccess={()=>{window.location.href='/organizer/dashboard'}}/>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="org-login-email" style={label}>Email</label>
              <input id="org-login-email" style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="org-login-password" style={label}>Password</label>
              <input id="org-login-password" style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="current-password" />
            </div>
            <button style={btnMagenta} disabled={busy} onClick={submit}>{busy ? 'Signing in…' : 'Log in'}</button>
            <div style={{ fontSize: 12, color: '#888' }}>No account yet? <a href="/organizer/signup" style={{ color: '#E6218C', fontWeight: 700 }}>Apply to sell tickets</a> · <a href="/organizer/forgot" style={{ color: '#E6218C', fontWeight: 700 }}>Forgot password?</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
