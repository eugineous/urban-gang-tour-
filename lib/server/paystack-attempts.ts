// Server-only durable initiation ledger. A provider timeout never permits resend.
// The caller authenticates the principal and validates/prices the purchase first.
import {createHash,randomUUID} from 'node:crypto';
import {q,qSchema} from './db';

export const PAYSTACK_ATTEMPT_SCHEMA=`
CREATE TABLE IF NOT EXISTS paystack_checkout_attempts (
 id TEXT PRIMARY KEY,
 scope_hash TEXT NOT NULL CHECK(scope_hash ~ '^[a-f0-9]{64}$'),
 token_hash TEXT NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 request_hash TEXT NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) DEFERRABLE INITIALLY DEFERRED,
 total INTEGER NOT NULL CHECK(total>0),
 context JSONB NOT NULL DEFAULT '{}'::jsonb,
 state TEXT NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','initiating','ready','unknown','closed','rejected')),
 claim_nonce TEXT,
 authorization_url TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(scope_hash,token_hash),
 CHECK(state!='ready' OR authorization_url IS NOT NULL),
 CHECK(state NOT IN ('initiating','ready','unknown','rejected') OR claim_nonce IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_paystack_attempts_unresolved
 ON paystack_checkout_attempts(updated_at) WHERE state IN ('initiating','unknown');
`;
let schema:Promise<void>|undefined;
export function ensurePaystackAttemptSchema(){
 if(!schema)schema=qSchema(PAYSTACK_ATTEMPT_SCHEMA).catch(error=>{schema=undefined;throw error});
 return schema;
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function canonical(value:unknown):string{
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
 throw Error('invalid_attempt_request');
}
export type AttemptIdentity={scopeHash:string;tokenHash:string;requestHash:string};
/** owner is a server-validated account/guest principal, never unverified contact.
 * request is normalized input without transient quotes. Token length is not
 * proof of entropy: the caller must generate >=128 random bits. Never log it.
 */
export function paystackAttemptIdentity(owner:string,token:string,request:unknown):AttemptIdentity{
 if(typeof owner!=='string'||!owner.trim()||owner.length>256)throw Error('invalid_attempt_owner');
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(token))throw Error('invalid_attempt_token');
 return {scopeHash:hash('ugt:paystack-owner:v1\0'+owner),tokenHash:hash('ugt:paystack-token:v1\0'+token),requestHash:hash('ugt:paystack-request:v1\0'+canonical(request))};
}
function validateIdentity(identity:AttemptIdentity){
 if(!identity||![identity.scopeHash,identity.tokenHash,identity.requestHash].every(value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)))throw Error('invalid_attempt_identity');
}
type AttemptState='prepared'|'initiating'|'ready'|'unknown'|'closed'|'rejected';
type StoredAttempt={id:string;order_id:string;total:number;state:AttemptState;request_hash:string;authorization_url:string|null;recoverable?:boolean;payment_status?:string};
export type PaystackAttempt={id:string;orderId:string;total:number;state:AttemptState;authorizationUrl?:string};
const trustedUrl=(url:unknown):url is string=>typeof url==='string'&&/^https:\/\/checkout\.paystack\.com\/[A-Za-z0-9_-]{1,200}$/.test(url);
function snapshot(row:StoredAttempt):PaystackAttempt{
 return {id:row.id,orderId:row.order_id,total:row.total,state:row.state,...(row.state==='ready'&&row.recoverable&&trustedUrl(row.authorization_url)?{authorizationUrl:row.authorization_url}:{})};
}
export class PaystackAttemptConflict extends Error{constructor(){super('attempt_request_conflict')}}
export type AttemptOrder={
 id:string;items:unknown[];total:number;name:string;email:string;phone:string;userId:number|null;
 fulfillment:{method:'pickup'|'delivery';fee:number;address:unknown|null}|null;
 context?:{promoId:number|null;referralCode:string|null};
};
/** A single statement commits the attempt, its card ledger and optional delivery
 * snapshot together. Deferred FK validation occurs after every CTE has executed.
 */
