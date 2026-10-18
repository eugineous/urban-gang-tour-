// Actual persistence SQL, independent PostgreSQL connections, no remote service.
// Opt in: UGT_MPESA_ATTEMPT_PG_FIXTURE=1 npx vitest run this-file
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
const adapter=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn()}));
vi.mock('@/lib/server/db',()=>adapter);
import * as attempts from '@/lib/server/mpesa-attempts';
const enabled=process.env.UGT_MPESA_ATTEMPT_PG_FIXTURE==='1';
const container='ugt-mpesa-attempt-'+randomUUID();
const dockerEnv={...process.env};
for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[name];
const dockerArgs=['--host=unix:///var/run/docker.sock'];
const docker=(args:string[],input?:string)=>execFileSync('docker',[...dockerArgs,...args],{env:dockerEnv,input,encoding:'utf8',timeout:15000,stdio:['pipe','pipe','pipe']}).trim();
const psql=['exec','-i',container,'psql','-X','-U','postgres','-qAt','-v','ON_ERROR_STOP=1'];
const sql=(text:string)=>docker(psql,"SET statement_timeout='5s';\n"+text);
const literal=(value:unknown)=>value==null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const execAsync=promisify(execFile);
async function query(statement:string,params:unknown[]=[]){
 // Each invocation starts a fresh psql/Postgres connection. Parameterized
 // PREPARE/EXECUTE mirrors the application's bound SQL, including its CTEs.
 const text="SET standard_conforming_strings=on; SET statement_timeout='5s'; PREPARE fixture AS "+statement+'; EXECUTE fixture('+params.map(literal).join(',')+');';
 const child=execAsync('docker',[...dockerArgs,...psql],{env:dockerEnv,encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 child.child.stdin?.end(text);
 const result=await child;
 return result.stdout.trim().split('\n').filter(Boolean).map(line=>({attempt:JSON.parse(line)}));
}
let created=false;
beforeAll(async()=>{
 if(!enabled)return;
 docker(['run','--rm','-d','--network','none','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine']);created=true;
 expect(docker(['inspect',container,'--format','{{.HostConfig.NetworkMode}}'])).toBe('none');
 await vi.waitFor(()=>expect(docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'])).toContain('accepting connections'),{timeout:10000});
 sql(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INTEGER NOT NULL,name TEXT,email TEXT,phone TEXT,user_id INTEGER,status TEXT DEFAULT 'pending',mpesa_ref TEXT);
 CREATE TABLE order_delivery_preferences(order_id TEXT PRIMARY KEY REFERENCES orders(id),method TEXT NOT NULL,fee INTEGER NOT NULL,address JSONB);`);
 adapter.q.mockImplementation(query);
 adapter.qSchema.mockImplementation(async(text:string)=>{sql('BEGIN;'+text+'COMMIT;')});
 await attempts.ensureMpesaAttemptSchema();
},20000);
beforeEach(()=>{if(enabled)sql('TRUNCATE mpesa_checkout_attempts,order_delivery_preferences,orders;')});
afterAll(()=>{if(created)docker(['stop',container])},20000);
const token='0123456789abcdef0123456789abcdef';
const purchase={items:[{id:'tee',qty:1}],contact:{name:'Local fixture',phone:'254700000000'},fulfillment:{method:'pickup'}};
const identity=(owner='validated-account:1',request:unknown=purchase)=>attempts.mpesaAttemptIdentity(owner,token,request);
const order=(total=1000):attempts.AttemptOrder=>({id:'ORD-'+randomUUID().replaceAll('-','').toUpperCase(),items:purchase.items,total,name:'Local fixture',email:'',phone:'254700000000',userId:1,fulfillment:{method:'pickup',fee:0,address:null}});
const count=(table:string)=>Number(sql('SELECT count(*) FROM '+table));
const test=it.skipIf(!enabled);
test('20 concurrent prepares and send claims create one ledger and one provider invocation',async()=>{
 const prepared=await Promise.all(Array.from({length:20},()=>attempts.prepareMpesaAttempt(identity(),order())));
 expect(new Set(prepared.map(result=>result.attempt.orderId)).size).toBe(1);
 expect(prepared.filter(result=>result.created)).toHaveLength(1);
 expect(count('orders')).toBe(1);expect(count('order_delivery_preferences')).toBe(1);expect(count('mpesa_checkout_attempts')).toBe(1);
 const provider=vi.fn(async()=>({CheckoutRequestID:'LOCAL-PROVIDER-REFERENCE'}));
 const claims=await Promise.all(Array.from({length:20},async()=>{
  const claim=await attempts.claimMpesaInitiation(identity());if(!claim)return null;
  const result=await provider();expect(await attempts.recordMpesaReference(claim.attempt.id,claim.nonce,result.CheckoutRequestID)).toBe(true);return claim;
 }));
 expect(claims.filter(Boolean)).toHaveLength(1);expect(provider).toHaveBeenCalledTimes(1);
 expect((await attempts.recoverMpesaAttempt(identity()))?.state).toBe('reference_recorded');
 expect(sql('SELECT status FROM orders')).toBe('pending'); // STK reference != paid.
},20000);
test('a cold module reuses an unchanged request and its originally accepted total',async()=>{
 const first=await attempts.prepareMpesaAttempt(identity(),order());
 vi.resetModules();const cold=await import('@/lib/server/mpesa-attempts');
 const replay=await cold.prepareMpesaAttempt(identity(),order(2500));
 expect(replay).toEqual({attempt:first.attempt,created:false});expect(count('orders')).toBe(1);
 const claim=await cold.claimMpesaInitiation(identity());expect(claim?.attempt.total).toBe(1000);
});
test('changed input conflicts, and a copied token cannot recover a different owner scope',async()=>{
 const first=await attempts.prepareMpesaAttempt(identity(),order());
 for(const request of [{...purchase,items:[{id:'tee',qty:2}]},{...purchase,contact:{...purchase.contact,name:'Changed'}},{...purchase,fulfillment:{method:'delivery'}}]){
  await expect(attempts.prepareMpesaAttempt(identity('validated-account:1',request),order())).rejects.toThrow('attempt_request_conflict');
  await expect(attempts.recoverMpesaAttempt(identity('validated-account:1',request))).rejects.toThrow('attempt_request_conflict');
  expect(await attempts.claimMpesaInitiation(identity('validated-account:1',request))).toBeNull();
 }
 expect(await attempts.recoverMpesaAttempt(identity('validated-account:2'))).toBeNull();
 const second=await attempts.prepareMpesaAttempt(identity('validated-account:2'),{...order(),userId:2});
 expect(second.attempt.orderId).not.toBe(first.attempt.orderId);expect(count('orders')).toBe(2);
});
test('a ledger or delivery failure rolls back the attempt and all partial financial rows',async()=>{
 sql(`CREATE FUNCTION reject_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_write_failure'; END $$;
 CREATE TRIGGER reject_ledger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION reject_fixture();`);
 try{await expect(attempts.prepareMpesaAttempt(identity(),order())).rejects.toThrow();expect(count('mpesa_checkout_attempts')).toBe(0);expect(count('orders')).toBe(0)}finally{sql('DROP TRIGGER reject_ledger ON orders;')}
 sql('CREATE TRIGGER reject_delivery BEFORE INSERT ON order_delivery_preferences FOR EACH ROW EXECUTE FUNCTION reject_fixture();');
 try{await expect(attempts.prepareMpesaAttempt(identity(),order())).rejects.toThrow();expect(count('mpesa_checkout_attempts')).toBe(0);expect(count('orders')).toBe(0)}finally{sql('DROP TRIGGER reject_delivery ON order_delivery_preferences; DROP FUNCTION reject_fixture();')}
 expect((await attempts.prepareMpesaAttempt(identity(),order())).created).toBe(true);
});
test('a crash after commit but before claim is recoverable, but an acquired claim is never stolen',async()=>{
 const prepared=await attempts.prepareMpesaAttempt(identity(),order());
 expect(await attempts.recoverMpesaAttempt(identity())).toEqual(prepared.attempt);
 const first=await attempts.claimMpesaInitiation(identity());expect(first).not.toBeNull();
 sql("UPDATE mpesa_checkout_attempts SET updated_at=now()-interval '2 days';");
 vi.resetModules();const cold=await import('@/lib/server/mpesa-attempts');
 expect((await cold.recoverMpesaAttempt(identity()))?.state).toBe('initiating');
 expect(await cold.claimMpesaInitiation(identity())).toBeNull();
 expect(await attempts.markMpesaInitiationUnknown(first!.attempt.id,'wrong-nonce')).toBe(false);
 expect(await attempts.markMpesaInitiationUnknown(first!.attempt.id,first!.nonce)).toBe(true);
 expect(await cold.claimMpesaInitiation(identity())).toBeNull();
});
test('provider acceptance followed by lost reference storage stays non-replayable and can be reconciled using the original nonce',async()=>{
 await attempts.prepareMpesaAttempt(identity(),order());const claim=(await attempts.claimMpesaInitiation(identity()))!;
 const provider=vi.fn(async()=>({CheckoutRequestID:'LOCAL-ACCEPTED'}));const response=await provider();
 sql(`CREATE FUNCTION reject_reference() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='reference_recorded' THEN RAISE EXCEPTION 'fixture_reference_failure'; END IF; RETURN NEW; END $$;
 CREATE TRIGGER reject_reference BEFORE UPDATE ON mpesa_checkout_attempts FOR EACH ROW EXECUTE FUNCTION reject_reference();`);
 try{await expect(attempts.recordMpesaReference(claim.attempt.id,claim.nonce,response.CheckoutRequestID)).rejects.toThrow();expect(sql('SELECT coalesce(mpesa_ref,\'NONE\') FROM orders')).toBe('NONE')}
 finally{sql('DROP TRIGGER reject_reference ON mpesa_checkout_attempts; DROP FUNCTION reject_reference();')}
 expect(await attempts.markMpesaInitiationUnknown(claim.attempt.id,claim.nonce)).toBe(true);
 expect((await attempts.recoverMpesaAttempt(identity()))?.state).toBe('unknown');
 expect(await attempts.claimMpesaInitiation(identity())).toBeNull();expect(provider).toHaveBeenCalledTimes(1);
 expect(await attempts.recordMpesaReference(claim.attempt.id,claim.nonce,response.CheckoutRequestID)).toBe(true);
 expect(sql('SELECT mpesa_ref FROM orders')).toBe('LOCAL-ACCEPTED');
});
test('reference persistence is replay-safe, nonce-bound and cannot rebind to another provider request',async()=>{
 await attempts.prepareMpesaAttempt(identity(),order());const claim=(await attempts.claimMpesaInitiation(identity()))!;
 expect(await attempts.recordMpesaReference(claim.attempt.id,'wrong-nonce','LOCAL-FIRST')).toBe(false);
 const results=await Promise.all(['LOCAL-FIRST','LOCAL-SECOND'].map(ref=>attempts.recordMpesaReference(claim.attempt.id,claim.nonce,ref)));
 expect(results.filter(Boolean)).toHaveLength(1);
 const reference=sql('SELECT mpesa_ref FROM orders');expect(sql('SELECT provider_reference FROM mpesa_checkout_attempts')).toBe(reference);
 expect(await attempts.recordMpesaReference(claim.attempt.id,claim.nonce,reference)).toBe(true);
 expect(await attempts.markMpesaInitiationUnknown(claim.attempt.id,claim.nonce)).toBe(false);
 expect(await attempts.claimMpesaInitiation(identity())).toBeNull();
});
test('only an existing terminal ledger outcome closes the attempt; nothing reopens or marks it paid',async()=>{
 const prepared=await attempts.prepareMpesaAttempt(identity(),order());
 expect(await attempts.closeSettledMpesaAttempt(prepared.attempt.id)).toBe(false);
 const claim=(await attempts.claimMpesaInitiation(identity()))!;
 expect(await attempts.recordMpesaReference(claim.attempt.id,claim.nonce,'LOCAL-CONFIRMED')).toBe(true);
 expect(sql('SELECT status FROM orders')).toBe('pending');
 sql("UPDATE orders SET status='paid';"); // Local fixture of an authoritative settlement.
 expect(await attempts.closeSettledMpesaAttempt(prepared.attempt.id)).toBe(true);
 expect((await attempts.recoverMpesaAttempt(identity()))?.state).toBe('closed');
 expect(await attempts.claimMpesaInitiation(identity())).toBeNull();
 expect(await attempts.recordMpesaReference(claim.attempt.id,claim.nonce,'LOCAL-OTHER')).toBe(false);
 expect(sql('SELECT mpesa_ref FROM orders')).toBe('LOCAL-CONFIRMED');expect(count('orders')).toBe(1);
});
test('bad totals and a colliding ledger ID cannot leave an orphan attempt',async()=>{
 for(const total of [0,-1,0.5,2147483648])await expect(attempts.prepareMpesaAttempt(identity(),order(total))).rejects.toThrow('invalid_attempt_order');
 expect(count('orders')).toBe(0);expect(count('mpesa_checkout_attempts')).toBe(0);
 const saved=order();await attempts.prepareMpesaAttempt(identity(),saved);
 await expect(attempts.prepareMpesaAttempt(identity('validated-account:2'),{...saved,userId:2})).rejects.toThrow();
 expect(count('orders')).toBe(1);expect(count('mpesa_checkout_attempts')).toBe(1);
});
test('closure racing reference recording never permits a new send or splits the linked reference',async()=>{
 for(let run=0;run<5;run++){
  const scoped=identity('validated-account:race-'+run);
  const saved=await attempts.prepareMpesaAttempt(scoped,order());const claim=(await attempts.claimMpesaInitiation(scoped))!;
  await query("UPDATE orders SET status='failed' WHERE id=$1 RETURNING row_to_json(orders) AS attempt",[saved.attempt.orderId]);
  const results=await Promise.all([attempts.closeSettledMpesaAttempt(saved.attempt.id),attempts.recordMpesaReference(claim.attempt.id,claim.nonce,'LOCAL-RACE')]);
  expect(results).toEqual([true,false]);expect((await attempts.recoverMpesaAttempt(scoped))?.state).toBe('closed');
  expect(await attempts.claimMpesaInitiation(scoped)).toBeNull();
 }
 expect(sql("SELECT count(*) FROM orders o JOIN mpesa_checkout_attempts a ON a.order_id=o.id WHERE o.mpesa_ref IS DISTINCT FROM a.provider_reference")).toBe('0');
});
test('a settled, repriced or already-linked ledger cannot acquire send permission',async()=>{
 const updates=["status='paid'","status='failed'","status='refunded'","total=2000","mpesa_ref='ALREADY-LINKED'"];
 for(const [index,update]of updates.entries()){
  const scoped=identity('validated-account:guard-'+index);const prepared=await attempts.prepareMpesaAttempt(scoped,order());
  await query('UPDATE orders SET '+update+' WHERE id=$1 RETURNING row_to_json(orders) AS attempt',[prepared.attempt.orderId]);
  expect(await attempts.claimMpesaInitiation(scoped)).toBeNull();
  expect((await attempts.recoverMpesaAttempt(scoped))?.state).toBe('prepared');
 }
});
