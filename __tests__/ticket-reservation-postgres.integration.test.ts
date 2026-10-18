import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const adapter=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn(),pool:vi.fn(),stk:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:adapter.q,qSchema:adapter.qSchema,db:adapter.pool,hasDb:()=>true}));
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:()=>{}}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'isolated-fixture',PURCHASE_NETWORK_LIMIT:1000,PUBLIC_READ_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:async()=>{},validatedCurrentBuyer:async()=>null}));
vi.mock('@/lib/server/catalog',()=>({serverTotalWithPromos:async(items:{id:string;qty:number}[])=>({total:items.reduce((n,line)=>n+500*line.qty,0),lines:items.map(line=>({...line,name:'Fixture merchandise',unit:500})),appliedPromoCode:null})}));
vi.mock('@/lib/server/merch-variants',()=>({applyVerifiedMerchVariants:async(_input:unknown,lines:unknown[])=>({lines,adjustment:0})}));
vi.mock('@/lib/server/merch-personalization',()=>({applyVerifiedMerchPersonalization:async(_input:unknown,lines:unknown[])=>lines}));
vi.mock('@/lib/server/inventory',()=>({assertMerchStockAvailable:async()=>{}}));
vi.mock('@/lib/server/mpesa',async original=>({...await original<typeof import('@/lib/server/mpesa')>(),mpesaConfigured:()=>true,stkPush:adapter.stk}));
vi.mock('@/lib/server/alert',()=>({alertCritical:async()=>{}}));
vi.mock('@/lib/server/notify',()=>({notifyNewOrder:async()=>{}}));
vi.mock('@/lib/server/affiliate-program',()=>({recordOrderReferral:async()=>false}));
import {ensureTicketInventorySchema,holdTickets,ticketCapacity,expireStaleReservations,consumeReservation} from '@/lib/server/ticket-inventory';
import {POST as createOrder} from '@/app/api/orders/route';
import {POST as recoverOrder} from '@/app/api/checkout/recovery/route';
import {createCheckoutSession} from '@/lib/server/checkout-session';
const enabled=process.env.UGT_TICKET_PG_FIXTURE==='1',fixture=new DisposablePostgres();
beforeAll(async()=>{
 if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INT NOT NULL,status TEXT DEFAULT 'pending',mpesa_ref TEXT,name TEXT,email TEXT,phone TEXT,user_id INTEGER);
 CREATE TABLE order_delivery_preferences(order_id TEXT PRIMARY KEY REFERENCES orders(id),method TEXT NOT NULL,fee INT,address JSONB);
 CREATE TABLE tour_events(id TEXT PRIMARY KEY,slug TEXT DEFAULT 'event',name TEXT DEFAULT 'Fixture event',kind TEXT,status TEXT,event_date DATE,venue TEXT,tiers JSONB,sales_start_at TIMESTAMPTZ,sales_end_at TIMESTAMPTZ);
 CREATE TABLE tickets(code TEXT PRIMARY KEY,order_id TEXT,event_id TEXT,tier_name TEXT,voided_at TIMESTAMPTZ);`);
 adapter.q.mockImplementation((text:string,args:unknown[]=[])=>fixture.query(text,args));adapter.qSchema.mockImplementation((text:string)=>fixture.schema(text));adapter.pool.mockImplementation(()=>fixture.pool());
 await ensureTicketInventorySchema();
},20000);
beforeEach(async()=>{if(!enabled)return;adapter.stk.mockReset().mockResolvedValue({ResponseCode:'0',CheckoutRequestID:'LOCAL-PROVIDER'});await fixture.query('TRUNCATE mpesa_checkout_attempts,ticket_reservations,tickets,orders,tour_events,order_delivery_preferences;');await fixture.query("INSERT INTO tour_events(id,kind,status,event_date,venue,tiers) VALUES('event','ticketed','published','2099-12-01','Fixture venue',$1::jsonb)",[JSON.stringify([{name:'General',price:500,capacity:1,per_order_min:1,per_order_max:2}])])});
afterAll(()=>fixture.stop(),20000);
const test=it.skipIf(!enabled);
async function order(id:string,qty=1){await fixture.query('INSERT INTO orders(id,items,total) VALUES($1,$2::jsonb,$3)',[id,JSON.stringify([{id:'ticket:event:0',qty}]),500*qty]);return {eventId:'event',tierIndex:0,qty,orderId:id}}
test('20 real concurrent buyers cannot reserve the same final admission',async()=>{
 const inputs=await Promise.all(Array.from({length:20},(_,i)=>order('ORD-BUYER-'+i)));
 const outcomes=await Promise.allSettled(inputs.map(input=>holdTickets(input)));
 expect(outcomes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 expect((await fixture.query("SELECT COUNT(*)::text AS n FROM ticket_reservations WHERE status='held'"))[0].n).toBe('1');
 expect(await ticketCapacity('event',0,'General')).toEqual({sold:0,reserved:1});
 expect((await fixture.query("SELECT COUNT(*)::text AS n FROM pg_stat_activity WHERE application_name='psql'"))[0].n).toBe('1');
},20000);
test('a retry uses the same reservation and rejects changed quantities',async()=>{
 const input=await order('ORD-RETRY');const ids=await Promise.all([holdTickets(input),holdTickets(input)]);expect(ids[0]).toBe(ids[1]);
 await expect(holdTickets({...input,qty:2})).rejects.toThrow('reservation_conflict');
 expect((await fixture.query('SELECT COUNT(*)::text AS n FROM ticket_reservations'))[0].n).toBe('1');
});
test('a confirmed order occupies a seat before asynchronous minting, without double counting its held seat',async()=>{
 const input=await order('ORD-PAID');await holdTickets(input);await fixture.query("UPDATE orders SET status='paid' WHERE id=$1",[input.orderId]);await consumeReservation(input.orderId);
 expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
 await expect(holdTickets(await order('ORD-SECOND'))).rejects.toThrow('sold_out');
 await fixture.query("INSERT INTO tickets(code,order_id,event_id,tier_name) VALUES('FIXTURE-TICKET',$1,'event','General')",[input.orderId]);
 expect(await ticketCapacity('event',0,'General')).toEqual({sold:1,reserved:0});
});
test('uncertain expired sends stay reserved until reconciliation, while a known prepared checkout can expire',async()=>{
 const input=await order('ORD-UNCERTAIN');await holdTickets(input);await fixture.query("UPDATE ticket_reservations SET expires_at=now()-interval '1 hour'");
 expect(await expireStaleReservations()).toBe(0); // Legacy pending is uncertain, not proof of no send.
 expect((await ticketCapacity('event',0,'General')).reserved).toBe(1);
 await expect(holdTickets(await order('ORD-BLOCKED'))).rejects.toThrow('sold_out');
 await fixture.query("INSERT INTO mpesa_checkout_attempts(id,scope_hash,token_hash,request_hash,order_id,total) VALUES('fixture',$1,$2,$3,$4,500)",['a'.repeat(64),'b'.repeat(64),'c'.repeat(64),input.orderId]);
 expect(await expireStaleReservations()).toBe(1);expect((await ticketCapacity('event',0,'General')).reserved).toBe(0);
 await holdTickets({eventId:'event',tierIndex:0,qty:1,orderId:'ORD-BLOCKED'});
});
test('paused events and a failed reservation write fail closed',async()=>{
 const input=await order('ORD-PAUSE');await fixture.query("UPDATE tour_events SET status='sales_paused'");await expect(holdTickets(input)).rejects.toThrow('event_not_sellable');
 await fixture.query("UPDATE tour_events SET status='published'");
 await fixture.schema("CREATE FUNCTION reject_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_hold_failed'; END $$; CREATE TRIGGER reject_hold BEFORE INSERT ON ticket_reservations FOR EACH ROW EXECUTE FUNCTION reject_hold();");
 try{await expect(holdTickets(input)).rejects.toThrow();expect((await fixture.query('SELECT COUNT(*)::text AS n FROM ticket_reservations'))[0].n).toBe('0')}
 finally{await fixture.schema('DROP TRIGGER reject_hold ON ticket_reservations;DROP FUNCTION reject_hold();')}
});
test('settlement racing another reservation never exposes a phantom free seat',async()=>{
 const input=await order('ORD-RACE');await holdTickets(input);const next=await order('ORD-OTHER');
 const [result]=await Promise.allSettled([holdTickets(next),(async()=>{await fixture.query("UPDATE orders SET status='paid' WHERE id=$1",[input.orderId]);await consumeReservation(input.orderId)})()]);
 expect(result.status).toBe('rejected');expect((await ticketCapacity('event',0,'General')).sold).toBe(1);
});
const input={name:'Local checkout',phone:'0700000000',idempotencyKey:'0123456789abcdef0123456789abcdef',items:[{id:'fixture-merch',qty:1}]};
function request(path:string,body:unknown,cookie:string){return new Request('https://urbangangtour.co.ke'+path,{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json',cookie:'ugt_checkout='+cookie},body:JSON.stringify(body)})}
test('20 actual order handlers with independent SQL sessions initiate the fake provider once',async()=>{
 const cookie=createCheckoutSession();const responses=await Promise.all(Array.from({length:20},()=>createOrder(request('/api/orders',input,cookie))));
 const data=await Promise.all(responses.map(response=>response.json()));expect(data.every(row=>typeof row.id==='string')).toBe(true);
 expect(new Set(data.map(row=>row.id)).size).toBe(1);expect(adapter.stk).toHaveBeenCalledTimes(1);
 expect((await fixture.query('SELECT COUNT(*)::text AS n FROM orders'))[0].n).toBe('1');
 const replay=await createOrder(request('/api/orders',input,cookie));expect(replay.status).toBe(202);expect(adapter.stk).toHaveBeenCalledTimes(1);
 const changed=await createOrder(request('/api/orders',{...input,items:[{id:'fixture-merch',qty:2}]},cookie));expect(changed.status).toBe(409);
},30000);
test('owner-cookie recovery needs no contact details, and copied keys cannot expose another browser order',async()=>{
 const cookie=createCheckoutSession();await createOrder(request('/api/orders',input,cookie));
 const response=await recoverOrder(request('/api/checkout/recovery',{key:input.idempotencyKey},cookie)),data=await response.json();
 expect(data).toMatchObject({ok:true,total:500,attemptState:'reference_recorded'});expect(JSON.stringify(data)).not.toContain('0700000000');expect(JSON.stringify(data)).not.toContain('Local checkout');
 expect((await recoverOrder(request('/api/checkout/recovery',{key:input.idempotencyKey},createCheckoutSession()))).status).toBe(404);
 expect((await createOrder(request('/api/orders',input,'forged'))).status).toBe(428);
});
test('provider timeout and a lost reference write recover the original order without a second prompt',async()=>{
 const cookie=createCheckoutSession();adapter.stk.mockRejectedValueOnce(Error('fixture_timeout'));
 const first=await createOrder(request('/api/orders',input,cookie));expect(first.status).toBe(202);expect(await first.json()).toMatchObject({attemptState:'unknown'});
 await createOrder(request('/api/orders',input,cookie));expect(adapter.stk).toHaveBeenCalledTimes(1);
 const next={...input,idempotencyKey:'abcdef0123456789abcdef0123456789'};
 await fixture.schema("CREATE FUNCTION reject_reference_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='reference_recorded' THEN RAISE EXCEPTION 'fixture_reference_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_reference_write BEFORE UPDATE ON mpesa_checkout_attempts FOR EACH ROW EXECUTE FUNCTION reject_reference_write();");
 try{const failed=await createOrder(request('/api/orders',next,cookie));expect((await failed.json()).attemptState).toBe('unknown');await createOrder(request('/api/orders',next,cookie));expect(adapter.stk).toHaveBeenCalledTimes(2)}
 finally{await fixture.schema('DROP TRIGGER reject_reference_write ON mpesa_checkout_attempts;DROP FUNCTION reject_reference_write();')}
});
test('two ticket checkouts cannot start payments for one remaining admission',async()=>{
 const cookie=createCheckoutSession();const ticket={name:input.name,phone:input.phone,ticket:{eventId:'event',tier:0,qty:1}};
 const responses=await Promise.all([input.idempotencyKey,'abcdef0123456789abcdef0123456789'].map(idempotencyKey=>createOrder(request('/api/orders',{...ticket,idempotencyKey},cookie))));
 expect(responses.filter(response=>response.status===200)).toHaveLength(1);expect(adapter.stk).toHaveBeenCalledTimes(1);
 expect((await ticketCapacity('event',0,'General')).reserved).toBe(1);
});
test('a crash after holding the final seat but before send permission can resume the same reservation',async()=>{
 const cookie=createCheckoutSession(),ticket={name:input.name,phone:input.phone,idempotencyKey:input.idempotencyKey,ticket:{eventId:'event',tier:0,qty:1}};
 await fixture.schema("CREATE FUNCTION reject_claim() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='initiating' THEN RAISE EXCEPTION 'fixture_claim_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_claim BEFORE UPDATE ON mpesa_checkout_attempts FOR EACH ROW EXECUTE FUNCTION reject_claim();");
 try{expect((await createOrder(request('/api/orders',ticket,cookie))).status).toBe(503);expect(adapter.stk).not.toHaveBeenCalled()}
 finally{await fixture.schema('DROP TRIGGER reject_claim ON mpesa_checkout_attempts;DROP FUNCTION reject_claim();')}
 expect((await createOrder(request('/api/orders',ticket,cookie))).status).toBe(200);expect(adapter.stk).toHaveBeenCalledTimes(1);
 expect((await fixture.query('SELECT COUNT(*)::text AS n FROM ticket_reservations'))[0].n).toBe('1');
});
