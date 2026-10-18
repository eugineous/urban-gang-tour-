'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {CONSENT_EVENT,hasConsentChoice,hasOptionalConsent, setOptionalConsent} from '@/lib/client/consent';
import styles from './PrivacyChoices.module.css';

export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [cleanup, setCleanup] = useState(false);
  const [details,setDetails]=useState(false);
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
    <div><strong>Your privacy. Your choice.</strong><button className={styles.close} type="button" onClick={()=>setShow(false)} aria-label="Close privacy preferences">×</button></div>
    {cleanup ? <><p role="status">Your choice is saved. Optional reporting is disabled and new ad requests are paused. Reload to clear services that had already loaded in this page.</p><div className={styles.actions}><button type="button" onClick={()=>location.reload()}>Reload now</button><button type="button" onClick={()=>setShow(false)}>Keep browsing</button></div></> : <>
      <p>Necessary storage keeps accounts, your cart and security working. Optional usage and performance reporting starts only if you accept.{optionalServices && <> This also enables {optionalServices}.</>} If you’re under 18, choose necessary only.</p>
      <div className={styles.actions}><button type="button" onClick={()=>decide(false)}>Reject optional</button><button type="button" onClick={()=>decide(true)}>Accept optional</button><button type="button" aria-expanded={details} aria-controls="privacy-storage-details" onClick={()=>setDetails(value=>!value)}>Preferences</button></div>
      {details&&<div id="privacy-storage-details"><p><strong>Always necessary:</strong> sign-in, security, cart and saved drafts. These keep the site working.</p><p><strong>Optional:</strong> usage and performance reporting{optionalServices?`, ${optionalServices}`:''}. Off until you accept. Rejecting optional storage does not stop you shopping or sending an enquiry.</p></div>}
      <p className={styles.links}><a href="/cookie-policy">Cookie policy</a><a href="/privacy-policy">Privacy policy</a><span>You can revisit this choice in the footer.</span></p>
    </>}
  </aside>;
}

export function PrivacyPreferencesButton() {
  return <button type="button" className="button secondary" onClick={()=>dispatchEvent(new Event('ugt-open-cookie-settings'))}>Review privacy preferences</button>;
}
