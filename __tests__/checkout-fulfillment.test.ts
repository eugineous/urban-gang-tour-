import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({q:vi.fn(),hasDb:()=>true}));
import {checkoutFulfillmentOptions,resolveCheckoutFulfillment} from '@/lib/server/checkout-fulfillment';
vi.mock('@/lib/server/customer-account',()=>({validatedCurrentBuyer:async()=>null,ensureCustomerAccountSchema:async()=>{}}));
import {GET as tracking} from '@/app/api/orders/tracking/route';
import {GET as bookingStatus} from '@/app/api/bookings/status/route';
const oldFee=process.env.MERCH_DELIVERY_FEE_KES;
afterEach(()=>{if(oldFee===undefined)delete process.env.MERCH_DELIVERY_FEE_KES;else process.env.MERCH_DELIVERY_FEE_KES=oldFee});
describe('checkout logistics security',()=>{
 it('keeps pickup free and disables unconfigured delivery',()=>{delete process.env.MERCH_DELIVERY_FEE_KES;expect(resolveCheckoutFulfillment(undefined)).toEqual({choice:{method:'pickup'},fee:0});expect(checkoutFulfillmentOptions().delivery.enabled).toBe(false);expect(()=>resolveCheckoutFulfillment({method:'delivery',address:{line1:'Main street',city:'Nairobi'}})).toThrow('delivery_unavailable')});
 it('uses only configured fees and requires a bounded address',()=>{process.env.MERCH_DELIVERY_FEE_KES='300';expect(resolveCheckoutFulfillment({method:'delivery',address:{line1:' Main street ',city:'Nairobi'}})).toEqual({choice:{method:'delivery',address:{line1:'Main street',city:'Nairobi'}},fee:300});expect(()=>resolveCheckoutFulfillment({method:'delivery',fee:0,address:{line1:'Main',city:'Nairobi'}})).toThrow('invalid_fulfillment');expect(()=>resolveCheckoutFulfillment({method:'delivery',address:{line1:'Main',city:''}})).toThrow('invalid_delivery_address')});
 it('rejects weak order references before any lookup',async()=>{const r=await tracking(new Request('https://urbangangtour.co.ke/api/orders/tracking?id=12345'));expect(r.status).toBe(400)});
 it('requires verified account ownership for historical short references',async()=>{const r=await tracking(new Request('https://urbangangtour.co.ke/api/orders/tracking?id=ORD-LEGACY123'));expect(r.status).toBe(401)});
 it('does not accept unsigned booking IDs as follow-up credentials',async()=>{const r=await bookingStatus(new Request('https://urbangangtour.co.ke/api/bookings/status?token=B-1234567890'));expect(r.status).toBe(401)});
});
