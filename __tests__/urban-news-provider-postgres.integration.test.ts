import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const state=vi.hoisted(()=>({query:vi.fn(),schema:vi.fn(),pool:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.query,qSchema:state.schema,db:state.pool}));
const enabled=process.env.UGT_URBAN_NEWS_PG_FIXTURE==='1',test=it.skipIf(!enabled),fixture=new DisposablePostgres();
let secrets:typeof import('@/lib/server/urban-news-secrets');
beforeAll(async()=>{if(!enabled)return;const loaded=await import('@/lib/server/urban-news-secrets').catch(()=>null);expect(loaded,'durable provider store must exist').not.toBeNull();secrets=loaded!;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});state.schema.mockImplementation((s:string|readonly string[])=>fixture.schema(typeof s==='string'?s:s.join(';\n')));state.query.mockImplementation(async(s:string,a:unknown[])=>{const rows=await fixture.query(s,a);return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,typeof value==='string'&&(value.startsWith('{')||value.startsWith('['))?JSON.parse(value):value])))});state.pool.mockImplementation(()=>fixture.pool());await secrets.getUrbanNewsConfig()},30000);
beforeEach(async()=>{if(!enabled)return;vi.stubEnv('SESSION_SECRET','fixture-only-session-secret-never-production');vi.stubEnv('GEMINI_API_KEY','');vi.stubEnv('OPENAI_API_KEY','');vi.stubEnv('QWEN_API_KEY','');await fixture.query('TRUNCATE urban_news_provider_keys,urban_news_provider_config,urban_news_provider_runs,urban_news_provider_lease,urban_news_provider_budget');await secrets.saveUrbanNewsBudget({monthlyLimitCents:500,enabledProviders:{qwen:true,gemini:true,openai:true}},'fixture-owner',0)});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});afterAll(()=>{if(enabled&&secrets)fixture.stop()},15000);

