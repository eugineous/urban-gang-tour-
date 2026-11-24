import {getMarketCoverageToday} from '@/lib/server/urban-news-market-queue';
import {validNewsProviderKey} from '@/lib/shared/news-provider-key';
import {NextResponse} from 'next/server';
import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {verifyAdminSession,hasPerm,isSuperAdmin,adminActor} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {getUrbanNewsOverview,getUrbanNewsItem,createUrbanNewsCandidate,saveUrbanNewsDraft,publishUrbanNews,holdUrbanNews,retractUrbanNews} from '@/lib/server/urban-news-store';
import {getUrbanNewsProviderStatus,getUrbanNewsConfigState,saveUrbanNewsConfig,discoverUrbanNews,generateUrbanNewsDraft,saveUrbanNewsBudget} from '@/lib/server/urban-news-automation';
import {fetchKenyaChartBackup} from '@/lib/server/urban-news-market-sources';
import {fetchKenyaMusicLead,checkNewsProviderModel} from '@/lib/server/urban-news-providers';
import {getUrbanNewsProviderKey,saveUrbanNewsProviderKey,deleteUrbanNewsProviderKey} from '@/lib/server/urban-news-secrets';
import {NEWS_CATEGORIES,type NewsStage,type NewsProvider,type UrbanNewsDraft,type UrbanNewsConfig,type NewsPublication,type NewsProviderReadiness} from '@/lib/shared/urban-news';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const revision=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const requestId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v);
const provider=(v:unknown):v is NewsProvider=>v==='gemini'||v==='openai'||v==='qwen'||v==='nvidia';
const stages=['discovered','draft','review','approved','live','held','retracted','archived','all'];
const actions={'key.check':['provider','model'],'chart.prepare':['requestId'],create:['candidate','requestId'],save:['id','expectedRevision','draft'],publish:['publication'],hold:['id','expectedRevision','reason'],retract:['id','expectedRevision','reason'],discover:['requestId'],generate:['id','expectedRevision','requestId','expectedConfigRevision','provider','model'],'config.save':['config','expectedConfigRevision'],'key.save':['provider','key'],'key.delete':['provider'],'budget.save':['budget','expectedBudgetRevision']} as const;
const ownerActions=new Set(['key.check','chart.prepare','publish','retract','config.save','key.save','key.delete','budget.save']);
async function access(req:Request){
 if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
 if(!hasPerm(req,'content'))return reply({error:'forbidden'},403);
 return null;
}
function safeConfig(c:UrbanNewsConfig):UrbanNewsConfig{
 return {discoveryEnabled:c.discoveryEnabled===true,draftingEnabled:c.draftingEnabled===true,provider:c.provider==='nvidia'?'nvidia':c.provider==='qwen'?'qwen':c.provider==='openai'?'openai':'gemini',model:String(c.model||'').slice(0,100),dailyDraftLimit:Number(c.dailyDraftLimit),dailyDiscoveryLimit:Number(c.dailyDiscoveryLimit),termsConfirmed:c.termsConfirmed===true,...(Array.isArray(c.parallelProviders)?{parallelProviders:c.parallelProviders.filter(provider)}:{}),...(typeof c.voice==='string'?{voice:c.voice.slice(0,1000)}:{}),...(Number.isInteger(c.dailyMarketTarget)?{dailyMarketTarget:c.dailyMarketTarget}:{})};
}
function safeReadiness(p:NewsProviderReadiness):NewsProviderReadiness{
 const item=(key:NewsProvider)=>({configured:p.providers?.[key]?.configured===true,keySource:(['managed','environment'].includes(p.providers?.[key]?.keySource)?p.providers[key].keySource:'none') as 'managed'|'environment'|'none'});
 const number=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:0;
 const last=p.lastRun;
 return {storageAvailable:p.storageAvailable===true,providers:{nvidia:item('nvidia'),gemini:item('gemini'),openai:item('openai'),qwen:item('qwen')},discoveryAvailable:p.discoveryAvailable===true,draftsUsedToday:number(p.draftsUsedToday),discoveriesUsedToday:number(p.discoveriesUsedToday),budget:p.budget?{monthlyLimitCents:number(p.budget.monthlyLimitCents),reservedCents:number(p.budget.reservedCents),revision:number(p.budget.revision),enabledProviders:{nvidia:p.budget.enabledProviders?.nvidia===true,qwen:p.budget.enabledProviders?.qwen===true,gemini:p.budget.enabledProviders?.gemini===true,openai:p.budget.enabledProviders?.openai===true}}:undefined,lastRun:last&&typeof last.at==='string'&&Number.isFinite(Date.parse(last.at))?{at:last.at,state:String(last.state).slice(0,40),code:typeof last.code==='string'&&/^[a-z0-9_]{1,80}$/.test(last.code)?last.code:null}:null};
}
function failure(error:unknown){
 const code=error instanceof Error?error.message:'';
 if(['provider_auth_rejected','provider_rate_limited','news_key_unavailable','news_model_not_listed','provider_unavailable','provider_timeout'].includes(code))return reply({error:code},422);
 if(code==='news_not_found')return reply({error:code},404);
 if(code==='news_conflict'||code==='news_capacity_reached'||code==='news_config_changed')return reply({error:code},409);
 if(code.startsWith('invalid_news_'))return reply({error:'invalid_news_request'},400);
 const review=['news_correction_note_required','news_evidence_required','news_review_checks_required','news_risk_review_required','news_sensitive_notes_required','news_claim_evidence_required','news_independent_sources_required','news_image_rights_required','news_incomplete_draft'];
 if(review.includes(code))return reply({error:code},422);
 return reply({error:'newsroom_unavailable'},503);
}

