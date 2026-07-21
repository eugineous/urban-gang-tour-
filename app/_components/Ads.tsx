'use client';

import { useEffect, useRef, useState } from 'react';

// Google AdSense, consent-gated and fully dormant until configured.
//
// Two gates must BOTH be true before any Google ad script loads:
//   1. NEXT_PUBLIC_ADSENSE_CLIENT is set (the ca-pub-XXXX publisher id, which
//      only exists after the owner creates and is approved for an AdSense
//      account). Unset = nothing here does anything.
//   2. The visitor accepted cookies (localStorage 'ugt-consent' === 'yes').
//      This keeps the site's "no third-party trackers unless you consent"
//      promise honest and satisfies the Kenya Data Protection Act 2019.
//
// The loader also drives AdSense Auto Ads, so Google can place ads across the
// whole site (including the v25 SPA pages like /gallery and /urban-news that
// are not React-owned) with no manual slot markup on those pages.

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
const CONSENT_EVENT = 'ugt:consent-changed';

function hasConsent(): boolean {
  try {
    return localStorage.getItem('ugt-consent') === 'yes';
  } catch {
    return false;
  }
}

// Reactively track cookie consent: reads it on mount, and re-checks when the
// consent banner dispatches CONSENT_EVENT, so ads (and any other consent-
// gated script, e.g. GoogleAnalytics.tsx) switch on the instant a visitor
// clicks Accept without needing a page reload.
export function useConsent(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const sync = () => setOk(hasConsent());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync); // consent changed in another tab
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return ok;
}

// Site-wide loader: injects the AdSense script exactly once, only when both
// gates pass. Mount this once in the root layout.
export function AdSenseLoader() {
  const consent = useConsent();
  const injected = useRef(false);

  useEffect(() => {
    if (!CLIENT || !consent || injected.current) return;
    if (document.getElementById('ugt-adsense')) { injected.current = true; return; }
    injected.current = true;
    const s = document.createElement('script');
    s.id = 'ugt-adsense';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`;
    document.head.appendChild(s);
  }, [consent]);

  return null;
}

// A single responsive ad unit. Renders nothing unless AdSense is configured,
// consent is given, AND a slot id is supplied (create ad units in the AdSense
// dashboard, then set their slot ids in env - see the slot props below). Safe
// to place anywhere in React-owned pages; it simply stays invisible until the
// account is live.
export function AdSlot({ slot, label = true, style }: { slot?: string; label?: boolean; style?: React.CSSProperties }) {
  const consent = useConsent();
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slot || !consent || pushed.current) return;
    try {
      // AdSense reads the <ins> we rendered and fills it.
      // @ts-expect-error adsbygoogle is injected by the loader script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* loader not ready yet; a later render will retry */ }
  }, [consent, slot]);

  if (!CLIENT || !slot) return null; // dormant: nothing rendered pre-launch

  return (
    <div style={{ margin: '24px 0', textAlign: 'center', ...style }}>
      {label && (
        <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>
          Advertisement
        </div>
      )}
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Convenience slots reading their ids from env, so placements across the app
// stay dormant until each unit is created in the AdSense dashboard and its id
// is pasted into Vercel. Missing env id = the slot renders nothing.
export function ArticleAd() {
  return <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE} />;
}
export function FeedAd() {
  return <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED} />;
}