async function manualAuthorization(){const current=await secrets.getUrbanNewsConfigState(),saved=await secrets.saveUrbanNewsConfig({...current.config,termsConfirmed:true},'owner',current.revision);return {configRevision:saved.revision,provider:saved.config.provider,model:saved.config.model,mode:'manual' as const}}
test('stores encrypted credentials only and installing or deleting a key never enables jobs',async()=>{
 await secrets.saveUrbanNewsProviderKey('gemini','fixture-super-private-key','owner');const rows=await fixture.query('SELECT * FROM urban_news_provider_keys');expect(JSON.stringify(rows)).not.toContain('fixture-super-private-key');expect(rows[0].ciphertext).toMatch(/^v1\./);expect(await secrets.getUrbanNewsProviderKey('gemini')).toBe('fixture-super-private-key');expect(await secrets.getUrbanNewsConfig()).toMatchObject({discoveryEnabled:false,draftingEnabled:false,termsConfirmed:false,dailyDraftLimit:2,dailyDiscoveryLimit:96});expect(await secrets.getUrbanNewsProviderStatus()).toMatchObject({providers:{gemini:{configured:true,keySource:'managed'}}});await secrets.deleteUrbanNewsProviderKey('gemini','owner');expect(await secrets.getUrbanNewsProviderKey('gemini')).toBeNull();
});
test('authenticates ciphertext to the provider and fails closed on tampering or secret rotation',async()=>{
 await secrets.saveUrbanNewsProviderKey('gemini','private-gemini','owner');await fixture.query("UPDATE urban_news_provider_keys SET provider='openai' WHERE provider='gemini'");await expect(secrets.getUrbanNewsProviderKey('openai')).rejects.toThrow('news_key_unavailable');await fixture.query("UPDATE urban_news_provider_keys SET provider='gemini'");vi.stubEnv('SESSION_SECRET','rotated-fixture-secret');await expect(secrets.getUrbanNewsProviderKey('gemini')).rejects.toThrow('news_key_unavailable');
});
test('reserves the final daily slot once across independent concurrent clients before any dispatch',async()=>{
 const results=await Promise.all(Array.from({length:8},(_,n)=>secrets.reserveUrbanNewsRun('draft','request-'+n,'fingerprint-'+n,2)));expect(results.filter(r=>r.state==='prepared')).toHaveLength(2);expect(results.filter(r=>r.code==='daily_budget_exhausted')).toHaveLength(6);expect((await secrets.getUrbanNewsProviderStatus()).draftsUsedToday).toBe(2);
},20000);
test('permits only one send, replays a prepared reservation without spending twice and never reclaims an unknown send',async()=>{
 const authorization=await manualAuthorization();const run=await secrets.reserveUrbanNewsRun('draft','same-request','same-fingerprint',2);const replay=await secrets.reserveUrbanNewsRun('draft','same-request','same-fingerprint',2);expect(replay.id).toBe(run.id);expect((await secrets.getUrbanNewsProviderStatus()).draftsUsedToday).toBe(1);const sent=await Promise.all([secrets.dispatchUrbanNewsDraftRun(run.id!,authorization),secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)]);expect(sent.filter(result=>result.ok)).toHaveLength(1);await fixture.query("UPDATE urban_news_provider_runs SET updated_at=now()-interval '2 days' WHERE id=$1",[run.id]);expect(await secrets.reserveUrbanNewsRun('draft','same-request','same-fingerprint',2)).toMatchObject({state:'unknown',code:'provider_outcome_unknown'});expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)).toEqual({ok:false,code:'provider_outcome_unknown'});await expect(secrets.reserveUrbanNewsRun('draft','same-request','different-fingerprint',2)).rejects.toThrow('news_request_conflict');
},20000);
test('stores bounded terminal results for response-loss replay and persistent discovery backoff',async()=>{
 const run=await secrets.reserveUrbanNewsRun('discovery','discovery-request','discovery-fingerprint',96);await secrets.dispatchUrbanNewsRun(run.id!);await secrets.finishUrbanNewsRun(run.id!,{ok:false,state:'failed',code:'provider_rate_limited'});expect(await secrets.reserveUrbanNewsRun('discovery','discovery-request','discovery-fingerprint',96)).toMatchObject({state:'failed',code:'provider_rate_limited'});expect(await secrets.reserveUrbanNewsRun('discovery','next-request','another-fingerprint',96)).toMatchObject({state:'blocked',code:'provider_backoff'});
});
test('validates the whole configuration and requires deliberate terms, bounded volume and key reactivation',async()=>{
 const defaults=await secrets.getUrbanNewsConfig();await expect(secrets.saveUrbanNewsConfig({...defaults,dailyDraftLimit:101},'owner',0)).rejects.toThrow('invalid_news_config');await expect(secrets.saveUrbanNewsConfig({...defaults,draftingEnabled:true},'owner',0)).rejects.toThrow('news_terms_required');await expect(secrets.saveUrbanNewsConfig({...defaults,model:'https://other.example/model'},'owner',0)).rejects.toThrow('invalid_news_model');await secrets.saveUrbanNewsConfig({...defaults,dailyDraftLimit:100,draftingEnabled:true,termsConfirmed:true},'owner',0);await secrets.saveUrbanNewsProviderKey('gemini','new-fixture-key','owner');expect(await secrets.getUrbanNewsConfig()).toMatchObject({draftingEnabled:false,dailyDraftLimit:100,termsConfirmed:true});
});
test('fences overlapping scheduler leases and only permits the active owner to heartbeat or release',async()=>{
 const leases=await Promise.all([secrets.claimUrbanNewsLease(),secrets.claimUrbanNewsLease()]);expect(leases.filter(Boolean)).toHaveLength(1);expect(await secrets.heartbeatUrbanNewsLease('wrong-token')).toBe(false);const token=leases.find(Boolean)!;expect(await secrets.heartbeatUrbanNewsLease(token)).toBe(true);await secrets.releaseUrbanNewsLease('wrong-token');expect(await secrets.claimUrbanNewsLease()).toBeNull();await secrets.releaseUrbanNewsLease(token);expect(await secrets.claimUrbanNewsLease()).toEqual(expect.any(String));
});
test('does not send a previous-day prepared reservation outside the current daily budget',async()=>{
 const authorization=await manualAuthorization();const run=await secrets.reserveUrbanNewsRun('draft','old-prepared-request','fingerprint-old',2);await fixture.query("UPDATE urban_news_provider_runs SET budget_day=(clock_timestamp() AT TIME ZONE 'UTC')::date-1 WHERE id=$1",[run.id]);expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)).toEqual({ok:false,code:'provider_outcome_unknown'});expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)).toEqual({ok:false,code:'provider_outcome_unknown'});
});
test('recovers a single candidate input across browser nonces and concurrent tabs, including uncertain sends',async()=>{
 const authorization=await manualAuthorization();const results=await Promise.all(Array.from({length:5},(_,n)=>secrets.reserveUrbanNewsRun('draft','tab-request-'+n,'candidate-revision-fingerprint',2)));expect(new Set(results.map(r=>r.id)).size).toBe(1);expect((await secrets.getUrbanNewsProviderStatus()).draftsUsedToday).toBe(1);expect(await secrets.dispatchUrbanNewsDraftRun(results[0].id!,authorization)).toEqual({ok:true});expect(await secrets.readUrbanNewsRun('draft','new-browser-request','candidate-revision-fingerprint')).toMatchObject({state:'unknown',id:results[0].id});expect(await secrets.reserveUrbanNewsRun('draft','reload-request','candidate-revision-fingerprint',2)).toMatchObject({state:'unknown',id:results[0].id});expect((await secrets.getUrbanNewsProviderStatus()).draftsUsedToday).toBe(1);
},20000);
test('integrates real editorial revisions, private generation and unknown-response replay without live model I/O',async()=>{
 await fixture.schema("CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN NOT NULL DEFAULT false,date DATE NOT NULL DEFAULT CURRENT_DATE,updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE audit_log(id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,detail JSONB)");
 const store=await import('@/lib/server/urban-news-store'),jobs=await import('@/lib/server/urban-news-automation');
 const candidate=await store.createUrbanNewsCandidate({url:'https://artist.example/fixture-official',title:'Night Garden announced',publisher:'Artist',country:'Global',language:'English',observedAt:new Date().toISOString(),provider:'manual'},'fixture-owner','fixture-source');
 const input={...candidate.draft,headline:'Night Garden announced',country:'Global',risk:'routine' as const,subjectKind:'public_figure' as const,verification:'attributed' as const,evidence:[{id:'official',url:'https://artist.example/fixture-official',publisher:'Artist',title:'Official release',observedAt:new Date().toISOString(),publishedAt:null,excerpt:'The fixture performer announced Night Garden for December in a verified official release.',rights:'public_facts' as const,role:'primary' as const,independenceKey:'artist',checked:true}]};
 const ready=await store.saveUrbanNewsDraft(candidate.id,1,input,'fixture-owner');await secrets.saveUrbanNewsProviderKey('gemini','fixture-provider-key','fixture-owner');const providerSettings=await secrets.saveUrbanNewsConfig({...await secrets.getUrbanNewsConfig(),draftingEnabled:true,termsConfirmed:true},'fixture-owner',(await secrets.getUrbanNewsConfigState()).revision);const authorization={configRevision:providerSettings.revision,provider:providerSettings.config.provider,model:providerSettings.config.model,mode:'manual' as const};let calls=0;
 vi.stubGlobal('fetch',async(url:string)=>{expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');calls++;return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({headline:'Night Garden planned for December',dek:'The performer shared plans for a new record.',body:['Night Garden is expected to arrive in December, according to the performer.'],category:'music',country:'Global',risk:'routine',subjectKind:'public_figure',verification:'attributed',claims:[{text:'Night Garden is planned for December.',evidenceIds:['official']}]})}]},safetyRatings:[]}],usageMetadata:{promptTokenCount:150,candidatesTokenCount:70}}),{headers:{'Content-Type':'application/json'}})});
 expect(await jobs.generateUrbanNewsDraft(candidate.id,ready.revision,'fixture-generate','fixture-owner',authorization)).toMatchObject({ok:true,state:'complete',drafted:1});expect(await jobs.generateUrbanNewsDraft(candidate.id,ready.revision,'new-tab-same-input','fixture-owner',authorization)).toMatchObject({ok:true,state:'complete',drafted:1});expect(calls).toBe(1);const generated=(await store.getUrbanNewsItem(candidate.id))!;expect(generated.revision).toBe(ready.revision+1);expect(generated.liveRevision).toBeNull();expect((await fixture.query('SELECT count(*) AS count FROM posts'))[0].count).toBe('0');expect((await fixture.query('SELECT usage FROM urban_news_provider_runs'))[0].usage).toContain('150');
 const approved=await store.publishUrbanNews({id:generated.id,expectedRevision:generated.revision,expectedLiveRevision:null,approvedHash:generated.draftHash,checks:{facts:true,rights:true,attribution:true}},'fixture-owner');const correction=await store.saveUrbanNewsDraft(approved.id,approved.revision,{...generated.draft,headline:'Private correction under review'},'fixture-owner');
 vi.stubGlobal('fetch',async()=>{calls++;throw Error('fixture-network-outcome-unknown')});expect(await jobs.generateUrbanNewsDraft(correction.id,correction.revision,'uncertain-correction','fixture-owner',authorization)).toMatchObject({state:'unknown'});expect(await jobs.generateUrbanNewsDraft(correction.id,correction.revision,'reload-uncertain-correction','fixture-owner',authorization)).toMatchObject({state:'unknown'});expect(calls).toBe(2);expect((await store.getUrbanNewsItem(candidate.id))?.liveRevision).toBe(approved.liveRevision);expect((await fixture.query('SELECT headline,published FROM posts WHERE urban_news_id=$1',[candidate.id]))[0]).toMatchObject({headline:'Night Garden planned for December',published:'t'});
},30000);
test('rejects a stale settings save after a key change pauses automatic drafting',async()=>{
 const initial=await secrets.getUrbanNewsConfigState();const active=await secrets.saveUrbanNewsConfig({...initial.config,draftingEnabled:true,termsConfirmed:true},'owner',initial.revision);await secrets.saveUrbanNewsProviderKey('qwen','fixture-qwen-rotated-key','owner');await expect(secrets.saveUrbanNewsConfig({...active.config,dailyDraftLimit:5},'stale-owner-tab',active.revision)).rejects.toThrow('news_config_changed');const current=await secrets.getUrbanNewsConfigState();expect(current.config.draftingEnabled).toBe(false);expect(current.revision).toBeGreaterThan(active.revision);
});
test('permits only one concurrent configuration save from a shared revision',async()=>{
 const initial=await secrets.getUrbanNewsConfigState();const results=await Promise.allSettled([secrets.saveUrbanNewsConfig({...initial.config,dailyDraftLimit:3},'owner-a',initial.revision),secrets.saveUrbanNewsConfig({...initial.config,dailyDraftLimit:4},'owner-b',initial.revision)]);expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);expect(results.filter(result=>result.status==='rejected').map(result=>String((result as PromiseRejectedResult).reason))).toEqual(['Error: news_config_changed']);
});
test('fences a prepared scheduled draft when the owner pauses its configuration before dispatch',async()=>{
 const initial=await secrets.getUrbanNewsConfigState();const active=await secrets.saveUrbanNewsConfig({...initial.config,provider:'qwen',model:'qwen3.8-flash',termsConfirmed:true,draftingEnabled:true},'owner',initial.revision);const run=await secrets.reserveUrbanNewsRun('draft','scheduled-config-race','config-race',2);await secrets.saveUrbanNewsConfig({...active.config,draftingEnabled:false},'owner',active.revision);const result=await secrets.dispatchUrbanNewsDraftRun(run.id!,{configRevision:active.revision,provider:'qwen',model:'qwen3.8-flash',mode:'scheduled'});expect(result).toEqual({ok:false,code:'news_config_changed'});const persisted=await secrets.readUrbanNewsRun('draft','scheduled-config-race','config-race');expect(persisted).toMatchObject({ok:false,state:'prepared',code:'news_config_changed'});
});
test('does not allow the discovery dispatcher to bypass model consent',async()=>{const run=await secrets.reserveUrbanNewsRun('draft','wrong-dispatcher','wrong-dispatcher',2);expect(await secrets.dispatchUrbanNewsRun(run.id!)).toBe(false)});
test('applies a lowered daily limit to prepared model requests before dispatch',async()=>{
 const initial=await secrets.getUrbanNewsConfigState(),active=await secrets.saveUrbanNewsConfig({...initial.config,termsConfirmed:true,dailyDraftLimit:2},'owner',initial.revision);const first=await secrets.reserveUrbanNewsRun('draft','lower-limit-a','lower-limit-a',2),second=await secrets.reserveUrbanNewsRun('draft','lower-limit-b','lower-limit-b',2);const lowered=await secrets.saveUrbanNewsConfig({...active.config,dailyDraftLimit:1},'owner',active.revision),authorization={configRevision:lowered.revision,provider:lowered.config.provider,model:lowered.config.model,mode:'manual' as const};expect(await secrets.dispatchUrbanNewsDraftRun(first.id!,authorization)).toEqual({ok:true});expect(await secrets.dispatchUrbanNewsDraftRun(second.id!,authorization)).toEqual({ok:false,code:'daily_budget_exhausted'});
});
test('resumes only known-unsent prepared work after fresh consent and never resends it after dispatch',async()=>{
 const first=await manualAuthorization(),run=await secrets.reserveUrbanNewsRun('draft','known-unsent','known-unsent',2);await secrets.saveUrbanNewsConfig({...await secrets.getUrbanNewsConfig(),draftingEnabled:false},'owner',first.configRevision);expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,first)).toEqual({ok:false,code:'news_config_changed'});const current=await secrets.getUrbanNewsConfigState(),fresh={configRevision:current.revision,provider:current.config.provider,model:current.config.model,mode:'manual' as const};expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,fresh)).toEqual({ok:true});expect(await secrets.readUrbanNewsRun('draft','known-unsent','known-unsent')).toMatchObject({state:'unknown',code:'provider_outcome_unknown'});expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,fresh)).toEqual({ok:false,code:'provider_outcome_unknown'});
});

