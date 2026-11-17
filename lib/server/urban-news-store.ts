import {createHash,randomUUID} from 'node:crypto';
import {q,qSchema,hasDb} from './db';
import {ensureEditorialSchema} from './editorial-schema';
import {invalidate} from './microcache';
import {URBAN_NEWS_PUBLIC_PREDICATE} from './editorial-publication';
import {canonicalNewsUrl,isNewsInstant,urbanNewsDraftHash,validateUrbanNewsDraft,validateNewsPublication} from './urban-news-policy';
import {NEWS_CATEGORIES,type DiscoveredNews,type UrbanNewsDraft,type UrbanNewsItem,type UrbanNewsOverview,type NewsPublication,type NewsStage,type PublicNewsSource,type NewsCategory} from '@/lib/shared/urban-news';

export const URBAN_NEWS_SCHEMA=`
 ALTER TABLE posts ADD COLUMN IF NOT EXISTS urban_news_id UUID;
 ALTER TABLE posts ADD COLUMN IF NOT EXISTS urban_news_revision INTEGER;
 ALTER TABLE posts ADD COLUMN IF NOT EXISTS urban_news_hash TEXT;
 ALTER TABLE posts ADD COLUMN IF NOT EXISTS urban_news_public JSONB;
 CREATE UNIQUE INDEX IF NOT EXISTS posts_urban_news_identity ON posts(urban_news_id) WHERE urban_news_id IS NOT NULL;
 CREATE TABLE IF NOT EXISTS urban_news_candidates (
  id UUID PRIMARY KEY,canonical_url TEXT NOT NULL UNIQUE,request_key TEXT NOT NULL UNIQUE,
  source JSONB NOT NULL,revision INTEGER NOT NULL DEFAULT 1,live_revision INTEGER,
  stage TEXT NOT NULL DEFAULT 'discovered' CHECK(stage IN ('discovered','draft','review','approved','live','held','retracted','archived')),
  draft JSONB NOT NULL,draft_hash TEXT NOT NULL,slug TEXT UNIQUE,approval JSONB,
  discovery_slot SMALLINT CHECK(discovery_slot BETWEEN 1 AND 500),
  published_at TIMESTAMPTZ,correction_note TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );
 CREATE UNIQUE INDEX IF NOT EXISTS urban_news_discovery_slot ON urban_news_candidates(discovery_slot) WHERE stage='discovered';
 CREATE INDEX IF NOT EXISTS urban_news_inbox ON urban_news_candidates(updated_at DESC,id DESC);
 CREATE TABLE IF NOT EXISTS urban_news_revisions (
  candidate_id UUID NOT NULL REFERENCES urban_news_candidates(id),revision INTEGER NOT NULL,
  draft JSONB NOT NULL,draft_hash TEXT NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(candidate_id,revision)
 );
 CREATE TABLE IF NOT EXISTS urban_news_evidence (
  candidate_id UUID NOT NULL,revision INTEGER NOT NULL,evidence_id TEXT NOT NULL,record JSONB NOT NULL,
  PRIMARY KEY(candidate_id,revision,evidence_id),FOREIGN KEY(candidate_id,revision) REFERENCES urban_news_revisions(candidate_id,revision)
 );
 CREATE TABLE IF NOT EXISTS urban_news_audit (
  id BIGSERIAL PRIMARY KEY,candidate_id UUID NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,revision INTEGER NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );
`;
let ready:Promise<void>|null=null;
export async function ensureUrbanNewsSchema():Promise<void>{
 if(!hasDb())throw Error('db_not_configured');
 if(!ready)ready=(async()=>{await ensureEditorialSchema();await qSchema(URBAN_NEWS_SCHEMA)})().catch(error=>{ready=null;throw error});
 return ready;
}
type Row={id:string;revision:number|string;live_revision:number|string|null;stage:NewsStage;draft:UrbanNewsDraft;draft_hash:string;slug:string|null;published_at:string|null;correction_note:string|null;created_at:string;updated_at:string};
const fields='id,revision,live_revision,stage,draft,draft_hash,slug,published_at,correction_note,created_at,updated_at';
const item=(row:Row):UrbanNewsItem=>({id:row.id,revision:Number(row.revision),liveRevision:row.live_revision===null?null:Number(row.live_revision),stage:row.stage,draft:row.draft,draftHash:row.draft_hash,slug:row.slug,publishedAt:row.published_at?new Date(row.published_at).toISOString():null,correctionNote:row.correction_note,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()});
const isId=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
function identity(id:string,revision?:number){if(!isId(id)||revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1||revision>1000000000))throw Error('invalid_news_revision')}
function actorId(actor:string){if(typeof actor!=='string'||!actor.trim()||actor.length>300)throw Error('invalid_news_actor')}
function refreshPublic(){for(const key of ['blog-published-posts','blog-published-post-summaries','blog-published-posts:urban-news','blog-published-post-summaries:urban-news','site-posts'])invalidate(key)}
async function resultOrConflict(rows:Row[],id:string):Promise<UrbanNewsItem>{if(rows[0])return item(rows[0]);if(!await getUrbanNewsItem(id))throw Error('news_not_found');throw Error('news_conflict')}

