import {afterEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'local-test',PUBLIC_READ_NETWORK_LIMIT:1000}));
import{q}from'@/lib/server/db';
import{GET}from'@/app/api/orders/status/route';
afterEach(()=>vi.clearAllMocks());
it('retains paid verification after merchandise fulfillment without exposing contacts',async()=>{
 vi.mocked(q).mockResolvedValue([{status:'fulfilled',total:1500,mpesa_receipt:'TEST-RECEIPT',phone:'PRIVATE',email:'PRIVATE',name:'PRIVATE',created_at:'2026-10-09'}]);
 const r=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));const data=await r.json();
 expect(data).toMatchObject({status:'fulfilled',receipt:'TEST-RECEIPT',total:1500});expect(JSON.stringify(data)).not.toContain('PRIVATE');expect(r.headers.get('Cache-Control')).toBe('no-store');
});
it('never reveals a payment receipt on a pending order',async()=>{
 vi.mocked(q).mockResolvedValue([{status:'pending',total:1500,mpesa_receipt:'SECRET-UNCONFIRMED'}]);
 const r=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));expect((await r.json()).receipt).toBe('');
});