// Content staff read/edit/request drafts; only the owner configures or publishes.
export async function GET(req:Request){
 const denied=await access(req);if(denied)return denied;
 if(!rateLimit('urban-news-read:'+clientIp(req),90,60000))return reply({error:'too_many_requests'},429);
 const params=new URL(req.url).searchParams;
 if(params.get('view')==='coverage'&&params.size===1){
  try{return reply({ok:true,rows:await getMarketCoverageToday()})}catch(error){return failure(error)}
 }
 if([...params.keys()].some(k=>!['id','cursor','q','stage','category'].includes(k)||params.getAll(k).length!==1))return reply({error:'invalid_news_request'},400);
 const id=params.get('id');if(id!==null&&!identifier(id))return reply({error:'invalid_news_request'},400);
 const q=params.get('q')||'',stage=params.get('stage')||'all',category=params.get('category')||'all',cursor=params.get('cursor')||undefined;
 if(q.length>100||/[\u0000-\u001f]/.test(q)||!stages.includes(stage)||category!=='all'&&!(NEWS_CATEGORIES as readonly string[]).includes(category)||cursor&&cursor.length>1000)return reply({error:'invalid_news_request'},400);
 try{
  if(id){const item=await getUrbanNewsItem(id);return item?reply({ok:true,item}):reply({error:'news_not_found'},404)}
  const [overview,config,providers]=await Promise.all([getUrbanNewsOverview(cursor,{q,stage:stage as NewsStage|'all',category:category as typeof NEWS_CATEGORIES[number]|'all'}),getUrbanNewsConfigState(),getUrbanNewsProviderStatus()]);
  return reply({ok:true,...overview,config:safeConfig(config.config),configRevision:config.revision,providers:safeReadiness(providers),canPublish:isSuperAdmin(req),enabled:urbanNewsEnabled()});
 }catch(error){return failure(error)}
}