export async function getUrbanNewsItem(id:string):Promise<UrbanNewsItem|null>{
 identity(id);await ensureUrbanNewsSchema();const rows=await q<Row>(`SELECT ${fields} FROM urban_news_candidates WHERE id=$1`,[id]);return rows[0]?item(rows[0]):null;
}
export async function getUrbanNewsOverview(cursor?:string,query?:{q?:string;stage?:NewsStage|'all';category?:NewsCategory|'all'}):Promise<UrbanNewsOverview>{
 const stages=['discovered','draft','review','approved','live','held','retracted','archived'];
 if(query&&(Object.keys(query).some(key=>!['q','stage','category'].includes(key))||query.q!==undefined&&(typeof query.q!=='string'||query.q.length>100)||query.stage!==undefined&&query.stage!=='all'&&!stages.includes(query.stage)||query.category!==undefined&&query.category!=='all'&&!NEWS_CATEGORIES.includes(query.category)))throw Error('invalid_news_query');
 const search=query?.q?.trim()||'',stage=query?.stage||'all',category=query?.category||'all';
 const filter=createHash('sha256').update(JSON.stringify([search,stage,category])).digest('hex').slice(0,16);
 let at:string|null=null,id:string|null=null;
 if(cursor!==undefined){try{if(cursor.length>300||!/^[A-Za-z0-9_-]+$/.test(cursor))throw Error();const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));if(!Array.isArray(parsed)||parsed.length!==3||parsed[2]!==filter||typeof parsed[0]!=='string'||!Number.isFinite(Date.parse(parsed[0]))||!isId(parsed[1]))throw Error();[at,id]=parsed}catch{throw Error('invalid_news_cursor')}}
 await ensureUrbanNewsSchema();
 const [rows,totals]=await Promise.all([q<Row>(`SELECT ${fields} FROM urban_news_candidates WHERE ($1::timestamptz IS NULL OR (updated_at,id)<($1::timestamptz,$2::uuid)) AND ($3='' OR position(lower($3) in lower((draft->>'headline')||' '||(draft->>'dek')))>0) AND ($4='all' OR stage=$4) AND ($5='all' OR draft->>'category'=$5) ORDER BY updated_at DESC,id DESC LIMIT 51`,[at,id,search,stage,category]),q<{stage:NewsStage;count:string}>(`SELECT stage,count(*)::text AS count FROM urban_news_candidates GROUP BY stage`)]);
 const visible=rows.slice(0,50),last=visible.at(-1),counts:Record<NewsStage,number>={discovered:0,draft:0,review:0,approved:0,live:0,held:0,retracted:0,archived:0};for(const row of totals)counts[row.stage]=Number(row.count);
 return {items:visible.map(item),counts,nextCursor:rows.length>50&&last?Buffer.from(JSON.stringify([last.updated_at,last.id,filter])).toString('base64url'):null};
}
function discovered(value:DiscoveredNews):DiscoveredNews{
 if(!value||typeof value!=='object'||Object.keys(value).some(key=>!['url','title','publisher','country','language','observedAt','provider'].includes(key))||typeof value.title!=='string'||!value.title.trim()||value.title.length>500||typeof value.publisher!=='string'||!value.publisher.trim()||value.publisher.length>300||typeof value.country!=='string'||value.country.length>80||typeof value.language!=='string'||value.language.length>30||typeof value.observedAt!=='string'||!Number.isFinite(Date.parse(value.observedAt))||Date.parse(value.observedAt)>Date.now()+60000||!['gdelt','manual'].includes(value.provider))throw Error('invalid_news_candidate');
 return {...value,url:canonicalNewsUrl(value.url)};
}
function initialDraft(source:DiscoveredNews):UrbanNewsDraft{return {headline:source.title,dek:'',body:[],category:'celebrity',country:'Global',verification:'developing',subjectKind:'unknown',risk:'unknown',evidence:[{id:'discovery',url:source.url,publisher:source.publisher,title:source.title,observedAt:source.observedAt,publishedAt:null,excerpt:'',rights:'unknown',role:'report',independenceKey:new URL(source.url).hostname,checked:false}],claims:[],image:'',imageAlt:'',imageRights:'none',author:'Urban News',disclosure:''}}

