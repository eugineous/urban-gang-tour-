import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({q:vi.fn(),paystack:vi.fn(),stripeSession:vi.fn(),referral:vi.fn()}));
vi.mock('@/lib/server/affiliate-program',()=>({recordOrderReferral:mocks.referral}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:mocks.q}));
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>({id:7,email:'buyer@example.com'}),ensureCustomerAccountSchema:async()=>{}}));
vi.mock('@/lib/server/origin',()=>({sameOrigin:()=>true}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'test',PURCHASE_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/catalog',()=>({getProducts:async()=>({tee:{id:'tee',price:100}}),serverTotalWithPromos:async()=>({total:100,lines:[{id:'tee',name:'T-shirt',qty:1,unit:100}],appliedPromoCode:null})}));
vi.mock('@/lib/server/promos',()=>({recordPromoCodeUse:async()=>{}}));
vi.mock('@/lib/server/merch-variants',()=>({applyVerifiedMerchVariants:async(_:any,lines:any)=>({lines,adjustment:0})}));
vi.mock('@/lib/server/inventory',()=>({assertMerchStockAvailable:async()=>{}}));
vi.mock('@/lib/server/alert',()=>({alertCritical:async()=>{}}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackInit:mocks.paystack}));
vi.mock('@/lib/server/stripe',()=>({stripeConfigured:()=>true,stripe:()=>({checkout:{sessions:{create:mocks.stripeSession}}})}));
import {POST as paystackCheckout} from '@/app/api/paystack/checkout/route';
import {POST as stripeCheckout} from '@/app/api/stripe/checkout/route';
const oldFee=process.env.MERCH_DELIVERY_FEE_KES;
beforeEach(()=>{vi.clearAllMocks();mocks.referral.mockResolvedValue(false);process.env.MERCH_DELIVERY_FEE_KES='300';mocks.q.mockImplementation(async(sql:string)=>sql.startsWith('UPDATE orders')?[{id:'order'}]:[]);mocks.paystack.mockResolvedValue({ok:true,url:'https://checkout.paystack.com/test'});mocks.stripeSession.mockResolvedValue({id:'cs_test',url:'https://checkout.stripe.com/test'})});
afterEach(()=>{if(oldFee===undefined)delete process.env.MERCH_DELIVERY_FEE_KES;else process.env.MERCH_DELIVERY_FEE_KES=oldFee});
function request(){return new Request('https://urbangangtour.co.ke/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:'tee',qty:1}],email:'buyer@example.com',name:'Buyer Example',phone:'+254712345678',fulfillment:{method:'delivery',address:{line1:'Main street',city:'Nairobi'}}})})}
describe('card delivery charges',()=>{
 it('charges Paystack the configured delivery fee and persists private preferences and ownership',async()=>{const r=await paystackCheckout(request());expect(r.status).toBe(200);expect(mocks.paystack.mock.calls[0][0].amountKes).toBe(400);expect(mocks.q.mock.calls.find(([sql])=>sql.includes('INSERT INTO order_delivery_preferences'))?.[1][2]).toBe(300);expect(mocks.q.mock.calls.find(([sql])=>sql.includes('INSERT INTO orders'))?.[1][6]).toBe(7);expect((await r.json()).orderId).toMatch(/^ORD-[A-Z0-9]+[A-F0-9]{24}$/)});
 it('charges Stripe the same fee as a separate server-priced line',async()=>{const r=await stripeCheckout(request());expect(r.status).toBe(200);const lines=mocks.stripeSession.mock.calls[0][0].line_items;expect(lines.reduce((sum:number,l:any)=>sum+l.quantity*l.price_data.unit_amount,0)).toBe(40000);expect(lines.at(-1).price_data.product_data.name).toBe('Merchandise delivery');expect((await r.json()).total).toBe(400)});
 it('rejects delivery when no real fee is configured before starting a card payment',async()=>{delete process.env.MERCH_DELIVERY_FEE_KES;const r=await paystackCheckout(request());expect(r.status).toBe(400);expect(mocks.paystack).not.toHaveBeenCalled()});
 it('requires usable delivery contact details before starting a card payment',async()=>{
   const r=await stripeCheckout(new Request('https://urbangangtour.co.ke/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:'tee',qty:1}],fulfillment:{method:'delivery',address:{line1:'Main street',city:'Nairobi'}}})}));
   expect(r.status).toBe(400);expect(await r.json()).toEqual({error:'delivery_contact_required'});expect(mocks.stripeSession).not.toHaveBeenCalled();
 });
 it('rejects malformed referral codes before payment processing',async()=>{
   const r=await paystackCheckout(new Request('https://urbangangtour.co.ke/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{id:'tee',qty:1}],referralCode:'not-approved'})}));
   expect(r.status).toBe(400);expect(await r.json()).toEqual({error:'invalid_referral_code'});expect(mocks.paystack).not.toHaveBeenCalled();
 });
 it('retains card checkout when optional attribution is unavailable',async()=>{mocks.referral.mockRejectedValueOnce(Error('Optional referral lookup unavailable'));const b=await request().json();b.referralCode='a'.repeat(24);const r=await paystackCheckout(new Request('https://urbangangtour.co.ke/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}));expect(r.status).toBe(200);expect(mocks.referral).toHaveBeenCalledWith(expect.stringMatching(/^ORD-/),'a'.repeat(24),7);expect(mocks.paystack).toHaveBeenCalledOnce();});
});
