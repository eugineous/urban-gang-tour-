import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';

describe('optional reporting consent',()=>{
 let values:Map<string,string>;
 let browser:Record<string,any>;
 beforeEach(()=>{
  vi.resetModules();values=new Map();browser={dispatchEvent:vi.fn(),gtag:vi.fn(),adsbygoogle:[]};
  vi.stubGlobal('window',browser);
  vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)});
 });
 afterEach(()=>vi.unstubAllGlobals());
 it('does not queue optional events before a decision or after a refusal',async()=>{
  const analytics=await import('@/lib/analytics');
  analytics.eventShare('example','whatsapp');expect(browser.dataLayer).toBeUndefined();
  values.set('ugt-consent','no');analytics.viewItem('example','Example');expect(browser.dataLayer).toBeUndefined();
 });
 it('starts only after acceptance and immediately stops future events on revocation',async()=>{
  const consent=await import('@/lib/client/consent');const analytics=await import('@/lib/analytics');
  consent.setOptionalConsent(true);analytics.eventShare('example','whatsapp');expect(browser.dataLayer).toHaveLength(1);
  consent.setOptionalConsent(false);analytics.eventShare('example','whatsapp');expect(browser.dataLayer).toHaveLength(1);
  expect(values.get('ugt-consent')).toBe('no');expect(browser.adsbygoogle.pauseAdRequests).toBe(1);
  expect(browser.gtag).toHaveBeenLastCalledWith('consent','update',expect.objectContaining({analytics_storage:'denied',ad_storage:'denied'}));
  expect(browser.dispatchEvent).toHaveBeenCalledTimes(2);
 });
 it('honours a refusal saved by another tab',async()=>{
  const consent=await import('@/lib/client/consent');consent.setOptionalConsent(true);
  values.set('ugt-consent','no');expect(consent.hasOptionalConsent()).toBe(false);
 });
 it('keeps a visit-only choice when browser storage is unavailable',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}});
  const consent=await import('@/lib/client/consent');expect(consent.hasOptionalConsent()).toBe(false);
  consent.setOptionalConsent(true);expect(consent.hasOptionalConsent()).toBe(true);
  consent.setOptionalConsent(false);expect(consent.hasOptionalConsent()).toBe(false);
 });
 it('is safe during server rendering',async()=>{
  vi.stubGlobal('window',undefined);const consent=await import('@/lib/client/consent');expect(consent.hasOptionalConsent()).toBe(false);
 });
});
