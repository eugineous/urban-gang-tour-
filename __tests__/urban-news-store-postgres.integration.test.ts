/** Opted-in, network-none disposable PostgreSQL only; never DATABASE_URL. */
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
import type {DiscoveredNews,UrbanNewsDraft} from '@/lib/shared/urban-news';
const fixture=vi.hoisted(()=>({query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Record<string,unknown>[]>,schema:undefined as unknown as (sql:string)=>Promise<void>}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,params?:unknown[])=>fixture.query(sql,params),qSchema:(sql:string)=>fixture.schema(sql)}));
import {createUrbanNewsCandidate,saveUrbanNewsDraft,publishUrbanNews,retractUrbanNews,holdUrbanNews,getUrbanNewsItem,getUrbanNewsOverview,ingestUrbanNewsCandidates,releaseApprovedUrbanNews} from '@/lib/server/urban-news-store';
import {urbanNewsDraftHash} from '@/lib/server/urban-news-policy';
import {getPublicPostSelect,getPublicPostSummarySelect} from '@/lib/server/editorial-publication';
const source:DiscoveredNews={url:'https://example.test/fixture?utm_source=one',title:'Fixture announcement',publisher:'Fixture publisher',country:'KE',language:'en',observedAt:'2026-11-17T00:00:00Z',provider:'manual'};
const draft:UrbanNewsDraft={headline:'Fictional fixture music announcement',dek:'Fixture reporting only.',body:['The fictional fixture artist announced a release.'],category:'music',country:'KE',verification:'attributed',subjectKind:'public_figure',risk:'routine',evidence:[{id:'source-1',url:'https://example.test/fixture',publisher:'Fixture publisher',title:'Fixture announcement',observedAt:'2026-11-17T00:00:00Z',publishedAt:null,excerpt:'Private excerpt NEVER public',rights:'public_facts',role:'primary',independenceKey:'fixture-publisher',checked:true}],claims:[{text:'A fixture release was announced.',evidenceIds:['source-1']}],image:'',imageAlt:'',imageRights:'none',author:'Urban News',disclosure:'Prepared with AI assistance and reviewed.'};
const approve=(item:{id:string;revision:number;liveRevision:number|null},d=draft)=>({id:item.id,expectedRevision:item.revision,expectedLiveRevision:item.liveRevision,approvedHash:urbanNewsDraftHash(d),checks:{facts:true,rights:true,attribution:true}});
describe.skipIf(process.env.UGT_URBAN_NEWS_PG_FIXTURE!=='1')('Urban News isolated SQL publication',()=>{
 const pg=new DisposablePostgres();
 beforeAll(async()=>{
  if(process.env.UGT_EDITORIAL_SQL_CONTAINER||process.env.UGT_NATIVE_POSTGRES_ROOT)throw Error('fresh_network_none_fixture_required');
  pg.start();let ready=false;for(let n=0;n<30&&!ready;n++){try{ready=pg.ready()}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,200))}if(!ready)throw Error('fixture_startup_unavailable');
  fixture.query=async(sql,params)=>{const rows=await pg.query(sql,params);return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'&&(value.startsWith('{')||value.startsWith('['))?JSON.parse(value):value])))};
  fixture.schema=async(sql)=>{await pg.schema(sql)};
  await pg.schema(`CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN NOT NULL DEFAULT false,date DATE NOT NULL DEFAULT CURRENT_DATE,updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE audit_log(id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,detail JSONB); INSERT INTO posts(slug,headline,body,published,date) VALUES('old-fixture','Preserved old story','["Preserved manuscript"]',true,'2020-01-01');`);
 },30000);
 afterAll(()=>pg.stop());
 it('deduplicates canonical discovery and response replays without changing legacy content',async()=>{
  const [a,b]=await Promise.all([createUrbanNewsCandidate(source,'fixture-editor','request-1'),createUrbanNewsCandidate({...source,url:'https://example.test/fixture'},'fixture-editor','request-2')]);
  expect(a.id).toBe(b.id);expect(a.revision).toBe(1);
  expect((await createUrbanNewsCandidate(source,'fixture-editor','request-1')).id).toBe(a.id);
  expect(await ingestUrbanNewsCandidates([source,{...source,url:'https://example.test/second'}],'fixture-run')).toEqual({added:1,duplicates:1});
  expect(await ingestUrbanNewsCandidates([source,{...source,url:'https://example.test/second'}],'fixture-run')).toEqual({added:0,duplicates:2});
  expect((await pg.query("SELECT headline,body,published FROM posts WHERE slug='old-fixture'"))[0]).toMatchObject({headline:'Preserved old story',body:'["Preserved manuscript"]',published:'t'});
 });
 it('publishes only one exact revision under concurrent approval and keeps private evidence private',async()=>{
  const candidate=await createUrbanNewsCandidate({...source,url:'https://example.test/publish'},'fixture-editor','publish-request');
  const saved=await saveUrbanNewsDraft(candidate.id,1,draft,'fixture-editor');
  await expect(publishUrbanNews({...approve(saved),approvedHash:'a'.repeat(64)},'fixture-owner')).rejects.toThrow('news_conflict');
  const results=await Promise.allSettled([publishUrbanNews(approve(saved),'fixture-owner'),publishUrbanNews(approve(saved),'fixture-owner')]);
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  const live=await getUrbanNewsItem(candidate.id);expect(live?.liveRevision).toBe(2);
  vi.stubEnv('URBAN_NEWS_ENABLED','true');
  const visible=await fixture.query(getPublicPostSelect());expect(visible).toHaveLength(1);expect(visible[0].slug).toBe(live?.slug);
  expect(JSON.stringify(visible)).not.toContain('Private excerpt');expect(visible[0].schema_type).toBe('NewsArticle');
  expect(visible[0].public_sources).toEqual([{id:'source-1',url:'https://example.test/fixture',publisher:'Fixture publisher',title:'Fixture announcement',publishedAt:null}]);
  expect(JSON.stringify(await fixture.query(getPublicPostSummarySelect()))).not.toContain('public_sources');
  vi.stubEnv('URBAN_NEWS_ENABLED','false');expect((await fixture.query(getPublicPostSelect())).map(row=>row.slug)).toEqual(['old-fixture']);
 });
 it('keeps a private correction and failed approval separate from the live snapshot',async()=>{
  const original=await createUrbanNewsCandidate({...source,url:'https://example.test/correction'},'fixture-editor','correction-request');
  const saved=await saveUrbanNewsDraft(original.id,1,draft,'fixture-editor');const live=await publishUrbanNews(approve(saved),'fixture-owner');
  const correction={...draft,headline:'Corrected fixture headline'};
  const next=await saveUrbanNewsDraft(live.id,live.revision,correction,'fixture-editor');
  expect(next.liveRevision).toBe(live.liveRevision);
  expect((await pg.query('SELECT headline,published FROM posts WHERE urban_news_id=$1',[live.id]))[0]).toMatchObject({headline:draft.headline,published:'t'});
  await expect(publishUrbanNews(approve(next,correction),'fixture-owner')).rejects.toThrow('news_correction_note_required');
  await expect(publishUrbanNews({...approve(next,correction),expectedLiveRevision:null,correctionNote:'Fixture correction.'},'fixture-owner')).rejects.toThrow('news_conflict');
  const published=await publishUrbanNews({...approve(next,correction),correctionNote:'Corrected the fixture headline after editor review.'},'fixture-owner');
  expect(published.liveRevision).toBe(next.revision);
  expect((await pg.query('SELECT headline FROM posts WHERE urban_news_id=$1',[live.id]))[0].headline).toBe(correction.headline);
 });
 it('serializes editing and approval, and retracts without permitting stale approval resurrection',async()=>{
  const item=await createUrbanNewsCandidate({...source,url:'https://example.test/race'},'fixture-editor','race-request');
  const saved=await saveUrbanNewsDraft(item.id,1,draft,'fixture-editor');
  const edit={...draft,headline:'Concurrent fixture edit'};
  await Promise.allSettled([saveUrbanNewsDraft(item.id,saved.revision,edit,'fixture-editor'),publishUrbanNews(approve(saved),'fixture-owner')]);
  const current=(await getUrbanNewsItem(item.id))!;
  if(current.liveRevision!==null)expect((await pg.query('SELECT headline FROM posts WHERE urban_news_id=$1',[item.id]))[0].headline).toBe(draft.headline);
  const results=await Promise.allSettled([retractUrbanNews(item.id,current.revision,'Editor retracted fixture.','fixture-owner'),publishUrbanNews({...approve(current,current.draft),correctionNote:'Fixture revision reviewed.'},'fixture-owner')]);
  expect(results.some(result=>result.status==='fulfilled')).toBe(true);
  const latest=(await getUrbanNewsItem(item.id))!;
  // Retraction is always independently available after a racing publish.
  const final=latest.stage==='retracted'?latest:await retractUrbanNews(item.id,latest.revision,'Editor retracted fixture.','fixture-owner');
  expect(final.stage).toBe('retracted');await expect(publishUrbanNews(approve(saved),'fixture-owner')).rejects.toThrow('news_conflict');
  expect((await pg.query('SELECT published FROM posts WHERE urban_news_id=$1',[item.id]))[0]?.published).not.toBe('t');
 });
 it('releases only due exact approvals, holds atomically and provides bounded keyset lists',async()=>{
  const item=await createUrbanNewsCandidate({...source,url:'https://example.test/scheduled'},'fixture-editor','scheduled-request');
  const saved=await saveUrbanNewsDraft(item.id,1,draft,'fixture-editor');
  const approved=await publishUrbanNews({...approve(saved),scheduledAt:new Date(Date.now()+3600000).toISOString()},'fixture-owner');expect(approved.stage).toBe('approved');
  expect(await releaseApprovedUrbanNews()).toEqual({released:0,slugs:[]});
  await holdUrbanNews(item.id,approved.revision,'Awaiting fixture update.','fixture-owner');
  await pg.query("UPDATE posts SET urban_news_public=jsonb_set(urban_news_public,'{scheduledAt}',to_jsonb((now()-interval '1 second')::text)) WHERE urban_news_id=$1",[item.id]);
  expect(await releaseApprovedUrbanNews()).toEqual({released:0,slugs:[]});
  const overview=await getUrbanNewsOverview();expect(overview.items.length).toBeLessThanOrEqual(50);expect(overview.counts.held).toBe(1);
  expect((await getUrbanNewsOverview(undefined,{q:'fixture',stage:'held',category:'music'})).items.map(row=>row.id)).toEqual([item.id]);
  expect((await getUrbanNewsOverview(undefined,{q:'nonexistent fixture'})).items).toEqual([]);
  await expect(getUrbanNewsOverview('invalid')).rejects.toThrow('invalid_news_cursor');
 });
 it('keeps the current public revision visible while an approved correction waits for its schedule',async()=>{
  const candidate=await createUrbanNewsCandidate({...source,url:'https://example.test/future-correction'},'fixture-editor','future-correction-request');
  const saved=await saveUrbanNewsDraft(candidate.id,1,draft,'fixture-editor');const live=await publishUrbanNews(approve(saved),'fixture-owner');
  const nextDraft={...draft,headline:'Scheduled correction fixture'};
  const next=await saveUrbanNewsDraft(live.id,live.revision,nextDraft,'fixture-editor');
  const scheduled=await publishUrbanNews({...approve(next,nextDraft),scheduledAt:new Date(Date.now()+3600000).toISOString(),correctionNote:'Reviewed scheduled fixture correction.'},'fixture-owner');
  expect(scheduled.stage).toBe('approved');
  vi.stubEnv('URBAN_NEWS_ENABLED','true');
  expect((await fixture.query(getPublicPostSelect())).find(row=>row.slug===live.slug)?.headline).toBe(draft.headline);
  expect(await releaseApprovedUrbanNews()).toEqual({released:0,slugs:[]});
  await pg.query("UPDATE urban_news_candidates SET approval=jsonb_set(approval,'{scheduledAt}',to_jsonb((now()-interval '1 second')::text)) WHERE id=$1",[live.id]);
  expect(await releaseApprovedUrbanNews()).toEqual({released:1,slugs:[live.slug]});
  expect((await fixture.query(getPublicPostSelect())).find(row=>row.slug===live.slug)?.headline).toBe(nextDraft.headline);
 });
 it('holds a private live correction without allowing staff to retract its approved public revision',async()=>{
  const candidate=await createUrbanNewsCandidate({...source,url:'https://example.test/held-correction'},'fixture-editor','held-correction-request');
  const saved=await saveUrbanNewsDraft(candidate.id,1,draft,'fixture-editor');const live=await publishUrbanNews(approve(saved),'fixture-owner');
  const correction=await saveUrbanNewsDraft(live.id,live.revision,{...draft,headline:'Unfinished held correction'},'fixture-editor');
  const held=await holdUrbanNews(live.id,correction.revision,'Incomplete research remains private.','fixture-editor');
  expect(held.stage).toBe('held');expect(held.liveRevision).toBe(live.liveRevision);
  vi.stubEnv('URBAN_NEWS_ENABLED','true');expect((await fixture.query(getPublicPostSelect())).find(row=>row.slug===live.slug)?.headline).toBe(draft.headline);
  expect(await releaseApprovedUrbanNews()).toEqual({released:0,slugs:[]});
 });
});
