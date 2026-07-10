'use client';

import { useEffect, useState } from 'react';

const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 22 };
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '2px solid #111', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
const btn: React.CSSProperties = { background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 14, padding: '12px 18px', border: '3px solid #111', borderRadius: 12, boxShadow: '4px 4px 0 #111', cursor: 'pointer', width: '100%' };

export default function AccountApp() {
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [msg, setMsg] = useState('');
  const [sub, setSub] = useState({ name: '', school: '', title: '', pitch: '', sent: false });

  useEffect(() => {
    fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }) })
      .then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  const go = async (action: string) => {
    setMsg('');
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...f }) });
    const d = await r.json();
    if (d.ok) setUser(d.user);
    else setMsg({ account_exists: 'That account already exists — log in instead.', wrong_credentials: 'Wrong email/phone or password.', password_min_6: 'Password needs at least 6 characters.', invalid_phone: 'Use a Kenyan number like 07XX… or +2547XX…', accounts_unavailable: 'Accounts are briefly unavailable — try again shortly.' }[d.error as string] || 'Failed: ' + (d.error || r.status));
  };

  const submitPitch = async () => {
    const r = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, email: user?.email }) });
    const d = await r.json();
    if (d.ok) setSub({ ...sub, sent: true });
  };

  if (user) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={card}>
          <h2 style={{ fontFamily: 'Anton', margin: '0 0 6px' }}>KARIBU, {(user.name || user.email || 'GANG MEMBER').toUpperCase()}</h2>
          <div style={{ fontSize: 13, color: '#555' }}>{user.email || user.phone} · Your details are protected under our <a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>Privacy Policy</a>.</div>
          <button style={{ ...btn, width: 'auto', marginTop: 14, background: '#111', color: '#fff' }}
            onClick={async () => { await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); setUser(null); }}>
            Log out
          </button>
        </div>
        <div style={card}>
          <h3 style={{ fontFamily: 'Anton', margin: '0 0 8px' }}>PITCH A STUDENT BLOG / NEWS STORY</h3>
          {sub.sent ? <div style={{ color: '#1F8A5B', fontWeight: 700 }}>✓ Sent to the newsroom — the crew reviews every pitch.</div> : (
            <div style={{ display: 'grid', gap: 10 }}>
              <input style={inp} placeholder="Your name" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} />
              <input style={inp} placeholder="School / campus" value={sub.school} onChange={(e) => setSub({ ...sub, school: e.target.value })} />
              <input style={inp} placeholder="Story title" value={sub.title} onChange={(e) => setSub({ ...sub, title: e.target.value })} />
              <textarea style={{ ...inp, minHeight: 110 }} placeholder="Tell us the story…" value={sub.pitch} onChange={(e) => setSub({ ...sub, pitch: e.target.value })} />
              <button style={btn} onClick={submitPitch}>SEND TO THE NEWSROOM</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'Anton', margin: '0 0 4px' }}>{mode === 'login' ? 'LOG IN' : 'JOIN THE GANG'}</h2>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>Use your email or Kenyan phone number.</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {mode === 'signup' && <input style={inp} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input style={inp} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input style={inp} placeholder="or Phone (07XX…)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input style={inp} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {msg && <div style={{ color: '#c00', fontSize: 13 }}>{msg}</div>}
        <button style={btn} onClick={() => go(mode)}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</button>
        <button style={{ background: 'none', border: 'none', color: '#E6218C', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
          {mode === 'login' ? "New here? Create an account →" : '← Already have an account? Log in'}
        </button>
        <div style={{ fontSize: 11.5, color: '#777' }}>By continuing you accept our <a href="/terms" style={{ color: '#E6218C' }}>Terms</a> and <a href="/privacy-policy" style={{ color: '#E6218C' }}>Privacy Policy</a>. We protect your data under the Kenya Data Protection Act 2019.</div>
      </div>
    </div>
  );
}
