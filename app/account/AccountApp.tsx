'use client';

import { useEffect, useRef, useState } from 'react';

const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 22 };
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '2px solid #111', borderRadius: 10, fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' };
const btn: React.CSSProperties = { background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 14, padding: '12px 18px', border: '3px solid #111', borderRadius: 12, boxShadow: '4px 4px 0 #111', cursor: 'pointer', width: '100%' };

export default function AccountApp() {
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [probe, setProbe] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [sub, setSub] = useState({ name: '', school: '', title: '', pitch: '', sent: false });

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setSessionError(false);
    fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }), signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error('session_unavailable'); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) setUser(d.user || null); })
      .catch(() => { if (!controller.signal.aborted) setSessionError(true); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [probe]);

  const go = async (action: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'logout' ? { action } : { action, ...f }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(action === 'logout' ? null : d.user);
        setF({ name: '', email: '', phone: '', password: '' });
        if (action === 'logout') setSub({ name: '', school: '', title: '', pitch: '', sent: false });
      } else setMsg(({ account_exists: 'Unable to create this account. Try logging in or contact us for help.', wrong_credentials: 'Check your email or phone and password, then try again.', password_min_6: 'Use a password with 6 to 100 characters.', invalid_email: 'Enter a valid email address.', need_email_or_phone: 'Enter your email or Kenyan phone number.', too_many_requests: 'Too many attempts. Wait a minute, then try again.', invalid_phone: 'Use a Kenyan number like 07XX… or +2547XX…', accounts_unavailable: 'Accounts are briefly unavailable. Try again shortly.' } as Record<string, string>)[d.error] || 'We could not complete that request. Please try again.');
    } catch { setMsg('Check your connection and try again. Your details have been kept.'); }
    finally { pending.current = false; setBusy(false); }
  };

  const submitPitch = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMsg('');
    try {
      const { name, school, title, pitch } = sub;
      const r = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, school, title, pitch }) });
      const d = await r.json();
      if (r.ok && d.ok) setSub({ ...sub, sent: true });
      else if (r.status === 401) { setUser(null); setMsg('Your session has ended. Log in again to send your story.'); }
      else setMsg(r.status === 429 ? 'Please wait a minute before sending again.' : 'Your story was not sent. Check the required name and title, then try again.');
    } catch { setMsg('Your story was not sent. Check your connection and try again.'); }
    finally { pending.current = false; setBusy(false); }
  };

  if (checking) return <div style={card} role="status">Checking your account…</div>;
  if (sessionError) return <div style={card}><p role="alert">We could not check your account. Check your connection and try again.</p><button style={btn} onClick={() => setProbe(probe + 1)}>Try again</button><p><a href="/">Back to the tour</a></p></div>;

  if (user) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={card}>
          <h2 style={{ fontFamily: 'Anton', margin: '0 0 6px' }}>KARIBU, {(user.name || user.email || 'GANG MEMBER').toUpperCase()}</h2>
          <div style={{ fontSize: 13, color: '#555' }}>{user.email || user.phone} · Your details are protected under our <a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>Privacy Policy</a>.</div>
          <button style={{ ...btn, width: 'auto', marginTop: 14, background: '#111', color: '#fff' }}
            disabled={busy} onClick={() => go('logout')}>
            {busy ? 'Please wait…' : 'Log out'}
          </button>
        </div>
        {msg && <p role="alert" style={{ ...card, color: '#a00' }}>{msg}</p>}
        <div style={card}>
          <h3 style={{ fontFamily: 'Anton', margin: '0 0 8px' }}>PITCH A STUDENT BLOG / NEWS STORY</h3>
          {sub.sent ? <div style={{ color: '#1F8A5B', fontWeight: 700 }}>✓ Sent to the newsroom — the crew reviews every pitch.</div> : (
            <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void submitPitch(); }}>
              <label>Your name<input style={inp} required maxLength={100} autoComplete="name" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} /></label>
              <label>School / campus<input style={inp} maxLength={150} value={sub.school} onChange={(e) => setSub({ ...sub, school: e.target.value })} /></label>
              <label>Story title<input style={inp} required maxLength={150} value={sub.title} onChange={(e) => setSub({ ...sub, title: e.target.value })} /></label>
              <label>Your story<textarea style={{ ...inp, minHeight: 110 }} maxLength={2000} value={sub.pitch} onChange={(e) => setSub({ ...sub, pitch: e.target.value })} /></label>
              <button style={btn} disabled={busy}>{busy ? 'Sending…' : 'SEND TO THE NEWSROOM'}</button>
            </form>
          )}
        </div>
        <div style={card}><h3 style={{ fontFamily: 'Anton' }}>YOUR DATA</h3><p>To request a copy or deletion of your personal data, <a href="mailto:admin@urbangangtour.co.ke?subject=Account%20data%20request">email our team</a>. We respond within 30 days. Opening your email app does not submit a request.</p><a href="/privacy-policy">Your privacy rights</a> · <a href="/">Back to the tour</a></div>
      </div>
    );
  }

  return (
    <div style={{ ...card, maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'Anton', margin: '0 0 4px' }}>{mode === 'login' ? 'LOG IN' : 'JOIN THE GANG'}</h2>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 14 }}>Use your email or Kenyan phone number.</div>
      <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void go(mode); }}>
        {mode === 'signup' && <label>Name<input style={inp} maxLength={100} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>}
        <label>Email<input style={inp} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Or Kenyan phone number<input style={inp} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label>Password<input style={inp} type="password" required minLength={6} maxLength={100} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {msg && <div role="alert" style={{ color: '#a00', fontSize: 14 }}>{msg}</div>}
        <button style={btn} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</button>
        <button type="button" disabled={busy} style={{ background: 'none', border: 'none', color: '#9a145d', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
          {mode === 'login' ? "New here? Create an account →" : '← Already have an account? Log in'}
        </button>
        <a href="mailto:admin@urbangangtour.co.ke?subject=Account%20access%20help">Need help accessing your account?</a>
        <a href="/">Back to the tour</a>
        <div style={{ fontSize: 11.5, color: '#777' }}>By continuing you accept our <a href="/terms" style={{ color: '#E6218C' }}>Terms</a> and <a href="/privacy-policy" style={{ color: '#E6218C' }}>Privacy Policy</a>. We protect your data under the Kenya Data Protection Act 2019.</div>
      </form>
    </div>
  );
}
