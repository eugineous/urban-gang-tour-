'use client';
import {GoogleSignIn} from '@/app/_components/GoogleSignIn';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';

import { useEffect, useRef, useState } from 'react';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ddd4da', borderRadius: 16, boxShadow: 'none', padding: 'clamp(18px, 5vw, 28px)' };
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid #b9acb3', borderRadius: 10, fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' };
const btn: React.CSSProperties = { background: '#9a145d', color: '#fff', fontWeight: 600, fontSize: 16, minHeight: 48, padding: '12px 18px', border: '1px solid #ddd4da', borderRadius: 12, boxShadow: 'none', cursor: 'pointer', width: '100%' };

export default function AccountApp() {
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [wallet, setWallet] = useState<any>(null);
  const [walletError, setWalletError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('reset');
    if (token) {
      // Keep a reset credential out of subsequent navigation/referrer URLs.
      window.history.replaceState(null, '', '/account');
      if (/^[A-Za-z0-9_-]{43}$/.test(token)) { setResetToken(token); setMode('reset'); }
      else setMsg('This reset link is invalid. Request a new password reset.');
    }
  }, []);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [eligible, setEligible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [probe, setProbe] = useState(0);
  useEffect(() => {
    setWallet(null); setWalletError('');
    if (!user) return;
    const controller = new AbortController();
    fetchWithTimeout('/api/account', {signal:controller.signal}).then(async r => {
      if (r.status===401) {
        if (!controller.signal.aborted) { setUser(null); setMsg('Your session has ended. Sign in again to view your purchases.'); }
        return null;
      }
      if (!r.ok) throw new Error();
      const data=await r.json();
      if (!Array.isArray(data.orders) || !Array.isArray(data.tickets) || !Array.isArray(data.requests)) throw new Error();
      return data;
    }).then(data => { if (data && !controller.signal.aborted) setWallet(data); })
      .catch(() => { if (!controller.signal.aborted) setWalletError('Your purchases could not load. Please try again.'); });
    return () => controller.abort();
  }, [user, probe]);

  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [sub, setSub] = useState({ name: '', school: '', title: '', pitch: '', sent: false });

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setSessionError(false);
    fetchWithTimeout('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }), signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error('session_unavailable'); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) setUser(d.user || null); })
      .catch(() => { if (!controller.signal.aborted) setSessionError(true); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [probe]);

  const go = async (action: string) => {
    if (pending.current) return;
    if (action === 'forgot' || action === 'reset') {
      pending.current = true; setBusy(true); setMsg('');
      try { const r = await fetchWithTimeout('/api/account/recovery', {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(action === 'forgot' ? {action,email:f.email} : {action,token:resetToken,password:f.password})}); const d = await r.json(); if (!r.ok) { setMsg(d.error === 'email_delivery_unavailable' ? 'Password emails are unavailable. Contact our team for account help.' : d.error === 'invalid_or_expired_token' ? 'This reset link has expired or was already used. Request another.' : 'We could not complete this request. Check your details and try again.'); } else if (action === 'reset') { setUser(null); setMode('login'); setF({...f,password:''}); setMsg('Password updated. Sign in with your new password.'); window.history.replaceState(null,'','/account'); } else setMsg(d.message); } catch { setMsg('Check your connection and try again.'); } finally { pending.current=false; setBusy(false); } return;
    }
    if (action === 'signup' && (!eligible || !termsAccepted)) { setMsg('Confirm you are 18 or older and accept the terms to create an account.'); return; }
    pending.current = true;
    setBusy(true);
    setMsg('');
    try {
      const r = await fetchWithTimeout('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'logout' ? { action } : { action, ...f, ...(action === 'signup' ? { adultConfirmed: eligible, termsAccepted } : {}) }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        setUser(action === 'logout' ? null : d.user);
        setF({ name: '', email: '', phone: '', password: '' });
        if (action === 'logout') setSub({ name: '', school: '', title: '', pitch: '', sent: false });
      } else setMsg(({ account_exists: 'Unable to create this account. Try logging in or contact us for help.', wrong_credentials: 'Check your email or phone and password, then try again.', password_min_6: 'Use a password with 6 to 100 characters.', invalid_email: 'Enter a valid email address.', need_email_or_phone: 'Enter your email or Kenyan phone number.', too_many_requests: 'Too many attempts. Wait a minute, then try again.', invalid_phone: 'Use a Kenyan number like 07XX… or +2547XX…', age_confirmation_required: 'Accounts are for adults aged 18 and over. Ask a parent or guardian to manage purchases.', terms_required: 'Accept the terms to create an account.', accounts_unavailable: 'Accounts are briefly unavailable. Try again shortly.' } as Record<string, string>)[d.error] || 'We could not complete that request. Please try again.');
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
      const r = await fetchWithTimeout('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, school, title, pitch }) });
      const d = await r.json();
      if (r.ok && d.ok) setSub({ ...sub, sent: true });
      else if (r.status === 401) { setUser(null); setMsg('Your session has ended. Log in again to send your story.'); }
      else setMsg(r.status === 429 ? 'Please wait a minute before sending again.' : 'Your story was not sent. Check the required name and title, then try again.');
    } catch { setMsg('Your story was not sent. Check your connection and try again.'); }
    finally { pending.current = false; setBusy(false); }
  };

  if (checking) return <div style={card} role="status">Checking your account…</div>;
  if (sessionError) return <div style={card}><p role="alert">We could not check your account. Check your connection and try again.</p><button style={btn} onClick={() => setProbe(probe + 1)}>Try again</button><p><a href="/">Back to the tour</a></p></div>;

  if (user && mode !== 'reset') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={card}>
          <h2 style={{ fontFamily: 'inherit', margin: '0 0 6px' }}>KARIBU, {(user.name || user.email || 'GANG MEMBER').toUpperCase()}</h2>
          <div style={{ fontSize: 15, color: '#555' }}>{user.email || user.phone} · Your details are protected under our <a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>Privacy Policy</a>.</div>
          <button style={{ ...btn, width: 'auto', marginTop: 14, background: '#111', color: '#fff' }}
            disabled={busy} onClick={() => go('logout')}>
            {busy ? 'Please wait…' : 'Log out'}
          </button>
        </div>
        {msg && <p role="alert" style={{ ...card, color: '#a00' }}>{msg}</p>}
        <div style={card}><h2>My orders &amp; tickets</h2><p>Purchases made while signed in appear here. Guest purchases remain in their original confirmation email.</p>{walletError && <p role="alert">{walletError} <button type="button" onClick={()=>{setWalletError('');setProbe(probe+1)}}>Retry</button></p>}{!wallet && !walletError && <p role="status">Loading your purchases…</p>}{wallet && wallet.orders.length===0 && <p>No account purchases yet. <a href="/events">Find an event</a> or <a href="/shop">visit the shop</a>.</p>}{wallet?.orders.map((order:any)=><article key={order.id} style={{borderTop:'1px solid #ddd',padding:'16px 0'}}><h3 style={{overflowWrap:'anywhere'}}>{order.id}</h3><p>{String(order.status).replace(/_/g,' ')} · KSh {Number(order.total).toLocaleString()}</p><p>{new Date(order.created_at).toLocaleDateString()}</p>{['paid','fulfilled'].includes(order.status) && <span><a href={`/receipt/${encodeURIComponent(order.id)}`}>View receipt</a> · <a href={`/orders/track?ref=${encodeURIComponent(order.id)}`}>Track order</a></span>}{wallet.tickets.filter((t:any)=>t.order_id===order.id).map((t:any)=><p key={t.code}><a href={`/api/tickets/${encodeURIComponent(t.code)}/pdf`}>Download {t.tier_name} ticket</a> · {t.used_at?'Scanned at gate':'Not yet scanned'}</p>)}</article>)}</div>
        <div style={card}>
          <h3 style={{ fontFamily: 'inherit', margin: '0 0 8px' }}>Share a story with Urban News</h3>
          {sub.sent ? <div style={{ color: '#1F8A5B', fontWeight: 700 }}>✓ Sent to the newsroom — the crew reviews every pitch.</div> : (
            <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void submitPitch(); }}>
              <label>Your name<input style={inp} required maxLength={100} autoComplete="name" value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} /></label>
              <label>School / campus<input style={inp} maxLength={150} value={sub.school} onChange={(e) => setSub({ ...sub, school: e.target.value })} /></label>
              <label>Story title<input style={inp} required maxLength={150} value={sub.title} onChange={(e) => setSub({ ...sub, title: e.target.value })} /></label>
              <label>Your story<textarea style={{ ...inp, minHeight: 110 }} maxLength={2000} value={sub.pitch} onChange={(e) => setSub({ ...sub, pitch: e.target.value })} /></label>
              <button style={btn} disabled={busy}>{busy ? 'Sending…' : 'Send to the newsroom'}</button>
            </form>
          )}
        </div>
        <div style={card}><h2>Your data</h2><p><a href="/account/preferences">Notification preferences</a></p><p><a href="/api/account?download=1">Export profile and linked purchases</a></p><p>Request account deletion. The team reviews the request and retains financial records where legally required.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMsg('');try{const r=await fetchWithTimeout('/api/account/privacy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation:deleteConfirmation})});const d=await r.json();if(!r.ok)throw new Error();setMsg(`Deletion request received. Reference: ${d.request.id}`);setProbe(probe+1);setDeleteConfirmation('');}catch{setMsg('Your request could not be saved. Please try again.');}finally{setBusy(false);}}}><label>Type DELETE MY ACCOUNT to confirm<input style={inp} value={deleteConfirmation} onChange={e=>setDeleteConfirmation(e.target.value)} required /></label><button style={{...btn,marginTop:12}} disabled={busy||deleteConfirmation!=='DELETE MY ACCOUNT'}>Request deletion</button></form>{wallet?.requests.map((r:any)=><p key={r.id}>Request {r.id}: {r.status}</p>)}<p><a href="/privacy-policy">Your privacy rights</a> · <a href="/">Back to the tour</a></p></div>
      </div>
    );
  }

  return (
    <div style={{ ...card, maxWidth: 440, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'inherit', margin: '0 0 4px' }}>{mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Create your account'}</h2>
      {mode==='login'&&<GoogleSignIn endpoint="/api/auth/google" onSuccess={d=>{setUser(d.user);setMsg('')}}/>}
      <div style={{ fontSize: 15, color: '#555', marginBottom: 14 }}>{mode === 'forgot' ? 'Enter the email used for your account.' : mode === 'reset' ? 'Use at least 8 characters. All other devices will be signed out.' : 'Use your email or Kenyan phone number.'}</div>
      <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void go(mode); }}>
        {mode === 'signup' && <label>Name<input style={inp} maxLength={100} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>}
        {mode !== 'reset' && <label>Email<input style={inp} type="email" required={mode==='forgot'} maxLength={254} autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>}
        {(mode === 'login' || mode === 'signup') && <label>Or Kenyan phone number<input style={inp} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>}
        {mode !== 'forgot' && <label>Password<input style={inp} type="password" required minLength={mode === 'reset' ? 8 : 6} maxLength={100} autoComplete={mode !== 'login' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>}
        {mode === 'signup' && <><p style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.5 }}>Accounts are for adults aged 18 and over. Under 18? Ask a parent or guardian to manage bookings and purchases. You can explore the tour without an account.</p><label className="ugt-account-consent"><input type="checkbox" required checked={eligible} onChange={e => setEligible(e.target.checked)} />I am 18 or older.</label><label className="ugt-account-consent"><input type="checkbox" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} /><span>I accept the <a href="/terms">Terms</a> and have read the <a href="/privacy-policy">Privacy Policy</a>.</span></label></>}
        {msg && <div role="alert" style={{ color: '#a00', fontSize: 14 }}>{msg}</div>}
        <button style={btn} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Save new password' : 'Create account'}</button>
        <button type="button" disabled={busy} style={{ background: 'none', border: 'none', color: '#9a145d', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>
          {mode === 'login' ? "New here? Create an account →" : '← Already have an account? Log in'}
        </button>
        {mode === 'login' && <button type="button" style={{...btn,background:'#fff',color:'#9a145d'}} onClick={()=>{setMode('forgot');setMsg('')}}>Forgot password?</button>}
        <a href="mailto:admin@urbangangtour.co.ke?subject=Account%20access%20help">Need help accessing your account?</a>
        <a href="/">Back to the tour</a>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}>By continuing you accept our <a href="/terms" style={{ color: '#E6218C' }}>Terms</a> and <a href="/privacy-policy" style={{ color: '#E6218C' }}>Privacy Policy</a>. We protect your data under the Kenya Data Protection Act 2019.</div>
      </form>
    </div>
  );
}
