// Production route/SQL and independent PostgreSQL sessions. No live providers.
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
import {DisposablePostgres} from './helpers/disposable-postgres';
// Each case crosses real disposable SQL sessions; the default unit-test budget
// is insufficient when another production build/browser uses the same runner.
vi.setConfig({testTimeout:20000});
const state=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(),db:vi.fn(),init:vi.fn(),capacityBarrier:null as null|(()=>Promise<void>),orderLocked:null as null|(()=>void)}));
vi.mock('@/lib/server/db',()=>({...state,hasDb:()=>true}));
vi.mock('@/lib/server/paystack',()=>({paystackConfigured:()=>true,paystackInit:state.init}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:async()=>{},validatedCurrentBuyer:async()=>null}));
vi.mock('next/server',async original=>({...await original<object>(),after:()=>{}}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'isolated-ticket',PURCHASE_NETWORK_LIMIT:1000,PUBLIC_READ_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{}}));
vi.mock('@/lib/server/catalog',()=>({getTicketTiers:async()=>({event:{name:'Fixture event',tiers:[{name:'General',price:500}]}}),getTicketedEvents:async()=>[{id:'event',name:'Fixture event',date:'1 December 2099',time:'',venue:'Fixture venue',city:'Nairobi',accent:'#E6218C'}]}));
vi.mock('@/lib/server/marketplace',()=>({getMarketplaceEventById:async()=>null}));
vi.mock('@/lib/server/session',async original=>({...await original<object>(),verifyAdminSession:async()=>true,isSuperAdmin:()=>true,hasPerm:()=>true,signedAdminSessionId:()=> 'isolated-ticket-scanner',adminActor:()=> 'fixture'}));
vi.mock('@/lib/server/notify',()=>({notifyTicketScan:async()=>{},notifyPaymentSuccess:async()=>{}}));
import {POST as checkout} from '@/app/api/paystack/checkout/route';
import {POST as webhook} from '@/app/api/paystack/webhook/route';
import {POST as scan} from '@/app/api/tickets/verify/route';
import {POST as saveAdmin} from '@/app/api/admin/save/route';
import {POST as comp} from '@/app/api/admin/tickets/comp/route';
import {GET as status} from '@/app/api/orders/status/route';
import {createCheckoutSession} from '@/lib/server/checkout-session';
import {ensurePaystackAttemptSchema,paystackAttemptIdentity,preparePaystackAttempt,claimPaystackInitiation,recordPaystackAuthorization} from '@/lib/server/paystack-attempts';
import {CAPACITY_COUNTS_SQL,ensureTicketInventorySchema,expireStaleReservations,ticketCapacity} from '@/lib/server/ticket-inventory';
import {ensurePaymentEffectsSchema,processPaymentEffects,settlePaystackOrder} from '@/lib/server/payment-effects';
import {ensureEmailOutbox} from '@/lib/server/email-outbox';
import {ensureTicketSchema,ensureTickets} from '@/lib/server/tickets';
import {recordRefund} from '@/lib/server/refunds';
import {claimPaystackTicket,ensurePaystackTicketSchema} from '@/lib/server/paystack-tickets';

const enabled=process.env.UGT_OWNED_PAYSTACK_TICKET_PG_FIXTURE==='1',fixture=new DisposablePostgres(),test=it.skipIf(!enabled);
const normalize=(rows:Record<string,any>[])=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,
 ['items','tiers','paystack_ticket'].includes(key)&&typeof value==='string'?JSON.parse(value):
 ['total','qty','tier_index','attempts','position','of_count'].includes(key)&&value!==null?Number(value):value])));
