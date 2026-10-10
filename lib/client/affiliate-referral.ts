export const AFFILIATE_REFERRAL_KEY = 'ugt-affiliate-referral';
export type AffiliateReferral = {code:string;termsVersion:string;capturedAt:number};
// Tab-scoped attribution only. No fingerprinting, location or contact data.
export function readAffiliateReferral(): AffiliateReferral | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(AFFILIATE_REFERRAL_KEY) || 'null');
    if (!data || !/^[a-f0-9]{24}$/.test(data.code) || typeof data.termsVersion !== 'string' || typeof data.capturedAt !== 'number' || Date.now() - data.capturedAt > 86400000 || data.capturedAt > Date.now()) return null;
    return data;
  } catch { return null; }
}
export function readReferralCode(): string | undefined { return readAffiliateReferral()?.code; }
export function clearAffiliateReferral() { try { sessionStorage.removeItem(AFFILIATE_REFERRAL_KEY); } catch {} window.dispatchEvent(new Event('ugt-referral-changed')); }