test('disabling a paid provider blocks even a previously prepared draft',async()=>{
 const authorization=await manualAuthorization(),status=await secrets.getUrbanNewsProviderStatus();
 const policy=await secrets.saveUrbanNewsBudget({monthlyLimitCents:300,enabledProviders:{qwen:true,gemini:false,openai:false}},'owner',status.budget!.revision);
 expect(policy.revision).toBe(status.budget!.revision+1);
 const run=await secrets.reserveUrbanNewsRun('draft','disabled-provider','disabled-provider',2);
 expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)).toEqual({ok:false,code:'news_provider_disabled'});
});
test('monthly cost guard blocks a draft before sending it to the model',async()=>{
 const authorization=await manualAuthorization(),status=await secrets.getUrbanNewsProviderStatus();
 await secrets.saveUrbanNewsBudget({monthlyLimitCents:300,enabledProviders:{qwen:true,gemini:true,openai:true}},'owner',status.budget!.revision);
 await fixture.query("INSERT INTO urban_news_provider_runs(id,kind,fingerprint,state,reserved_cost_cents,provider,model) VALUES('spent-fixture','draft','spent-fixture','complete',299,'gemini','gemini-3.5-flash-lite')");
 const run=await secrets.reserveUrbanNewsRun('draft','would-exceed-month','would-exceed-month',2);
 expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,authorization)).toEqual({ok:false,code:'monthly_budget_exhausted'});
});

