// Production handlers, real independent SQL sessions, isolated network-none DB.
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {DisposablePostgres} from './helpers/disposable-postgres';
vi.setConfig({testTimeout:30000});
const state=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(),db:vi.fn(),init:vi.fn()}));
vi.mock('@/lib/server/db',()=>({...state,hasDb:()=>true}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackInit:state.init}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:async()=>{},validatedCurrentBuyer:async()=>null}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{}}));
vi.mock('@/lib/server/organizer-session',()=>({currentApprovedOrganizer:async()=>({organizer:{id:'org'}})}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PURCHASE_NETWORK_LIMIT:1000,PUBLIC_READ_NETWORK_LIMIT:1000}));
vi.mock('next/server',async original=>({...await original<object>(),after:()=>{}}));
vi.mock('@/lib/server/notify',()=>({notifyPaymentSuccess:async()=>{}}));
import {POST as checkout} from '@/app/api/marketplace/checkout/route';
import {POST as edit} from '@/app/api/organizer/events/[id]/route';
import {POST as webhook} from '@/app/api/paystack/webhook/route';
import {POST as recovery} from '@/app/api/checkout/recovery/route';
import {createCheckoutSession} from '@/lib/server/checkout-session';
import {ensureMarketplaceColumns} from '@/lib/server/marketplace';
import {ensurePaystackAttemptSchema,claimPaystackInitiation,preparePaystackAttempt,paystackAttemptIdentity} from '@/lib/server/paystack-attempts';
import {priceMarketplaceTicket,claimMarketplaceTicket,settleMarketplaceTicket} from '@/lib/server/paystack-marketplace-tickets';
import {ensureTicketInventorySchema,ticketCapacity,expireStaleReservations} from '@/lib/server/ticket-inventory';
import {ensurePaymentEffectsSchema,processPaymentEffects,settlePaystackOrder} from '@/lib/server/payment-effects';
import {ensureTicketSchema} from '@/lib/server/tickets';
import {ensureEmailOutbox} from '@/lib/server/email-outbox';
const enabled=process.env.UGT_MARKETPLACE_TICKET_PG_FIXTURE==='1',test=it.skipIf(!enabled),fixture=new DisposablePostgres();
const normalize=(rows:Record<string,any>[])=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,
 ['items','tiers','paystack_marketplace','purchase'].includes(key)&&typeof value==='string'?JSON.parse(value):
 ['total','qty','position','of_count','commission_amount','organizer_amount'].includes(key)&&value!==null?Number(value):value])));
