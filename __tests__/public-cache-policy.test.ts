import {describe,it,expect} from 'vitest';
// @ts-expect-error The Worker policy is shared as an unbundled ES module.
import {canCachePublicPage} from '../public-cache-policy.mjs';
const req=(path:string,headers:Record<string,string>={},method='GET')=>new Request('https://urbangangtour.co.ke'+path,{headers,method});
describe('public edge cache isolation',()=>{
  it('allows only anonymous public content',()=>{
    expect(canCachePublicPage(req('/'))).toBe(true);
    expect(canCachePublicPage(req('/about',{cookie:'ugt-consent=no; ugt_did=abcdefgh'}))).toBe(true);
    expect(canCachePublicPage(req('/about/'))).toBe(true);
  });
  it.each(['/shop','/shop/available','/shop/tee','/cart','/checkout','/account','/admin','/organizer/login','/api/orders','/pay/success','/receipt/ORD-123','/events','/gallery'])('does not share live or customer state from %s',path=>expect(canCachePublicPage(req(path))).toBe(false));
  it.each([{RSC:'1'},{Authorization:'Bearer test'},{cookie:'ugt_user=session'},{cookie:'ugt_admin=session'},{cookie:'ugt_org=session'},{cookie:'ugt_organizer=session'},{'cache-control':'no-cache'}])('bypasses private or explicit refresh requests',headers=>expect(canCachePublicPage(req('/about',headers))).toBe(false));
  it('does not cache form requests or query-specific HTML',()=>{
    expect(canCachePublicPage(req('/about',{},'POST'))).toBe(false);
    expect(canCachePublicPage(req('/?ref=private'))).toBe(false);
  });
});
