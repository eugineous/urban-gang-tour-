import {budgetAllows,reserveNewsDraftCents} from './urban-news-budget';
import {NEWS_DRAFT_MODELS,type NewsConfigState,type NewsDraftAuthorization,type NewsJobResult,type UrbanNewsItem} from '@/lib/shared/urban-news';
import {getUrbanNewsItem,saveUrbanNewsDraft,holdUrbanNews,ingestUrbanNewsCandidates,releaseApprovedUrbanNews} from './urban-news-store';
import {matchesNewsSelection,pausedUrbanNewsProviders,getUrbanNewsProviderStatus,getUrbanNewsConfigState,getUrbanNewsConfig,getUrbanNewsProviderKey,reserveUrbanNewsRun,readUrbanNewsRun,dispatchUrbanNewsDraftRun,dispatchUrbanNewsRun,finishUrbanNewsRun,newsRunFingerprint,safeNewsError,claimUrbanNewsLease,heartbeatUrbanNewsLease,releaseUrbanNewsLease} from './urban-news-secrets';
import {draftFromEvidence,fetchDiscoveredNews,fetchKenyaMusicLead,hasDraftEvidence} from './urban-news-providers';
import {chooseDiscoveryCountry,listReadyMarketDrafts} from '@/lib/server/urban-news-market-queue';
import {discoverMarketSources,fetchKenyaChartBackup,eligibleGlobalNewsLead} from '@/lib/server/urban-news-market-sources';
export {getUrbanNewsConfigState,getUrbanNewsConfig,saveUrbanNewsConfig,getUrbanNewsProviderStatus,saveUrbanNewsBudget} from './urban-news-secrets';

function identity(requestId:string,actor:string){if(typeof requestId!=='string'||!requestId.trim()||requestId.length>120||typeof actor!=='string'||!actor.trim()||actor.length>100)throw Error('invalid_news_request');return actor+'\0'+requestId}
const blocked=(code:string):NewsJobResult=>({ok:false,state:'blocked',code});
function failure(error:unknown):NewsJobResult{const code=safeNewsError(error);return {ok:false,state:['provider_timeout','provider_unavailable','news_storage_unavailable'].includes(code)?'unknown':'failed',code}}
function terminal(run:NewsJobResult|null){return run&&run.state!=='prepared'?run:null}

/** A single bounded discovery request; provider metadata is never checked evidence. */
export async function discoverUrbanNews(requestId:string,actor:string):Promise<NewsJobResult>{
 const request=identity(requestId,actor),config=await getUrbanNewsConfig();
 const fingerprint=newsRunFingerprint({kind:'discovery',version:1});
 const replay=terminal(await readUrbanNewsRun('discovery',request,fingerprint));
 if(replay)return replay;
 const run=await reserveUrbanNewsRun('discovery',request,fingerprint,config.dailyDiscoveryLimit);
 if(run.state!=='prepared')return run;
 const id=run.id!;
 if(!await dispatchUrbanNewsRun(id))return {ok:false,state:'unknown',code:'provider_outcome_unknown',id};
 const target=config.dailyMarketTarget??5;
 const marketRequest=chooseDiscoveryCountry(Math.floor(Date.now()/900_000),target)
  .catch(()=>{throw Error('news_storage_unavailable')}).then(country=>discoverMarketSources(country,target));
 const [chart,headlines,market]=await Promise.allSettled([
  fetchKenyaMusicLead().catch(()=>fetchKenyaChartBackup()),fetchDiscoveredNews(),marketRequest
 ]);
 const marketItems=market.status==='fulfilled'?market.value.slice(0,Math.min(5,target)):[];
 if(chart.status==='rejected'&&headlines.status==='rejected'&&!marketItems.length){
  const storageFailure=market.status==='rejected'&&safeNewsError(market.reason)==='news_storage_unavailable';
  return finishUrbanNewsRun(id,failure(storageFailure?market.reason:headlines.reason));
 }
 const found=chart.status==='fulfilled'?[chart.value]:[];
 found.push(...marketItems);
 if(headlines.status==='fulfilled')found.push(...headlines.value.filter(eligibleGlobalNewsLead).slice(0,2));
 let imported;
 try{imported=await ingestUrbanNewsCandidates(found,id)}
 catch(error){
  const code=error instanceof Error&&error.message==='news_capacity_reached'?'news_capacity_reached':'news_storage_unavailable';
  return finishUrbanNewsRun(id,failure(Error(code)));
 }
 return finishUrbanNewsRun(id,{ok:true,state:'complete',...imported});
}

