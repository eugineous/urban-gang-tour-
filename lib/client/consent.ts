export const CONSENT_EVENT = 'ugt:consent-changed';
let visitChoice: boolean | undefined;
export function hasOptionalConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {const choice=localStorage.getItem('ugt-consent');if(choice==='yes'||choice==='no')return choice==='yes'} catch {}
  return visitChoice === true;
}
export function setOptionalConsent(accepted: boolean): void {
  visitChoice = accepted;
  try {localStorage.setItem('ugt-consent', accepted ? 'yes' : 'no')} catch {}
  const measurement = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const target = window as unknown as Record<string, any>;
  if (measurement) target['ga-disable-' + measurement] = !accepted;
  target.gtag?.('consent', 'update', {analytics_storage:accepted?'granted':'denied',ad_storage:accepted?'granted':'denied',ad_user_data:accepted?'granted':'denied',ad_personalization:accepted?'granted':'denied'});
  if (target.adsbygoogle) target.adsbygoogle.pauseAdRequests = accepted ? 0 : 1;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
