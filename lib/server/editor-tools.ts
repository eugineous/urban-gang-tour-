// Narrow machine credentials: no admin session, publication, tickets or customer access.
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {db,q,qSchema} from './db';
import {ensureOpsSchema} from './ops';
import {parseOrganizerEventPatch} from './organizer-event-validation';
import {validateEventTiers} from './event-tier-input';
import {mediaConfigured,mediaPut} from './media';

export const TOOL_SCOPES=['poster:upload','event:draft'] as const;
export type ToolScope=typeof TOOL_SCOPES[number];
export const POSTER_MAX_BYTES=5*1024*1024;
export class ToolError extends Error {constructor(message:string,public readonly status=400){super(message)}}
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ToolError('invalid_body');return value as Record<string,unknown>}
function plain(value:unknown,max:number){if(typeof value!=='string'||value.trim().length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new ToolError('invalid_text');return value.trim()}
export function parseToolGrant(value:unknown){
 const v=object(value);
 if(Object.keys(v).some(k=>!['label','expiresInDays','scopes'].includes(k)))throw new ToolError('unexpected_field');
 const label=plain(v.label,80);if(!label)throw new ToolError('label_required');
 if(!Number.isSafeInteger(v.expiresInDays)||Number(v.expiresInDays)<1||Number(v.expiresInDays)>30)throw new ToolError('invalid_expiry');
 if(!Array.isArray(v.scopes)||!v.scopes.length||v.scopes.length>2||v.scopes.some(s=>!TOOL_SCOPES.includes(s))||new Set(v.scopes).size!==v.scopes.length)throw new ToolError('invalid_scopes');
 return {label,expiresInDays:Number(v.expiresInDays),scopes:v.scopes as ToolScope[]};
}
export function parseToolDraft(value:unknown){
 const v=object(value);
 if(Object.keys(v).some(k=>!['requestId','posterId','kind','name','eventDate','eventTime','venue','city','description'].includes(k)))throw new ToolError('unexpected_field');
 if(!uuid(v.requestId))throw new ToolError('invalid_request_id');
 if(v.posterId!==undefined&&!uuid(v.posterId))throw new ToolError('invalid_poster_id');
 if(!['ticketed','school','past'].includes(String(v.kind)))throw new ToolError('invalid_kind');
 const patch:Record<string,string>={};
 for(const key of ['name','eventDate','venue','city','description'])if(v[key]!==undefined)patch[key]=plain(v[key],key==='description'?2000:key==='venue'?300:key==='name'?200:100);
 const parsed=parseOrganizerEventPatch(patch);
 if(!parsed.ok)throw new ToolError(parsed.error);
 if(!parsed.patch.name)throw new ToolError('name_required');
 const eventTime=v.eventTime===undefined?'':plain(v.eventTime,80);
 // Tiers and sales are deliberately absent; canonical validator confirms the empty inventory.
 const tiers=validateEventTiers([]);if(!tiers.ok)throw new ToolError(tiers.error);
 return {requestId:v.requestId,posterId:v.posterId as string|undefined,kind:String(v.kind),...parsed.patch,name:parsed.patch.name,eventTime};
}
export async function readLimitedBody(req:Request,max:number):Promise<Buffer>{
 const size=req.headers.get('content-length');
 if(size!==null&&(!/^\d+$/.test(size)||!Number.isSafeInteger(Number(size))))throw new ToolError('invalid_size');
 if(size!==null&&Number(size)>max)throw new ToolError('body_too_large',413);
 if(!req.body)throw new ToolError('empty_body');
 const reader=req.body.getReader();let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new ToolError('body_timeout',408)),15000)});
  let total=0;const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;total+=value.byteLength;if(total>max)throw new ToolError('body_too_large',413);chunks.push(value)}
  return Buffer.concat(chunks,total);
 }finally{clearTimeout(timer);void reader.cancel().catch(()=>{})}
}
export async function readToolJson(req:Request,max=16*1024):Promise<unknown>{
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new ToolError('invalid_content_type',415);
 const bytes=await readLimitedBody(req,max);try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new ToolError('invalid_json')}
}
export const EDITOR_TOOL_SCHEMA=`
CREATE TABLE IF NOT EXISTS editor_tool_keys (
 id UUID PRIMARY KEY, label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
 token_hash TEXT NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 scopes TEXT[] NOT NULL CHECK(cardinality(scopes) BETWEEN 1 AND 2 AND scopes <@ ARRAY['poster:upload','event:draft']::text[]),
 issuer TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>created_at AND expires_at<=created_at+interval '30 days'),
 revoked_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ,
 minute_start TIMESTAMPTZ NOT NULL DEFAULT now(), minute_count INT NOT NULL DEFAULT 0,
 day_start TIMESTAMPTZ NOT NULL DEFAULT now(), day_count INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS editor_tool_posters (
 id UUID PRIMARY KEY, key_id UUID NOT NULL REFERENCES editor_tool_keys(id),
 url TEXT NOT NULL, content_type TEXT NOT NULL CHECK(content_type IN ('image/png','image/jpeg','image/webp')),
 bytes INT NOT NULL CHECK(bytes BETWEEN 1 AND 5242880), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS editor_tool_drafts (
 key_id UUID NOT NULL REFERENCES editor_tool_keys(id), request_id UUID NOT NULL,
 payload_hash TEXT NOT NULL, event_id TEXT NOT NULL REFERENCES tour_events(id),
 PRIMARY KEY(key_id,request_id)
);
`;
let schema:Promise<void>|null=null;
export function ensureEditorToolSchema(){if(!schema)schema=(async()=>{await ensureOpsSchema();await qSchema(EDITOR_TOOL_SCHEMA)})().catch(e=>{schema=null;throw e});return schema}

