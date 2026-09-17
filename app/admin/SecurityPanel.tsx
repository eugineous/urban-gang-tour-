'use client';

import { useEffect, useState } from 'react';
import GmailConnectButton from './GmailConnectButton';

const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', padding: 18 };
const field: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
const button: React.CSSProperties = { background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };

export default function SecurityPanel({ googleClientId, say }: { googleClientId: string; say: (message: string) => void }) {
  const [status, setStatus] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/admin/security').then((response) => response.json()).then(setStatus);
  useEffect(() => { load(); }, []);

  const savePassword = async () => {
    if (password !== confirmPassword) { say('Passwords do not match'); return; }
    setSaving(true);
    const response = await fetch('/api/admin/security', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { say(data.hint || data.error || 'Could not save password'); return; }
    setPassword(''); setConfirmPassword(''); load(); say('Control Room password updated');
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Gmail from the Control Room? You can reconnect later.')) return;
    const response = await fetch('/api/admin/gmail', { method: 'DELETE' });
    if (response.ok) { say('Gmail disconnected'); load(); }
    else say('Could not disconnect Gmail');
  };

  return <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
    <section style={card}>
      <div style={{ fontFamily: 'Anton', fontSize: 22 }}>CONTROL ROOM PASSWORD</div>
      <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5 }}>Choose your own password. It is stored as a salted hash, never as readable text. Your server access code remains an emergency backup until you rotate or remove it.</p>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{status?.customPasswordSet ? 'Custom password is active' : 'No custom password set yet'} · {status?.envBackupSet ? 'Backup code active' : 'No backup code'}</div>
      <div style={{ display: 'grid', gap: 9 }}>
        <input style={field} type="password" autoComplete="new-password" placeholder="New password (12+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} />
        <input style={field} type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <button type="button" style={{ ...button, justifySelf: 'start', opacity: saving ? .65 : 1 }} disabled={saving || !password} onClick={savePassword}>{saving ? 'Saving…' : 'Set my password'}</button>
      </div>
    </section>
    <section style={card}>
      <div style={{ fontFamily: 'Anton', fontSize: 22 }}>GOOGLE & GMAIL</div>
      <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5 }}>Google Sign-In controls access. Gmail access is separate and lets the Booking Desk and Inbox read and send mail.</p>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>Google login: {status?.googleLoginConfigured ? 'configured' : 'not configured'}</div>
      {status?.gmail?.connected ? <div>
        <div style={{ border: '2px solid #111', borderRadius: 10, padding: 12, background: '#DDF6E8', fontSize: 13, fontWeight: 800 }}>Connected as {status.gmail.email}</div>
        <button type="button" style={{ ...button, background: '#fff', marginTop: 12 }} onClick={disconnect}>Disconnect Gmail</button>
      </div> : <GmailConnectButton clientId={googleClientId} onConnected={() => load()} />}
    </section>
  </div>;
}