export async function POST(req:Request){
 const denied=await access(req);if(denied)return denied;
 if(!requireOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('urban-news-write:'+clientIp(req),30,60000))return reply({error:'too_many_requests'},429);
 const parsed=await readJsonObject(req,96*1024);if(!parsed.ok)return reply({error:parsed.error},parsed.status);
 const body=parsed.value,action=body.action;
 if(typeof action!=='string'||!Object.hasOwn(actions,action))return reply({error:'invalid_news_request'},400);
 if(ownerActions.has(action)&&!isSuperAdmin(req))return reply({error:'forbidden'},403);
 if(!keys(body,['action',...actions[action as keyof typeof actions]]))return reply({error:'invalid_news_request'},400);
 const actor=adminActor(req);
 try{
  if(action==='key.check'){
   if(!provider(body.provider)||typeof body.model!=='string')return reply({error:'invalid_news_request'},400);
   const key=await getUrbanNewsProviderKey(body.provider);
   if(!key)return reply({error:'news_key_unavailable'},422);
   return reply({ok:true,access:await checkNewsProviderModel(body.provider,body.model,key)});
  }
  if(action==='chart.prepare'){
   if(!requestId(body.requestId))return reply({error:'invalid_news_request'},400);
   const source=await fetchKenyaMusicLead().catch(()=>fetchKenyaChartBackup());
   return reply({ok:true,item:await createUrbanNewsCandidate(source,actor,body.requestId)});
  }
  if(action==='create'){
   const c=body.candidate;
   if(!object(c)||!keys(c,['url','title','publisher','country','language'])||!requestId(body.requestId)||typeof c.url!=='string'||typeof c.title!=='string'||typeof c.publisher!=='string'||c.url.length>2048||c.title.length>240||c.publisher.length>120||c.country!==undefined&&typeof c.country!=='string'||c.language!==undefined&&typeof c.language!=='string')return reply({error:'invalid_news_request'},400);
   const item=await createUrbanNewsCandidate({url:c.url,title:c.title,publisher:c.publisher,country:String(c.country||'Global'),language:String(c.language||'English'),observedAt:new Date().toISOString(),provider:'manual'},actor,body.requestId);
   return reply({ok:true,item});
  }
  if(action==='key.save'||action==='key.delete'){
   if(!provider(body.provider))return reply({error:'invalid_news_request'},400);
   let updated;if(action==='key.save'){if(typeof body.key!=='string'||!validNewsProviderKey(body.provider,body.key)||body.key.length<20||body.key.length>4096||/[\s\u0000-\u001f]/.test(body.key))return reply({error:'invalid_news_request'},400);updated=await saveUrbanNewsProviderKey(body.provider,body.key,actor)}
   else updated=await deleteUrbanNewsProviderKey(body.provider,actor);
   return reply({ok:true,config:safeConfig(updated.config),configRevision:updated.revision,providers:safeReadiness(await getUrbanNewsProviderStatus())});
  }
  if(action==='budget.save'){
   if(!Number.isSafeInteger(body.expectedBudgetRevision)||Number(body.expectedBudgetRevision)<0||!object(body.budget)||!keys(body.budget,['monthlyLimitCents','enabledProviders']))return reply({error:'invalid_news_request'},400);
   await saveUrbanNewsBudget(body.budget,actor,Number(body.expectedBudgetRevision));
   return reply({ok:true,providers:safeReadiness(await getUrbanNewsProviderStatus())});
  }
  if(action==='config.save'){
   if(!Number.isSafeInteger(body.expectedConfigRevision)||Number(body.expectedConfigRevision)<0||!object(body.config)||!keys(body.config,['discoveryEnabled','draftingEnabled','provider','model','dailyDraftLimit','dailyDiscoveryLimit','termsConfirmed','parallelProviders','voice','dailyMarketTarget']))return reply({error:'invalid_news_request'},400);
   const updated=await saveUrbanNewsConfig(body.config as UrbanNewsConfig,actor,Number(body.expectedConfigRevision));return reply({ok:true,config:safeConfig(updated.config),configRevision:updated.revision});
  }
  if(action==='discover'){if(!requestId(body.requestId))return reply({error:'invalid_news_request'},400);return reply(await discoverUrbanNews(body.requestId,actor))}
  if(action==='publish'){
   const p=body.publication;
   if(!object(p)||!keys(p,['id','expectedRevision','expectedLiveRevision','approvedHash','scheduledAt','correctionNote','checks'])||!identifier(p.id)||!revision(p.expectedRevision)||(p.expectedLiveRevision!==null&&!revision(p.expectedLiveRevision))||typeof p.approvedHash!=='string'||!/^[a-f0-9]{64}$/.test(p.approvedHash)||!object(p.checks)||!keys(p.checks,['facts','rights','attribution','sensitiveNotes']))return reply({error:'invalid_news_request'},400);
   return reply({ok:true,item:await publishUrbanNews(p as NewsPublication,actor)});
  }
  if(!identifier(body.id)||!revision(body.expectedRevision))return reply({error:'invalid_news_request'},400);
  if(action==='save'){if(!object(body.draft))return reply({error:'invalid_news_request'},400);return reply({ok:true,item:await saveUrbanNewsDraft(body.id,body.expectedRevision,body.draft as UrbanNewsDraft,actor)})}
  if(action==='generate'){if(!requestId(body.requestId)||!Number.isSafeInteger(body.expectedConfigRevision)||Number(body.expectedConfigRevision)<0||!provider(body.provider)||typeof body.model!=='string'||body.model.length>100)return reply({error:'invalid_news_request'},400);return reply(await generateUrbanNewsDraft(body.id,body.expectedRevision,body.requestId,actor,{configRevision:Number(body.expectedConfigRevision),provider:body.provider,model:body.model,mode:'manual'}))}
  if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>2000)return reply({error:'invalid_news_request'},400);
  return reply({ok:true,item:await(action==='hold'?holdUrbanNews:retractUrbanNews)(body.id,body.expectedRevision,body.reason.trim(),actor)});
 }catch(error){return failure(error)}
}