export async function preparePaystackAttempt(identity:AttemptIdentity,order:AttemptOrder):Promise<{attempt:PaystackAttempt;created:boolean}>{
 validateIdentity(identity);
 if(!order||typeof order.id!=='string'||!/^ORD-[A-Z0-9-]{4,40}$/.test(order.id)||!Number.isSafeInteger(order.total)||order.total<1||order.total>2147483647||!Array.isArray(order.items)||!order.items.length)throw Error('invalid_attempt_order');
 if(order.userId!==null&&(!Number.isSafeInteger(order.userId)||order.userId<1))throw Error('invalid_attempt_order');
 const fulfillment=order.fulfillment,context=order.context;
 if(fulfillment&&(!['pickup','delivery'].includes(fulfillment.method)||!Number.isSafeInteger(fulfillment.fee)||fulfillment.fee<0||fulfillment.fee>2147483647))throw Error('invalid_attempt_order');
 if(context&&((context.promoId!==null&&(!Number.isSafeInteger(context.promoId)||context.promoId<1))||(context.referralCode!==null&&(typeof context.referralCode!=='string'||context.referralCode.length>128))))throw Error('invalid_attempt_order');
 await ensurePaystackAttemptSchema();const candidate=randomUUID();
 const rows=await q<{attempt:StoredAttempt}>(`
 WITH claimed AS (
  INSERT INTO paystack_checkout_attempts(id,scope_hash,token_hash,request_hash,order_id,total,context)
  VALUES($1,$2,$3,$4,$5,$6,$15::jsonb)
  ON CONFLICT(scope_hash,token_hash) DO UPDATE
   SET updated_at=paystack_checkout_attempts.updated_at
   WHERE paystack_checkout_attempts.request_hash=EXCLUDED.request_hash
  RETURNING *
 ), saved_order AS (
  INSERT INTO orders(id,items,total,name,email,phone,user_id,pay_method,paystack_ref)
  SELECT $5,$7::jsonb,$6,$8,$9,$10,$11,'card',$5 FROM claimed WHERE id=$1
  RETURNING id
 ), saved_delivery AS (
  INSERT INTO order_delivery_preferences(order_id,method,fee,address)
  SELECT id,$12::text,$13::integer,$14::jsonb FROM saved_order WHERE $12::text IS NOT NULL
  RETURNING order_id
 ) SELECT row_to_json(claimed) AS attempt FROM claimed`,
 [candidate,identity.scopeHash,identity.tokenHash,identity.requestHash,order.id,order.total,JSON.stringify(order.items),order.name,order.email,order.phone,order.userId,fulfillment?.method??null,fulfillment?.fee??0,fulfillment?.address==null?null:JSON.stringify(fulfillment.address),JSON.stringify(context??{})]);
 if(!rows[0])throw new PaystackAttemptConflict();
 return {attempt:snapshot(rows[0].attempt),created:rows[0].attempt.id===candidate};
}
const recoverySelection=`SELECT a.*,o.status AS payment_status,
 (o.status IN ('pending','unknown','reconciling') AND o.pay_method='card' AND o.paystack_ref=a.order_id AND o.total=a.total) AS recoverable
 FROM paystack_checkout_attempts a JOIN orders o ON o.id=a.order_id`;
/** Recovery always checks the authenticated owner, token and normalized request. */
export async function recoverPaystackAttempt(identity:AttemptIdentity):Promise<PaystackAttempt|null>{
 validateIdentity(identity);await ensurePaystackAttemptSchema();
 const rows=await q<{attempt:StoredAttempt}>(`SELECT row_to_json(found) AS attempt FROM (${recoverySelection} WHERE a.scope_hash=$1 AND a.token_hash=$2) found`,[identity.scopeHash,identity.tokenHash]);
 if(!rows[0])return null;
 if(rows[0].attempt.request_hash!==identity.requestHash)throw new PaystackAttemptConflict();
 return snapshot(rows[0].attempt);
}
/** Contact-free lookup. The caller must authenticate owner before calling. */
export async function findOwnedPaystackAttempt(owner:string,token:string):Promise<(PaystackAttempt&{paymentStatus:string})|null>{
 const identity=paystackAttemptIdentity(owner,token,null);await ensurePaystackAttemptSchema();
 const rows=await q<{attempt:StoredAttempt&{payment_status:string}}>(`SELECT row_to_json(found) AS attempt FROM (${recoverySelection} WHERE a.scope_hash=$1 AND a.token_hash=$2) found`,[identity.scopeHash,identity.tokenHash]);
 return rows[0]?{...snapshot(rows[0].attempt),paymentStatus:rows[0].attempt.payment_status}:null;
}
/** Internal server pricing snapshot for an unchanged request. Never expose it. */
export async function savedPaystackPurchase(identity:AttemptIdentity){
 validateIdentity(identity);await ensurePaystackAttemptSchema();
 const rows=await q<{attempt:{items:unknown[]|string;total:number;context:{promoId?:number;referralCode?:string}}}>(`SELECT row_to_json(found) AS attempt FROM (
  SELECT o.items,a.total,a.context FROM paystack_checkout_attempts a JOIN orders o ON o.id=a.order_id
  WHERE a.scope_hash=$1 AND a.token_hash=$2 AND a.request_hash=$3
 ) found`,[identity.scopeHash,identity.tokenHash,identity.requestHash]);
 const row=rows[0]?.attempt;if(!row)throw Error('attempt_not_found');
 return {...row,items:typeof row.items==='string'?JSON.parse(row.items) as unknown[]:row.items};
}
/** Only prepared can claim. No lease expiry or timestamp-based reclaim exists:
 * an initiating worker may already have contacted the provider. Keep nonce private.
 */
