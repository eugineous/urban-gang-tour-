// Actual persistence SQL on isolated, disposable PostgreSQL; never DATABASE_URL.
// UGT_PAYSTACK_ATTEMPT_PG_FIXTURE=1 opts in. The helper enforces network isolation.
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {DisposablePostgres} from './helpers/disposable-postgres';
const adapter=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn()}));
vi.mock('@/lib/server/db',()=>adapter);
import * as attempts from '@/lib/server/paystack-attempts';
const enabled=process.env.UGT_PAYSTACK_ATTEMPT_PG_FIXTURE==='1',fixture=new DisposablePostgres();
beforeAll(async()=>{
 if(!enabled)return;
 fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});
 await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INTEGER NOT NULL,name TEXT,email TEXT,phone TEXT,user_id INTEGER,status TEXT DEFAULT 'pending',pay_method TEXT,paystack_ref TEXT);
 CREATE TABLE order_delivery_preferences(order_id TEXT PRIMARY KEY REFERENCES orders(id),method TEXT NOT NULL,fee INTEGER NOT NULL,address JSONB);`);
 adapter.q.mockImplementation((text:string,args:unknown[]=[])=>fixture.query(text,args));
 adapter.qSchema.mockImplementation((text:string)=>fixture.schema(text));
 await attempts.ensurePaystackAttemptSchema();
},20000);
beforeEach(async()=>{if(enabled)await fixture.query('TRUNCATE paystack_checkout_attempts,order_delivery_preferences,orders')});
afterAll(()=>fixture.stop(),20000);
const test=it.skipIf(!enabled),token='0123456789abcdef0123456789abcdef';
const purchase={items:[{id:'tee',qty:1}],contact:{name:'Local fixture',email:'fixture@example.test'},fulfillment:{method:'pickup'}};
const identity=(owner='validated-account:1',request:unknown=purchase)=>attempts.paystackAttemptIdentity(owner,token,request);
const order=(total=1000):attempts.AttemptOrder=>({id:'ORD-'+randomUUID().replaceAll('-','').toUpperCase(),items:purchase.items,total,name:'Local fixture',email:'fixture@example.test',phone:'254700000000',userId:1,fulfillment:{method:'pickup',fee:0,address:null},context:{promoId:3,referralCode:'LOCAL'}});
const count=async(table:string)=>Number((await fixture.query('SELECT count(*) AS count FROM '+table))[0].count);
const ledger=async()=> (await fixture.query('SELECT * FROM orders'))[0];
const url='https://checkout.paystack.com/local_checkout';
test('concurrent prepares and claims create one card ledger and permit one provider initialization',async()=>{
 const prepared=await Promise.all(Array.from({length:20},()=>attempts.preparePaystackAttempt(identity(),order())));
 expect(prepared.filter(value=>value.created)).toHaveLength(1);expect(new Set(prepared.map(value=>value.attempt.orderId)).size).toBe(1);
 expect(await count('orders')).toBe(1);expect(await count('order_delivery_preferences')).toBe(1);expect(await count('paystack_checkout_attempts')).toBe(1);
 expect(await ledger()).toMatchObject({status:'pending',pay_method:'card',paystack_ref:prepared[0].attempt.orderId});
 const claims=await Promise.all(Array.from({length:20},()=>attempts.claimPaystackInitiation(identity())));
 expect(claims.filter(Boolean)).toHaveLength(1);
 const claim=claims.find(Boolean)!;expect(await attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,url)).toBe(true);
 expect(await attempts.recoverPaystackAttempt(identity())).toMatchObject({state:'ready',authorizationUrl:url});
 expect((await ledger()).status).toBe('pending');
},20000);
test('cold retries preserve accepted server pricing, lines and promotion context',async()=>{
 const first=await attempts.preparePaystackAttempt(identity(),order());
 vi.resetModules();const cold=await import('@/lib/server/paystack-attempts');
 expect(await cold.preparePaystackAttempt(identity(),{...order(2500),items:[{id:'changed',qty:8}],context:{promoId:8,referralCode:'CHANGED'}})).toEqual({attempt:first.attempt,created:false});
 expect(await cold.savedPaystackPurchase(identity())).toEqual({items:purchase.items,total:1000,context:{promoId:3,referralCode:'LOCAL'}});
 expect((await cold.claimPaystackInitiation(identity()))?.attempt.total).toBe(1000);
 expect(await count('orders')).toBe(1);
});
test('changed requests conflict and another owner cannot recover a copied token',async()=>{
 await attempts.preparePaystackAttempt(identity(),order());
 const changed=identity('validated-account:1',{...purchase,items:[{id:'tee',qty:2}]});
 await expect(attempts.preparePaystackAttempt(changed,order())).rejects.toThrow('attempt_request_conflict');
 await expect(attempts.recoverPaystackAttempt(changed)).rejects.toThrow('attempt_request_conflict');
 await expect(attempts.savedPaystackPurchase(changed)).rejects.toThrow('attempt_not_found');
 expect(await attempts.claimPaystackInitiation(changed)).toBeNull();
 expect(await attempts.findOwnedPaystackAttempt('validated-account:2',token)).toBeNull();
 expect(await attempts.recoverPaystackAttempt(identity('validated-account:2'))).toBeNull();
 const owned=await attempts.findOwnedPaystackAttempt('validated-account:1',token);
 expect(owned).toMatchObject({total:1000,state:'prepared',paymentStatus:'pending'});
 expect(JSON.stringify(owned)).not.toMatch(/fixture@example|254700|Local fixture|claim_nonce|scope_hash/);
});
test('ledger and delivery failures atomically roll back the attempt and financial rows',async()=>{
 await fixture.schema("CREATE FUNCTION reject_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_write_failure'; END $$");
 for(const table of ['orders','order_delivery_preferences']){
  await fixture.schema(`CREATE TRIGGER reject_fixture BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION reject_fixture()`);
  try{await expect(attempts.preparePaystackAttempt(identity(),order())).rejects.toThrow();expect(await count('paystack_checkout_attempts')).toBe(0);expect(await count('orders')).toBe(0)}
  finally{await fixture.schema(`DROP TRIGGER reject_fixture ON ${table}`)}
 }
 await fixture.schema('DROP FUNCTION reject_fixture()');
});
test('uncertain initialization is nonce-bound, marks only pending ledger unknown and never grants a resend',async()=>{
 const first=await attempts.preparePaystackAttempt(identity(),order());
 expect(await attempts.recoverPaystackAttempt(identity())).toEqual(first.attempt);
 const claim=(await attempts.claimPaystackInitiation(identity()))!;
 expect(await attempts.markPaystackInitiationUnknown(claim.attempt.id,'wrong-nonce')).toBe(false);
 expect(await attempts.markPaystackInitiationUnknown(claim.attempt.id,claim.nonce)).toBe(true);
 expect((await ledger()).status).toBe('unknown');
 await fixture.query("UPDATE paystack_checkout_attempts SET updated_at=now()-interval '2 days'");
 vi.resetModules();const cold=await import('@/lib/server/paystack-attempts');
 expect(await cold.claimPaystackInitiation(identity())).toBeNull();
 expect(await cold.recoverPaystackAttempt(identity())).toMatchObject({state:'unknown'});
 expect(await cold.recordPaystackAuthorization(claim.attempt.id,claim.nonce,url)).toBe(true);
 expect(await cold.claimPaystackInitiation(identity())).toBeNull();
});
test('authorization storage rejects unsafe destinations, another nonce and conflicting replacements',async()=>{
 await attempts.preparePaystackAttempt(identity(),order());const claim=(await attempts.claimPaystackInitiation(identity()))!;
 for(const unsafe of ['http://checkout.paystack.com/token','https://checkout.paystack.com.evil.test/token','https://user@checkout.paystack.com/token','https://checkout.paystack.com:443/token','https://checkout.paystack.com/token#fragment','https://checkout.paystack.com/','https://checkout.paystack.com/token?next=evil'])await expect(attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,unsafe)).rejects.toThrow('invalid_authorization_url');
 expect(await attempts.recordPaystackAuthorization(claim.attempt.id,'wrong-nonce',url)).toBe(false);
 const results=await Promise.all([url,'https://checkout.paystack.com/another_checkout'].map(value=>attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,value)));
 expect(results.filter(Boolean)).toHaveLength(1);
 const saved=(await attempts.recoverPaystackAttempt(identity()))!.authorizationUrl!;
 expect(await attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,saved)).toBe(true);
 expect(await attempts.markPaystackInitiationUnknown(claim.attempt.id,claim.nonce)).toBe(false);
 expect((await ledger()).status).toBe('pending');
});
test('ready URLs are withheld when the current ledger is settled, rebound, repriced or uses another method',async()=>{
 for(const [index,update]of ["status='paid'","status='failed'","pay_method='mpesa'","paystack_ref='OTHER'","total=999"].entries()){
  const owner='validated-account:guard-'+index,scoped=identity(owner),prepared=await attempts.preparePaystackAttempt(scoped,order());
  const claim=(await attempts.claimPaystackInitiation(scoped))!;expect(await attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,url)).toBe(true);
  await fixture.query('UPDATE orders SET '+update+' WHERE id=$1',[prepared.attempt.orderId]);
  expect((await attempts.recoverPaystackAttempt(scoped))!.authorizationUrl).toBeUndefined();
  expect((await attempts.findOwnedPaystackAttempt(owner,token))!.authorizationUrl).toBeUndefined();
  expect(await attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,url)).toBe(false);
  expect(await attempts.claimPaystackInitiation(scoped)).toBeNull();
 }
},20000);
test('pre-provider rejection never changes an already paid ledger or reopens a ready attempt',async()=>{
 await attempts.preparePaystackAttempt(identity(),order());const claim=(await attempts.claimPaystackInitiation(identity()))!;
 expect(await attempts.markPaystackInitiationRejected(claim.attempt.id,'wrong-nonce')).toBe(false);
 expect(await attempts.markPaystackInitiationRejected(claim.attempt.id,claim.nonce)).toBe(true);
 expect((await ledger()).status).toBe('failed');expect((await attempts.recoverPaystackAttempt(identity()))!.state).toBe('rejected');
 expect(await attempts.claimPaystackInitiation(identity())).toBeNull();expect(await attempts.recordPaystackAuthorization(claim.attempt.id,claim.nonce,url)).toBe(false);
 const paid=identity('validated-account:paid');await attempts.preparePaystackAttempt(paid,order());const paidClaim=(await attempts.claimPaystackInitiation(paid))!;
 await fixture.query("UPDATE orders SET status='paid' WHERE id=$1",[paidClaim.attempt.orderId]);
 expect(await attempts.markPaystackInitiationRejected(paidClaim.attempt.id,paidClaim.nonce)).toBe(false);
 expect(await attempts.markPaystackInitiationUnknown(paidClaim.attempt.id,paidClaim.nonce)).toBe(true);
 expect((await fixture.query('SELECT status FROM orders WHERE id=$1',[paidClaim.attempt.orderId]))[0].status).toBe('paid');
 expect(await attempts.recordPaystackAuthorization(paidClaim.attempt.id,paidClaim.nonce,url)).toBe(false);
},20000);
test('send claims require pending matching card ledgers and validation cannot create orphan attempts',async()=>{
 for(const total of [0,-1,0.5,2147483648])await expect(attempts.preparePaystackAttempt(identity(),order(total))).rejects.toThrow('invalid_attempt_order');
 for(const userId of [0,-1,0.5])await expect(attempts.preparePaystackAttempt(identity(),{...order(),userId})).rejects.toThrow('invalid_attempt_order');
 expect(await count('paystack_checkout_attempts')).toBe(0);
 for(const [index,update]of ["status='paid'","status='unknown'","pay_method='mpesa'","paystack_ref='OTHER'","total=999"].entries()){
  const scoped=identity('validated-account:unclaimable-'+index),saved=await attempts.preparePaystackAttempt(scoped,order());
  await fixture.query('UPDATE orders SET '+update+' WHERE id=$1',[saved.attempt.orderId]);
  expect(await attempts.claimPaystackInitiation(scoped)).toBeNull();
 }
},20000);