async function createCandidate(input:DiscoveredNews,actor:string,requestId:string):Promise<{item:UrbanNewsItem;added:boolean}>{
 const source=discovered(input);actorId(actor);if(typeof requestId!=='string'||!requestId.trim()||requestId.length>200)throw Error('invalid_news_request');await ensureUrbanNewsSchema();
 const id=randomUUID(),draft=initialDraft(source),hash=urbanNewsDraftHash(draft),requestKey=createHash('sha256').update(actor+'\0'+requestId).digest('hex');
 for(let attempt=0;attempt<5;attempt++){
  const rows=await q<Row>(`WITH saved AS (
   INSERT INTO urban_news_candidates(id,canonical_url,request_key,source,draft,draft_hash,discovery_slot)
   SELECT $1::uuid,$2,$3,$4::jsonb,$5::jsonb,$6,slot FROM generate_series(1,500) slot
   WHERE NOT EXISTS(SELECT 1 FROM urban_news_candidates WHERE stage='discovered' AND discovery_slot=slot)
   ORDER BY random() LIMIT 1 ON CONFLICT DO NOTHING RETURNING *
  ), history AS (
   INSERT INTO urban_news_revisions(candidate_id,revision,draft,draft_hash,actor) SELECT id,revision,draft,draft_hash,$7 FROM saved RETURNING candidate_id
  ), evidence AS (
   INSERT INTO urban_news_evidence(candidate_id,revision,evidence_id,record) SELECT id,revision,'discovery',draft->'evidence'->0 FROM saved WHERE id IN(SELECT candidate_id FROM history) RETURNING candidate_id
  ), audit AS (
   INSERT INTO urban_news_audit(candidate_id,actor,action,revision) SELECT id,$7,'discover',revision FROM saved RETURNING candidate_id
  ) SELECT ${fields} FROM saved`,[id,source.url,requestKey,JSON.stringify(source),JSON.stringify(draft),hash,actor]);
  if(rows[0])return {item:item(rows[0]),added:true};
  const existing=await q<Row&{canonical_url:string;request_key:string}>(`SELECT ${fields},canonical_url,request_key FROM urban_news_candidates WHERE canonical_url=$1 OR request_key=$2`,[source.url,requestKey]);
  const replay=existing.find(row=>row.request_key===requestKey);if(replay&&replay.canonical_url!==source.url)throw Error('news_conflict');if(existing[0])return {item:item(existing[0]),added:false};
 }
 throw Error('news_capacity_reached');
}
export async function createUrbanNewsCandidate(input:DiscoveredNews,actor:string,requestId:string):Promise<UrbanNewsItem>{return (await createCandidate(input,actor,requestId)).item}
export async function ingestUrbanNewsCandidates(items:DiscoveredNews[],runId:string):Promise<{added:number;duplicates:number}>{
 if(!Array.isArray(items)||items.length>50||typeof runId!=='string'||!runId||runId.length>150)throw Error('invalid_news_batch');
 const validated=items.map(discovered);await ensureUrbanNewsSchema();let added=0,duplicates=0;
 for(const source of validated){
  const created=await createCandidate(source,'discovery:'+runId,createHash('sha256').update(source.url).digest('hex'));
  if(created.added)added++;else duplicates++;
 }
 return {added,duplicates};
}

