'use client';

import { useEffect, useRef } from 'react';
import { useConsent } from './Ads';
import {usePathname} from 'next/navigation';
import {hasOptionalConsent} from '@/lib/client/consent';

// Real Google Analytics (GA4). Same two-gate pattern as AdSenseLoader:
//   1. NEXT_PUBLIC_GA_MEASUREMENT_ID must be set (the owner's real
//      Measurement ID) - unset means nothing here does anything.
//   2. The visitor accepted cookies. This is a genuine third-party tracker,
//      so it must respect the same consent gate as AdSense, or the site's
//      cookie banner ("no third-party trackers" / disclose which ones)
//      stops being true. See CookieConsent.tsx.
const ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export function GoogleAnalytics() {
  const consent = useConsent();
  const injected = useRef(false);
  const pathname=usePathname();

  useEffect(() => {
    const allowed = consent && hasOptionalConsent() && !/^\/(verify|t|tickets|receipt|admin|organizer|account|checkout|cart|pay|orders)(\/|$)/.test(pathname||'');
    if (ID) (window as any)['ga-disable-' + ID] = !allowed;
    (window as any).gtag?.('consent','update',{analytics_storage:allowed?'granted':'denied'});
    if (!allowed) return;
    if (!ID || !consent || injected.current) return;
    if (document.getElementById('ugt-ga4')) { injected.current = true; return; }
    injected.current = true;

    const s = document.createElement('script');
    s.id = 'ugt-ga4';
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
    document.head.appendChild(s);

    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    function gtag(...args: unknown[]) { w.dataLayer.push(args); }
    w.gtag = w.gtag || gtag;
    w.gtag('js', new Date());
    w.gtag('config', ID);
  }, [consent,pathname]);

  return null;
}
