import {campaignsAllowedOn} from '@/lib/marketing-campaigns';

export const CONSENT_EVENT = 'ugt:consent-changed';
let visitChoice: boolean | undefined;
export function hasConsentChoice():boolean{
 if(typeof window==='undefined')return false;
 try{const value=localStorage.getItem('ugt-consent');if(value==='yes'||value==='no')return true}catch{}
 return visitChoice!==undefined;
}
export function hasOptionalConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {const choice=localStorage.getItem('ugt-consent');if(choice==='yes'||choice==='no')return choice==='yes'} catch {}
  return visitChoice === true;
}
/** A saved choice never permits reporting from private workflows. */
export function optionalReportingAllowedOn(path: string | null): boolean {
  return typeof path === 'string' && !/^\/(api|admin|organizer|account|search|my-tickets|cart|checkout|pay|receipt|receipts|tickets|t|verify|orders|book\/status)(\/|$)/.test(path);
}
export function hasOptionalReportingConsent(path: string | null = typeof location === 'undefined' ? null : location.pathname): boolean {
  return hasOptionalConsent() && optionalReportingAllowedOn(path);
}
/** Apply effective permissions without changing the visitor's saved choice. */
export function syncOptionalConsentServices(path: string | null): void {
  if (typeof window === 'undefined') return;
  const accepted = hasOptionalConsent();
  const reporting = accepted && optionalReportingAllowedOn(path);
  const advertising = reporting && typeof path === 'string' && campaignsAllowedOn(path);
  const measurement = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const target = window as unknown as Record<string, any>;
  if (measurement) target['ga-disable-' + measurement] = !reporting;
  target.gtag?.('consent', 'update', {analytics_storage:reporting?'granted':'denied',ad_storage:advertising?'granted':'denied',ad_user_data:advertising?'granted':'denied',ad_personalization:advertising?'granted':'denied'});
  if (target.adsbygoogle) target.adsbygoogle.pauseAdRequests = advertising ? 0 : 1;
}
export function setOptionalConsent(accepted: boolean): void {
  visitChoice = accepted;
  try {localStorage.setItem('ugt-consent', accepted ? 'yes' : 'no')} catch {}
  syncOptionalConsentServices(typeof location === 'undefined' ? null : location.pathname);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
