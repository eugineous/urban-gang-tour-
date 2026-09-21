'use client';

export default function OfflineClient() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui,sans-serif', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 72 }}>🎤</div>
        <h1 style={{ fontFamily: 'Anton,sans-serif', fontSize: 48, margin: '16px 0 8px', letterSpacing: 2 }}>YOU&apos;RE OFFLINE</h1>
        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 400, lineHeight: 1.5 }}>No connection detected. Check your internet and try again — the tour waits for no one.</p>
        {/* Reload button — must be a client-side click, handled here */}
        <button onClick={() => window.location.reload()} style={{ marginTop: 28, background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 16, padding: '14px 28px', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '4px 4px 0 #E6218C' }}>TRY AGAIN</button>
      </body>
    </html>
  );
}