export async function saveUrbanNewsDraft(id:string,expectedRevision:number,value:UrbanNewsDraft,actor:string):Promise<UrbanNewsItem>{
 identity(id,expectedRevision);actorId(actor);const draft=validateUrbanNewsDraft(value),hash=urbanNewsDraftHash(draft);await ensureUrbanNewsSchema();
 const rows=await q<Row>(`WITH eligible AS MATERIALIZED (
  SELECT candidate.*,EXISTS(SELECT 1 FROM posts WHERE urban_news_id=candidate.id AND ${URBAN_NEWS_PUBLIC_PREDICATE}) AS has_live
  FROM urban_news_candidates candidate WHERE id=$1 AND revision=$2 AND stage<>'archived' FOR UPDATE
 ), saved AS (
  UPDATE urban_news_candidates candidate SET draft=$3::jsonb,draft_hash=$4,revision=candidate.revision+1,stage='draft',discovery_slot=NULL,approval=NULL,
   live_revision=CASE WHEN eligible.has_live THEN candidate.live_revision ELSE NULL END,
   published_at=CASE WHEN eligible.has_live OR candidate.published_at<=now() THEN candidate.published_at ELSE NULL END,updated_at=clock_timestamp()
  FROM eligible WHERE candidate.id=eligible.id RETURNING candidate.*
 ), projection AS (
  UPDATE posts SET published=false,social_automation_enabled=false,urban_news_public=jsonb_set(urban_news_public,'{live}','false'::jsonb),updated_at=now()
  WHERE urban_news_id IN(SELECT id FROM saved WHERE live_revision IS NULL) RETURNING urban_news_id
 ), history AS (
  INSERT INTO urban_news_revisions(candidate_id,revision,draft,draft_hash,actor) SELECT id,revision,draft,draft_hash,$5 FROM saved RETURNING candidate_id,revision
 ), evidence AS (
  INSERT INTO urban_news_evidence(candidate_id,revision,evidence_id,record)
  SELECT saved.id,saved.revision,record->>'id',record FROM saved CROSS JOIN LATERAL jsonb_array_elements(saved.draft->'evidence') record
  JOIN history ON history.candidate_id=saved.id AND history.revision=saved.revision RETURNING candidate_id
 ), audit AS (
  INSERT INTO urban_news_audit(candidate_id,actor,action,revision,detail) SELECT id,$5,'save_draft',revision,jsonb_build_object('hash',draft_hash) FROM saved RETURNING candidate_id
 ) SELECT ${fields} FROM saved`,[id,expectedRevision,JSON.stringify(draft),hash,actor]);
 if(rows[0]){refreshPublic();return item(rows[0]);}
 // Repeating an interrupted save cannot create a second revision.
 const current=await getUrbanNewsItem(id);if(current&&current.revision===expectedRevision+1&&current.draftHash===hash&&current.stage==='draft')return current;
 return resultOrConflict([],id);
}

