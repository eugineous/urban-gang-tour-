import {beforeEach,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({buyer:null as {id:number}|null,claim:vi.fn()}));
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>f.buyer,ensureCustomerAccountSchema:async()=>{}}));
vi.mock('@/lib/server/customer-order-claim',()=>({claimGuestOrder:f.claim}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
import {POST} from '@/app/api/account/orders/claim/route';
const ref='ORD-ABCDEF0123456789ABCDEF0123456789';
const request=(body:object,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/account/orders/claim',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
beforeEach(()=>{f.buyer=null;f.claim.mockReset()});
it('rejects foreign and anonymous requests without an order lookup',async()=>{
 expect((await POST(request({ref},'https://evil.test'))).status).toBe(403);expect((await POST(request({ref}))).status).toBe(401);expect(f.claim).not.toHaveBeenCalled();
});
it('never trusts a body user ID or weak historical reference',async()=>{
 f.buyer={id:7};expect((await POST(request({ref,userId:8}))).status).toBe(400);expect((await POST(request({ref:'ORD-OLD123'}))).status).toBe(400);expect(f.claim).not.toHaveBeenCalled();
});
it('uses only the authenticated buyer and gives no information on unclaimable orders',async()=>{
 f.buyer={id:7};f.claim.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 const denied=await POST(request({ref}));expect(denied.status).toBe(404);expect(await denied.json()).toEqual({error:'order_not_claimable'});
 const allowed=await POST(request({ref}));expect(allowed.status).toBe(200);expect(await allowed.json()).toEqual({ok:true});expect(f.claim).toHaveBeenLastCalledWith(7,ref);expect(allowed.headers.get('Cache-Control')).toContain('no-store');
});
