import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const enabled=process.env.UGT_ACCOUNT_PG_FIXTURE==='1',fixture=new DisposablePostgres();
const adapter=vi.hoisted(()=>({schema:vi.fn(),q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({qSchema:adapter.schema,q:adapter.q,hasDb:()=>true,db:()=>null}));
vi.mock('@/lib/server/customer-account',()=>({ensureCustomerAccountSchema:async()=>{},validatedCurrentBuyer:async()=>null}));
import {ensureCustomerIdentitySchema} from '@/lib/server/customer-identity';
import {requestEmailVerification,confirmEmailVerification,deliverSecurityEmailJob,queueCustomerPasswordReset} from '@/lib/server/customer-email-verification';
import {claimGuestOrder} from '@/lib/server/customer-order-claim';
import {ensureCustomerPasskeySchema} from '@/lib/server/customer-passkeys';
import {POST as resetPassword} from '@/app/api/account/recovery/route';
beforeAll(async()=>{if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});await fixture.schema("CREATE TABLE users(id SERIAL PRIMARY KEY,email TEXT UNIQUE,phone TEXT,name TEXT DEFAULT '',pass_hash TEXT DEFAULT '',session_version INTEGER DEFAULT 0)");
 // Existing collisions must not be merged, deleted or prevent migration.
 await fixture.query("INSERT INTO users(email,phone) VALUES('legacy-a@example.test','0712345678'),('legacy-b@example.test','254712345678')");
 await fixture.schema("CREATE TABLE orders(id TEXT PRIMARY KEY,email TEXT,user_id INTEGER REFERENCES users(id),status TEXT DEFAULT 'paid')");
 adapter.schema.mockImplementation((sql:string|readonly string[])=>fixture.schema(typeof sql==='string'?sql:sql.join(';')));adapter.q.mockImplementation((sql:string,args:unknown[])=>fixture.query(sql,args));await ensureCustomerIdentitySchema();
},30000);
beforeEach(()=>{vi.stubEnv('SESSION_SECRET','fixture-session-secret');vi.stubEnv('RESEND_API_KEY','fixture-email-key')});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
afterAll(()=>{if(enabled)fixture.stop()},20000);
const test=it.skipIf(!enabled);
test('preserves ambiguous historical records while rejecting a new canonical alias',async()=>{
 await expect(fixture.query("INSERT INTO users(email,phone) VALUES('new@example.test','+254712345678')")).rejects.toThrow();
 expect((await fixture.query('SELECT COUNT(*) AS n FROM users'))[0].n).toBe('2');
 const rows=await fixture.query('SELECT email_verified_at FROM users');expect(rows.every(row=>row.email_verified_at===null)).toBe(true);
});
test('only one concurrent new signup can reserve the same phone across formats',async()=>{
 const results=await Promise.allSettled(['0722334455','254722334455','+254 722 334 455'].map((phone,index)=>fixture.query('INSERT INTO users(email,phone) VALUES($1,$2) RETURNING id',['concurrent'+index+'@example.test',phone])));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
});
test('rejects case-variant email duplicates but allows unrelated users to omit a phone',async()=>{
 await fixture.query("INSERT INTO users(email) VALUES('Mixed@Example.Test')");
 await expect(fixture.query("INSERT INTO users(email) VALUES(' mixed@example.test ')")).rejects.toThrow();
 await fixture.query("INSERT INTO users(email) VALUES('other1@example.test'),('other2@example.test')");
});
async function verificationBuyer(email:string){return Number((await fixture.query('INSERT INTO users(email) VALUES($1) RETURNING id',[email]))[0].id)}
async function deliver(id:string){let code='';vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{code=JSON.parse(String(init.body)).text.match(/\b\d{8}\b/)?.[0]||'';return Response.json({id:'fixture-email-id'})}));expect(await deliverSecurityEmailJob(id)).toBe('accepted');expect(code).toMatch(/^\d{8}$/);return code}
test('encrypts queued codes and atomically consumes email proof once under concurrent confirmation',async()=>{
 const userId=await verificationBuyer('proof@example.test'),job=await requestEmailVerification(userId,0,'proof@example.test');expect(job).toBeTypeOf('string');
 const code=await deliver(job!);const jobs=await fixture.query('SELECT payload_encrypted FROM customer_security_email_outbox WHERE id=$1',[job]);expect(JSON.stringify(jobs)).not.toContain(code);
 const confirmations=await Promise.all(Array.from({length:10},()=>confirmEmailVerification(userId,code)));expect(confirmations.filter(Boolean)).toHaveLength(1);
 expect((await fixture.query('SELECT email_verified_at FROM users WHERE id=$1',[userId]))[0].email_verified_at).toBeTruthy();expect(await confirmEmailVerification(userId,code)).toBe(false);
},20000);
test('never accepts another account code and locks a code after five guesses',async()=>{
 const userId=await verificationBuyer('guesses@example.test'),other=await verificationBuyer('other-proof@example.test');const code=await deliver((await requestEmailVerification(userId,0,'guesses@example.test'))!);
 expect(await confirmEmailVerification(other,code)).toBe(false);for(let n=0;n<5;n++)expect(await confirmEmailVerification(userId,'00000000')).toBe(false);expect(await confirmEmailVerification(userId,code)).toBe(false);
});
test('rejects expired and reset-session proofs, and enforces a persisted resend cooldown',async()=>{
 const userId=await verificationBuyer('expired@example.test'),job=await requestEmailVerification(userId,0,'expired@example.test');expect(await requestEmailVerification(userId,0,'expired@example.test')).toBeNull();const code=await deliver(job!);
 await fixture.query("UPDATE customer_email_proofs SET expires_at=now()-interval '1 second' WHERE user_id=$1",[userId]);expect(await confirmEmailVerification(userId,code)).toBe(false);
 await fixture.query("UPDATE customer_email_proofs SET expires_at=now()+interval '10 minutes' WHERE user_id=$1",[userId]);await fixture.query('UPDATE users SET session_version=session_version+1 WHERE id=$1',[userId]);expect(await confirmEmailVerification(userId,code)).toBe(false);
});
test('attaches a guest purchase only with both the strong capability and verified matching email',async()=>{
 const userId=await verificationBuyer('claim@example.test'),other=await verificationBuyer('other-claim@example.test'),ref='ORD-ABCDEF0123456789ABCDEF0123456789';
 await fixture.query('INSERT INTO orders(id,email) VALUES($1,$2)',[ref,'claim@example.test']);
 expect(await claimGuestOrder(userId,ref)).toBe(false);await fixture.query('UPDATE users SET email_verified_at=now() WHERE id IN ($1,$2)',[userId,other]);
 expect(await claimGuestOrder(other,ref)).toBe(false);expect(await claimGuestOrder(userId,'ORD-OLD123')).toBe(false);
 expect(await claimGuestOrder(userId,ref)).toBe(true);expect(await claimGuestOrder(userId,ref)).toBe(true);
 expect((await fixture.query('SELECT user_id,status FROM orders WHERE id=$1',[ref]))[0]).toEqual({user_id:String(userId),status:'paid'});
});
test('never steals an already linked order even with a matching verified email and reference',async()=>{
 const userId=await verificationBuyer('claimed@example.test'),other=await verificationBuyer('existing-owner@example.test'),ref='ORD-0123456789ABCDEF0123456789ABCDEF';
 await fixture.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[userId]);await fixture.query('INSERT INTO orders(id,email,user_id) VALUES($1,$2,$3)',[ref,'claimed@example.test',other]);
 expect(await claimGuestOrder(userId,ref)).toBe(false);expect((await fixture.query('SELECT user_id FROM orders WHERE id=$1',[ref]))[0].user_id).toBe(String(other));
});
test('queues password-reset credentials encrypted, with one active link and identical retry payload',async()=>{
 const userId=await verificationBuyer('reset-queue@example.test'),job=await queueCustomerPasswordReset('reset-queue@example.test');expect(job).toBeTypeOf('string');
 const bodies:string[]=[],keys:string[]=[];let accepted=false;
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{bodies.push(String(init.body));keys.push(new Headers(init.headers).get('Idempotency-Key')!);return accepted?Response.json({id:'fixture-reset-id'}):Response.json({error:'uncertain'},503)}));
 expect(await deliverSecurityEmailJob(job!)).toBe('queued');const raw=JSON.parse(bodies[0]).text.match(/reset=([A-Za-z0-9_-]{43})/)?.[1];expect(raw).toHaveLength(43);
 const tokens=await fixture.query('SELECT token_hash FROM customer_reset_tokens WHERE user_id=$1',[userId]);expect(tokens).toHaveLength(1);expect(tokens[0].token_hash).toMatch(/^[a-f0-9]{64}$/);expect(tokens[0].token_hash).not.toBe(raw);
 const queued=await fixture.query('SELECT payload_encrypted FROM customer_security_email_outbox WHERE id=$1',[job]);expect(queued[0].payload_encrypted).not.toContain(raw);
 expect(await queueCustomerPasswordReset('reset-queue@example.test')).toBeNull();
 await fixture.query("UPDATE customer_security_email_outbox SET next_attempt_at=now()-interval '1 second' WHERE id=$1",[job]);accepted=true;expect(await deliverSecurityEmailJob(job!)).toBe('accepted');expect(bodies[1]).toBe(bodies[0]);expect(keys).toEqual([job,job]);
});
test('never creates a reset job for an unregistered address',async()=>{
 const before=(await fixture.query('SELECT COUNT(*) AS n FROM customer_security_email_outbox'))[0].n;
 expect(await queueCustomerPasswordReset('unknown-reset@example.test')).toBeNull();expect((await fixture.query('SELECT COUNT(*) AS n FROM customer_security_email_outbox'))[0].n).toBe(before);
});
test('password recovery atomically consumes the token, revokes keys/challenges, and preserves the permanent handle',async()=>{
 await ensureCustomerPasskeySchema();const userId=await verificationBuyer('reset-revocation@example.test'),job=await queueCustomerPasswordReset('reset-revocation@example.test');let token='';
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{token=JSON.parse(String(init.body)).text.match(/reset=([A-Za-z0-9_-]{43})/)[1];return Response.json({id:'fixture-reset-revoke'})}));await deliverSecurityEmailJob(job!);
 await fixture.query('INSERT INTO customer_passkey_accounts(user_id,handle) VALUES($1,$2)',[userId,'opaque-permanent-handle']);
 await fixture.query('INSERT INTO customer_passkeys(id,user_id,public_key,counter,slot) VALUES($1,$2,$3,0,1)',['fixture-key',userId,'fixture-public-key']);
 await fixture.query("INSERT INTO customer_passkey_challenges(hash,owner_hash,kind,user_id,session_version,expires_at) VALUES($1,$2,'register',$3,0,now()+interval '5 minutes')",['a'.repeat(64),'b'.repeat(64),userId]);
 const request=()=>new Request('https://urbangangtour.co.ke/api/account/recovery',{method:'POST',headers:{Origin:'https://urbangangtour.co.ke'},body:JSON.stringify({action:'reset',token,password:'new-safe-password'})});
 expect((await resetPassword(request())).status).toBe(200);expect((await fixture.query('SELECT revoked_at FROM customer_passkeys WHERE user_id=$1',[userId]))[0].revoked_at).toBeTruthy();
 expect(await fixture.query('SELECT hash FROM customer_passkey_challenges WHERE user_id=$1',[userId])).toEqual([]);expect((await fixture.query('SELECT handle FROM customer_passkey_accounts WHERE user_id=$1',[userId]))[0].handle).toBe('opaque-permanent-handle');expect((await resetPassword(request())).status).toBe(400);
});