test('replacing a rejected key permits a fresh attempt and retains its prior spend',async()=>{
 const auth=await manualAuthorization(),first=await secrets.reserveUrbanNewsRun('draft','invalid-first','retry-key-story',2);
 expect(await secrets.dispatchUrbanNewsDraftRun(first.id!,auth)).toEqual({ok:true});
 await secrets.finishUrbanNewsRun(first.id!,{ok:false,state:'failed',code:'provider_auth_rejected'});
 await secrets.saveUrbanNewsProviderKey(auth.provider,'fixture-replacement-credential','owner');
 expect(await secrets.readUrbanNewsRun('draft','new-owner-request','retry-key-story')).toBeNull();
 const next=await secrets.reserveUrbanNewsRun('draft','new-owner-request','retry-key-story',2);
 expect(next.id).not.toEqual(first.id);
 expect((await secrets.getUrbanNewsProviderStatus()).budget!.reservedCents).toBeGreaterThan(0);
});

test('reserves the last monthly allowance once across simultaneous approved writers and scopes rate limits per provider',async()=>{
 const initial=await secrets.getUrbanNewsConfigState();
 const settings=await secrets.saveUrbanNewsConfig({...initial.config,draftingEnabled:true,termsConfirmed:true,dailyDraftLimit:10,parallelProviders:['qwen'],voice:'Plain English',dailyMarketTarget:5},'owner',initial.revision);
 await fixture.query("INSERT INTO urban_news_provider_runs(id,kind,fingerprint,state,reserved_cost_cents) VALUES('prior','draft','prior','complete',475)");
 const main={mode:'scheduled' as const,configRevision:settings.revision,provider:settings.config.provider,model:settings.config.model};
 const alternate={...main,provider:'qwen' as const,model:'qwen-flash'};
 const [a,b]=await Promise.all([secrets.reserveUrbanNewsRun('draft','slot-primary','story-primary',10,main.provider),secrets.reserveUrbanNewsRun('draft','slot-qwen','story-qwen',10,alternate.provider)]);
 const results=await Promise.all([secrets.dispatchUrbanNewsDraftRun(a.id!,main),secrets.dispatchUrbanNewsDraftRun(b.id!,alternate)]);
 expect(results.filter(result=>result.ok)).toHaveLength(1);
 expect(results).toContainEqual({ok:false,code:'monthly_budget_exhausted'});
 const run=results[0].ok?a:b,winner=results[0].ok?main:alternate,other=results[0].ok?alternate:main;
 await secrets.finishUrbanNewsRun(run.id!,{ok:false,state:'failed',code:'provider_rate_limited'});
 expect(await secrets.reserveUrbanNewsRun('draft','limited','limited',10,winner.provider)).toMatchObject({code:'provider_backoff'});
 expect(await secrets.reserveUrbanNewsRun('draft','available','available',10,other.provider)).toMatchObject({state:'prepared'});
 expect(await secrets.readUrbanNewsRun('draft',results[0].ok?'slot-primary':'slot-qwen','different-story',true)).toMatchObject({state:'failed',code:'provider_rate_limited'});
},20000);

