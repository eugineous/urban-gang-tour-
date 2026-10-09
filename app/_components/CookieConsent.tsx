'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Privacy-first consent: analytics beacon only fires AFTER acceptance.
// Choice is remembered locally; "Decline" disables the counter entirely.
export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let choice: string | null = null;
    try { choice = localStorage.getItem('ugt-consent'); } catch { /* storage can be unavailable */ }
    if (choice === 'yes') beacon();
    if (choice) return;
    // Keep the first screen usable. Optional tracking remains off while the
    // visitor reads; show the non-blocking choice after they begin scrolling.
    const reveal = () => { if (window.scrollY > 120) setShow(true); };
    window.addEventListener('scroll', reveal, { passive: true });
    reveal();
    return () => window.removeEventListener('scroll', reveal);
  }, []);

  useEffect(() => { const open = () => setShow(true); window.addEventListener('ugt-open-cookie-settings', open); return () => window.removeEventListener('ugt-open-cookie-settings', open); }, []);

  const beacon = () => {
    try {
      void fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: location.pathname }), keepalive: true }).catch(() => {});
    } catch { /* never block */ }
  };

  const decide = (yes: boolean) => {
    try { localStorage.setItem('ugt-consent', yes ? 'yes' : 'no'); } catch { /* choice still applies to this visit */ }
    setShow(false);
    if (yes) beacon();
    // Let consent-gated features (AdSense loader, ad slots) react instantly
    // without a page reload. Decline keeps every third-party script off.
    try { window.dispatchEvent(new Event('ugt:consent-changed')); } catch { /* no-op */ }
  };

  // Whether AdSense / Google Analytics are configured decides how honest the
  // banner must be about third-party cookies (they only ever load after Accept).
  const adsEnabled = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
  const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const thirdParty = [adsEnabled && 'ads via Google', gaEnabled && 'Google Analytics'].filter(Boolean).join(' and ');

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/checkout') || pathname?.startsWith('/pay/') || !show) return null;
  return (
    <div className="ugt-cookie-consent" role="region" aria-label="Privacy preferences" style={{ position: 'fixed', bottom: 14, left: 14, right: 14, zIndex: 10000, maxWidth: 560, margin: '0 auto', background: '#fff', border: '1px solid #ddd', borderRadius: 16, boxShadow: 'none', padding: '16px 18px', fontFamily: 'inherit' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Your privacy choices</div>
      <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.5 }}>
        Optional page-view analytics stay off until you accept.{' '}
        {thirdParty
          ? `If you Accept, we also use ${thirdParty}, which set their own cookies. Decline and none of it loads.`
          : 'No third-party trackers.'}{' '}
        Read how we handle your details in the{' '}
        <a href="/privacy-policy" style={{ color: '#E6218C', fontWeight: 700 }}>Privacy Policy</a>.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => decide(true)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '9px 16px', fontWeight: 800, fontSize: 13, boxShadow: 'none', cursor: 'pointer' }}>Accept</button>
        <button onClick={() => decide(false)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Decline non-essential</button>
      </div>
    </div>
  );
}
