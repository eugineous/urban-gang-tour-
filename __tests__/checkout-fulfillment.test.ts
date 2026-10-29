import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({q:vi.fn(),hasDb:()=>true}));
import {checkoutFulfillmentOptions,resolveCheckoutFulfillment} from '@/lib/server/checkout-fulfillment';
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>null,ensureCustomerAccountSchema:async()=>{}}));
import {GET as tracking} from '@/app/api/orders/tracking/route';
import {GET as bookingStatus} from '@/app/api/bookings/status/route';
import {q} from '@/lib/server/db';
const oldFee=process.env.MERCH_DELIVERY_FEE_KES;
afterEach(()=>{if(oldFee===undefined)delete process.env.MERCH_DELIVERY_FEE_KES;else process.env.MERCH_DELIVERY_FEE_KES=oldFee});
describe('checkout logistics security',()=>{
 it('returns recorded production and delivery updates without customer contacts, address or staff notes',async()=>{
  vi.mocked(q).mockImplementation(async(sql:string)=>{
   if(sql.startsWith('SELECT id,status FROM orders'))return [{id:'ORD-ABC123456789012345678901234',status:'paid'}];
   if(sql.includes('FROM merch_fulfillments'))return [{status:'in_production',handoff_method:'',reference:'',updated_at:'2026-10-28T12:00:00Z'}];
   if(sql.includes('FROM merch_fulfillment_events'))return [{status:'in_production',created_at:'2026-10-28T12:00:00Z'},{status:'delivered',created_at:'2026-10-29T12:00:00Z'}];
   if(sql.includes('FROM order_delivery_preferences'))return [{method:'delivery',fee:300}];return [];
  });
  const response=await tracking(new Request('https://urbangangtour.co.ke/api/orders/tracking?id=ORD-ABC123456789012345678901234'));
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  const data=await response.json();expect(data.history.map((event:any)=>event.status)).toEqual(['in_production','delivered']);
  for(const sql of vi.mocked(q).mock.calls.map(call=>String(call[0])))expect(sql).not.toMatch(/SELECT\s+\*|SELECT[^\n]*(?:phone|email|address|note)/i);
  expect(data).not.toHaveProperty('address');expect(data).not.toHaveProperty('phone');expect(data).not.toHaveProperty('email');
 });
 it('keeps pickup free and disables unconfigured delivery',()=>{delete process.env.MERCH_DELIVERY_FEE_KES;expect(resolveCheckoutFulfillment(undefined)).toEqual({choice:{method:'pickup'},fee:0});expect(checkoutFulfillmentOptions().delivery.enabled).toBe(false);expect(()=>resolveCheckoutFulfillment({method:'delivery',address:{line1:'Main street',city:'Nairobi'}})).toThrow('delivery_unavailable')});
 it('uses only configured fees and requires a bounded address',()=>{process.env.MERCH_DELIVERY_FEE_KES='300';expect(resolveCheckoutFulfillment({method:'delivery',address:{line1:' Main street ',city:'Nairobi'}})).toEqual({choice:{method:'delivery',address:{line1:'Main street',city:'Nairobi'}},fee:300});expect(()=>resolveCheckoutFulfillment({method:'delivery',fee:0,address:{line1:'Main',city:'Nairobi'}})).toThrow('invalid_fulfillment');expect(()=>resolveCheckoutFulfillment({method:'delivery',address:{line1:'Main',city:''}})).toThrow('invalid_delivery_address')});
 it('rejects weak order references before any lookup',async()=>{const r=await tracking(new Request('https://urbangangtour.co.ke/api/orders/tracking?id=12345'));expect(r.status).toBe(400)});
 it('requires verified account ownership for historical short references',async()=>{const r=await tracking(new Request('https://urbangangtour.co.ke/api/orders/tracking?id=ORD-LEGACY123'));expect(r.status).toBe(401)});
 it('does not accept unsigned booking IDs as follow-up credentials',async()=>{const r=await bookingStatus(new Request('https://urbangangtour.co.ke/api/bookings/status?token=B-1234567890'));expect(r.status).toBe(401)});
});
