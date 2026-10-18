// Persistence primitive only. Not yet wired into checkout or deployed.
// The caller must authenticate the owner scope and validate/price the purchase
// before calling this module. A hash is not authentication or payment evidence.
import {createHash,randomUUID} from 'node:crypto';
import {q,qSchema} from './db';

export const MPESA_ATTEMPT_SCHEMA=`
CREATE TABLE IF NOT EXISTS mpesa_checkout_attempts (
 id TEXT PRIMARY KEY,
 scope_hash TEXT NOT NULL CHECK(scope_hash ~ '^[a-f0-9]{64}$'),
 token_hash TEXT NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 request_hash TEXT NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) DEFERRABLE INITIALLY DEFERRED,
 total INTEGER NOT NULL CHECK(total>0),
 state TEXT NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','initiating','reference_recorded','unknown','closed')),
 claim_nonce TEXT,
 provider_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(scope_hash,token_hash),
 CHECK(state!='reference_recorded' OR provider_reference IS NOT NULL),
 CHECK(state NOT IN ('initiating','unknown','reference_recorded') OR claim_nonce IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_mpesa_attempts_unresolved
 ON mpesa_checkout_attempts(updated_at) WHERE state IN ('initiating','unknown');
`;
let schema:Promise<void>|undefined;
export function ensureMpesaAttemptSchema(){
 if(!schema)schema=qSchema(MPESA_ATTEMPT_SCHEMA).catch(error=>{schema=undefined;throw error});
 return schema;
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function canonical(value:unknown):string{
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
 }
 throw Error('invalid_attempt_request');
}
export type AttemptIdentity={scopeHash:string;tokenHash:string;requestHash:string};
/** owner is a server-validated account/guest principal, NEVER an unverified phone.
 * request is the normalized purchase/contact/fulfilment input, without transient
 * quote results. An existing attempt retains its originally accepted total.
 * Tokens need >=128 bits of cryptographic randomness from the caller; length
 * validation alone cannot prove entropy. Do not log tokens, hashes or contacts.
 */
export function mpesaAttemptIdentity(owner:string,token:string,request:unknown):AttemptIdentity{
 if(typeof owner!=='string'||!owner.trim()||owner.length>256)throw Error('invalid_attempt_owner');
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(token))throw Error('invalid_attempt_token');
 return {scopeHash:hash('ugt:mpesa-owner:v1\0'+owner),tokenHash:hash('ugt:mpesa-token:v1\0'+token),requestHash:hash('ugt:mpesa-request:v1\0'+canonical(request))};
}
function validateIdentity(identity:AttemptIdentity){
 if(!identity||![identity.scopeHash,identity.tokenHash,identity.requestHash].every(value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)))throw Error('invalid_attempt_identity');
}
type AttemptState='prepared'|'initiating'|'reference_recorded'|'unknown'|'closed';
type StoredAttempt={id:string;order_id:string;total:number;state:AttemptState;request_hash:string;claim_nonce:string|null;provider_reference:string|null};
export type MpesaAttempt={id:string;orderId:string;total:number;state:AttemptState};
const snapshot=(row:StoredAttempt):MpesaAttempt=>({id:row.id,orderId:row.order_id,total:row.total,state:row.state});
export class MpesaAttemptConflict extends Error{constructor(){super('attempt_request_conflict')}}
export type AttemptOrder={
 id:string;items:unknown[];total:number;name:string;email:string;phone:string;userId:number|null;
 fulfillment:{method:'pickup'|'delivery';fee:number;address:unknown|null}|null;
};
/** Prerequisites: existing orders.user_id and order_delivery_preferences schema.
 * This single SQL statement atomically creates the attempt, ledger and delivery
 * snapshot. The deferred FK is checked at COMMIT, after the ledger CTE executes.
 * No provider/network call is held inside a database transaction.
 */
export async function prepareMpesaAttempt(identity:AttemptIdentity,order:AttemptOrder):Promise<{attempt:MpesaAttempt;created:boolean}>{
 validateIdentity(identity);
 if(!order||typeof order.id!=='string'||!/^ORD-[A-Z0-9-]{4,40}$/.test(order.id)||!Number.isSafeInteger(order.total)||order.total<1||order.total>2147483647||!Array.isArray(order.items)||!order.items.length)throw Error('invalid_attempt_order');
 if(order.userId!==null&&(!Number.isSafeInteger(order.userId)||order.userId<1))throw Error('invalid_attempt_order');
 const fulfillment=order.fulfillment;
 if(fulfillment&&(!['pickup','delivery'].includes(fulfillment.method)||!Number.isSafeInteger(fulfillment.fee)||fulfillment.fee<0||fulfillment.fee>2147483647))throw Error('invalid_attempt_order');
 await ensureMpesaAttemptSchema();
 const candidate=randomUUID();
 const rows=await q<{attempt:StoredAttempt}>(`
 WITH claimed AS (
  INSERT INTO mpesa_checkout_attempts(id,scope_hash,token_hash,request_hash,order_id,total)
  VALUES($1,$2,$3,$4,$5,$6)
  ON CONFLICT(scope_hash,token_hash) DO UPDATE
   SET updated_at=mpesa_checkout_attempts.updated_at
   WHERE mpesa_checkout_attempts.request_hash=EXCLUDED.request_hash
  RETURNING *
 ), saved_order AS (
  INSERT INTO orders(id,items,total,name,email,phone,user_id)
  SELECT $5,$7::jsonb,$6,$8,$9,$10,$11 FROM claimed WHERE id=$1
  RETURNING id
 ), saved_delivery AS (
  INSERT INTO order_delivery_preferences(order_id,method,fee,address)
  SELECT id,$12::text,$13::integer,$14::jsonb FROM saved_order WHERE $12::text IS NOT NULL
  RETURNING order_id
 )
 SELECT row_to_json(claimed) AS attempt FROM claimed`,
 [candidate,identity.scopeHash,identity.tokenHash,identity.requestHash,order.id,order.total,JSON.stringify(order.items),order.name,order.email,order.phone,order.userId,fulfillment?.method??null,fulfillment?.fee??0,fulfillment?.address==null?null:JSON.stringify(fulfillment.address)]);
 if(!rows[0])throw new MpesaAttemptConflict();
 return {attempt:snapshot(rows[0].attempt),created:rows[0].attempt.id===candidate};
}
/** Lookup is owner/token scoped. Never resolve an order by an attempt token alone. */
export async function recoverMpesaAttempt(identity:AttemptIdentity):Promise<MpesaAttempt|null>{
 validateIdentity(identity);await ensureMpesaAttemptSchema();
 const rows=await q<{attempt:StoredAttempt}>('SELECT row_to_json(a) AS attempt FROM mpesa_checkout_attempts a WHERE scope_hash=$1 AND token_hash=$2',[identity.scopeHash,identity.tokenHash]);
 if(!rows[0])return null;
 if(rows[0].attempt.request_hash!==identity.requestHash)throw new MpesaAttemptConflict();
 return snapshot(rows[0].attempt);
}
/** One durable winner may send. There is intentionally NO lease/reclaim of an
 * initiating/unknown attempt: a dead worker might already have sent the request.
 * Keep the nonce server-side. Losing/concurrent callers must only recover/poll.
 */
