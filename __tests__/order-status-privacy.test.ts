import {afterEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'local-test',PUBLIC_READ_NETWORK_LIMIT:1000}));
import{q}from'@/lib/server/db';
import{GET}from'@/app/api/orders/status/route';
afterEach(()=>vi.clearAllMocks());
it('identifies the Paystack gateway without misreporting its hosted mobile-money channel as card',async()=>{
 vi.mocked(q).mockResolvedValue([{status:'pending',total:1500,pay_method:'card',paystack_ref:'ORD-TEST-ONLY'}]);
 const r=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));
 expect(await r.json()).toMatchObject({method:'paystack',receipt:''});
});
it('retains paid verification after merchandise fulfillment without exposing contacts',async()=>{
 vi.mocked(q).mockResolvedValue([{status:'fulfilled',total:1500,mpesa_receipt:'TEST-RECEIPT',phone:'PRIVATE',email:'PRIVATE',name:'PRIVATE',created_at:'2026-10-09'}]);
 const r=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));const data=await r.json();
 expect(data).toMatchObject({status:'fulfilled',receipt:'TEST-RECEIPT',total:1500});expect(JSON.stringify(data)).not.toContain('PRIVATE');expect(r.headers.get('Cache-Control')).toBe('no-store');
});
it('never reveals a payment receipt on a pending order',async()=>{
 vi.mocked(q).mockResolvedValue([{status:'pending',total:1500,mpesa_receipt:'SECRET-UNCONFIRMED'}]);
 const r=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));expect((await r.json()).receipt).toBe('');
});
it('exposes redacted delivery progress only after confirmed payment',async()=>{
 vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('SELECT * FROM orders')?[{id:'ORD-TEST-ONLY',status:'paid',items:[{id:'merch',qty:1}],email:'PRIVATE',phone:'PRIVATE',name:'PRIVATE'}]:[]);
 const response=await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'));const data=await response.json();expect(data.delivery).toEqual({tickets:'not_required',email:'preparing'});expect(JSON.stringify(data)).not.toContain('PRIVATE');
 vi.mocked(q).mockResolvedValue([{status:'refunded',email:'PRIVATE'}]);
 expect((await (await GET(new Request('http://localhost/api/orders/status?id=ORD-TEST-ONLY'))).json()).delivery).toBeUndefined();
});
it('never caches malformed order lookups',async()=>{
 const response=await GET(new Request('http://localhost/api/orders/status?id=bad'));expect(response.status).toBe(400);expect(response.headers.get('Cache-Control')).toBe('no-store');
});
