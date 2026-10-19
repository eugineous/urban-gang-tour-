import {createHash,randomUUID} from 'node:crypto';
import {q,qSchema} from './db';
export type ReplyDraft={subject:string;body:string;version:string;sendKey:string;deleted:boolean};
export type DraftChannel='booking'|'gmail';
let ready:Promise<void>|undefined;
export function ensureReplyDraftSchema(){
 if(!ready)ready=qSchema(`CREATE TABLE IF NOT EXISTS admin_reply_drafts(
  actor_hash TEXT NOT NULL, channel TEXT NOT NULL CHECK(channel IN ('booking','gmail')),
  context TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL, send_key TEXT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_hash,channel,context));`).catch(error=>{ready=undefined;throw error});
 return ready;
}
const owner=(actor:string)=>createHash('sha256').update('ugt:reply-draft:v1\0'+actor).digest('hex');
const snapshot=(row:ReplyDraft):ReplyDraft=>({...row,deleted:row.deleted===true||String(row.deleted)==='t'});
export class ReplyDraftConflict extends Error{constructor(){super('draft_changed_elsewhere')}}
export async function readReplyDraft(actor:string,channel:DraftChannel,context:string){
 await ensureReplyDraftSchema();
 const rows=await q<ReplyDraft>('SELECT subject,body,version,send_key AS "sendKey",deleted FROM admin_reply_drafts WHERE actor_hash=$1 AND channel=$2 AND context=$3',[owner(actor),channel,context]);
 return rows[0]?snapshot(rows[0]):null;
}
/** Compare-and-swap is one statement. No provider I/O or long-held transaction.
 * Tombstones erase the text but prevent delayed saves resurrecting a cleared draft.
 */
export async function writeReplyDraft(actor:string,channel:DraftChannel,context:string,expectedVersion:string|null,input:{subject:string;body:string}|null,legacySendKey?:string){
 await ensureReplyDraftSchema();const scope=owner(actor),version=randomUUID(),subject=input?.subject??'',body=input?.body??'',deleted=!input;
 const rows=expectedVersion===null
  ?await q<ReplyDraft>(`INSERT INTO admin_reply_drafts(actor_hash,channel,context,subject,body,version,send_key,deleted)
    VALUES($1,$2,$3,$4,$5,$6,$8,$7) ON CONFLICT(actor_hash,channel,context) DO NOTHING RETURNING subject,body,version,send_key AS "sendKey",deleted`,[scope,channel,context,subject,body,version,deleted,legacySendKey??version])
  :await q<ReplyDraft>(`UPDATE admin_reply_drafts SET subject=$4,body=$5,version=$6,send_key=CASE WHEN deleted AND NOT $7 THEN $6 ELSE send_key END,deleted=$7,updated_at=now()
    WHERE actor_hash=$1 AND channel=$2 AND context=$3 AND version=$8 RETURNING subject,body,version,send_key AS "sendKey",deleted`,[scope,channel,context,subject,body,version,deleted,expectedVersion]);
 if(rows[0])return snapshot(rows[0]);
 // A lost response may be retried, but only identical durable content is an ack.
 const current=await readReplyDraft(actor,channel,context);
 if(current&&current.subject===subject&&current.body===body&&current.deleted===deleted)return current;
 throw new ReplyDraftConflict();
}