export async function claimMpesaInitiation(identity:AttemptIdentity):Promise<{attempt:MpesaAttempt;nonce:string}|null>{
 validateIdentity(identity);await ensureMpesaAttemptSchema();
 const nonce=randomUUID();
 const rows=await q<{attempt:StoredAttempt}>(`WITH locked_attempt AS (
  SELECT id,order_id,total FROM mpesa_checkout_attempts
  WHERE scope_hash=$1 AND token_hash=$2 AND request_hash=$3 AND state='prepared' FOR UPDATE
 ), eligible_order AS (
  SELECT o.id FROM orders o JOIN locked_attempt a ON a.order_id=o.id
  WHERE o.status='pending' AND o.total=a.total AND o.mpesa_ref IS NULL FOR UPDATE OF o
 )
 UPDATE mpesa_checkout_attempts SET state='initiating',claim_nonce=$4,updated_at=now()
 WHERE id IN (SELECT id FROM locked_attempt) AND order_id IN (SELECT id FROM eligible_order)
  AND state='prepared'
 RETURNING row_to_json(mpesa_checkout_attempts) AS attempt`,[identity.scopeHash,identity.tokenHash,identity.requestHash,nonce]);
 return rows[0]?{attempt:snapshot(rows[0].attempt),nonce}:null;
}
/** Persist reference and ledger linkage together. This does NOT confirm payment. */
export async function recordMpesaReference(attemptId:string,nonce:string,reference:string):Promise<boolean>{
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(reference))throw Error('invalid_provider_reference');
 const rows=await q<{attempt:StoredAttempt}>(`
 WITH locked AS (
  SELECT id,order_id FROM mpesa_checkout_attempts
  WHERE id=$1 AND claim_nonce=$2 AND state IN ('initiating','unknown','reference_recorded')
   AND (provider_reference IS NULL OR provider_reference=$3)
  FOR UPDATE
 ), ledger AS (
  UPDATE orders o SET mpesa_ref=$3
  FROM locked a
  WHERE o.id=a.order_id AND o.status IN ('pending','unknown','reconciling')
   AND (o.mpesa_ref IS NULL OR o.mpesa_ref=$3)
  RETURNING o.id
 )
 UPDATE mpesa_checkout_attempts a SET state='reference_recorded',provider_reference=$3,updated_at=now()
 WHERE a.id=$1 AND a.claim_nonce=$2 AND a.state IN ('initiating','unknown','reference_recorded')
  AND (a.provider_reference IS NULL OR a.provider_reference=$3)
  AND EXISTS(SELECT 1 FROM ledger WHERE ledger.id=a.order_id)
 RETURNING row_to_json(a) AS attempt`,[attemptId,nonce,reference]);
 return rows.length===1;
}
/** Failure/timeout after acquiring send permission is ambiguous, NOT retryable.
 * A failure to persist this flag is still safe: 'initiating' is also non-replayable.
 */
export async function markMpesaInitiationUnknown(attemptId:string,nonce:string):Promise<boolean>{
 const rows=await q<{attempt:StoredAttempt}>(`UPDATE mpesa_checkout_attempts SET state='unknown',updated_at=now()
 WHERE id=$1 AND claim_nonce=$2 AND state='initiating'
 RETURNING row_to_json(mpesa_checkout_attempts) AS attempt`,[attemptId,nonce]);
 return rows.length===1;
}
/** Closure follows an existing authoritative terminal ledger status only. It
 * never sets paid/failed, mints a receipt, deletes history or reopens an attempt.
 */
export async function closeSettledMpesaAttempt(attemptId:string):Promise<boolean>{
 const rows=await q<{attempt:StoredAttempt}>(`UPDATE mpesa_checkout_attempts a SET state='closed',updated_at=now()
 FROM orders o WHERE a.id=$1 AND o.id=a.order_id AND a.state!='closed'
  AND o.status IN ('paid','fulfilled','declined','timed_out','failed','refunded','partially_refunded')
 RETURNING row_to_json(a) AS attempt`,[attemptId]);
 return rows.length===1;
}