test('validates optional settings, fences unsaved alternate selections and keeps manual requests on the primary provider',async()=>{
 const {config}=await secrets.getUrbanNewsConfigState();
 for(const invalid of [{voice:'a'.repeat(1001)},{dailyMarketTarget:0},{dailyMarketTarget:21},{parallelProviders:['openai','openai']},{parallelProviders:['unknown']}])
  await expect(secrets.saveUrbanNewsConfig({...config,...invalid} as typeof config,'owner',0)).rejects.toThrow();
 const active=await secrets.saveUrbanNewsConfig({...config,draftingEnabled:true,termsConfirmed:true,parallelProviders:['qwen']},'owner',0);
 const run=await secrets.reserveUrbanNewsRun('draft','slot-alt','story-alt',2,'qwen');
 const selected={mode:'scheduled' as const,provider:'qwen' as const,model:'qwen-flash',configRevision:active.revision};
 for(const forbidden of [{...selected,mode:'manual' as const},{...selected,model:'qwen3.8-flash'},{...selected,provider:'openai' as const,model:'gpt-4.1-mini'}])
  expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,forbidden)).toEqual({ok:false,code:'news_config_changed'});
 await secrets.saveUrbanNewsConfig({...active.config,parallelProviders:[]},'owner',active.revision);
 expect(await secrets.dispatchUrbanNewsDraftRun(run.id!,selected)).toEqual({ok:false,code:'news_config_changed'});
});

