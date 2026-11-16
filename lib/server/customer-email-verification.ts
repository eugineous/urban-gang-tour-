import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,randomInt,randomUUID} from 'node:crypto';
import {q} from './db';
import {ensureCustomerIdentitySchema} from './customer-identity';
import {normalizeCustomerEmail} from '@/lib/shared/customer-identity';
export async function queueCustomerPasswordReset(email:string):Promise<string|null>{
 if(!process.env.RESEND_API_KEY)throw Error('email_delivery_unavailable');
 if(normalizeCustomerEmail(email)!==email)throw Error('invalid_email');
 const raw=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(raw).digest('hex'),id='account-'+randomUUID();
 const payload=seal(id,JSON.stringify({from:process.env.BOOKINGS_FROM||'Urban Gang Tour <admin@urbangangtour.co.ke>',to:email,subject:'Reset your Urban Gang Tour password',text:`Reset your password within one hour:\nhttps://urbangangtour.co.ke/account?reset=${raw}\n\nOnly the latest link works. Resetting signs out your other devices. If you did not request this, ignore this message.`}));
 await ensureCustomerIdentitySchema();
 const rows=await q<{id:string}>(`WITH candidates AS (
 SELECT id FROM users WHERE lower(btrim(email))=$2 ORDER BY id LIMIT 2
 ), issued AS (
 INSERT INTO customer_reset_tokens(token_hash,user_id,expires_at)
 SELECT $1,id,now()+interval '1 hour' FROM candidates WHERE (SELECT COUNT(*) FROM candidates)=1
 ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at
 WHERE customer_reset_tokens.expires_at<now()+interval '59 minutes' RETURNING user_id,token_hash,expires_at
 ) INSERT INTO customer_security_email_outbox(id,user_id,token_hash,payload_encrypted,expires_at,purpose)
 SELECT $3,user_id,token_hash,$4,expires_at,'reset' FROM issued RETURNING id`,[hash,email,id,payload]);
 return rows[0]?.id||null;
}

// Both the worker and due-job selector use the same authorization predicate.
// Replaced, used or reset-session proofs cannot starve current delivery jobs.
const currentProof=`((j.purpose='verification' AND EXISTS(SELECT 1 FROM customer_email_proofs p JOIN users u ON u.id=p.user_id
 WHERE p.user_id=j.user_id AND p.token_hash=j.token_hash AND p.used_at IS NULL AND p.expires_at>now() AND p.session_version=u.session_version))
 OR (j.purpose='reset' AND EXISTS(SELECT 1 FROM customer_reset_tokens r WHERE r.user_id=j.user_id AND r.token_hash=j.token_hash AND r.expires_at>now())))`;

function key(){const secret=process.env.SESSION_SECRET;if(!secret)throw Error('identity_secret_unavailable');return createHash('sha256').update('ugt-security-email-v1:'+secret).digest()}
function proof(userId:number,code:string){return createHmac('sha256',key()).update('email-proof:'+userId+':'+code).digest('hex')}
function seal(id:string,body:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(id));const encrypted=Buffer.concat([cipher.update(body,'utf8'),cipher.final()]);return [iv,encrypted,cipher.getAuthTag()].map(value=>value.toString('base64url')).join('.')}
function open(id:string,payload:string){const parts=payload.split('.');if(parts.length!==3||payload.length>16000)throw Error('invalid_security_payload');const[iv,encrypted,tag]=parts.map(value=>Buffer.from(value,'base64url'));const decipher=createDecipheriv('aes-256-gcm',key(),iv);decipher.setAAD(Buffer.from(id));decipher.setAuthTag(tag);return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString('utf8')}

