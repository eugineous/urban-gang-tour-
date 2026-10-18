import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),stk:vi.fn(),eligible:true,after:vi.fn(),attempt:null as any,saved:null as any}));
vi.mock('@/lib/server/checkout-session',()=>({checkoutPrincipal:()=> 'signed-fixture'}));
vi.mock('@/lib/server/mpesa-attempts',async original=>({...await original<any>(),
 recoverMpesaAttempt:async()=>state.attempt,
 prepareMpesaAttempt:async(_identity:any,order:any)=>{await state.q('INSERT INTO orders (id,items,total)',[order.id,JSON.stringify(order.items),order.total]);state.saved=order;state.attempt={id:'attempt',orderId:order.id,total:order.total,state:'prepared'};return{attempt:state.attempt,created:true}},
 savedMpesaPurchase:async()=>state.saved,
 claimMpesaInitiation:async()=>{state.attempt.state='initiating';return{attempt:state.attempt,nonce:'nonce'}},
 recordMpesaReference:async()=>{await state.q('UPDATE orders SET mpesa_ref');state.attempt.state='reference_recorded';return true},
 markMpesaInitiationUnknown:async()=>{state.attempt.state='unknown';return true},
}));
vi.mock('next/server',async(importOriginal)=>({...await importOriginal<typeof import('next/server')>(),after:state.after}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q}));
vi.mock('@/lib/server/origin',()=>({sameOrigin:()=>true}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PURCHASE_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/catalog',()=>({serverTotalWithPromos:vi.fn(async(items:{id:string;qty:number}[])=>({
 total:items.reduce((total,item)=>total+1000*item.qty,0),
 lines:items.map(item=>({...item,name:'Rails Tee',unit:1000,basePrice:1000,promoId:null})),appliedPromoCode:null,
}))}));
vi.mock('@/lib/server/promos',()=>({recordPromoCodeUseOnce:vi.fn()}));
vi.mock('@/lib/server/mpesa',()=>({mpesaConfigured:()=>true,normalizePhone:()=> '254700000000',stkPush:state.stk}));
vi.mock('@/lib/server/alert',()=>({alertCritical:vi.fn()}));
vi.mock('@/lib/server/notify',()=>({notifyNewOrder:vi.fn()}));
vi.mock('@/lib/server/inventory',()=>({assertMerchStockAvailable:vi.fn()}));
vi.mock('@/lib/server/ticket-inventory',()=>({parseTierInventory:vi.fn(),assertTicketAvailable:vi.fn(),holdTickets:vi.fn(),releaseReservation:vi.fn()}));
vi.mock('@/lib/server/event-truth',()=>({resolveEventTruth:vi.fn()}));
vi.mock('@/lib/server/affiliate-program',()=>({recordOrderReferral:vi.fn()}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:vi.fn(),validatedCurrentBuyer:async()=>null}));
import {POST as createOrder} from '@/app/api/orders/route';
import {POST as quote} from '@/app/api/checkout/quote/route';
import {assertMerchStockAvailable} from '@/lib/server/inventory';
const request=(body:unknown,path='orders')=>new Request(`https://urbangangtour.co.ke/api/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const body={name:'Test Buyer',phone:'0700000000',idempotencyKey:'0123456789abcdef0123456789abcdef',items:[
 {id:'rails-tee',qty:2,variant:'L',printableName:' Amina '},
 {id:'rails-tee',qty:1,variant:'L',printableName:'Brian'},
]};
beforeEach(()=>{
 vi.clearAllMocks();state.eligible=true;state.attempt=null;state.saved=null;state.stk.mockResolvedValue({ResponseCode:'0',CheckoutRequestID:'MOCK-CHECKOUT'});
 state.q.mockImplementation(async(sql:string)=>{
  if(sql.includes('name_on_back_enabled'))return [{id:'rails-tee',name_on_back_enabled:state.eligible}];
  if(sql.includes('SELECT label, price_adjustment'))return [{label:'L',price_adjustment:200}];
  if(sql.includes('UPDATE orders SET mpesa_ref'))return [{id:'durable-order'}];
  return [];
 });
});

describe('personalization order and quote contract',()=>{
 it('writes both print instructions before requesting payment and keeps authoritative variant pricing',async()=>{
  const response=await createOrder(request(body));
  expect(response.status).toBe(200);
  expect((await response.json()).total).toBe(3600);
  const insert=state.q.mock.calls.find(([sql])=>sql.includes('INSERT INTO orders '));
  expect(insert).toBeDefined();
  const lines=JSON.parse(insert![1][1]);
  expect(lines).toEqual([
   {id:'rails-tee',qty:2,name:'Rails Tee (L)',unit:1200,variant:'L',printableName:'Amina'},
   {id:'rails-tee',qty:1,name:'Rails Tee (L)',unit:1200,variant:'L',printableName:'Brian'},
  ]);
  expect(assertMerchStockAvailable).toHaveBeenCalledWith(lines);
  expect(state.q.mock.invocationCallOrder[state.q.mock.calls.indexOf(insert!)]).toBeLessThan(state.stk.mock.invocationCallOrder[0]);
  expect(state.stk).toHaveBeenCalledWith('254700000000',3600,expect.any(String),'UrbanGang');
 });
 it('reuses the order and payment attempt on a retry with the same buyer key',async()=>{
  const retryBody={...body,idempotencyKey:'personalization-retry-000000000001'};
  const first=await (await createOrder(request(retryBody))).json();
  const second=await (await createOrder(request(retryBody))).json();
  expect(second).toMatchObject({ok:true,id:first.id,total:first.total,attemptState:'reference_recorded',payment:'checking'});
  expect(state.q.mock.calls.filter(([sql])=>sql.includes('INSERT INTO orders '))).toHaveLength(1);
  expect(state.stk).toHaveBeenCalledTimes(1);
 });
 it('blocks unapproved printing before persisting an order or initiating payment',async()=>{
  state.eligible=false;
  const response=await createOrder(request(body));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({error:'personalization_not_available'});
  expect(state.q.mock.calls.some(([sql])=>sql.includes('INSERT INTO orders '))).toBe(false);
  expect(state.stk).not.toHaveBeenCalled();
 });
 it('rejects unsupported characters before catalog reads',async()=>{
  const response=await createOrder(request({...body,items:[{id:'rails-tee',qty:1,printableName:'<img>'}]}));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({error:'invalid_printable_name'});
  expect(state.q).not.toHaveBeenCalled();expect(state.stk).not.toHaveBeenCalled();
 });
 it('quotes the same free printing and variant totals without creating an order',async()=>{
  const response=await quote(request({items:body.items},'checkout/quote'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({total:3600,promoApplied:false,savings:0,deliveryFee:0});
  expect(state.q.mock.calls.some(([sql])=>sql.includes('INSERT INTO orders '))).toBe(false);
  expect(state.stk).not.toHaveBeenCalled();
 });
 it('fails the quote when the product no longer permits printing',async()=>{
  state.eligible=false;
  const response=await quote(request({items:body.items},'checkout/quote'));
  expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'quote_unavailable'});
 });
});
