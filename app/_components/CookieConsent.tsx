'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {CONSENT_EVENT,hasConsentChoice,hasOptionalConsent, setOptionalConsent} from '@/lib/client/consent';
import styles from './PrivacyChoices.module.css';

export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [cleanup, setCleanup] = useState(false);
  const resolved = useRef(false);
  const optionalServices = [process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && 'Google Analytics', process.env.NEXT_PUBLIC_ADSENSE_CLIENT && 'Google advertising'].filter(Boolean).join(' and ');
  function pageView() {
    if (!hasOptionalConsent() || /^\/(admin|organizer|account|cart|checkout|pay|receipt|tickets|t|verify|orders|book\/status)(\/|$)/.test(location.pathname)) return;
    void fetch('/api/track', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:location.pathname}),keepalive:true}).catch(()=>{});
  }
  useEffect(() => {
    pageView();
    resolved.current=hasConsentChoice();
    setShow(!resolved.current);
  }, [pathname]);
  useEffect(()=>{const sync=()=>{resolved.current=hasConsentChoice();if(resolved.current)setShow(false)};addEventListener(CONSENT_EVENT,sync);addEventListener('storage',sync);return()=>{removeEventListener(CONSENT_EVENT,sync);removeEventListener('storage',sync)}},[]);
  useEffect(() => {const open = () => {setShow(true);setCleanup(false)}; addEventListener('ugt-open-cookie-settings',open); return () => removeEventListener('ugt-open-cookie-settings',open)}, []);
  function decide(accepted: boolean) {
    resolved.current = true;
    const loaded = Boolean(document.getElementById('ugt-ga4') || document.getElementById('ugt-adsense'));
    setOptionalConsent(accepted);
    if (accepted) pageView();
    setCleanup(!accepted && loaded);
    setShow(!accepted && loaded);
  }
  if (!show || pathname?.startsWith('/admin') || /^\/(checkout|pay)(\/|$)/.test(pathname || '')) return null;
  return <aside className={styles.banner} aria-label="Privacy preferences">
    <div><strong>Cookies</strong><button className={styles.close} type="button" onClick={()=>setShow(false)} aria-label="Close privacy preferences">×</button></div>
    {cleanup ? <><p role="status">Your choice is saved. Optional reporting and ads are disabled. Reload to clear services already loaded.</p><div className={styles.actions}><button type="button" onClick={()=>location.reload()}>Reload now</button><button type="button" onClick={()=>setShow(false)}>Keep browsing</button></div></> : <>
      <p>Necessary cookies keep the site working. Optional reporting{optionalServices&&<> ({optionalServices})</>} stays off until you accept. If you’re under 18, choose Reject.</p>
      <div className={styles.actions}><button type="button" onClick={()=>decide(false)}>Reject</button><button type="button" onClick={()=>decide(true)}>Accept</button></div>
      <p className={styles.links}><a href="/cookie-policy">Cookie policy</a><a href="/privacy-policy">Privacy policy</a><span>You can revisit this choice in the footer.</span></p>
    </>}
  </aside>;
}

export function PrivacyPreferencesButton() {
  return <button type="button" className="button secondary" onClick={()=>dispatchEvent(new Event('ugt-open-cookie-settings'))}>Cookie settings</button>;
}