type Client={query:(sql:string,params?:unknown[])=>Promise<{rows:Record<string,any>[]}>}; // Same SQL path used by the isolated PostgreSQL fixture.
async function transaction<T>(work:(client:Client)=>Promise<T>):Promise<T>{
 await ensureEditorToolSchema();const pool=db();if(!pool)throw new ToolError('tools_unavailable',503);
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='10s'");const value=await work(client);await client.query('COMMIT');return value}
 catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}finally{client.release();await pool.end()}
}
export async function listToolKeys(){await ensureEditorToolSchema();return q('SELECT id,label,scopes,issuer,created_at,expires_at,revoked_at,last_used_at FROM editor_tool_keys ORDER BY created_at DESC LIMIT 100')}
export async function issueToolKey(input:ReturnType<typeof parseToolGrant>,actor:string){
 const id=randomUUID(),token='ugt_edit_'+randomBytes(32).toString('base64url');
 const key=await transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(72116820)');
  const count=await client.query('SELECT count(*) AS total FROM editor_tool_keys WHERE revoked_at IS NULL AND expires_at>now()');
  if(Number(count.rows[0].total)>=10)throw new ToolError('active_key_limit',409);
  const result=await client.query(`INSERT INTO editor_tool_keys(id,label,token_hash,scopes,issuer,expires_at) VALUES($1,$2,$3,$4,$5,now()+$6::int*interval '1 day') RETURNING id,label,scopes,expires_at`,[id,input.label,tokenHash(token),input.scopes,actor,input.expiresInDays]);
  await client.query("INSERT INTO audit_log(actor,action,detail) VALUES($1,'editorTool.issue',jsonb_build_object('keyId',$2::text,'scopes',$3::text[]))",[actor,id,input.scopes]);
  return result.rows[0];
 });
 return {key,token};
}
export async function revokeToolKey(id:unknown,actor:string){
 if(!uuid(id))throw new ToolError('invalid_key_id');
 return transaction(async client=>{
  const result=await client.query('UPDATE editor_tool_keys SET revoked_at=coalesce(revoked_at,now()) WHERE id=$1 RETURNING id',[id]);
  if(!result.rows.length)throw new ToolError('key_not_found',404);
  await client.query("INSERT INTO audit_log(actor,action,detail) VALUES($1,'editorTool.revoke',jsonb_build_object('keyId',$2::text))",[actor,id]);
  return {ok:true};
 });
}
export function bearerToken(req:Request){
 const match=/^Bearer (ugt_edit_[A-Za-z0-9_-]{43})$/.exec(req.headers.get('authorization')||'');
 if(!match)throw new ToolError('invalid_credential',401);return match[1];
}
// Preflight before reading bytes. Every side effect rechecks under the key row lock.
export async function checkToolCredential(token:string,scope:ToolScope){
 await ensureEditorToolSchema();const rows=await q('SELECT id FROM editor_tool_keys WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp() AND $2=ANY(scopes)',[tokenHash(token),scope]);
 if(!rows.length)throw new ToolError('invalid_credential_or_scope',401);
}
async function authorized<T>(token:string,scope:ToolScope,work:(client:Client,key:Record<string,any>)=>Promise<T>):Promise<T>{
 return transaction(async client=>{
  // This row lock serializes use against revocation and parallel quota checks.
  const result=await client.query('SELECT *,expires_at>clock_timestamp() AS unexpired FROM editor_tool_keys WHERE token_hash=$1 FOR UPDATE',[tokenHash(token)]);
  const key=result.rows[0];
  if(!key||key.revoked_at||key.unexpired!==true&&key.unexpired!=='t'||!key.scopes?.includes(scope))throw new ToolError('invalid_credential_or_scope',401);
  const used=await client.query(`UPDATE editor_tool_keys SET
   minute_count=CASE WHEN minute_start<=clock_timestamp()-interval '1 minute' THEN 1 ELSE minute_count+1 END,
   minute_start=CASE WHEN minute_start<=clock_timestamp()-interval '1 minute' THEN clock_timestamp() ELSE minute_start END,
   day_count=CASE WHEN day_start<=clock_timestamp()-interval '1 day' THEN 1 ELSE day_count+1 END,
   day_start=CASE WHEN day_start<=clock_timestamp()-interval '1 day' THEN clock_timestamp() ELSE day_start END,
   last_used_at=clock_timestamp()
   WHERE id=$1 AND expires_at>clock_timestamp() AND revoked_at IS NULL
   AND (minute_start<=clock_timestamp()-interval '1 minute' OR minute_count<6)
   AND (day_start<=clock_timestamp()-interval '1 day' OR day_count<30) RETURNING id`,[key.id]);
  if(!used.rows.length)throw new ToolError('tool_rate_limit',429);
  return work(client,key);
 });
}
const imageTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as const;
export function validatePoster(bytes:Buffer,type:string){
 if(!Object.hasOwn(imageTypes,type))throw new ToolError('invalid_content_type',415);
 if(!bytes.length||bytes.length>POSTER_MAX_BYTES)throw new ToolError('invalid_image_size',413);
 const valid=type==='image/jpeg'?bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
 type==='image/png'?bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
 bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!valid)throw new ToolError('invalid_image');
}
export async function uploadToolPoster(token:string,bytes:Buffer,type:string){
 validatePoster(bytes,type);
 return authorized(token,'poster:upload',async(client,key)=>{
  if(!mediaConfigured())throw new ToolError('media_unavailable',503);
  const id=randomUUID();
  // Existing mediaPut validates storage keys/types and applies the shared storage budget.
  const {url}=await mediaPut(`admin-events/${id}.${imageTypes[type as keyof typeof imageTypes]}`,bytes,{contentType:type});
  await client.query('INSERT INTO editor_tool_posters(id,key_id,url,content_type,bytes) VALUES($1,$2,$3,$4,$5)',[id,key.id,url,type,bytes.length]);
  await client.query("INSERT INTO audit_log(actor,action,detail) VALUES($1,'editorTool.poster',jsonb_build_object('keyId',$2::text,'posterId',$3::text,'bytes',$4::int))",[key.issuer,key.id,id,bytes.length]);
  return {posterId:id,url};
 });
}
export async function createToolDraft(token:string,input:ReturnType<typeof parseToolDraft>){
 return authorized(token,'event:draft',async(client,key)=>{
  const digest=tokenHash(JSON.stringify(input));
  const prior=await client.query('SELECT event_id,payload_hash FROM editor_tool_drafts WHERE key_id=$1 AND request_id=$2',[key.id,input.requestId]);
  if(prior.rows.length){if(prior.rows[0].payload_hash!==digest)throw new ToolError('request_id_conflict',409);return {id:prior.rows[0].event_id,status:'draft',reused:true}}
  let image='';
  if(input.posterId){const result=await client.query('SELECT url FROM editor_tool_posters WHERE id=$1 AND key_id=$2',[input.posterId,key.id]);if(!result.rows.length)throw new ToolError('poster_not_owned',403);image=result.rows[0].url}
  const id='event-'+randomUUID();
  await client.query(`INSERT INTO tour_events(id,slug,kind,name,event_date,event_time,venue,city,description,image,status,tiers)
   VALUES($1,$1,$2,$3,$4::date,$5,$6,$7,$8,$9,'draft','[]'::jsonb)`,[id,input.kind,input.name,input.eventDate||null,input.eventTime,input.venue||'',input.city||'',input.description||'',image]);
  await client.query('INSERT INTO editor_tool_drafts(key_id,request_id,payload_hash,event_id) VALUES($1,$2,$3,$4)',[key.id,input.requestId,digest,id]);
  await client.query("INSERT INTO audit_log(actor,action,detail) VALUES($1,'editorTool.draft',jsonb_build_object('keyId',$2::text,'eventId',$3::text))",[key.issuer,key.id,id]);
  return {id,status:'draft',reused:false};
 });
}
