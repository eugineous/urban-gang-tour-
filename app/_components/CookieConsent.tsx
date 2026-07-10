'use client';

import { useEffect, useState } from 'react';

// Privacy-first consent: analytics beacon only fires AFTER acceptance.
// Choice is remembered locally; "Decline" disables the counter entirely.
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem('ugt-consent');
    if (!choice) setShow(true);
    if (choice === 'yes') beacon();
  }, []);

  const beacon = () => {
    try {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: location.pathname }), keepalive: true });
    } catch { /* never block */ }
  };

  const decide = (yes: boolean) => {
    localStorage.setItem('ugt-consent', yes ? 'yes' : 'no');
    setShow(false);
    if (yes) beacon();
  };

  if (!show) return null;
  return (
    <div style={{ position: 'fixed', bottom: 14, left: 14, right: 14, zIndex: 10000, maxWidth: 560, margin: '0 auto', background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: '16px 18px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🍪 Quick one about your data</div>
      <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.5 }}>
        We use a private page-view counter (no third-party trackers) and only store the personal details you give us for bookings, orders and accounts — protected under the Kenya Data Protection Act 2019. Read the{' '}
        <a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>Privacy Policy</a>.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => decide(true)} style={{ background: '#FFD400', border: '2px solid #111', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13, boxShadow: '3px 3px 0 #111', cursor: 'pointer' }}>Accept</button>
        <button onClick={() => decide(false)} style={{ background: '#fff', border: '2px solid #111', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Decline non-essential</button>
      </div>
    </div>
  );
}