function publicSnapshot(draft:UrbanNewsDraft,revision:number,hash:string,note:string|null){
 const sources:PublicNewsSource[]=draft.evidence.map(source=>({id:source.id,url:canonicalNewsUrl(source.url),title:source.title,publisher:source.publisher,publishedAt:source.publishedAt}));
 return {revision,approvedRevision:revision,hash,approvedHash:hash,live:true,sources,verification:draft.verification,country:draft.country,correction:note,author:draft.author,disclosure:draft.disclosure,imageAlt:draft.imageAlt,imageRights:draft.imageRights};
}
export async function publishUrbanNews(input:NewsPublication,actor:string):Promise<UrbanNewsItem>{
 if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['id','expectedRevision','expectedLiveRevision','approvedHash','scheduledAt','correctionNote','checks'].includes(key)))throw Error('invalid_news_publication');
 identity(input.id,input.expectedRevision);actorId(actor);
 if(input.expectedLiveRevision!==null&&(!Number.isSafeInteger(input.expectedLiveRevision)||input.expectedLiveRevision<1)||typeof input.approvedHash!=='string'||!/^[a-f0-9]{64}$/.test(input.approvedHash)||input.correctionNote!==undefined&&(typeof input.correctionNote!=='string'||input.correctionNote.length>2000)||input.scheduledAt!==undefined&&!isNewsInstant(input.scheduledAt))throw Error('invalid_news_publication');
 const current=await getUrbanNewsItem(input.id);if(!current)throw Error('news_not_found');
 if(current.revision!==input.expectedRevision||current.liveRevision!==input.expectedLiveRevision||current.draftHash!==input.approvedHash||current.stage==='archived')throw Error('news_conflict');
 validateNewsPublication(current.draft,input.checks);
 const correction=input.correctionNote?.trim()||null;if(current.publishedAt!==null&&Date.parse(current.publishedAt)<=Date.now()&&!correction)throw Error('news_correction_note_required');
 const slug=current.slug||current.draft.headline.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110).replace(/-$/,'')+'-'+current.id.slice(0,8);
 const snapshot=publicSnapshot(current.draft,current.revision,current.draftHash,correction);
 const rows=await q<Row>(`WITH eligible AS MATERIALIZED (
  SELECT candidate.*,EXISTS(SELECT 1 FROM posts WHERE urban_news_id=candidate.id AND ${URBAN_NEWS_PUBLIC_PREDICATE}) AS has_live
  FROM urban_news_candidates candidate WHERE id=$1 AND revision=$2 AND live_revision IS NOT DISTINCT FROM $3::int AND draft_hash=$4 AND stage<>'archived' FOR UPDATE
 ), projection AS (
  INSERT INTO posts(slug,headline,section,image,dek,body,published,date,editorial_status,editorial_managed,social_automation_enabled,urban_news_id,urban_news_revision,urban_news_hash,urban_news_public,updated_at)
  SELECT $5,draft->>'headline',draft->>'category',CASE WHEN draft->>'image'='' THEN '/assets/pwa-512.png' ELSE draft->>'image' END,draft->>'dek',draft->'body',true,
   (COALESCE(CASE WHEN published_at<=now() THEN published_at END,GREATEST(COALESCE($7::timestamptz,now()),now())) AT TIME ZONE 'Africa/Nairobi')::date,'live',false,false,id,revision,draft_hash,
   $6::jsonb||jsonb_build_object('scheduledAt',GREATEST(COALESCE($7::timestamptz,now()),now()),'publishedAt',COALESCE(CASE WHEN published_at<=now() THEN published_at END,GREATEST(COALESCE($7::timestamptz,now()),now())),'modifiedAt',GREATEST(COALESCE($7::timestamptz,now()),now())),now()
  FROM eligible WHERE NOT(has_live AND COALESCE($7::timestamptz>now(),false))
  ON CONFLICT(slug) DO UPDATE SET headline=excluded.headline,section=excluded.section,image=excluded.image,dek=excluded.dek,body=excluded.body,published=true,date=excluded.date,editorial_status='live',social_automation_enabled=false,
   urban_news_revision=excluded.urban_news_revision,urban_news_hash=excluded.urban_news_hash,urban_news_public=excluded.urban_news_public,updated_at=excluded.updated_at
  WHERE posts.urban_news_id=excluded.urban_news_id RETURNING urban_news_id,urban_news_public
 ), saved AS (
  UPDATE urban_news_candidates candidate SET live_revision=CASE WHEN eligible.has_live AND $7::timestamptz>now() THEN eligible.live_revision ELSE candidate.revision END,
   stage=CASE WHEN $7::timestamptz>now() THEN 'approved' ELSE 'live' END,
   slug=$5,published_at=COALESCE(CASE WHEN candidate.published_at<=now() THEN candidate.published_at END,GREATEST(COALESCE($7::timestamptz,now()),now())),
   correction_note=CASE WHEN eligible.has_live AND $7::timestamptz>now() THEN candidate.correction_note ELSE $8 END,
   approval=jsonb_build_object('actor',$9::text,'hash',$4::text,'revision',$2::int,'previousLiveRevision',$3::int,'checks',$10::jsonb,'approvedAt',now(),'scheduledAt',GREATEST(COALESCE($7::timestamptz,now()),now()),'public',$6::jsonb),discovery_slot=NULL,updated_at=clock_timestamp()
  FROM eligible WHERE candidate.id=eligible.id AND (EXISTS(SELECT 1 FROM projection WHERE urban_news_id=candidate.id) OR (eligible.has_live AND $7::timestamptz>now())) RETURNING candidate.*
 ), audit AS (
  INSERT INTO urban_news_audit(candidate_id,actor,action,revision,detail) SELECT id,$9,'approve_publication',revision,jsonb_build_object('hash',draft_hash,'previousLiveRevision',$3::int,'correction',$8::text,'checks',$10::jsonb) FROM saved RETURNING candidate_id
 ) SELECT ${fields} FROM saved`,[input.id,input.expectedRevision,input.expectedLiveRevision,input.approvedHash,slug,JSON.stringify(snapshot),input.scheduledAt||null,correction,actor,JSON.stringify(input.checks)]);
 const result=await resultOrConflict(rows,input.id);refreshPublic();return result;
}