/** Only the authenticated route may call this after password reauthentication. */
export async function requestEmailVerification(userId:number,version:number,email:string):Promise<string|null>{
 if(!Number.isSafeInteger(userId)||userId<1||!Number.isSafeInteger(version)||version<0||normalizeCustomerEmail(email)!==email)throw Error('invalid_identity');
 if(!process.env.RESEND_API_KEY)throw Error('email_delivery_unavailable');
 const code=String(randomInt(10000000,100000000)),hash=proof(userId,code),id='account-'+randomUUID();
 const payload=seal(id,JSON.stringify({from:process.env.BOOKINGS_FROM||'Urban Gang Tour <admin@urbangangtour.co.ke>',to:email,subject:'Verify your Urban Gang Tour email',text:`Your verification code is ${code}.\n\nEnter it on your Urban Gang account page within 15 minutes. Only the latest code works. Never share your password or M-Pesa PIN. If you did not request this, ignore this message.`}));
 await ensureCustomerIdentitySchema();
 const rows=await q(`WITH proof AS (
 INSERT INTO customer_email_proofs(token_hash,user_id,session_version,email,expires_at)
 SELECT $1,id,$3,$4,now()+interval '15 minutes' FROM users
 WHERE id=$2 AND session_version=$3 AND (NULLIF(btrim(email),'') IS NULL OR lower(btrim(email))=$4)
 ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,email=EXCLUDED.email,
 session_version=EXCLUDED.session_version,expires_at=EXCLUDED.expires_at,created_at=now(),attempts=0,used_at=NULL
 WHERE customer_email_proofs.created_at<now()-interval '60 seconds' RETURNING token_hash,expires_at
 ) INSERT INTO customer_security_email_outbox(id,user_id,token_hash,payload_encrypted,expires_at)
 SELECT $5,$2,token_hash,$6,expires_at FROM proof RETURNING id`,[hash,userId,version,email,id,payload]);
 return rows.length?id:null;
}
export async function confirmEmailVerification(userId:number,code:string):Promise<boolean>{
 if(!Number.isSafeInteger(userId)||userId<1||!/^\d{8}$/.test(code))return false;
 const hash=proof(userId,code);await ensureCustomerIdentitySchema();
 const rows=await q(`WITH checked AS (
 UPDATE customer_email_proofs p SET attempts=p.attempts+1,used_at=CASE WHEN p.token_hash=$2 THEN now() ELSE NULL END
 FROM users u WHERE p.user_id=$1 AND u.id=p.user_id AND u.session_version=p.session_version
 AND p.used_at IS NULL AND p.expires_at>now() AND p.attempts<5 RETURNING p.*
 ) UPDATE users u SET email=c.email,email_verified_at=now() FROM checked c
 WHERE u.id=c.user_id AND u.session_version=c.session_version AND c.token_hash=$2
 AND (NULLIF(btrim(u.email),'') IS NULL OR lower(btrim(u.email))=c.email) RETURNING u.id`,[userId,hash]);
 return rows.length===1;
}

type Job={id:string;payload_encrypted:string;attempts:number};
export async function deliverSecurityEmailJob(id:string):Promise<string>{
 if(!process.env.RESEND_API_KEY)return 'blocked';await ensureCustomerIdentitySchema();
 const lease=randomUUID();
 const rows=await q<Job>(`UPDATE customer_security_email_outbox j SET status='processing',attempts=j.attempts+1,
 lease_token=$2,lease_until=now()+interval '1 minute'
 WHERE j.id=$1 AND ${currentProof} AND j.expires_at>now() AND j.attempts<4
 AND ((j.status='queued' AND j.next_attempt_at<=now()) OR (j.status='processing' AND j.lease_until<now()))
 RETURNING j.id,j.payload_encrypted,j.attempts`,[id,lease]);
 const job=rows[0];if(!job)return 'not_due';let error='security_email_preparation_failed',retryable=false;
 try{
  const body=open(id,job.payload_encrypted);retryable=true;error='provider_unavailable';
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body,signal:AbortSignal.timeout(12000)});
  if(!response.ok){error='provider_http_'+response.status;retryable=response.status===408||response.status===429||response.status>=500;await response.body?.cancel();throw Error(error)}
  const data=await response.json().catch(()=>null);error='provider_acceptance_unconfirmed';
  if(typeof data?.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id))throw Error(error);
  const accepted=await q(`UPDATE customer_security_email_outbox SET status='accepted',provider_id=$3,last_error=NULL,lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,lease,data.id]);
  return accepted.length?'accepted':'lease_lost';
 }catch{
  const status=retryable&&Number(job.attempts)<4?'queued':'failed';
  const saved=await q(`UPDATE customer_security_email_outbox SET status=$3,last_error=$4,next_attempt_at=now()+interval '30 seconds',lease_token=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,lease,status,error]);
  return saved.length?status:'lease_lost';
 }
}
export async function processSecurityEmailOutbox(limit=5){
 if(!process.env.RESEND_API_KEY)return[];await ensureCustomerIdentitySchema();
 const jobs=await q<{id:string}>(`SELECT j.id FROM customer_security_email_outbox j WHERE j.expires_at>now() AND j.attempts<4 AND ${currentProof}
 AND ((j.status='queued' AND j.next_attempt_at<=now()) OR (j.status='processing' AND j.lease_until<now())) ORDER BY j.next_attempt_at,j.id LIMIT $1`,[Math.max(1,Math.min(10,limit))]);
 const outcomes=[];for(const job of jobs)outcomes.push({id:job.id,status:await deliverSecurityEmailJob(job.id)});return outcomes;
}