/** Model text can only produce a new private revision; it has no approval authority. */
export async function generateUrbanNewsDraft(id:string,expectedRevision:number,requestId:string,actor:string,authorization:NewsDraftAuthorization):Promise<NewsJobResult>{
 const request=identity(requestId,actor);if(!/^[a-f0-9-]{36}$/i.test(id)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('invalid_news_revision');
 const fingerprint=newsRunFingerprint({kind:'draft',id,revision:expectedRevision,version:1}),replay=terminal(await readUrbanNewsRun('draft',request,fingerprint,authorization?.mode==='scheduled'));if(replay)return replay;
 const current=await getUrbanNewsConfigState(),config=current.config;
 if(!matchesNewsSelection(current,authorization))return blocked('news_config_changed');
 if(!config.termsConfirmed)return blocked('news_terms_required');
 const key=await getUrbanNewsProviderKey(authorization.provider);if(!key)return blocked('news_key_unavailable');const item=await getUrbanNewsItem(id);if(!item)return blocked('news_item_unavailable');if(item.revision!==expectedRevision)throw Error('news_conflict');if(!hasDraftEvidence(item.draft))return blocked('insufficient_evidence');
 const run=await reserveUrbanNewsRun('draft',request,fingerprint,config.dailyDraftLimit,authorization.provider);if(run.state!=='prepared')return run;
 const dispatch=await dispatchUrbanNewsDraftRun(run.id!,authorization);if(!dispatch.ok)return dispatch.code==='provider_outcome_unknown'?{ok:false,state:'unknown',code:dispatch.code,id:run.id}:{...blocked(dispatch.code),id:run.id};
 try{const generated=await draftFromEvidence(authorization.provider,authorization.model,key,item.draft,config.voice);const saved=await saveUrbanNewsDraft(id,expectedRevision,generated.draft,actor);if(saved.liveRevision===null&&(saved.draft.risk!=='routine'||saved.draft.verification==='developing'||saved.draft.subjectKind==='unknown'))await holdUrbanNews(id,saved.revision,'Generated draft requires additional editorial verification.',actor);return await finishUrbanNewsRun(run.id!,{ok:true,state:'complete',drafted:1},generated.usage)}catch(error){const result=failure(error);if(item.liveRevision===null&&['provider_output_invalid','provider_evidence_invalid','provider_copying_detected','provider_finish_unsafe'].includes(result.code||''))await holdUrbanNews(id,expectedRevision,result.code!,actor).catch(()=>{});return await finishUrbanNewsRun(run.id!,result)}
}

function draftable(item:UrbanNewsItem){
 return (item.stage==='discovered'||item.stage==='draft'&&item.draft.claims.length===0)&&hasDraftEvidence(item.draft);
}

async function scheduledDrafts(snapshot:NewsConfigState,window:number):Promise<NewsJobResult|null>{
 const {config}=snapshot;
 let providers=[...new Set([config.provider,...(config.parallelProviders??[])])];
 const modelFor=(provider:typeof config.provider)=>provider===config.provider?config.model:NEWS_DRAFT_MODELS[provider][0];
 const parallel=providers.length>1;
 if(parallel){
  const readiness=await getUrbanNewsProviderStatus();
  if(!readiness.storageAvailable||!readiness.budget)return blocked('news_storage_unavailable');
  const budget=readiness.budget;
  providers=providers.filter(provider=>budget.enabledProviders[provider]);
  if(!providers.length)return blocked('news_provider_disabled');
  providers=providers.filter(provider=>readiness.providers[provider].configured);
  if(!providers.length)return blocked('news_key_unavailable');
  providers=providers.filter(provider=>budgetAllows(budget.reservedCents,reserveNewsDraftCents(provider,modelFor(provider)),budget.monthlyLimitCents));
  if(!providers.length)return blocked('monthly_budget_exhausted');
  const paused=await pausedUrbanNewsProviders();
  providers=providers.filter(provider=>!paused.includes(null)&&!paused.includes(provider));
  if(!providers.length)return blocked('provider_backoff');
 }
 const items=await listReadyMarketDrafts(config.dailyMarketTarget??5,providers.length);
 const candidates=items.filter(draftable).slice(0,providers.length);
 if(!candidates.length)return null;
 const results=await Promise.allSettled(candidates.map((item,index)=>{
  const provider=providers[index];
  const model=modelFor(provider);
  const request=parallel?'scheduled-draft-'+window+'-'+provider:'scheduled-draft-'+window;
  return generateUrbanNewsDraft(item.id,item.revision,request,'scheduler',{provider,model,mode:'scheduled',configRevision:snapshot.revision});
 }));
 const jobs=results.map(result=>result.status==='fulfilled'?result.value:failure(result.reason));
 if(jobs.length===1)return jobs[0];
 const failed=jobs.find(job=>!job.ok);
 return {...(failed??{ok:true,state:'complete' as const}),drafted:jobs.reduce((sum,job)=>sum+(job.drafted??0),0)};
}

/** Lease and heartbeat fence overlapping cron invocations. Each model gets a distinct story revision. */
export async function runUrbanNewsAutomation():Promise<NewsJobResult>{
 if(process.env.URBAN_NEWS_ENABLED!=='true')return blocked('news_mode_disabled');
 const lease=await claimUrbanNewsLease();
 if(!lease)return {ok:false,state:'processing',code:'news_job_busy'};
 try{
  const snapshot=await getUrbanNewsConfigState(),config=snapshot.config;
  if(!await heartbeatUrbanNewsLease(lease))return blocked('news_lease_lost');
  const {released}=await releaseApprovedUrbanNews(5);
  const window=Math.floor(Date.now()/900_000);
  let discovered:NewsJobResult={ok:true,state:'complete'};
  if(config.discoveryEnabled)discovered=await discoverUrbanNews('scheduled-discovery-'+window,'scheduler');
  if(config.draftingEnabled&&config.termsConfirmed){
   if(!await heartbeatUrbanNewsLease(lease))return blocked('news_lease_lost');
   const generated=await scheduledDrafts(snapshot,window);
   if(generated)return {...generated,added:discovered.added,duplicates:discovered.duplicates,released};
  }
  return {...discovered,released};
 }catch(error){return failure(error)}finally{await releaseUrbanNewsLease(lease).catch(()=>{})}
}
