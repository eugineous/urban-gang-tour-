import {createHash,randomUUID} from 'node:crypto';
import {hasDb,q,qSchema} from './db';

// Database-owned jobs contain private receipt payloads. Only summary fields
// are returned to the super-admin API; no browser can read a payload or key.
let schemaReady:Promise<void>|undefined;
export async function ensureEmailOutbox() {
  if (!hasDb()) throw new Error('db_not_configured');
  if(!schemaReady) schemaReady=qSchema(`CREATE TABLE IF NOT EXISTS email_delivery_outbox (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, delivery TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', attempts INT NOT NULL DEFAULT 0,
    request_body TEXT, provider_id TEXT, last_error TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(), lease_until TIMESTAMPTZ,
    lease_token TEXT, first_send_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ); CREATE INDEX IF NOT EXISTS email_delivery_outbox_due ON email_delivery_outbox(status,next_attempt_at);`).then(()=>undefined).catch(error=>{schemaReady=undefined;throw error});
  return schemaReady;
}

export async function enqueueReceiptEmail(orderId:string,delivery='payment') {
  if (!orderId || orderId.length>100 || !/^[a-zA-Z0-9_-]{1,100}$/.test(delivery)) throw new Error('invalid_delivery');
  await ensureEmailOutbox();
  const id='receipt-'+createHash('sha256').update(orderId+'\0'+delivery).digest('hex').slice(0,40);
  await q(`INSERT INTO email_delivery_outbox(id,order_id,delivery)
    SELECT $1,id,$3 FROM orders WHERE id=$2 AND status IN ('paid','fulfilled') AND email IS NOT NULL AND email<>''
    ON CONFLICT(id) DO NOTHING`,[id,orderId,delivery]);
  return id;
}

type Job={id:string;order_id:string;delivery:string;status:string;attempts:number;request_body:string|null;first_send_at:string|null;lease_token:string};
export async function deliverReceiptEmailJob(id:string) {
  await ensureEmailOutbox();
  if (!process.env.RESEND_API_KEY) {
    await q(`UPDATE email_delivery_outbox SET status='blocked',last_error='email_not_configured',updated_at=now()
      WHERE id=$1 AND status IN ('queued','blocked')`,[id]);
    return 'blocked';
  }
  const token=randomUUID();
  const rows=await q<Job>(`UPDATE email_delivery_outbox SET status='processing',attempts=attempts+1,
      lease_until=now()+interval '5 minutes',lease_token=$2,updated_at=now()
    WHERE id=$1 AND attempts<8 AND (first_send_at IS NULL OR first_send_at>now()-interval '20 hours')
      AND ((status IN ('queued','blocked') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()))
    RETURNING *`,[id,token]);
  const job=rows[0];
  if (!job) return 'not_due';
  let retryable=true,error='receipt_preparation_failed';
  try {
    let body=job.request_body;
    if (!body) {
      const orders=await q(`SELECT * FROM orders WHERE id=$1 AND status IN ('paid','fulfilled')`,[job.order_id]);
      if (!orders[0]) {retryable=false;throw new Error('order_not_paid');}
      const {renderReceiptEmailPayload}=await import('./receipt-email');
      body=await renderReceiptEmailPayload(orders[0]);
      const saved=await q(`UPDATE email_delivery_outbox SET request_body=$3,updated_at=now()
        WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,token,body]);
      if (!saved.length) return 'lease_lost';
    }
    const sending=await q(`UPDATE email_delivery_outbox SET first_send_at=COALESCE(first_send_at,now())
      WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,token]);
    if (!sending.length) return 'lease_lost';
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},
      body,signal:AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      error=`provider_http_${response.status}`;
      retryable=response.status===408||response.status===429||response.status>=500;
      throw new Error(error);
    }
    const data=await response.json().catch(()=>({}));
    const providerId=typeof data.id==='string'?data.id.slice(0,100):null;
    await q(`UPDATE email_delivery_outbox SET status='accepted',provider_id=$3,last_error=NULL,
      lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,[id,token,providerId]);
    return 'accepted';
  } catch {
    const failed=!retryable||job.attempts>=8;
    const delay=Math.min(3600,30*2**Math.min(job.attempts,7));
    await q(`UPDATE email_delivery_outbox SET status=$3,last_error=$4,next_attempt_at=now()+($5*interval '1 second'),
      lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=$1 AND lease_token=$2`,[id,token,failed?'failed':'queued',error,delay]);
    return failed?'failed':'queued';
  }
}

export async function processEmailOutbox(limit=5) {
  await ensureEmailOutbox();
  if (!process.env.RESEND_API_KEY) throw new Error('email_not_configured');
  // Stop uncertain retries before the provider's 24-hour idempotency window
  // expires; an operator must inspect them instead of risking a duplicate.
  await q(`UPDATE email_delivery_outbox SET status='failed',last_error='manual_review_required',updated_at=now()
    WHERE status IN ('queued','blocked','processing') AND (attempts>=8 OR first_send_at<=now()-interval '20 hours')`);
  const jobs=await q<{id:string}>(`SELECT id FROM email_delivery_outbox
    WHERE (status IN ('queued','blocked') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now())
    ORDER BY created_at LIMIT $1`,[Math.min(10,Math.max(1,limit))]);
  const outcomes=[];
  for (const job of jobs) outcomes.push({id:job.id,status:await deliverReceiptEmailJob(job.id)});
  return outcomes;
}

export async function emailOutboxStatus() {
  await ensureEmailOutbox();
  const jobs=await q(`SELECT id,order_id,delivery,status,attempts,provider_id,last_error,
    next_attempt_at::text,created_at::text,updated_at::text FROM email_delivery_outbox ORDER BY created_at DESC LIMIT 100`);
  return {configured:!!process.env.RESEND_API_KEY,jobs};
}

export async function retryEmailOutbox(id:string) {
  await ensureEmailOutbox();
  // Retry only within the safe window and keep the original provider payload.
  const rows=await q(`UPDATE email_delivery_outbox SET status='queued',next_attempt_at=now(),last_error=NULL
    WHERE id=$1 AND status IN ('blocked','queued') AND attempts<8
      AND (first_send_at IS NULL OR first_send_at>now()-interval '20 hours') RETURNING id`,[id]);
  return rows.length?deliverReceiptEmailJob(id):'manual_review_required';
}
