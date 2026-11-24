import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {db,hasDb,q,qSchema} from './db';
import {NEWS_DRAFT_MODELS} from '@/lib/shared/urban-news';
import {DEFAULT_NEWS_BUDGET,reserveNewsDraftCents,validNewsBudget,budgetAllows} from './urban-news-budget';
import type {NewsConfigState,NewsDraftAuthorization,NewsJobResult,NewsProvider,NewsProviderReadiness,UrbanNewsConfig,UrbanNewsBudget} from '@/lib/shared/urban-news';

// Separate namespace and authenticated provider context: these never enter settings/history.
const schema=`CREATE TABLE IF NOT EXISTS urban_news_provider_keys(
 provider TEXT PRIMARY KEY CHECK(provider IN ('gemini','openai','qwen','nvidia')),ciphertext TEXT NOT NULL,
 updated_by TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS urban_news_provider_config(
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),value JSONB NOT NULL,updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0));
 CREATE TABLE IF NOT EXISTS urban_news_provider_runs(
 id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('draft','discovery')),fingerprint TEXT NOT NULL,
 budget_day DATE NOT NULL DEFAULT (clock_timestamp() AT TIME ZONE 'UTC')::date,
 state TEXT NOT NULL CHECK(state IN ('prepared','dispatched','complete','failed','unknown')),
 result JSONB,usage JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());
 CREATE INDEX IF NOT EXISTS urban_news_provider_daily ON urban_news_provider_runs(budget_day,kind);
 CREATE UNIQUE INDEX IF NOT EXISTS urban_news_provider_draft_input ON urban_news_provider_runs(fingerprint) WHERE kind='draft';
 CREATE TABLE IF NOT EXISTS urban_news_provider_lease(
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),token TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());
 CREATE TABLE IF NOT EXISTS urban_news_provider_budget(
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),limit_cents INTEGER NOT NULL DEFAULT 500 CHECK(limit_cents BETWEEN 300 AND 500),
 enabled JSONB NOT NULL DEFAULT '{"qwen":true,"gemini":false,"openai":false}'::jsonb,
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),updated_by TEXT NOT NULL DEFAULT 'system',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());`;
let ready:Promise<void>|undefined;
// qSchema accepts explicit statements so the migration block is never split.
const qwenProviderUpgrade=`DO $ugt_qwen$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='urban_news_provider_keys'::regclass
  AND conname='urban_news_provider_keys_provider_check' AND position('nvidia' IN pg_get_constraintdef(oid))=0) THEN
  ALTER TABLE urban_news_provider_keys DROP CONSTRAINT urban_news_provider_keys_provider_check;
  ALTER TABLE urban_news_provider_keys ADD CONSTRAINT urban_news_provider_keys_provider_check CHECK(provider IN ('gemini','openai','qwen','nvidia'));
 END IF;
END; $ugt_qwen$`;
function ensure(){if(!hasDb())throw Error('news_storage_unavailable');return ready??(ready=qSchema([...schema.split(';').map(statement=>statement.trim()).filter(Boolean),"ALTER TABLE urban_news_provider_config ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0)",qwenProviderUpgrade,"ALTER TABLE urban_news_provider_runs ADD COLUMN IF NOT EXISTS reserved_cost_cents INTEGER NOT NULL DEFAULT 0", "ALTER TABLE urban_news_provider_runs ADD COLUMN IF NOT EXISTS provider TEXT", "ALTER TABLE urban_news_provider_runs ADD COLUMN IF NOT EXISTS model TEXT"]).catch(error=>{ready=undefined;throw error}))}
const defaults:UrbanNewsConfig={discoveryEnabled:false,draftingEnabled:false,provider:'gemini',model:'gemini-3.5-flash-lite',dailyDraftLimit:2,dailyDiscoveryLimit:96,termsConfirmed:false};
export const NEWS_MODELS=NEWS_DRAFT_MODELS;
export function validateNewsModel(provider:NewsProvider,model:string){validProvider(provider);if(!NEWS_MODELS[provider].includes(model))throw Error('invalid_news_model')}
function validProvider(value:NewsProvider){if(value!=='gemini'&&value!=='openai'&&value!=='qwen'&&value!=='nvidia')throw Error('invalid_news_provider');return value}
function actorValue(value:string){if(typeof value!=='string'||!value.trim()||value.length>200)throw Error('invalid_news_actor');return value}
function keyMaterial(){const secret=process.env.SESSION_SECRET;if(!secret||secret.length<16||secret==='dev-secret-change-me')throw Error('news_secret_unavailable');return createHash('sha256').update('ugt:urban-news:provider-keys:v1\0'+secret).digest()}
function encrypt(provider:NewsProvider,value:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyMaterial(),iv);cipher.setAAD(Buffer.from('ugt:urban-news:'+provider+':v1'));const bytes=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),bytes.toString('base64url')].join('.')}
function decrypt(provider:NewsProvider,value:string){try{const [version,iv,tag,text,...rest]=value.split('.');if(version!=='v1'||rest.length||!iv||!tag||!text)throw Error();const decipher=createDecipheriv('aes-256-gcm',keyMaterial(),Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from('ugt:urban-news:'+provider+':v1'));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(text,'base64url')),decipher.final()]).toString('utf8')}catch{throw Error('news_key_unavailable')}}
function environmentKey(provider:NewsProvider){const value=process.env[provider==='gemini'?'GEMINI_API_KEY':provider==='qwen'?'QWEN_API_KEY':provider==='nvidia'?'NVIDIA_API_KEY':'OPENAI_API_KEY'];return value&&value.length<=4096&&!/[\r\n\0]/.test(value)?value:null}
async function pauseConfig(client:Client,actor:string):Promise<NewsConfigState>{
 const rows=(await client.query("INSERT INTO urban_news_provider_config(id,value,updated_by,revision) VALUES(true,$1::jsonb,$2,1) ON CONFLICT(id) DO UPDATE SET value=jsonb_set(urban_news_provider_config.value,'{draftingEnabled}','false'::jsonb),revision=urban_news_provider_config.revision+1,updated_by=$2,updated_at=now() RETURNING value,revision",[JSON.stringify(defaults),actor])).rows;
 return configState(rows[0]);
}
export async function saveUrbanNewsProviderKey(provider:NewsProvider,key:string,actor:string):Promise<NewsConfigState>{validProvider(provider);actorValue(actor);if(typeof key!=='string'||!key.trim()||key!==key.trim()||key.length>4096||/[\r\n\0]/.test(key))throw Error('invalid_news_key');const ciphertext=encrypt(provider,key);return transaction(async client=>{await client.query('INSERT INTO urban_news_provider_keys(provider,ciphertext,updated_by) VALUES($1,$2,$3) ON CONFLICT(provider) DO UPDATE SET ciphertext=excluded.ciphertext,updated_by=excluded.updated_by,updated_at=now()',[provider,ciphertext,actor]);// A replacement credential may retry only definitive authentication failures.
 await client.query("UPDATE urban_news_provider_runs SET fingerprint=id||':auth-rejected' WHERE kind='draft' AND provider=$1 AND state='failed' AND result->>'code'='provider_auth_rejected' AND fingerprint<>id||':auth-rejected'",[provider]);
 return pauseConfig(client,actor)})}
