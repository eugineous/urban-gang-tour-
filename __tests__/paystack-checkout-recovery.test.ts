import {beforeEach,expect,it,vi} from 'vitest';
const s=vi.hoisted(()=>({q:vi.fn(),price:vi.fn(),recover:vi.fn(),prepare:vi.fn(),claim:vi.fn(),record:vi.fn(),unknown:vi.fn(),saved:vi.fn(),init:vi.fn(),owner:vi.fn(),stock:vi.fn(),products:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:s.q}));
vi.mock('@/lib/server/origin',()=>({sameOrigin:()=>true}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PURCHASE_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/checkout-session',()=>({checkoutPrincipal:s.owner}));
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>null,ensureCustomerAccountSchema:async()=>{}}));
vi.mock('@/lib/server/checkout-fulfillment',()=>({checkoutDeliveryContact:()=>({name:'',phone:''}),resolveCheckoutFulfillment:()=>({choice:{method:'pickup'},fee:0}),ensureCheckoutFulfillmentSchema:async()=>{},saveCheckoutFulfillment:async()=>{}}));
vi.mock('@/lib/server/catalog',()=>({getProducts:s.products,serverTotalWithPromos:s.price}));
vi.mock('@/lib/server/merch-variants',()=>({applyVerifiedMerchVariants:async(_:unknown,lines:unknown[])=>({lines,adjustment:0})}));
vi.mock('@/lib/server/merch-personalization',()=>({applyVerifiedMerchPersonalization:async(_:unknown,lines:unknown[])=>lines}));
vi.mock('@/lib/server/inventory',()=>({assertMerchStockAvailable:s.stock}));
vi.mock('@/lib/server/promos',()=>({recordPromoCodeUse:async()=>{}}));
vi.mock('@/lib/server/affiliate-program',()=>({recordOrderReferral:async()=>false}));
vi.mock('@/lib/server/alert',()=>({alertCritical:async()=>{}}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackInit:s.init}));
vi.mock('@/lib/server/paystack-attempts',()=>({
 paystackAttemptIdentity:()=>({scopeHash:'a'.repeat(64),tokenHash:'b'.repeat(64),requestHash:'c'.repeat(64)}),
 PaystackAttemptConflict:class extends Error{},recoverPaystackAttempt:s.recover,preparePaystackAttempt:s.prepare,
 claimPaystackInitiation:s.claim,recordPaystackAuthorization:s.record,markPaystackInitiationUnknown:s.unknown,savedPaystackPurchase:s.saved,
}));
import {POST} from '@/app/api/paystack/checkout/route';
const attempt={id:'ATTEMPT',orderId:'ORD-ORIGINAL',total:100,state:'prepared'};
beforeEach(()=>{vi.clearAllMocks();s.owner.mockReturnValue('checkout:fixture');s.q.mockResolvedValue([]);s.recover.mockResolvedValue(null);s.price.mockResolvedValue({total:100,lines:[{id:'tee',name:'Tee',qty:1,unit:100}],appliedPromoCode:null});s.prepare.mockResolvedValue({attempt,created:true});s.claim.mockResolvedValue({attempt,nonce:'nonce'});s.record.mockResolvedValue(true);s.unknown.mockResolvedValue(true);s.init.mockResolvedValue({ok:true,url:'https://checkout.paystack.com/fixture'});});
const request=(extra:Record<string,unknown>={})=>new Request('https://urbangangtour.co.ke/api/paystack/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:'tee',qty:1}],idempotencyKey:'k'.repeat(64),...extra})});
beforeEach(()=>{s.stock.mockResolvedValue(undefined);s.products.mockResolvedValue({tee:{price:100}})});
it('requires an opaque retry key before creating a payable order',async()=>{expect((await POST(request({idempotencyKey:undefined}))).status).toBe(400);expect(s.init).not.toHaveBeenCalled();});
it('requires the signed checkout browser scope',async()=>{s.owner.mockReturnValue(null);expect((await POST(request())).status).toBe(428);expect(s.prepare).not.toHaveBeenCalled();});
it('recovers an uncertain original order without repricing or initializing again',async()=>{s.recover.mockResolvedValue({...attempt,state:'unknown'});const r=await POST(request());expect(r.status).toBe(202);expect(await r.json()).toMatchObject({orderId:'ORD-ORIGINAL',total:100,attemptState:'unknown'});expect(s.price).not.toHaveBeenCalled();expect(s.init).not.toHaveBeenCalled();});
it('recovers the same saved checkout URL rather than creating another order',async()=>{s.recover.mockResolvedValue({...attempt,state:'ready',authorizationUrl:'https://checkout.paystack.com/original'});const r=await POST(request());expect(r.status).toBe(200);expect(await r.json()).toMatchObject({authorizationUrl:'https://checkout.paystack.com/original',orderId:'ORD-ORIGINAL'});expect(s.price).not.toHaveBeenCalled();expect(s.init).not.toHaveBeenCalled();});
it('keeps initialization uncertainty recoverable instead of marking it failed',async()=>{s.init.mockResolvedValue({ok:false,outcome:'unknown'});const r=await POST(request());expect(r.status).toBe(202);expect(await r.json()).toMatchObject({orderId:'ORD-ORIGINAL',attemptState:'unknown'});expect(s.unknown).toHaveBeenCalledWith('ATTEMPT','nonce');expect(s.q.mock.calls.some(([sql])=>/status='failed'/.test(sql))).toBe(false);});
it('does not initialize when another request already won the durable claim',async()=>{s.claim.mockResolvedValue(null);s.recover.mockResolvedValueOnce(null).mockResolvedValueOnce({...attempt,state:'initiating'});const r=await POST(request());expect(r.status).toBe(202);expect(s.init).not.toHaveBeenCalled();});
it('does not return an unpersisted authorization URL after a storage failure',async()=>{s.record.mockResolvedValue(false);const r=await POST(request());expect(r.status).toBe(202);expect(await r.json()).not.toHaveProperty('authorizationUrl');expect(s.init).toHaveBeenCalledOnce();});
it('uses persisted original pricing when resuming a prepared order',async()=>{s.recover.mockResolvedValue(attempt);s.saved.mockResolvedValue({items:[{id:'tee',qty:1,unit:100}],total:100,context:{}});await POST(request());expect(s.price).not.toHaveBeenCalled();expect(s.init.mock.calls[0][0]).toMatchObject({amountKes:100,reference:'ORD-ORIGINAL'});});
it('rechecks prepared saved stock before creating a hosted payment without repricing',async()=>{s.recover.mockResolvedValue(attempt);s.saved.mockResolvedValue({items:[{id:'tee',qty:1,unit:100}],total:100,context:{}});s.stock.mockRejectedValueOnce(Error('out_of_stock'));const response=await POST(request());expect(response.status).toBe(400);expect(await response.json()).toMatchObject({error:'out_of_stock'});expect(s.price).not.toHaveBeenCalled();expect(s.claim).not.toHaveBeenCalled();expect(s.init).not.toHaveBeenCalled();});
it('does not initiate a prepared purchase whose product has since been retired',async()=>{s.recover.mockResolvedValue(attempt);s.saved.mockResolvedValue({items:[{id:'tee',qty:1,unit:100}],total:100,context:{}});s.products.mockResolvedValue({});const response=await POST(request());expect(response.status).toBe(400);expect(await response.json()).toMatchObject({error:'unknown_product'});expect(s.init).not.toHaveBeenCalled();});
