import {createHash} from 'node:crypto';
import {q,qSchema} from './db';
import {sendGmailMessage} from './gmail';
let ready:Promise<void>|undefined;
function ensure(){if(!ready)ready=qSchema(`CREATE TABLE IF NOT EXISTS gmail_send_attempts(id TEXT PRIMARY KEY,request_hash TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('sending','accepted','unknown')),provider_id TEXT,thread_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`).catch(error=>{ready=undefined;throw error});return ready}
export class GmailSendUncertain extends Error{constructor(){super('gmail_send_outcome_unknown')}}
/** Gmail has no SQL transaction/idempotency contract. Persist permission once;
 * never steal or resend a possibly accepted send. Do not log message contents.
 */
export async function sendGmailOnce(actor:string,requestId:string,input:Parameters<typeof sendGmailMessage>[0]){
 if(!/^[A-Za-z0-9_-]{32,128}$/.test(requestId))throw Error('invalid_request_id');
 await ensure();const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
 const id=digest(actor+'\0'+requestId),fingerprint=digest(JSON.stringify({to:input.to,subject:input.subject,body:input.body,threadId:input.threadId||'',inReplyTo:input.inReplyTo||'',references:input.references||''}));
 const claimed=await q(`INSERT INTO gmail_send_attempts(id,request_hash,status) VALUES($1,$2,'sending') ON CONFLICT(id) DO NOTHING RETURNING id`,[id,fingerprint]);
 if(!claimed.length){
  const rows=await q<{request_hash:string;status:string;provider_id:string;thread_id:string}>('SELECT request_hash,status,provider_id,thread_id FROM gmail_send_attempts WHERE id=$1',[id]);
  if(rows[0]?.request_hash!==fingerprint)throw Error('reply_details_changed');
  if(rows[0].status!=='accepted')throw new GmailSendUncertain();
  return {id:rows[0].provider_id,threadId:rows[0].thread_id,requestKey:id,deduped:true};
 }
 try{
  const sent=await sendGmailMessage(input);if(!sent.id)throw Error('provider_ack_missing');
  const acknowledged=await q("UPDATE gmail_send_attempts SET status='accepted',provider_id=$2,thread_id=$3,updated_at=now() WHERE id=$1 AND status='sending' RETURNING id",[id,sent.id,sent.threadId||'']);
  if(acknowledged.length!==1)throw Error('send_ack_not_persisted');
  return {...sent,requestKey:id,deduped:false};
 }catch{await q("UPDATE gmail_send_attempts SET status='unknown',updated_at=now() WHERE id=$1 AND status='sending'",[id]).catch(()=>{});throw new GmailSendUncertain()}
}