const query=async(sql:string,args:unknown[]=[])=>normalize(await fixture.query(sql,args));
beforeAll(async()=>{
 if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INT NOT NULL,status TEXT DEFAULT 'pending',name TEXT,email TEXT,phone TEXT,user_id INT,pay_method TEXT,paystack_ref TEXT,mpesa_ref TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE order_delivery_preferences(order_id TEXT PRIMARY KEY REFERENCES orders(id),method TEXT,fee INT,address JSONB);
 CREATE TABLE tickets(code TEXT PRIMARY KEY,order_id TEXT,event_id TEXT,tier_name TEXT,position INT,of_count INT,holder TEXT DEFAULT '',used_at TIMESTAMPTZ,used_by TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE marketplace_organizers(id TEXT PRIMARY KEY,status TEXT,paystack_subaccount_code TEXT,business_name TEXT);
 CREATE TABLE marketplace_events(id TEXT PRIMARY KEY,organizer_id TEXT,name TEXT,event_date DATE,venue TEXT,city TEXT,description TEXT,image TEXT,tiers JSONB,status TEXT,rejection_reason TEXT DEFAULT '',created_at TIMESTAMPTZ DEFAULT now(),updated_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE settings(key TEXT PRIMARY KEY,value JSONB,updated_at TIMESTAMPTZ DEFAULT now());CREATE TABLE audit_log(id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,detail TEXT);`);
 state.q.mockImplementation(query);state.qSchema.mockImplementation((sql:string)=>fixture.schema(sql));
 state.db.mockImplementation(()=>{const clients:ReturnType<DisposablePostgres['connect']>[]=[];return {query:async(sql:string,args:unknown[]=[])=>({rows:await query(sql,args)}),connect:async()=>{const client=fixture.connect();clients.push(client);return {...client,query:async(sql:string,args:unknown[]=[])=>({rows:normalize((await client.query(sql,args)).rows)})}},end:async()=>{await Promise.all(clients.map(c=>c.end()))}}});
 await ensureMarketplaceColumns();await ensureTicketSchema();await ensureTicketInventorySchema();await ensurePaystackAttemptSchema();await ensurePaymentEffectsSchema();await ensureEmailOutbox();
},30000);
beforeEach(async()=>{
 if(!enabled)return;vi.stubEnv('SESSION_SECRET','fixture-marketplace-session');vi.stubEnv('PAYSTACK_SECRET_KEY','fixture-provider');vi.stubEnv('RESEND_API_KEY','');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('network forbidden')}));
 state.init.mockReset().mockResolvedValue({ok:true,url:'https://checkout.paystack.com/fixture-marketplace'});
 await fixture.query('TRUNCATE payment_effect_outbox,email_delivery_outbox,ticket_reservations,mpesa_checkout_attempts,paystack_checkout_attempts,order_delivery_preferences,tickets,orders,marketplace_events,marketplace_organizers,settings,audit_log CASCADE');
 await fixture.query("INSERT INTO marketplace_organizers(id,status,paystack_subaccount_code,business_name) VALUES('org','approved','ACCT_fixture','Fixture organizer')");
 await fixture.query("INSERT INTO marketplace_events(id,organizer_id,name,event_date,venue,city,description,image,tiers,status) VALUES('mkt-event','org','Fixture event','2099-12-01','Fixture venue','Nairobi','Fixture description','',$1::jsonb,'published')",[JSON.stringify([{name:'General',price:500,capacity:1}])]);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});afterAll(()=>{if(enabled)fixture.stop()},30000);
const body=(n=1)=>({eventId:'mkt-event',tier:0,qty:1,name:'Fixture buyer',email:'',idempotencyKey:String(n).padStart(64,'0')});
const request=(data:unknown,cookie=createCheckoutSession(),path='/api/marketplace/checkout')=>new Request('https://urbangangtour.co.ke'+path,{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json',cookie:'ugt_checkout='+cookie},body:JSON.stringify(data)});
const count=async(table:string)=>Number((await query('SELECT COUNT(*) AS n FROM '+table))[0].n);
async function started(cookie=createCheckoutSession()){const response=await checkout(request(body(),cookie));expect(response.status).toBe(200);return {...await response.json(),cookie}}
const settle=(id:string)=>settlePaystackOrder({orderId:id,reference:id,amountKes:500});
test('one concurrent purchase commits one split snapshot and capacity hold before the only provider dispatch',async()=>{
 const cookie=createCheckoutSession();state.init.mockImplementation(async(input:any)=>{expect(input).toMatchObject({amountKes:500,channels:['card','mobile_money'],subaccountCode:'ACCT_fixture',transactionChargeKes:40,bearer:'account'});expect(await ticketCapacity('mkt-event',0,'General')).toEqual({sold:0,reserved:1});return {ok:true,url:'https://checkout.paystack.com/fixture-marketplace'}});
 const responses=await Promise.all(Array.from({length:4},()=>checkout(request(body(),cookie))));expect(responses.every(r=>[200,202].includes(r.status))).toBe(true);const values=await Promise.all(responses.map(r=>r.json()));expect(new Set(values.map(v=>v.id)).size).toBe(1);expect(state.init).toHaveBeenCalledTimes(1);expect(await count('orders')).toBe(1);expect(await count('ticket_reservations')).toBe(1);
 expect((await checkout(request({...body(),qty:2},cookie))).status).toBe(409);
});
test('ambiguous response recovery preserves the reference, accepted split and non-expiring payable hold',async()=>{
 state.init.mockResolvedValue({ok:false,outcome:'unknown'});const cookie=createCheckoutSession(),response=await checkout(request(body(),cookie));expect(response.status).toBe(202);const original=await response.json();expect(original.attemptState).toBe('unknown');
 await fixture.query("INSERT INTO settings(key,value) VALUES('marketplace_commission_percent','99')");await fixture.query("UPDATE marketplace_organizers SET paystack_subaccount_code='ACCT_changed'");await fixture.query("UPDATE ticket_reservations SET expires_at=now()-interval '2 days'");
 expect(await expireStaleReservations()).toBe(0);expect((await(await checkout(request(body(),cookie))).json()).id).toBe(original.id);expect(state.init).toHaveBeenCalledTimes(1);
 const recovered=await recovery(request({key:body().idempotencyKey,provider:'paystack'},cookie,'/api/checkout/recovery'));expect(await recovered.json()).toMatchObject({id:original.id,attemptState:'unknown'});
 expect((await query('SELECT paystack_marketplace FROM orders'))[0].paystack_marketplace).toMatchObject({subaccountCode:'ACCT_fixture',commissionPercent:8,commissionAmount:40,organizerAmount:460});
});
test('independent buyers racing the final seat cannot create two payable hosted sessions',async()=>{
 const results=await Promise.all([checkout(request(body())),checkout(request(body(2)))]);expect(results.map(r=>r.status).sort()).toEqual([200,400]);expect(state.init).toHaveBeenCalledTimes(1);expect(await ticketCapacity('mkt-event',0,'General')).toEqual({sold:0,reserved:1});
});
test('missing capacity and commission lookup outages fail closed before provider dispatch',async()=>{
 await fixture.query("UPDATE marketplace_events SET tiers='[{\"name\":\"General\",\"price\":500}]'");expect((await checkout(request(body()))).status).toBe(400);expect(state.init).not.toHaveBeenCalled();
 await fixture.query("UPDATE marketplace_events SET tiers='[{\"name\":\"General\",\"price\":500,\"capacity\":1}]'");await fixture.schema('ALTER TABLE settings RENAME TO unavailable_settings');
 try{expect((await checkout(request(body(2)))).status).toBe(503);expect(state.init).not.toHaveBeenCalled()}finally{await fixture.schema('ALTER TABLE unavailable_settings RENAME TO settings')}
});
test.each(['Changed','General'])('material edit with tier %s racing checkout precedes dispatch or rejects a payable hold',async name=>{
 const [payment,change]=await Promise.all([checkout(request(body())),edit(request({tiers:[{name,price:700,capacity:1}]}),{params:Promise.resolve({id:'mkt-event'})})]);
 if(payment.status===200){expect(change.status).toBe(400);expect((await query('SELECT tiers FROM marketplace_events'))[0].tiers[0].name).toBe('General')}else{expect(change.status).toBe(200);expect(state.init).not.toHaveBeenCalled()}
});
test('a prepared snapshot cannot dispatch after a same-name price change even if another writer kept publication',async()=>{
 const purchase=await priceMarketplaceTicket({eventId:'mkt-event',tier:0,qty:1}),identity=paystackAttemptIdentity('isolated-owner',body().idempotencyKey,{marketplace:{eventId:'mkt-event',tier:0,qty:1}});
 await preparePaystackAttempt(identity,{id:'ORD-PRICEPREPARED',items:[{id:'ticket:mkt-event:0',qty:1,name:purchase.name,unit:500}],total:500,name:'Fixture',email:'',phone:'',userId:null,fulfillment:null,marketplace:purchase});
 await fixture.query("UPDATE marketplace_events SET tiers='[{\"name\":\"General\",\"price\":700,\"capacity\":1}]'");
 await expect(claimMarketplaceTicket(identity,'ORD-PRICEPREPARED',purchase)).rejects.toThrow('ticket_snapshot_conflict');expect(await count('ticket_reservations')).toBe(0);
});
test('signed duplicate settlement mints once from accepted terms before receipt and blocks paid-before-mint edits',async()=>{
 const {id}=await started();const raw=JSON.stringify({event:'charge.success',data:{reference:id,currency:'KES',status:'success',amount:50000}}),signed=()=>new Request('https://urbangangtour.co.ke/api/paystack/webhook',{method:'POST',headers:{'x-paystack-signature':createHmac('sha512','fixture-provider').update(raw).digest('hex')},body:raw});
 expect((await webhook(signed())).status).toBe(200);expect((await edit(request({tiers:[{name:'Changed',price:700,capacity:1}]}),{params:Promise.resolve({id:'mkt-event'})})).status).toBe(400);
 await fixture.query("UPDATE marketplace_events SET tiers='[{\"name\":\"Unexpected rename\",\"price\":500,\"capacity\":1}]'");await processPaymentEffects(4,id);expect((await query('SELECT tier_name FROM tickets'))[0].tier_name).toBe('General');expect(await count('tickets')).toBe(1);expect((await webhook(signed())).status).toBe(200);await processPaymentEffects(8,id);expect(await count('tickets')).toBe(1);
});
test('incorrect money cannot settle and late unavailable money is paid refund review without excess admission',async()=>{
 const {id}=await started();expect(await settlePaystackOrder({orderId:id,reference:id,amountKes:1})).toBeNull();expect(await count('payment_effect_outbox')).toBe(0);await fixture.query("UPDATE marketplace_events SET status='cancelled'");expect(await settle(id)).toBeNull();expect((await query('SELECT status,ticket_fulfillment_status FROM orders'))[0]).toMatchObject({status:'paid',ticket_fulfillment_status:'refund_review'});await processPaymentEffects(4,id);expect(await count('tickets')).toBe(0);expect(await settle(id)).toBeNull();
});
test('capacity-only updates preserve tiers and cannot reduce below a payable obligation',async()=>{
 await started();const params={params:Promise.resolve({id:'mkt-event'})};
 expect((await edit(request({tiers:[{name:'General',price:500,capacity:0}]}),params)).status).toBe(400);
 expect((await edit(request({tiers:[{name:'General',price:500,capacity:2}]}),params)).status).toBe(200);
 expect((await query('SELECT tiers,status FROM marketplace_events'))[0]).toMatchObject({tiers:[{name:'General',price:500,capacity:2}],status:'published'});
});
test('a generic merchandise claim cannot dispatch a prepared marketplace purchase',async()=>{
 await fixture.query("UPDATE marketplace_events SET tiers='[{\"name\":\"General\",\"price\":500,\"capacity\":0}]'");const cookie=createCheckoutSession();expect((await checkout(request(body(),cookie))).status).toBe(400);
 // Find the actual durable owner/request identity, rather than substituting an ownership bypass.
 const attempts=await query('SELECT scope_hash,token_hash,request_hash FROM paystack_checkout_attempts');expect(attempts).toHaveLength(1);const a=attempts[0];expect(await claimPaystackInitiation({scopeHash:a.scope_hash,tokenHash:a.token_hash,requestHash:a.request_hash})).toBeNull();
});
test('legacy pending marketplace money is accounted for review without inventing capacity entitlements',async()=>{
 await fixture.query("INSERT INTO orders(id,items,total,status,pay_method,paystack_ref,source,organizer_id,marketplace_event_id) VALUES('ORD-LEGACY123',$1::jsonb,500,'pending','card','ORD-LEGACY123','marketplace','org','mkt-event')",[JSON.stringify([{id:'ticket:mkt-event:0',qty:1,unit:500,name:'Fixture event - General'}])]);
 expect(await settleMarketplaceTicket({orderId:'ORD-LEGACY123',reference:'ORD-LEGACY123',amountKes:500})).toEqual({handled:true,order:null});expect((await query("SELECT status,ticket_fulfillment_status FROM orders WHERE id='ORD-LEGACY123'"))[0]).toMatchObject({status:'paid',ticket_fulfillment_status:'refund_review'});await processPaymentEffects(4,'ORD-LEGACY123');expect(await count('tickets')).toBe(0);
});
