import {randomUUID} from 'node:crypto';
import {hasDb,q,qSchema} from './db';
import {ensureBookingsSchema} from './bookings-schema';
import {contactPayloadHash,contactReference,type ContactEnquiry} from './contact-enquiries';
import {renderContactEmailPayload} from './contact-email';

let schemaReady:Promise<void>|undefined;
export async function ensureContactEmailOutbox(){
 if(!hasDb())throw Error('contact_unavailable');
 if(!schemaReady)schemaReady=qSchema(`CREATE TABLE IF NOT EXISTS contact_email_outbox (
  id TEXT PRIMARY KEY,booking_id TEXT NOT NULL,payload_hash TEXT NOT NULL,source_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',attempts INT NOT NULL DEFAULT 0,request_body TEXT,
  provider_id TEXT,last_error TEXT,next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,lease_token TEXT,first_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 ); CREATE INDEX IF NOT EXISTS contact_email_outbox_due ON contact_email_outbox(status,next_attempt_at);`).then(()=>undefined).catch(error=>{schemaReady=undefined;throw error});
 return schemaReady;
}
type ContactJob={id:string;booking_id:string;payload_hash:string;source_payload:string;status:string;attempts:number;request_body:string|null;lease_token:string};
export async function saveContactEnquiry(enquiry:ContactEnquiry,requestId:string){
 await ensureBookingsSchema();await ensureContactEmailOutbox();
 const reference=contactReference(requestId),id='contact-'+reference.slice(2),hash=contactPayloadHash(enquiry);
 // Both records are committed by one statement. A retry can neither replace
 // the private source snapshot nor silently change an earlier enquiry.
 let rows=await q<{id:string;payload_hash:string;status:string}>(`WITH saved AS (
  INSERT INTO bookings(id,name,email,type,message,event_brief,source)
  VALUES($1,$2,$3,'Contact enquiry',$4,$5,'contact') ON CONFLICT(id) DO NOTHING RETURNING id
 ), queued AS (
  INSERT INTO contact_email_outbox(id,booking_id,payload_hash,source_payload)
  SELECT $6,id,$7,$8 FROM saved ON CONFLICT(id) DO NOTHING RETURNING id,payload_hash,status
 ) SELECT id,payload_hash,status FROM queued
 UNION ALL SELECT id,payload_hash,status FROM contact_email_outbox WHERE id=$6 AND NOT EXISTS(SELECT 1 FROM queued)`,[reference,enquiry.name,enquiry.email,enquiry.message,enquiry.subject,id,hash,JSON.stringify(enquiry)]);
 // A concurrent identical insert may have committed after the CTE snapshot.
 if(!rows.length)rows=await q(`SELECT id,payload_hash,status FROM contact_email_outbox WHERE id=$1`,[id]);
 if(!rows[0])throw Error('contact_unavailable');
 if(rows[0].payload_hash!==hash)throw Error('request_details_changed');
 return {reference,jobId:id,status:rows[0].status};
}
export async function deliverContactEmailJob(id:string){
 await ensureContactEmailOutbox();
 if(!process.env.RESEND_API_KEY){await q(`UPDATE contact_email_outbox SET status='blocked',last_error='email_not_configured',next_attempt_at=now()+interval '15 minutes',updated_at=now() WHERE id=$1 AND status IN ('queued','blocked')`,[id]);return 'blocked';}
 const token=randomUUID();
 const [job]=await q<ContactJob>(`UPDATE contact_email_outbox SET status='processing',attempts=attempts+1,lease_until=now()+interval '5 minutes',lease_token=$2,updated_at=now()
  WHERE id=$1 AND attempts<8 AND (first_send_at IS NULL OR first_send_at>now()-interval '20 hours')
  AND ((status IN ('queued','blocked') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now())) RETURNING *`,[id,token]);
 if(!job)return 'not_due';
 let error='contact_delivery_failed',retryable=true,blocked=false;
 try{
  let body=job.request_body;
  if(!body){body=await renderContactEmailPayload(JSON.parse(job.source_payload),job.booking_id);const saved=await q(`UPDATE contact_email_outbox SET request_body=$3,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,token,body]);if(!saved.length)return 'lease_lost';}
  const sending=await q(`UPDATE contact_email_outbox SET first_send_at=COALESCE(first_send_at,now()) WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,token]);if(!sending.length)return 'lease_lost';
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},body,signal:AbortSignal.timeout(12000)});
  if(!response.ok){error=`provider_http_${response.status}`;retryable=response.status===408||response.status===429||response.status>=500;throw Error(error);}
  const data=await response.json().catch(()=>({}));
  const providerId=typeof data.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(data.id)?data.id:null;
  if(!providerId){error='provider_acceptance_unconfirmed';throw Error(error);}
  await q(`UPDATE contact_email_outbox SET status='accepted',provider_id=$3,last_error=NULL,lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,[id,token,providerId]);
  return 'accepted';
 }catch(cause){
  if(cause instanceof Error&&['contact_recipient_not_configured','contact_sender_not_configured'].includes(cause.message)){error=cause.message;blocked=true;}
  const status=blocked?'blocked':!retryable||job.attempts>=8?'failed':'queued',delay=blocked?900:Math.min(3600,30*2**Math.min(job.attempts,7));
  await q(`UPDATE contact_email_outbox SET status=$3,last_error=$4,next_attempt_at=now()+($5*interval '1 second'),attempts=GREATEST(0,attempts-$6),lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,[id,token,status,error,delay,blocked?1:0]);
  return status;
 }
}
export async function processContactEmailOutbox(limit=3){
 await ensureContactEmailOutbox();
 await q(`UPDATE contact_email_outbox SET status='failed',last_error='manual_review_required',updated_at=now() WHERE status IN ('queued','blocked','processing') AND (attempts>=8 OR first_send_at<=now()-interval '20 hours')`);
 const jobs=await q<{id:string}>(`SELECT id FROM contact_email_outbox WHERE (status IN ('queued','blocked') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()) ORDER BY created_at LIMIT $1`,[Math.min(5,Math.max(1,limit))]);
 const outcomes=[];for(const job of jobs)outcomes.push({id:job.id,status:await deliverContactEmailJob(job.id)});return outcomes;
}
export async function contactEmailOutboxStatus(){
 await ensureContactEmailOutbox();
 return q(`SELECT id,booking_id,status,attempts,provider_id,last_error,next_attempt_at::text,created_at::text,updated_at::text FROM contact_email_outbox ORDER BY created_at DESC LIMIT 100`);
}
export async function retryContactEmailJob(id:string){
 await ensureContactEmailOutbox();
 const rows=await q(`UPDATE contact_email_outbox SET status='queued',next_attempt_at=now(),last_error=NULL WHERE id=$1 AND status IN ('queued','blocked') AND attempts<8 AND (first_send_at IS NULL OR first_send_at>now()-interval '20 hours') RETURNING id`,[id]);
 return rows.length?deliverContactEmailJob(id):'manual_review_required';
}