async function withdraw(id:string,expectedRevision:number,reason:string,actor:string,stage:'held'|'retracted'):Promise<UrbanNewsItem>{
 identity(id,expectedRevision);actorId(actor);if(typeof reason!=='string'||!reason.trim()||reason.length>2000)throw Error('invalid_news_reason');await ensureUrbanNewsSchema();
 const rows=await q<Row>(`WITH eligible AS MATERIALIZED (
  SELECT candidate.*,EXISTS(SELECT 1 FROM posts WHERE urban_news_id=candidate.id AND published
   AND urban_news_public->>'live'='true' AND (urban_news_public->>'scheduledAt')::timestamptz<=now()
   AND (urban_news_public->>'publishedAt')::timestamptz<=now()) AS has_live
  FROM urban_news_candidates candidate WHERE id=$1 AND revision=$2 AND stage<>'archived' FOR UPDATE
 ), saved AS (
  UPDATE urban_news_candidates candidate SET stage=$5,revision=candidate.revision+1,
   live_revision=CASE WHEN $5='held' AND eligible.has_live THEN eligible.live_revision ELSE NULL END,
   approval=NULL,discovery_slot=NULL,published_at=CASE WHEN eligible.has_live OR candidate.published_at<=now() THEN candidate.published_at ELSE NULL END,updated_at=clock_timestamp()
  FROM eligible WHERE candidate.id=eligible.id RETURNING candidate.*
 ), projection AS (
  UPDATE posts SET published=false,social_automation_enabled=false,urban_news_public=jsonb_set(urban_news_public,'{live}','false'::jsonb),updated_at=now()
  WHERE urban_news_id IN(SELECT id FROM saved WHERE live_revision IS NULL) RETURNING urban_news_id
 ), history AS (
  INSERT INTO urban_news_revisions(candidate_id,revision,draft,draft_hash,actor) SELECT id,revision,draft,draft_hash,$4 FROM saved RETURNING candidate_id
 ), evidence AS (
  INSERT INTO urban_news_evidence(candidate_id,revision,evidence_id,record)
  SELECT saved.id,saved.revision,record->>'id',record FROM saved CROSS JOIN LATERAL jsonb_array_elements(saved.draft->'evidence') record
  WHERE saved.id IN(SELECT candidate_id FROM history) RETURNING candidate_id
 ), audit AS (
  INSERT INTO urban_news_audit(candidate_id,actor,action,revision,detail) SELECT id,$4,$5,revision,jsonb_build_object('reason',$3::text) FROM saved RETURNING candidate_id
 ) SELECT ${fields} FROM saved`,[id,expectedRevision,reason.trim(),actor,stage]);
 const result=await resultOrConflict(rows,id);refreshPublic();return result;
}
export const holdUrbanNews=(id:string,expectedRevision:number,reason:string,actor:string)=>withdraw(id,expectedRevision,reason,actor,'held');
export const retractUrbanNews=(id:string,expectedRevision:number,reason:string,actor:string)=>withdraw(id,expectedRevision,reason,actor,'retracted');