export async function deleteUrbanNewsProviderKey(provider:NewsProvider,actor:string):Promise<NewsConfigState>{validProvider(provider);actorValue(actor);return transaction(async client=>{await client.query('DELETE FROM urban_news_provider_keys WHERE provider=$1',[provider]);return pauseConfig(client,actor)})}
/** Server-only capability. Never return this value through an API or a log. */
export async function getUrbanNewsProviderKey(provider:NewsProvider):Promise<string|null>{validProvider(provider);if(!hasDb())return environmentKey(provider);await ensure();const rows=await q<{ciphertext:string}>('SELECT ciphertext FROM urban_news_provider_keys WHERE provider=$1',[provider]);return rows[0]?decrypt(provider,rows[0].ciphertext):environmentKey(provider)}
function parseConfig(value:unknown):UrbanNewsConfig {
 if(typeof value!=='object'||!value||Array.isArray(value))throw Error('invalid_news_config');
 const v=value as UrbanNewsConfig;
 const required=Object.keys(defaults);
 const allowed=[...required,'parallelProviders','voice','dailyMarketTarget'];
 if(!required.every(key=>Object.hasOwn(v,key))||Object.keys(v).some(key=>!allowed.includes(key))
  ||typeof v.discoveryEnabled!=='boolean'||typeof v.draftingEnabled!=='boolean'||typeof v.termsConfirmed!=='boolean'
  ||!Number.isInteger(v.dailyDraftLimit)||v.dailyDraftLimit<1||v.dailyDraftLimit>100
  ||!Number.isInteger(v.dailyDiscoveryLimit)||v.dailyDiscoveryLimit<1||v.dailyDiscoveryLimit>96)
  throw Error('invalid_news_config');
 validProvider(v.provider);
 validateNewsModel(v.provider,v.model);
 if(Object.hasOwn(v,'voice')&&(typeof v.voice!=='string'||v.voice.length>1000))throw Error('invalid_news_config');
 if(Object.hasOwn(v,'dailyMarketTarget')&&(typeof v.dailyMarketTarget!=='number'||!Number.isInteger(v.dailyMarketTarget)||v.dailyMarketTarget<1||v.dailyMarketTarget>20))
  throw Error('invalid_news_config');
 if(Object.hasOwn(v,'parallelProviders')){
  const pool=v.parallelProviders;
  if(!Array.isArray(pool)||pool.length>4||new Set(pool).size!==pool.length)throw Error('invalid_news_config');
  pool.forEach(validProvider);
 }
 if((v.discoveryEnabled||v.draftingEnabled)&&!v.termsConfirmed)throw Error('news_terms_required');
 return {...v};
}