export async function claimPaystackInitiation(identity:AttemptIdentity):Promise<{attempt:PaystackAttempt;nonce:string}|null>{
 validateIdentity(identity);await ensurePaystackAttemptSchema();const nonce=randomUUID();
 const rows=await q<{attempt:StoredAttempt}>(`WITH locked_attempt AS (
  SELECT id,order_id,total FROM paystack_checkout_attempts
  WHERE scope_hash=$1 AND token_hash=$2 AND request_hash=$3 AND state='prepared' FOR UPDATE
 ), eligible_order AS (
  SELECT o.id FROM orders o JOIN locked_attempt a ON a.order_id=o.id
  WHERE o.status='pending' AND o.total=a.total AND o.pay_method='card' AND o.paystack_ref=a.order_id FOR UPDATE OF o
 ) UPDATE paystack_checkout_attempts SET state='initiating',claim_nonce=$4,updated_at=now()
 WHERE id IN (SELECT id FROM locked_attempt) AND order_id IN (SELECT id FROM eligible_order) AND state='prepared'
 RETURNING row_to_json(paystack_checkout_attempts) AS attempt`,[identity.scopeHash,identity.tokenHash,identity.requestHash,nonce]);
 return rows[0]?{attempt:snapshot(rows[0].attempt),nonce}:null;
}
/** Save one trusted authorization URL. Initialization is never payment evidence. */
export async function recordPaystackAuthorization(attemptId:string,nonce:string,url:string):Promise<boolean>{
 if(!trustedUrl(url))throw Error('invalid_authorization_url');
 const rows=await q<{attempt:StoredAttempt}>(`WITH locked_attempt AS (
  SELECT id,order_id,total FROM paystack_checkout_attempts
  WHERE id=$1 AND claim_nonce=$2 AND state IN ('initiating','unknown','ready')
   AND (authorization_url IS NULL OR authorization_url=$3) FOR UPDATE
 ), eligible_order AS (
  SELECT o.id FROM orders o JOIN locked_attempt a ON a.order_id=o.id
  WHERE o.status IN ('pending','unknown','reconciling') AND o.total=a.total AND o.pay_method='card' AND o.paystack_ref=a.order_id FOR UPDATE OF o
 ) UPDATE paystack_checkout_attempts SET state='ready',authorization_url=$3,updated_at=now()
 WHERE id IN (SELECT id FROM locked_attempt) AND order_id IN (SELECT id FROM eligible_order)
  AND claim_nonce=$2 AND state IN ('initiating','unknown','ready') AND (authorization_url IS NULL OR authorization_url=$3)
 RETURNING row_to_json(paystack_checkout_attempts) AS attempt`,[attemptId,nonce,url]);
 return rows.length===1;
}
/** Ambiguous network/storage outcome. Pending ledger becomes unknown; existing
 * terminal financial state is preserved. Even a failed write cannot permit resend.
 */
export async function markPaystackInitiationUnknown(attemptId:string,nonce:string):Promise<boolean>{
 const rows=await q<{attempt:StoredAttempt}>(`WITH locked_attempt AS (
  SELECT id,order_id,total FROM paystack_checkout_attempts WHERE id=$1 AND claim_nonce=$2 AND state='initiating' FOR UPDATE
 ), ledger AS (
  UPDATE orders o SET status='unknown' FROM locked_attempt a
  WHERE o.id=a.order_id AND o.status='pending' AND o.total=a.total AND o.pay_method='card' AND o.paystack_ref=a.order_id RETURNING o.id
 ) UPDATE paystack_checkout_attempts SET state='unknown',updated_at=now()
 WHERE id IN (SELECT id FROM locked_attempt) AND claim_nonce=$2 AND state='initiating'
 RETURNING row_to_json(paystack_checkout_attempts) AS attempt`,[attemptId,nonce]);
 return rows.length===1;
}
/** ONLY for authoritative provider validation rejection before any transaction
 * was created. Never use for a transport error, timeout or malformed response.
 */
export async function markPaystackInitiationRejected(attemptId:string,nonce:string):Promise<boolean>{
 const rows=await q<{attempt:StoredAttempt}>(`WITH locked_attempt AS (
  SELECT id,order_id,total FROM paystack_checkout_attempts
  WHERE id=$1 AND claim_nonce=$2 AND state='initiating' AND authorization_url IS NULL FOR UPDATE
 ), ledger AS (
  UPDATE orders o SET status='failed' FROM locked_attempt a
  WHERE o.id=a.order_id AND o.status='pending' AND o.total=a.total AND o.pay_method='card' AND o.paystack_ref=a.order_id RETURNING o.id
 ) UPDATE paystack_checkout_attempts SET state='rejected',updated_at=now()
 WHERE id IN (SELECT id FROM locked_attempt) AND order_id IN (SELECT id FROM ledger) AND claim_nonce=$2 AND state='initiating'
 RETURNING row_to_json(paystack_checkout_attempts) AS attempt`,[attemptId,nonce]);
 return rows.length===1;
}