const query=async(sql:string,args:unknown[]=[])=>normalize(await fixture.query(sql,args));
beforeAll(async()=>{
 if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INT NOT NULL,status TEXT DEFAULT 'pending',
 name TEXT,email TEXT,phone TEXT,user_id INT,pay_method TEXT,paystack_ref TEXT,mpesa_ref TEXT,
 created_at TIMESTAMPTZ DEFAULT now(),paystack_ticket JSONB,ticket_fulfillment_status TEXT,ticket_payment_received_at TIMESTAMPTZ);
 CREATE TABLE order_delivery_preferences(order_id TEXT PRIMARY KEY REFERENCES orders(id),method TEXT,fee INT,address JSONB);
 CREATE TABLE tour_events(id TEXT PRIMARY KEY,slug TEXT,name TEXT,kind TEXT,status TEXT,event_date DATE,venue TEXT,tiers JSONB,sales_start_at TIMESTAMPTZ,sales_end_at TIMESTAMPTZ);
 CREATE TABLE tickets(code TEXT PRIMARY KEY,order_id TEXT,event_id TEXT,tier_name TEXT,position INT,of_count INT,holder TEXT DEFAULT '',used_at TIMESTAMPTZ,used_by TEXT,created_at TIMESTAMPTZ DEFAULT now(),voided_at TIMESTAMPTZ);
 CREATE TABLE audit_log(id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,detail TEXT);`);
 state.q.mockImplementation(query);state.qSchema.mockImplementation((sql:string)=>fixture.schema(sql));
 state.db.mockImplementation(()=>{
  const clients:ReturnType<DisposablePostgres['connect']>[]=[];
  return {query:async(sql:string,args:unknown[]=[])=>({rows:await query(sql,args)}),connect:async()=>{const c=fixture.connect();clients.push(c);return {...c,query:async(sql:string,args:unknown[]=[])=>{const rows=normalize((await c.query(sql,args)).rows);if(sql==='SELECT * FROM orders WHERE id=$1 FOR UPDATE')state.orderLocked?.();if(sql===CAPACITY_COUNTS_SQL)await state.capacityBarrier?.();return {rows}}}},end:async()=>{await Promise.all(clients.map(c=>c.end()))}};
 });
 await ensureTicketInventorySchema();await ensurePaystackAttemptSchema();await ensurePaymentEffectsSchema();await ensureTicketSchema();await ensureEmailOutbox();
},30000);
beforeEach(async()=>{
 if(!enabled)return;vi.stubEnv('PAYSTACK_TICKETS_ENABLED','true');vi.stubEnv('SESSION_SECRET','isolated-ticket-signing-key');vi.stubEnv('PAYSTACK_SECRET_KEY','isolated-ticket-provider-key');vi.stubEnv('RESEND_API_KEY','');
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('live network forbidden')}));
 state.capacityBarrier=null;state.init.mockReset().mockResolvedValue({ok:true,url:'https://checkout.paystack.com/fixture-ticket'});
 await fixture.query('TRUNCATE payment_effect_outbox,email_delivery_outbox,ticket_reservations,mpesa_checkout_attempts,order_delivery_preferences,tickets,orders,tour_events,audit_log CASCADE');
 // The attempt table exists after first ticket checkout; keep beforeEach valid on RED.
 await fixture.query("SELECT to_regclass('paystack_checkout_attempts') AS name").then(async r=>{if(r[0]?.name)await fixture.query('TRUNCATE paystack_checkout_attempts')});
 await fixture.query("INSERT INTO tour_events VALUES('event','event','Fixture event','ticketed','published','2099-12-01','Fixture venue',$1::jsonb,NULL,NULL)",[JSON.stringify([{name:'General',price:500,capacity:1,per_order_min:1,per_order_max:2}])]);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});afterAll(()=>{if(enabled)fixture.stop()},30000);
const token=(n=1)=>String(n).padStart(64,'0');
const body=(n=1)=>({ticket:{eventId:'event',tier:0,qty:1},name:'Fixture buyer',email:'fixture@example.test',idempotencyKey:token(n)});
const request=(data:unknown,cookie=createCheckoutSession())=>new Request('https://urbangangtour.co.ke/api/paystack/checkout',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json',cookie:'ugt_checkout='+cookie},body:JSON.stringify(data)});
async function started(n=1,cookie=createCheckoutSession()){
 const response=await checkout(request(body(n),cookie));expect(response.status).toBe(200);
 const data=await response.json();expect(data).toMatchObject({total:500,attemptState:'ready',authorizationUrl:'https://checkout.paystack.com/fixture-ticket'});return {id:data.id as string,cookie};
}
const count=async(table:string)=>Number((await query('SELECT COUNT(*) AS n FROM '+table))[0].n);
const settle=(id:string)=>settlePaystackOrder({orderId:id,reference:id,amountKes:500});
test('default-closed ticket flag rejects before ledger or provider work',async()=>{
 vi.stubEnv('PAYSTACK_TICKETS_ENABLED','');const response=await checkout(request(body()));expect(response.status).toBe(503);expect(await count('orders')).toBe(0);expect(state.init).not.toHaveBeenCalled();
});
test.each([{items:[{id:'tee',qty:1}]},{fulfillment:{method:'pickup'}},{promoCode:'FREE'},{ticket:{eventId:'event',tier:0,qty:1,price:1}},{ticket:{eventId:'event',tier:0,qty:1.5}}])('rejects mixed or untrusted ticket input %j',async patch=>{
 expect((await checkout(request({...body(),...patch}))).status).toBe(400);expect(await count('orders')).toBe(0);expect(state.init).not.toHaveBeenCalled();
});
test('server pricing and the persisted hold precede the only provider initialization',async()=>{
 state.init.mockImplementation(async(input:any)=>{expect(input.amountKes).toBe(500);expect(input.channels).toEqual(['card','mobile_money']);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});return {ok:true,url:'https://checkout.paystack.com/fixture-ticket'}});
 const {id,cookie}=await started();const replay=await checkout(request(body(),cookie));expect((await replay.json()).id).toBe(id);expect(state.init).toHaveBeenCalledTimes(1);expect(await count('orders')).toBe(1);
 expect((await checkout(request({...body(),ticket:{eventId:'event',tier:0,qty:2}},cookie))).status).toBe(409);
});
test('the order snapshot is atomic with attempt creation so a cold retry cannot lose ticket identity',async()=>{
 await fixture.schema('ALTER TABLE orders ADD CONSTRAINT require_ticket_snapshot CHECK(paystack_ticket IS NOT NULL)');
 try{await started();expect(state.init).toHaveBeenCalledTimes(1)}finally{await fixture.schema('ALTER TABLE orders DROP CONSTRAINT require_ticket_snapshot')}
});
test('the merchandise send-claim helper cannot bypass the ticket capacity transaction',async()=>{
 const identity=paystackAttemptIdentity('isolated-fixture-owner',token(),{ticket:{eventId:'event',tier:0,qty:1}}),purchase={eventId:'event',tier:0,qty:1,tierName:'General',unit:500,name:'Fixture event - General'};
 await preparePaystackAttempt(identity,{id:'ORD-GENERICCLAIM',items:[{id:'ticket:event:0',qty:1,unit:500}],total:500,name:'Fixture buyer',phone:'',email:'',userId:null,fulfillment:null,ticket:purchase});
 expect(await claimPaystackInitiation(identity)).toBeNull();expect(await count('ticket_reservations')).toBe(0);
});
test('a ticket claim rejects ledger lines that disagree with its immutable quantity snapshot',async()=>{
 const identity=paystackAttemptIdentity('isolated-fixture-owner',token(),{ticket:{eventId:'event',tier:0,qty:1}}),purchase={eventId:'event',tier:0,qty:1,tierName:'General',unit:500,name:'Fixture event - General'};
 await preparePaystackAttempt(identity,{id:'ORD-LINEMISMATCH',items:[{id:'ticket:event:0',qty:2,unit:500,name:purchase.name}],total:500,name:'Fixture buyer',phone:'',email:'',userId:null,fulfillment:null,ticket:purchase});
 await expect(claimPaystackTicket(identity,'ORD-LINEMISMATCH',purchase)).rejects.toThrow('reservation_conflict');expect(await count('ticket_reservations')).toBe(0);
});
test('a stale send retry cannot deadlock with saving the original authorization',async()=>{
 await ensurePaystackTicketSchema();
 const identity=paystackAttemptIdentity('isolated-lock-owner',token(),{ticket:{eventId:'event',tier:0,qty:1}}),purchase={eventId:'event',tier:0,qty:1,tierName:'General',unit:500,name:'Fixture event - General'},id='ORD-AUTHORIZATIONRACE';
 await preparePaystackAttempt(identity,{id,items:[{id:'ticket:event:0',qty:1,unit:500,name:purchase.name}],total:500,name:'Fixture buyer',phone:'',email:'',userId:null,fulfillment:null,ticket:purchase});
 const claimed=await claimPaystackTicket(identity,id,purchase);expect(claimed).not.toBeNull();
 const authorization=fixture.connect();let retry:ReturnType<typeof claimPaystackTicket>|undefined;
 try{
  await authorization.query('BEGIN');
  // Match the provider-result writer's first lock before letting the stale
  // retry acquire its order lock. Every statement uses a real SQL session.
  await authorization.query('SELECT id FROM paystack_checkout_attempts WHERE id=$1 FOR UPDATE',[claimed!.attempt.id]);
  let signal!:()=>void;const locked=new Promise<void>(resolve=>{signal=resolve});state.orderLocked=signal;
  retry=claimPaystackTicket(identity,id,purchase);await locked;
  state.q.mockImplementationOnce(async(sql:string,args:unknown[])=>normalize((await authorization.query(sql,args)).rows));
  const saved=recordPaystackAuthorization(claimed!.attempt.id,claimed!.nonce,'https://checkout.paystack.com/fixture-ticket').then(async result=>{await authorization.query('COMMIT');return result});
  const results=await Promise.allSettled([retry,saved]);
  expect(results).toEqual([{status:'fulfilled',value:null},{status:'fulfilled',value:true}]);
  expect((await query('SELECT state,authorization_url FROM paystack_checkout_attempts WHERE order_id=$1',[id]))[0]).toMatchObject({state:'ready',authorization_url:'https://checkout.paystack.com/fixture-ticket'});
  expect(await count('ticket_reservations')).toBe(1);
 }finally{state.orderLocked=null;state.q.mockImplementation(query);await authorization.query('ROLLBACK').catch(()=>{});await authorization.end();await retry?.catch(()=>{})}
},30000);
test('verified money for changed ticket ledger lines is reviewed rather than minting extra admissions',async()=>{
 const {id}=await started();await fixture.query('UPDATE orders SET items=$2::jsonb WHERE id=$1',[id,JSON.stringify([{id:'ticket:event:0',qty:2,unit:500,name:'Fixture event - General'}])]);await settle(id);await processPaymentEffects(4,id);
 expect((await query('SELECT status,ticket_fulfillment_status FROM orders WHERE id=$1',[id]))[0]).toMatchObject({status:'paid',ticket_fulfillment_status:'refund_review'});expect(await count('tickets')).toBe(0);
},30000);
test.each(["tiers='[{\"name\":\"General\",\"price\":500}]'::jsonb","venue=''","event_date='2000-01-01'","sales_start_at=now()+interval '1 day'","sales_end_at=now()-interval '1 hour'"])(
 'unknown capacity, incomplete schedule or closed sales never dispatch: %s',async patch=>{
 await fixture.query('UPDATE tour_events SET '+patch);expect((await checkout(request(body()))).status).toBe(400);expect(state.init).not.toHaveBeenCalled();
});
test('independent concurrent buyers cannot initialize two payments for the final admission',async()=>{
 const responses=await Promise.all(Array.from({length:10},(_,i)=>checkout(request(body(i+1)))));expect(responses.filter(r=>r.status===200)).toHaveLength(1);expect(state.init).toHaveBeenCalledTimes(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
},30000);
test('a timeout retains the same reference and expired uncertain capacity without resending',async()=>{
 state.init.mockRejectedValueOnce(Error('provider_timeout'));const cookie=createCheckoutSession();const response=await checkout(request(body(),cookie));expect(response.status).toBe(202);const data=await response.json();expect(data.attemptState).toBe('unknown');
 await fixture.query("UPDATE ticket_reservations SET expires_at=now()-interval '2 days'");expect(await expireStaleReservations()).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
 expect((await(await checkout(request(body(),cookie))).json()).id).toBe(data.id);expect(state.init).toHaveBeenCalledTimes(1);
});
test('ready and legacy failed ledgers never lose a potentially payable hosted hold on a timer',async()=>{
 const {id}=await started();await fixture.query("UPDATE ticket_reservations SET expires_at=now()-interval '2 days'");await fixture.query("UPDATE orders SET status='failed' WHERE id=$1",[id]);expect(await expireStaleReservations()).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
});
test.each(['sales_paused','cancelled','postponed','rescheduled'])('lifecycle %s cannot dispatch a new payment',async eventStatus=>{
 await fixture.query('UPDATE tour_events SET status=$1',[eventStatus]);expect((await checkout(request(body()))).status).toBe(400);expect(state.init).not.toHaveBeenCalled();
});
test('a send-claim write failure atomically rolls back the seat and retries without an orphaned send',async()=>{
 await fixture.schema("CREATE FUNCTION reject_ticket_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='initiating' THEN RAISE EXCEPTION 'fixture_claim_failed'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_ticket_claim BEFORE UPDATE ON paystack_checkout_attempts FOR EACH ROW EXECUTE FUNCTION reject_ticket_claim()");
 const cookie=createCheckoutSession();try{expect((await checkout(request(body(),cookie))).status).toBe(503);expect(await count('ticket_reservations')).toBe(0);expect(state.init).not.toHaveBeenCalled()}finally{await fixture.schema('DROP TRIGGER reject_ticket_claim ON paystack_checkout_attempts;DROP FUNCTION reject_ticket_claim()')}
 await started(1,cookie);expect(state.init).toHaveBeenCalledTimes(1);
});
test('duplicate settlement mints one stable set and only then makes the receipt durable',async()=>{
 const {id}=await started();const results=await Promise.all(Array.from({length:10},()=>settle(id)));expect(results.filter(Boolean)).toHaveLength(1);
 await Promise.all([processPaymentEffects(4,id),processPaymentEffects(4,id)]);await processPaymentEffects(4,id);
 expect(await count('tickets')).toBe(1);expect(await count('email_delivery_outbox')).toBe(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
 const order=(await query('SELECT * FROM orders WHERE id=$1',[id]))[0];const first=await ensureTickets(order);expect(await ensureTickets(order)).toEqual(first);
},30000);
test('normal sales closure after dispatch honors an already held paid seat',async()=>{
 const {id}=await started();await fixture.query("UPDATE tour_events SET status='sales_paused',sales_end_at=now()-interval '1 hour'");expect(await settle(id)).toMatchObject({status:'paid'});expect((await query('SELECT ticket_fulfillment_status FROM orders WHERE id=$1',[id]))[0].ticket_fulfillment_status).toBe('reserved');
});
test.each(['cancelled','postponed','rescheduled'])('money arriving after event %s is recorded for manual refund review without tickets',async eventStatus=>{
 const {id}=await started();await fixture.query('UPDATE tour_events SET status=$1',[eventStatus]);await settle(id);await processPaymentEffects(4,id);
 const order=(await query('SELECT * FROM orders WHERE id=$1',[id]))[0];expect(order).toMatchObject({status:'paid',ticket_fulfillment_status:'refund_review'});expect(order.ticket_payment_received_at).toBeTruthy();expect(await ensureTickets(order)).toEqual([]);expect(await count('tickets')).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:0});
 const publicState=await(await status(new Request('https://urbangangtour.co.ke/api/orders/status?id='+id))).json();expect(publicState).toMatchObject({status:'paid',ticketFulfillment:'refund_review',delivery:{tickets:'review'}});
 await recordRefund({orderId:id,amountKes:500,reason:'External return completed',actor:'fixture',requestId:'a'.repeat(32),externalReference:'BANK-RETURN-001',externalConfirmed:true,ticketCodes:[]});expect((await query('SELECT status,ticket_fulfillment_status FROM orders WHERE id=$1',[id]))[0]).toMatchObject({status:'refunded',ticket_fulfillment_status:'refunded'});
},30000);
test('late success after released seats were reallocated records money but cannot oversell or mint',async()=>{
 const old=await started();await fixture.query("UPDATE ticket_reservations SET status='released' WHERE order_id=$1",[old.id]);await fixture.query("UPDATE orders SET status='failed' WHERE id=$1",[old.id]);
 const next=await started(2);expect(await settle(old.id)).toBeNull();const oldOrder=(await query('SELECT * FROM orders WHERE id=$1',[old.id]))[0];expect(oldOrder).toMatchObject({status:'paid',ticket_fulfillment_status:'refund_review'});expect(oldOrder.ticket_payment_received_at).toBeTruthy();expect(await ensureTickets(oldOrder)).toEqual([]);
 await settle(next.id);await processPaymentEffects(4,next.id);expect(await count('tickets')).toBe(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});expect(await settle(old.id)).toBeNull();
},30000);
test('manual fulfillment cannot relabel an unfulfillable paid ticket as delivered',async()=>{
 const {id}=await started();await fixture.query("UPDATE tour_events SET status='cancelled'");await settle(id);
 const response=await saveAdmin(new Request('https://urbangangtour.co.ke/api/admin/save',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'orderStatus',data:{id,status:'fulfilled',expectedStatus:'paid'}})}));
 expect(response.status).toBe(409);expect((await query('SELECT status FROM orders WHERE id=$1',[id]))[0].status).toBe('paid');
});
test('late success can reacquire an actually free finite seat while new sales are eligible',async()=>{
 const {id}=await started();await fixture.query("UPDATE ticket_reservations SET status='released' WHERE order_id=$1",[id]);await fixture.query("UPDATE orders SET status='failed' WHERE id=$1",[id]);expect(await settle(id)).toMatchObject({status:'paid'});await processPaymentEffects(4,id);expect(await count('tickets')).toBe(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
},30000);
test('turning the launch flag off does not strand already initiated money or entitlement',async()=>{
 const {id}=await started();vi.stubEnv('PAYSTACK_TICKETS_ENABLED','');expect(await settle(id)).toMatchObject({status:'paid'});await processPaymentEffects(4,id);expect(await count('tickets')).toBe(1);
},30000);
test('a full external refund committed before mint prevents entitlement and gate admission',async()=>{
 const {id}=await started();await settle(id);const stale=(await query('SELECT * FROM orders WHERE id=$1',[id]))[0];await recordRefund({orderId:id,amountKes:500,reason:'External return completed',actor:'fixture',requestId:'b'.repeat(32),externalReference:'BANK-RETURN-002',externalConfirmed:true,ticketCodes:[]});expect(await ensureTickets(stale)).toEqual([]);await processPaymentEffects(4,id);expect(await count('tickets')).toBe(0);expect(await settle(id)).toBeNull();
});
test('a minted paid ticket is admitted exactly once by concurrent authenticated scans',async()=>{
 const {id}=await started();await settle(id);await processPaymentEffects(4,id);const code=(await query('SELECT code FROM tickets'))[0].code;
 const scanRequest=()=>new Request('https://urbangangtour.co.ke/api/tickets/verify',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({code})});
 const results=await Promise.all(Array.from({length:10},async()=>await(await scan(scanRequest())).json()));expect(results.filter(r=>r.result==='valid')).toHaveLength(1);expect(results.filter(r=>r.result==='used')).toHaveLength(9);
},30000);
test('signed failed-charge then signed late success retains the original seat and accounts once',async()=>{
 const {id}=await started();
 const signed=(event:string)=>{const raw=JSON.stringify({event,data:{reference:id,currency:'KES',status:event==='charge.success'?'success':'failed',amount:50000}});return new Request('https://urbangangtour.co.ke/api/paystack/webhook',{method:'POST',headers:{'x-paystack-signature':createHmac('sha512','isolated-ticket-provider-key').update(raw).digest('hex')},body:raw})};
 expect((await webhook(signed('charge.failed'))).status).toBe(200);await fixture.query("UPDATE ticket_reservations SET expires_at=now()-interval '2 days'");expect(await expireStaleReservations()).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
 expect((await webhook(signed('charge.success'))).status).toBe(200);const first=(await query('SELECT ticket_payment_received_at FROM orders'))[0].ticket_payment_received_at;
 expect((await webhook(signed('charge.success'))).status).toBe(200);expect((await query('SELECT ticket_payment_received_at FROM orders'))[0].ticket_payment_received_at).toBe(first);await processPaymentEffects(4,id);expect(await count('tickets')).toBe(1);
},30000);
test('an enqueue failure rolls back ticket settlement and retains its held admission for redelivery',async()=>{
 const {id}=await started();await fixture.schema("CREATE FUNCTION reject_ticket_effect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_enqueue_failed'; END $$;CREATE TRIGGER reject_ticket_effect BEFORE INSERT ON payment_effect_outbox FOR EACH ROW EXECUTE FUNCTION reject_ticket_effect()");
 try{await expect(settle(id)).rejects.toThrow();expect((await query('SELECT status,ticket_payment_received_at FROM orders WHERE id=$1',[id]))[0]).toMatchObject({status:'pending',ticket_payment_received_at:null});expect(await count('payment_effect_outbox')).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1})}finally{await fixture.schema('DROP TRIGGER reject_ticket_effect ON payment_effect_outbox;DROP FUNCTION reject_ticket_effect()')}
 await settle(id);await processPaymentEffects(4,id);expect(await count('tickets')).toBe(1);
},30000);
test('released-seat late settlement racing a new buyer never grants more than the one actual admission',async()=>{
 const old=await started();await fixture.query("UPDATE ticket_reservations SET status='released' WHERE order_id=$1",[old.id]);await fixture.query("UPDATE orders SET status='failed' WHERE id=$1",[old.id]);
 await Promise.all([settle(old.id),checkout(request(body(2)))]);const capacity=await ticketCapacity('event',0,'General');expect(capacity.sold+capacity.reserved).toBe(1);
 const ready=await query("SELECT id FROM orders WHERE status='pending' AND id<>$1",[old.id]);for(const order of ready)await settle(order.id);
 await processPaymentEffects(20);expect(await count('tickets')).toBe(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
},30000);
test('partial refund racing admission either returns that unused ticket or admits it, while preserving the other',async()=>{
 await fixture.query("UPDATE tour_events SET tiers='[{\"name\":\"General\",\"price\":500,\"capacity\":2}]'::jsonb");
 const response=await checkout(request({...body(),ticket:{eventId:'event',tier:0,qty:2}}));expect(response.status).toBe(200);const {id}=await response.json();await settlePaystackOrder({orderId:id,reference:id,amountKes:1000});await processPaymentEffects(4,id);
 const codes=await query('SELECT code FROM tickets ORDER BY position');expect(codes).toHaveLength(2);
 const scanCode=(code:string)=>scan(new Request('https://urbangangtour.co.ke/api/tickets/verify',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({code})}));
 const [refundResult,admission]=await Promise.allSettled([recordRefund({orderId:id,amountKes:500,reason:'External return completed',actor:'fixture',requestId:'c'.repeat(32),externalReference:'BANK-RACE-001',externalConfirmed:true,ticketCodes:[codes[0].code]}),scanCode(codes[0].code).then(r=>r.json())]);
 expect(admission.status).toBe('fulfilled');if(admission.status==='fulfilled')expect(admission.value.result).toBe(refundResult.status==='fulfilled'?'invalid':'valid');
 expect((await(await scanCode(codes[1].code)).json()).result).toBe('valid');expect((await(await scanCode(codes[1].code)).json()).result).toBe('used');
},30000);
const complimentary=()=>comp(new Request('https://urbangangtour.co.ke/api/admin/tickets/comp',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({eventId:'event',tier:0,qty:1,holderName:'Fixture guest',reason:'Owner-approved local fixture'})}));
test('a complimentary issue cannot consume the final admission held for a payable hosted checkout',async()=>{
 await started();expect((await complimentary()).status).toBe(409);expect(await count('tickets')).toBe(0);expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
});
test('an actual complimentary handler racing paid checkout shares the event lock and the final seat',async()=>{
 const [payment,free]=await Promise.all([checkout(request(body())),complimentary()]);expect([payment.status,free.status].sort()).toEqual(free.status===200?[200,400]:[200,409]);
 const capacity=await ticketCapacity('event',0,'General');expect(capacity.sold+capacity.reserved).toBe(1);
 if(payment.status===200){const {id}=await payment.json();await settle(id);await processPaymentEffects(4,id)}
 expect(await count('tickets')).toBe(1);expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
},30000);
test('the complimentary event lock prevents two synchronized capacity snapshots from granting the final seat',async()=>{
 await ensurePaystackTicketSchema();const identity=paystackAttemptIdentity('isolated-race-owner',token(),{ticket:{eventId:'event',tier:0,qty:1}}),purchase={eventId:'event',tier:0,qty:1,tierName:'General',unit:500,name:'Fixture event - General'};
 await preparePaystackAttempt(identity,{id:'ORD-SYNCHRONIZEDRACE',items:[{id:'ticket:event:0',qty:1,unit:500,name:purchase.name}],total:500,name:'Fixture buyer',phone:'',email:'',userId:null,fulfillment:null,ticket:purchase});
 let release!:()=>void,arrivals=0;const barrier=new Promise<void>(resolve=>{release=resolve}),timer=setTimeout(()=>release(),2000);
 // Under the real event lock only one transaction can reach this point until
 // it commits; without that lock both would use the same stale free-seat count.
 state.capacityBarrier=async()=>{if(++arrivals===2)release();await barrier};
 try{
  const [paid,free]=await Promise.allSettled([claimPaystackTicket(identity,'ORD-SYNCHRONIZEDRACE',purchase),complimentary()]);
  expect(free.status).toBe('fulfilled');const winners=Number(paid.status==='fulfilled'&&paid.value!==null)+Number(free.status==='fulfilled'&&free.value.status===200);expect(winners).toBe(1);
  const capacity=await ticketCapacity('event',0,'General');expect(capacity.sold+capacity.reserved).toBe(1);
 }finally{clearTimeout(timer);state.capacityBarrier=null}
},30000);
test('an authorized untracked complimentary issue retains its existing semantics without opening paid ticket sales',async()=>{
 await fixture.query("UPDATE tour_events SET tiers='[{\"name\":\"General\",\"price\":500}]'::jsonb");expect((await checkout(request(body()))).status).toBe(400);expect((await complimentary()).status).toBe(200);expect(state.init).not.toHaveBeenCalled();
});