export async function releaseApprovedUrbanNews(limit=10):Promise<{released:number;slugs:string[]}>{
 await ensureUrbanNewsSchema();const bounded=Math.max(1,Math.min(25,Math.floor(limit)||10));
 const rows=await q<{slug:string}>(`WITH eligible AS MATERIALIZED (
  SELECT candidate.id FROM urban_news_candidates candidate JOIN posts ON posts.urban_news_id=candidate.id
  WHERE candidate.stage='approved' AND candidate.approval->>'revision'=candidate.revision::text AND candidate.approval->>'hash'=candidate.draft_hash
   AND posts.published AND posts.urban_news_revision=candidate.live_revision
   AND posts.urban_news_public->>'live'='true' AND posts.urban_news_public->>'approvedHash'=posts.urban_news_hash
   AND posts.urban_news_public->>'approvedRevision'=posts.urban_news_revision::text AND (candidate.approval->>'scheduledAt')::timestamptz<=now()
  ORDER BY candidate.updated_at LIMIT $1 FOR UPDATE OF candidate SKIP LOCKED
 ), projection AS (
  UPDATE posts SET headline=candidate.draft->>'headline',section=candidate.draft->>'category',dek=candidate.draft->>'dek',body=candidate.draft->'body',
   image=CASE WHEN candidate.draft->>'image'='' THEN '/assets/pwa-512.png' ELSE candidate.draft->>'image' END,
   urban_news_revision=candidate.revision,urban_news_hash=candidate.draft_hash,
   urban_news_public=(candidate.approval->'public')||jsonb_build_object('scheduledAt',candidate.approval->>'scheduledAt','publishedAt',LEAST(candidate.published_at,now()),'modifiedAt',CASE WHEN posts.urban_news_revision=candidate.revision THEN posts.urban_news_public->>'modifiedAt' ELSE now()::text END),
   social_automation_enabled=false,updated_at=now()
  FROM urban_news_candidates candidate WHERE posts.urban_news_id=candidate.id AND candidate.id IN(SELECT id FROM eligible) RETURNING candidate.id
 ), saved AS (
  UPDATE urban_news_candidates SET stage='live',live_revision=revision,correction_note=approval->'public'->>'correction',updated_at=clock_timestamp() WHERE id IN(SELECT id FROM projection) AND stage='approved' RETURNING id,revision,slug
 ), audit AS (
  INSERT INTO urban_news_audit(candidate_id,actor,action,revision) SELECT id,'scheduler','release',revision FROM saved RETURNING candidate_id
 ) SELECT slug FROM saved`,[bounded]);
 if(rows.length)refreshPublic();return {released:rows.length,slugs:rows.map(row=>row.slug)};
}
