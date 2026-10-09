'use client';

export default function OfflineClient() {
  return (
    <section style={{ margin: 0, fontFamily: 'system-ui,sans-serif', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '0 24px' }}>
        <img src="/assets/ugt-logo-v2.png" alt="Urban Gang Tour" width="120" height="80" style={{objectFit:"contain"}}/>
        <h1 style={{ fontFamily: 'Anton,sans-serif', fontSize: 48, margin: '16px 0 8px', letterSpacing: 2 }}>CONNECTION INTERRUPTED</h1>
        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 400, lineHeight: 1.5 }}>Check your internet connection, then try again. Your payment status still needs server confirmation.</p>
        {/* Reload button — must be a client-side click, handled here */}
        <button onClick={() => window.location.pathname === '/offline' ? window.location.assign('/') : window.location.reload()} style={{ marginTop: 28, background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 16, padding: '14px 28px', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '4px 4px 0 #E6218C' }}>TRY AGAIN</button>
    </section>
  );
}