/** Scheduled alternates use their first allowlisted model. Manual requests require the saved primary selection. */
export function matchesNewsSelection(current:NewsConfigState,authorization:NewsDraftAuthorization):boolean {
 if(!authorization||current.revision!==authorization.configRevision)return false;
 const {config}=current;
 const primary=authorization.provider===config.provider&&authorization.model===config.model;
 if(authorization.mode==='manual')return primary;
 if(authorization.mode!=='scheduled'||!config.draftingEnabled)return false;
 if(authorization.provider===config.provider)return primary;
 return config.parallelProviders?.includes(authorization.provider)===true
  &&authorization.model===NEWS_MODELS[authorization.provider][0];
}
function configState(row?:Record<string,unknown>):NewsConfigState{
 if(!row)return{config:{...defaults},revision:0};const revision=Number(row.revision);if(!Number.isSafeInteger(revision)||revision<1)throw Error('news_storage_unavailable');
 return{config:parseConfig(typeof row.value==='string'?JSON.parse(row.value):row.value),revision};
}
export async function getUrbanNewsConfigState():Promise<NewsConfigState>{if(!hasDb())return configState();await ensure();return configState((await q<Record<string,unknown>>('SELECT value,revision FROM urban_news_provider_config WHERE id=true'))[0])}
export async function getUrbanNewsConfig():Promise<UrbanNewsConfig>{return (await getUrbanNewsConfigState()).config}
export async function saveUrbanNewsConfig(value:UrbanNewsConfig,actor:string,expectedRevision:number):Promise<NewsConfigState>{
 actorValue(actor);const config=parseConfig(value);if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('invalid_news_config');
 return transaction(async client=>{const current=configState((await client.query('SELECT value,revision FROM urban_news_provider_config WHERE id=true FOR UPDATE')).rows[0]);if(current.revision!==expectedRevision)throw Error('news_config_changed');
 const rows=current.revision===0?(await client.query('INSERT INTO urban_news_provider_config(id,value,updated_by,revision) VALUES(true,$1::jsonb,$2,1) ON CONFLICT DO NOTHING RETURNING value,revision',[JSON.stringify(config),actor])).rows:(await client.query('UPDATE urban_news_provider_config SET value=$1::jsonb,updated_by=$2,updated_at=now(),revision=revision+1 WHERE id=true AND revision=$3 RETURNING value,revision',[JSON.stringify(config),actor,expectedRevision])).rows;
 if(!rows[0])throw Error('news_config_changed');return configState(rows[0]);});
}
type Client={query:(sql:string,args?:unknown[])=>Promise<{rows:Record<string,unknown>[]}>};
async function transaction<T>(work:(client:Client)=>Promise<T>):Promise<T>{await ensure();const pool=db();if(!pool)throw Error('news_storage_unavailable');let client;try{client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='8s'");await client.query("SELECT pg_advisory_xact_lock(hashtext('ugt:urban-news:provider-budget:v1'))");const value=await work(client);await client.query('COMMIT');return value}catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}finally{client?.release();await pool.end().catch(()=>{})}}
/** Owner budget changes share the advisory lock used by provider dispatch. */
export async function saveUrbanNewsBudget(value:unknown,actor:string,expectedRevision:number):Promise<UrbanNewsBudget>{
 actorValue(actor);
 if(!validNewsBudget(value)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('invalid_news_budget');
 return transaction(async client=>{
  const previous=(await client.query('SELECT revision FROM urban_news_provider_budget WHERE id=true FOR UPDATE')).rows[0];
  const revision=previous?Number(previous.revision):0;
  if(revision!==expectedRevision)throw Error('news_config_changed');
  const enabled=JSON.stringify(value.enabledProviders);
  const rows=revision===0
   ?(await client.query('INSERT INTO urban_news_provider_budget(id,limit_cents,enabled,updated_by) VALUES(true,$1,$2::jsonb,$3) ON CONFLICT DO NOTHING RETURNING revision',[value.monthlyLimitCents,enabled,actor])).rows
   :(await client.query('UPDATE urban_news_provider_budget SET limit_cents=$1,enabled=$2::jsonb,revision=revision+1,updated_by=$3,updated_at=clock_timestamp() WHERE id=true AND revision=$4 RETURNING revision',[value.monthlyLimitCents,enabled,actor,expectedRevision])).rows;
  if(!rows[0])throw Error('news_config_changed');
  return {...value,revision:Number(rows[0].revision),reservedCents:0};
 });
}
/** Missing policy rows use defaults; existing provider credentials and consent remain unchanged. */
function budgetRow(row?:Record<string,unknown>):UrbanNewsBudget{
 if(!row)return {...DEFAULT_NEWS_BUDGET,enabledProviders:{...DEFAULT_NEWS_BUDGET.enabledProviders}};
 const enabled=typeof row.enabled==='string'?JSON.parse(row.enabled):row.enabled;
 const input={monthlyLimitCents:Number(row.limit_cents),enabledProviders:enabled};
 if(!validNewsBudget(input))throw Error('news_storage_unavailable');
 const revision=Number(row.revision);
 if(!Number.isSafeInteger(revision)||revision<1)throw Error('news_storage_unavailable');
 return {...input,enabledProviders:{...input.enabledProviders,nvidia:input.enabledProviders.nvidia===true},revision,reservedCents:0};
}
const monthCostSql="SELECT COALESCE(SUM(CASE WHEN reserved_cost_cents>0 THEN reserved_cost_cents ELSE 50 END),0) AS reserved FROM urban_news_provider_runs WHERE kind='draft' AND state<>'prepared' AND budget_day>=date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date AND budget_day<(date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')+interval '1 month')::date";
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const newsRunFingerprint=(value:unknown)=>hash(JSON.stringify(value));
const recentRateLimit="result->>'code'='provider_rate_limited' AND updated_at>clock_timestamp()-interval '15 minutes'";
export async function pausedUrbanNewsProviders():Promise<(NewsProvider|null)[]>{
 await ensure();
 return (await q<{provider:NewsProvider|null}>(`SELECT DISTINCT provider FROM urban_news_provider_runs WHERE kind='draft' AND ${recentRateLimit}`)).map(row=>row.provider);
}
export async function readUrbanNewsRun(kind:'draft'|'discovery',requestId:string,fingerprint:string,scheduledSlot=false):Promise<NewsJobResult|null>{await ensure();const requestKey=hash(kind+'\0'+requestId);const rows=await q<{id:string;state:string;fingerprint:string;result:NewsJobResult|string|null}>("SELECT id,state,fingerprint,result FROM urban_news_provider_runs WHERE id=$1 OR ($2='draft' AND kind='draft' AND fingerprint=$3) ORDER BY (id=$1) DESC LIMIT 1",[requestKey,kind,fingerprint]);if(!rows[0])return null;const row=rows[0],id=row.id;if(row.fingerprint!==fingerprint){
 // A repeated cron window can see a different head of queue. Replay the original
 // slot, but never resume an unsent reservation with another story's evidence.
 if(!scheduledSlot||kind!=='draft'||id!==requestKey)throw Error('news_request_conflict');
 if(row.state==='prepared')return {ok:false,state:'blocked',code:'news_request_conflict',id};
 }if(row.result)return {...(typeof row.result==='string'?JSON.parse(row.result):row.result),id};return {ok:row.state==='prepared',state:row.state==='prepared'?'prepared':'unknown',...(row.state==='prepared'?{}:{code:'provider_outcome_unknown'}),id}}
/** A reservation is durable before dispatch, and is never refunded after uncertainty. */
export async function reserveUrbanNewsRun(kind:'draft'|'discovery',requestId:string,fingerprint:string,limit:number,provider?:NewsProvider):Promise<NewsJobResult>{if(!['draft','discovery'].includes(kind)||typeof requestId!=='string'||!requestId||requestId.length>240||typeof fingerprint!=='string'||!fingerprint||fingerprint.length>240||!Number.isInteger(limit)||limit<1||limit>(kind==='draft'?100:96))throw Error('invalid_news_run');const id=hash(kind+'\0'+requestId);return transaction(async client=>{
 const existing=(await client.query("SELECT id,state,fingerprint,result FROM urban_news_provider_runs WHERE id=$1 OR ($2='draft' AND kind='draft' AND fingerprint=$3) ORDER BY (id=$1) DESC LIMIT 1",[id,kind,fingerprint])).rows[0];if(existing){if(existing.fingerprint!==fingerprint)throw Error('news_request_conflict');if(kind==='draft'&&existing.state==='prepared'){
  await client.query("UPDATE urban_news_provider_runs SET budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date WHERE id=$1 AND state='prepared' AND budget_day<(clock_timestamp() AT TIME ZONE 'UTC')::date",[existing.id]);
 }if(existing.result)return {...(typeof existing.result==='string'?JSON.parse(existing.result):existing.result as NewsJobResult),id:String(existing.id)};return {ok:false,state:existing.state==='prepared'?'prepared':'unknown',...(existing.state==='prepared'?{}:{code:'provider_outcome_unknown'}),id:String(existing.id)}}
 const backoff=(await client.query(`SELECT id FROM urban_news_provider_runs WHERE kind=$1 AND ${recentRateLimit} AND ($2::text IS NULL OR provider=$2 OR provider IS NULL) LIMIT 1`,[kind,provider??null])).rows[0];if(backoff)return {ok:false,state:'blocked',code:'provider_backoff'};
 const usage=(await client.query("SELECT count(*) AS used FROM urban_news_provider_runs WHERE kind=$1 AND budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date",[kind])).rows[0];if(Number(usage.used)>=limit)return {ok:false,state:'blocked',code:'daily_budget_exhausted'};
 await client.query("INSERT INTO urban_news_provider_runs(id,kind,fingerprint,state) VALUES($1,$2,$3,'prepared')",[id,kind,fingerprint]);return {ok:true,state:'prepared',id};
 })}
export async function dispatchUrbanNewsRun(id:string):Promise<boolean>{await ensure();return (await q("UPDATE urban_news_provider_runs SET state='dispatched',updated_at=clock_timestamp() WHERE id=$1 AND kind='discovery' AND state='prepared' AND budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date RETURNING id",[id])).length===1}
/** The budget lock also serializes owner settings/key changes with durable dispatch. */
export async function dispatchUrbanNewsDraftRun(id:string,authorization:NewsDraftAuthorization):Promise<{ok:true}|{ok:false;code:'news_config_changed'|'daily_budget_exhausted'|'monthly_budget_exhausted'|'news_provider_disabled'|'provider_outcome_unknown'}>{
 return transaction(async client=>{
  const run=(await client.query("SELECT id FROM urban_news_provider_runs WHERE id=$1 AND kind='draft' AND state='prepared' AND budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date FOR UPDATE",[id])).rows[0];
  if(!run)return{ok:false,code:'provider_outcome_unknown'};
  const current=configState((await client.query('SELECT value,revision FROM urban_news_provider_config WHERE id=true FOR UPDATE')).rows[0]);
  const allowed=matchesNewsSelection(current,authorization)&&current.config.termsConfirmed;
  const spent=allowed?Number((await client.query("SELECT count(*) AS used FROM urban_news_provider_runs WHERE kind='draft' AND state<>'prepared' AND budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date")).rows[0]?.used||0):0;
  const policy=budgetRow((await client.query('SELECT limit_cents,enabled,revision FROM urban_news_provider_budget WHERE id=true FOR UPDATE')).rows[0]);
  const reserved=allowed?reserveNewsDraftCents(authorization.provider,authorization.model):0;
  const monthlyUsed=Number((await client.query(monthCostSql)).rows[0]?.reserved||0);
  const block=!allowed?'news_config_changed':spent>=current.config.dailyDraftLimit?'daily_budget_exhausted':!policy.enabledProviders[authorization.provider]?'news_provider_disabled':!budgetAllows(monthlyUsed,reserved,policy.monthlyLimitCents)?'monthly_budget_exhausted':null;
  if(block){const result:NewsJobResult={ok:false,state:'prepared',code:block,id};await client.query("UPDATE urban_news_provider_runs SET result=$2::jsonb,updated_at=clock_timestamp() WHERE id=$1 AND state='prepared'",[id,JSON.stringify(result)]);return{ok:false,code:block}}
  await client.query("UPDATE urban_news_provider_runs SET state='dispatched',result=NULL,reserved_cost_cents=$2,provider=$3,model=$4,updated_at=clock_timestamp() WHERE id=$1 AND state='prepared'",[id,reserved,authorization.provider,authorization.model]);return{ok:true};
 });
}
const resultCodes=new Set(['news_capacity_reached','provider_auth_rejected','news_config_changed','provider_rate_limited','provider_timeout','provider_unavailable','provider_non_json','provider_body_too_large','provider_json_invalid','provider_output_invalid','provider_evidence_invalid','provider_copying_detected','provider_finish_unsafe','news_revision_conflict','insufficient_evidence','news_storage_unavailable','provider_outcome_unknown','news_item_unavailable','news_terms_required','news_key_unavailable','monthly_budget_exhausted','news_provider_disabled']);
export function safeNewsError(error:unknown){const code=error instanceof Error?error.message:'';return resultCodes.has(code)?code:'provider_unavailable'}
export async function finishUrbanNewsRun(id:string,value:NewsJobResult,usage?:{inputTokens:number;outputTokens:number}):Promise<NewsJobResult>{const result:NewsJobResult={ok:value.ok===true,state:value.state==='complete'?'complete':value.state==='unknown'?'unknown':'failed',id};if(value.code)result.code=safeNewsError(Error(value.code));for(const key of ['added','duplicates','drafted','released'] as const)if(typeof value[key]==='number'&&Number.isSafeInteger(value[key])&&value[key]!>=0)result[key]=value[key];const boundedUsage=usage&&Number.isSafeInteger(usage.inputTokens)&&usage.inputTokens>=0&&usage.inputTokens<10000000&&Number.isSafeInteger(usage.outputTokens)&&usage.outputTokens>=0&&usage.outputTokens<1000000?usage:{};await ensure();await q("UPDATE urban_news_provider_runs SET state=$2,result=$3::jsonb,usage=$4::jsonb,updated_at=clock_timestamp() WHERE id=$1 AND state='dispatched'",[id,result.state,JSON.stringify(result),JSON.stringify(boundedUsage)]);return result}
export async function getUrbanNewsProviderStatus():Promise<NewsProviderReadiness>{const providers:NewsProviderReadiness['providers']={nvidia:{configured:!!environmentKey('nvidia'),keySource:environmentKey('nvidia')?'environment':'none'},gemini:{configured:!!environmentKey('gemini'),keySource:environmentKey('gemini')?'environment':'none'},openai:{configured:!!environmentKey('openai'),keySource:environmentKey('openai')?'environment':'none'},qwen:{configured:!!environmentKey('qwen'),keySource:environmentKey('qwen')?'environment':'none'}};const base:NewsProviderReadiness={storageAvailable:false,providers,discoveryAvailable:false,draftsUsedToday:0,discoveriesUsedToday:0,lastRun:null};if(!hasDb())return base;try{await ensure();const keys=await q<{provider:NewsProvider;ciphertext:string}>('SELECT provider,ciphertext FROM urban_news_provider_keys');for(const row of keys){if(row.provider!=='gemini'&&row.provider!=='openai'&&row.provider!=='qwen'&&row.provider!=='nvidia')continue;try{decrypt(row.provider,row.ciphertext);providers[row.provider]={configured:true,keySource:'managed'}}catch{providers[row.provider]={configured:false,keySource:'managed'}}}const usage=await q<{kind:string;used:string}>("SELECT kind,count(*) AS used FROM urban_news_provider_runs WHERE budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date GROUP BY kind");const latest=await q<{at:string;state:string;code:string|null}>("SELECT updated_at::text AS at,state,result->>'code' AS code FROM urban_news_provider_runs ORDER BY updated_at DESC,id DESC LIMIT 1");const row=(await q<Record<string,unknown>>('SELECT limit_cents,enabled,revision FROM urban_news_provider_budget WHERE id=true'))[0];
 const budget=budgetRow(row);
 budget.reservedCents=Number((await q<{reserved:string}>(monthCostSql))[0]?.reserved||0);
 return {...base,budget,storageAvailable:true,discoveryAvailable:true,draftsUsedToday:Number(usage.find(x=>x.kind==='draft')?.used||0),discoveriesUsedToday:Number(usage.find(x=>x.kind==='discovery')?.used||0),lastRun:latest[0]?{at:latest[0].at,state:latest[0].state,code:latest[0].code?safeNewsError(Error(latest[0].code)):null}:null}}catch{return base}}
export async function claimUrbanNewsLease():Promise<string|null>{await ensure();const token=randomUUID();const rows=await q("INSERT INTO urban_news_provider_lease(id,token,expires_at) VALUES(true,$1,clock_timestamp()+interval '90 seconds') ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at,heartbeat_at=clock_timestamp() WHERE urban_news_provider_lease.expires_at<clock_timestamp() RETURNING token",[token]);return rows.length?token:null}
export async function heartbeatUrbanNewsLease(token:string):Promise<boolean>{await ensure();return (await q("UPDATE urban_news_provider_lease SET expires_at=clock_timestamp()+interval '90 seconds',heartbeat_at=clock_timestamp() WHERE id=true AND token=$1 AND expires_at>clock_timestamp() RETURNING token",[token])).length===1}
export async function releaseUrbanNewsLease(token:string):Promise<void>{await ensure();await q('DELETE FROM urban_news_provider_lease WHERE id=true AND token=$1',[token])}
