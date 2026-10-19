import {NextResponse} from 'next/server';
import {adminActor,hasPerm,isSuperAdmin,verifyAdminSession} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {readJsonObject} from '@/lib/server/json-body';
import {rateLimit} from '@/lib/server/ratelimit';
import {readReplyDraft,writeReplyDraft,ReplyDraftConflict,type DraftChannel} from '@/lib/server/reply-drafts';
import {createHash} from 'node:crypto';
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
function validContext(channel:unknown,context:unknown):channel is DraftChannel{
 return (channel==='booking'||channel==='gmail')&&typeof context==='string'&&context.length>0&&context.length<=300&&!/[\x00-\x1f]/.test(context)&&(channel!=='booking'||/^B-[A-Z0-9-]{4,40}$/i.test(context));
}
// Signed-in staff see ONLY their own drafts; booking permission or owner inbox.
async function access(req:Request){
 if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
 if(!rateLimit('reply-drafts:'+createHash('sha256').update(adminActor(req)).digest('hex'),180,60000))return reply({error:'too_many_requests'},429);
 return null;
}
const permitted=(req:Request,channel:DraftChannel)=>channel==='gmail'?isSuperAdmin(req):hasPerm(req,'bookings');
export async function GET(req:Request){
 const denied=await access(req);if(denied)return denied;
 const url=new URL(req.url),channel=url.searchParams.get('channel'),context=url.searchParams.get('context');
 if([...url.searchParams.keys()].some(key=>!['channel','context'].includes(key))||!validContext(channel,context))return reply({error:'invalid_draft'},400);
 if(!permitted(req,channel))return reply({error:'forbidden'},403);
 try{return reply({ok:true,draft:await readReplyDraft(adminActor(req),channel,context!)})}catch{return reply({error:'draft_unavailable'},503)}
}
async function mutate(req:Request,clear:boolean){
 const denied=await access(req);if(denied)return denied;
 if(!requireOrigin(req))return reply({error:'bad_origin'},403);
 const parsed=await readJsonObject(req,50000);if(!parsed.ok)return reply({error:parsed.error},parsed.status);
 const value=parsed.value,{channel,context,expectedVersion}=value;
 if(Object.keys(value).some(key=>!['channel','context','expectedVersion',...(clear?[]:['subject','body','legacySendKey'])].includes(key))||!validContext(channel,context)||!(expectedVersion===null||typeof expectedVersion==='string'&&/^[a-f0-9-]{36}$/i.test(expectedVersion)))return reply({error:'invalid_draft'},400);
 if(value.legacySendKey!==undefined&&(clear||expectedVersion!==null||typeof value.legacySendKey!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(value.legacySendKey)))return reply({error:'invalid_draft'},400);
 if(!permitted(req,channel))return reply({error:'forbidden'},403);
 if(!clear&&(typeof value.subject!=='string'||value.subject.length>200||/[\r\n]/.test(value.subject)||typeof value.body!=='string'||value.body.length>10000))return reply({error:'invalid_draft'},400);
 try{return reply({ok:true,draft:await writeReplyDraft(adminActor(req),channel,context as string,expectedVersion as string|null,clear?null:{subject:value.subject as string,body:value.body as string},value.legacySendKey as string|undefined)})}
 catch(error){return reply({error:error instanceof ReplyDraftConflict?'draft_changed_elsewhere':'draft_save_unconfirmed'},error instanceof ReplyDraftConflict?409:503)}
}
export const PUT=(req:Request)=>mutate(req,false);
export const DELETE=(req:Request)=>mutate(req,true);
