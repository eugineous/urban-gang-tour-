'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {CONSENT_EVENT,hasConsentChoice,hasOptionalConsent, setOptionalConsent} from '@/lib/client/consent';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import styles from './PrivacyChoices.module.css';

export function CookieConsent() {
  const t=useMessages(privacyMessages);
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [cleanup, setCleanup] = useState(false);
  const resolved = useRef(false);
  const analytics=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?'Google Analytics':'';
  const advertising=process.env.NEXT_PUBLIC_ADSENSE_CLIENT?t('consent.advertising'):'';
  const optionalServices=analytics&&advertising?t('consent.serviceJoin',{analytics,advertising}):analytics||advertising;
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
  return <aside className={styles.banner} data-privacy-preferences aria-label={t('consent.label')}>
    <div><strong>{t('consent.title')}</strong><button className={styles.close} type="button" onClick={()=>setShow(false)} aria-label={t('consent.close')}>×</button></div>
    {cleanup ? <><p role="status">{t('consent.cleanup')}</p><div className={styles.actions}><button type="button" onClick={()=>location.reload()}>{t('consent.reload')}</button><button type="button" onClick={()=>setShow(false)}>{t('consent.keepBrowsing')}</button></div></> : <>
      <p>{t('consent.disclosure',{services:optionalServices?t('consent.services',{names:optionalServices}):''})}</p>
      <div className={styles.actions}><button type="button" onClick={()=>decide(false)}>{t('consent.reject')}</button><button type="button" onClick={()=>decide(true)}>{t('consent.accept')}</button></div>
      <p className={styles.links}><a href="/cookie-policy">{t('consent.cookiePolicy')}</a><a href="/privacy-policy">{t('consent.privacyPolicy')}</a><span>{t('consent.revisit')}</span></p>
    </>}
  </aside>;
}

export function PrivacyPreferencesButton() {
  const t=useMessages(privacyMessages);
  return <button type="button" className="button secondary" onClick={()=>dispatchEvent(new Event('ugt-open-cookie-settings'))}>{t('consent.settings')}</button>;
}