test('activates the two configured writers and the chart policy in one revision-checked transaction',async()=>{
 let state=await secrets.getUrbanNewsConfigState();
 const budget=(await secrets.getUrbanNewsProviderStatus()).budget!;
 expect(state.config).toMatchObject({automaticChartBriefs:false,dailyPublicationLimit:10});
 const input={expectedConfigRevision:state.revision,expectedBudgetRevision:budget.revision,termsConfirmed:true,dailyPublicationLimit:15};
 vi.stubEnv('NVIDIA_API_KEY','');
 await expect(secrets.activateUrbanNewsDesk(input,'owner')).rejects.toThrow('news_key_unavailable');
 expect(await secrets.getUrbanNewsConfigState()).toEqual(state);
 vi.stubEnv('NVIDIA_API_KEY','nvapi-fixture');
 state=await secrets.saveUrbanNewsProviderKey('qwen','fixture-qwen-key','owner');
 expect(state.config.automaticChartBriefs).toBe(false);
 await expect(secrets.activateUrbanNewsDesk(input,'owner')).rejects.toThrow('news_config_changed');
 const activation={...input,expectedConfigRevision:state.revision};
 await expect(secrets.activateUrbanNewsDesk({...activation,termsConfirmed:false},'owner')).rejects.toThrow('news_terms_required');
 await expect(secrets.activateUrbanNewsDesk({...activation,dailyPublicationLimit:16},'owner')).rejects.toThrow('invalid_news_config');
 const results=await Promise.allSettled([secrets.activateUrbanNewsDesk(activation,'owner'),secrets.activateUrbanNewsDesk(activation,'owner')]);
 expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 expect(await secrets.getUrbanNewsConfig()).toMatchObject({discoveryEnabled:true,draftingEnabled:true,automaticChartBriefs:true,dailyPublicationLimit:15,provider:'qwen',parallelProviders:['nvidia']});
 expect((await secrets.getUrbanNewsProviderStatus()).budget).toMatchObject({monthlyLimitCents:budget.monthlyLimitCents,enabledProviders:{qwen:true,nvidia:true},revision:budget.revision+1});
},30000);

