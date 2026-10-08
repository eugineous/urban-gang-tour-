import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error Worker integration is plain ESM.
import {publicDesignResponse} from '../lib/cloudflare/public-design.mjs';
const routes=['/','/about','/events','/contact-us'];
describe('public design deployment boundary',()=>{
 it.each(['/api/orders','/api/auth','/admin','/account','/shop','/book','/organizer/dashboard','/tickets/abc','/receipt/abc','/blog/a'])('preserves live services at %s',async path=>{
  const fetch=vi.fn();expect(await publicDesignResponse(new Request('https://urbangangtour.co.ke'+path),{ASSETS:{fetch}},routes)).toBeNull();expect(fetch).not.toHaveBeenCalled();
 });
 it('preserves the established ticket checkout deep link',async()=>{expect(await publicDesignResponse(new Request('https://urbangangtour.co.ke/events?event=real-event'),{},routes)).toBeNull()});
 it('does not intercept writes',async()=>{expect(await publicDesignResponse(new Request('https://urbangangtour.co.ke/events',{method:'POST'}),{},routes)).toBeNull()});
 it('serves approved HTML with safe caching, production iframe/feed permissions',async()=>{
  const fetch=vi.fn(async()=>new Response('<h1>About</h1>'));
  const response=await publicDesignResponse(new Request('https://urbangangtour.co.ke/about/'),{ASSETS:{fetch}},routes);
  expect(fetch.mock.calls[0][0].url).toBe('https://urbangangtour.co.ke/_design-pages/about/index.html');
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-cache');expect(response.headers.get('content-security-policy')).toContain('https://www.youtube-nocookie.com');expect(await response.text()).toContain('<h1>');
 });
 it('falls back to the working application if an asset is missing',async()=>{expect(await publicDesignResponse(new Request('https://urbangangtour.co.ke/about'),{ASSETS:{fetch:async()=>new Response('missing',{status:404})}},routes)).toBeNull()});
});