test('revalidates chart facts, leaves edits private and atomically records just one paced publication across retries',async()=>{
 const store=await import('@/lib/server/urban-news-store');
 await fixture.schema('CREATE TABLE IF NOT EXISTS posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN NOT NULL DEFAULT false,date DATE NOT NULL DEFAULT CURRENT_DATE,updated_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS audit_log(id BIGSERIAL PRIMARY KEY,actor TEXT,action TEXT,detail JSONB)');
 const {NEWS_MARKETS}=await import('@/lib/shared/news-preferences');
 const tick=Math.floor(Date.now()/900000),countries=NEWS_MARKETS.filter(m=>m.code!=='Global');
 const country=countries[tick%countries.length].code,cc=country.toLowerCase(),observedAt=new Date().toISOString();
 const feed='https://rss.marketingtools.apple.com/api/v2/'+cc+'/music/most-played/10/songs.json';
 const track=(id:string,name:string)=>({id,name,artistName:'Fixture Singer',kind:'songs',url:'https://music.apple.com/'+cc+'/album/fixture/1?i='+id});
 const tracks=[track('1001','Private edit'),track('1002','Neutral title'),track('1003','Another track')];
 const payload={feed:{id:feed,country:cc,updated:observedAt,results:tracks}};
 const fetch=vi.fn(async()=>new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}}));
 vi.stubGlobal('fetch',fetch);vi.stubEnv('URBAN_NEWS_ENABLED','true');
 const first=await store.createUrbanNewsCandidate({title:'Private draft',url:tracks[0].url,country,observedAt,language:'English',publisher:'Apple Music',provider:'manual'},'owner','private-edit');
 await store.saveUrbanNewsDraft(first.id,1,{...first.draft,headline:'Held for editing'},'owner');
 const lease=(await secrets.claimUrbanNewsLease())!;
 const prior=await secrets.getUrbanNewsConfigState();
 expect(await store.publishScheduledChartBrief(prior.revision,lease,tick)).toBe(0);
 expect(fetch).not.toHaveBeenCalled();
 const active=await secrets.saveUrbanNewsConfig({...prior.config,automaticChartBriefs:true,termsConfirmed:true,dailyPublicationLimit:1},'owner',prior.revision);
 expect(await store.publishScheduledChartBrief(active.revision,'old-lease',tick)).toBe(0);
 const results=await Promise.all([store.publishScheduledChartBrief(active.revision,lease,tick),store.publishScheduledChartBrief(active.revision,lease,tick)]);
 expect(results.sort()).toEqual([0,1]);
 expect((await store.getUrbanNewsItem(first.id))?.liveRevision).toBeNull();
 const record=(await fixture.query("SELECT c.stage,c.revision,c.approval,p.headline,p.urban_news_public,a.action,a.actor,a.detail FROM urban_news_chart_publications ledger JOIN urban_news_candidates c ON c.id=ledger.candidate_id JOIN posts p ON p.urban_news_id=c.id JOIN urban_news_audit a ON a.candidate_id=c.id WHERE a.action='automatic_chart_publication'"))[0];
 expect(record).toMatchObject({stage:'live',revision:'1',actor:'scheduler',headline:expect.stringContaining('ranks No. 2')});
 expect(JSON.parse(record.approval)).toMatchObject({method:'automatic_chart',configRevision:active.revision});
 expect(JSON.parse(record.approval)).not.toHaveProperty('checks');
 expect(JSON.parse(record.urban_news_public)).toMatchObject({publicationMethod:'automatic_chart',sources:[expect.objectContaining({url:feed})]});
 expect(JSON.parse(record.detail)).toMatchObject({marketTrack:country+':1002',observedAt});
 expect(await store.publishScheduledChartBrief(active.revision,lease,tick)).toBe(0);
 await fixture.query('UPDATE urban_news_chart_publications SET tick=tick-1');
 expect(await store.publishScheduledChartBrief(active.revision,lease,tick)).toBe(0);
},30000);
