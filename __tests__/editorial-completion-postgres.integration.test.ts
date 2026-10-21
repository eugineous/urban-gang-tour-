/** Actual isolated PostgreSQL only. Never opens DATABASE_URL or a production URL. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {beforeAll,describe,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Record<string,unknown>[]>,schema:undefined as unknown as (sql:string)=>Promise<void>}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,params?:unknown[])=>fixture.query(sql,params),qSchema:(sql:string)=>fixture.schema(sql)}));
import {editorialBundle,type EditorialItem} from '@/lib/editorial-import';
import {importEditorial,itemHash,holdEditorial} from '@/lib/server/editorial';
import {applyEditorialCompletion} from '@/lib/server/editorial-completion';
import {PUBLIC_POST_PREDICATE,PUBLIC_POST_SELECT} from '@/lib/server/editorial-publication';
const container=process.env.UGT_EDITORIAL_SQL_CONTAINER,run=promisify(execFile);
const fixtureDatabase='editorial_completion_fixture_'+Date.now()+'_'+process.pid;
const env={...process.env,DOCKER_HOST:undefined,DOCKER_CONTEXT:undefined,DOCKER_TLS:undefined,DOCKER_TLS_VERIFY:undefined,DOCKER_CERT_PATH:undefined};
async function sql(input:string){
 if(container!=='ugt-editorial-fixture-20261019')throw Error('isolated_fixture_required');
 const child=execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',fixtureDatabase,'--csv','-q','-v','ON_ERROR_STOP=1'],{env});
 let out='',error='';child.stdout?.on('data',value=>out+=value);child.stderr?.on('data',value=>error+=value);child.stdin?.end(input);
 await new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});return out;
}
function records(text:string):Record<string,unknown>[] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field=''}else field+=c;}
 if(field||row.length){row.push(field);rows.push(row);}const header=rows.shift()||[];
 return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>{const value=row[i];return [key,value==='t'?true:value==='f'?false:value.startsWith('{')||value.startsWith('[')?JSON.parse(value):value];})));
}
const literal=(value:unknown):string=>value===null?'NULL':Array.isArray(value)?literal('{'+value.map(x=>JSON.stringify(String(x))).join(',')+'}'):typeof value==='boolean'||typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const query=async(statement:string,params:unknown[]=[])=>records(await sql(params.length?`PREPARE fixture AS ${statement}; EXECUTE fixture(${params.map(literal).join(',')});`:statement));
const originalSha='a'.repeat(64),completedSha='b'.repeat(64);
const body='# Fictional completed guide\n\n'+('Useful fictional planning guidance, not actual reporting. '.repeat(75));
let sequence=0;
function assignment(label:string):EditorialItem{
 const date=new Date(Date.UTC(2026,9,30+sequence++)).toISOString().slice(0,10);
 return {slug:'completion-fixture-'+label,date,scheduled_at:date+'T03:07:00.000Z',title:'Original assignment '+label,section:'Analysis',description:'Fictional private assignment',author:'Fictional editorial desk',kind:'assignment',markdown:'# Original assignment\n\nOriginal fixture reporting outline: '+label+'\n\n## Proposed structure\n\nDo not publish this outline.',image_prompt:'Fictional illustrative planning objects',metadata:{}};
}
function article(item:EditorialItem):EditorialItem{return {...item,kind:'article',title:'Completed analytical guide '+item.slug,description:'A complete fictional guide for isolated testing.',markdown:body,metadata:{editorial_type:'Analysis / practical guide',original_assignment_sha256:originalSha}};}
function request(originals:EditorialItem[]){
 const start=Date.now();
 return {version:1 as const,mode:'complete_owner_analysis' as const,request_id:randomUUID(),original_source_sha256:originalSha,requested_at:new Date(start).toISOString(),expires_at:new Date(start+3600000).toISOString(),source_request:'Complete and schedule these analytical guides without asserting independent fact checking.',bundle:editorialBundle({version:1,source_sha256:completedSha,items:originals.map(article)}),targets:originals.map(item=>({slug:item.slug,hash:itemHash(item),revision:1}))};
}
async function seed(item:EditorialItem){await importEditorial({version:1,source_sha256:originalSha,items:[item]},'fictional-completion-import',false);}
async function snapshot(slug:string){return (await query('SELECT to_jsonb(posts) AS snapshot FROM posts WHERE slug=$1',[slug]))[0]?.snapshot;}
let legacySnapshot:unknown,firstTenSnapshots:unknown;
describe.skipIf(!container)('isolated Postgres assignment completion',()=>{
 beforeAll(async()=>{
  expect(container).toBe('ugt-editorial-fixture-20261019');
  const inspected=await run('docker',['--host=unix:///var/run/docker.sock','inspect',container!,'--format','{{.HostConfig.NetworkMode}}'],{env});expect(inspected.stdout.trim()).toBe('none');
  await run('docker',['--host=unix:///var/run/docker.sock','exec',container!,'createdb','-U','postgres',fixtureDatabase],{env});
  fixture.query=query;fixture.schema=async statement=>{await sql(statement);};
  await sql(`CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN,date DATE,updated_at TIMESTAMPTZ DEFAULT now()); INSERT INTO posts VALUES('completion-legacy-fixture','Legacy retained story','News','/legacy.webp','Preserve this historical story','["Historical fixture"]',true,'2020-01-01',now());`);
  const firstTen=Array.from({length:10},(_,index):EditorialItem=>{const date=new Date(Date.UTC(2026,9,20+index)).toISOString().slice(0,10);return {slug:'first-ten-completion-fixture-'+index,date,scheduled_at:date+'T03:07:00.000Z',title:'Existing full guide '+index,section:'Analysis',description:'Previously approved fixture.',author:'Fictional editorial desk',kind:'article',markdown:body,image_prompt:'Fictional brand illustration',metadata:{editorial_type:'Analysis / practical guide'}};});
  await importEditorial(editorialBundle({version:1,source_sha256:originalSha,items:firstTen}),'fictional-original-ten',false);
  await query(`UPDATE posts SET published=true,editorial_status='live',published_at=scheduled_at,editorial_review=jsonb_build_object('approved_revision',editorial_revision::text,'approved_hash',editorial_import_hash) WHERE slug LIKE 'first-ten-completion-fixture-%'`);
  legacySnapshot=await snapshot('completion-legacy-fixture');
  firstTenSnapshots=await query(`SELECT to_jsonb(posts) AS snapshot FROM posts WHERE slug LIKE 'first-ten-completion-fixture-%' ORDER BY slug`);
 });
 it('atomically replaces a saved brief, approves its new revision honestly and keeps its future body private',async()=>{
  const original=assignment('successful');await seed(original);const manifest=request([original]),completed=manifest.bundle.items[0];
  expect(await applyEditorialCompletion(manifest)).toMatchObject({expired:false,completed:1,already:0,conflicts:0});
  const row=await snapshot(original.slug) as Record<string,unknown>,review=row.editorial_review as Record<string,unknown>,assets=row.asset_manifest as Record<string,unknown>;
  expect(row).toMatchObject({slug:original.slug,headline:completed.title,editorial_kind:'article',editorial_status:'approved_for_auto_release',published:true,editorial_revision:2,editorial_import_hash:itemHash(completed),social_automation_enabled:false});
  expect(review).toMatchObject({mode:'owner_approved_analysis',facts_checked:false,approved_revision:'2',approved_hash:itemHash(completed)});
  expect(assets.hero).toBe('/assets/ugt-logo.png');expect(assets.og).toBe('/assets/ugt-logo.png');expect(assets.illustration).toBe(false);
  expect(row.published_at).toBeNull();expect(row.body).not.toEqual([]);expect(row.date).toBe(original.date);expect(new Date(String(row.scheduled_at)).toISOString()).toBe(original.scheduled_at);
  expect((await query(PUBLIC_POST_SELECT)).map(item=>item.slug)).not.toContain(original.slug);
  const at=(time:string)=>query(`SELECT slug FROM posts WHERE ${PUBLIC_POST_PREDICATE.replaceAll('now()',`'${time}'::timestamptz`)}`);
  expect((await at(original.date+'T03:06:59.999Z')).map(item=>item.slug)).not.toContain(original.slug);
  expect((await at(original.scheduled_at)).map(item=>item.slug)).toContain(original.slug);
  const receipts=await query(`SELECT detail FROM editorial_audit WHERE slug=$1 AND action='complete_owner_analysis'`,[original.slug]);expect(receipts).toHaveLength(1);
  const detail=receipts[0].detail as Record<string,unknown>;expect(detail).toMatchObject({request_id:manifest.request_id,original_source_sha256:originalSha,original_hash:itemHash(original),original_revision:1,completed_hash:itemHash(completed),completed_revision:2});
  expect(JSON.stringify(detail.original_source)).toContain('Original fixture reporting outline: successful');expect(JSON.stringify(detail)).toContain('"facts_checked":false');
 });
 it('retries harmlessly and cannot resurrect held content under the same or a fresh request ID',async()=>{
  const original=assignment('held');await seed(original);const manifest=request([original]);
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:1});
  const approved=await snapshot(original.slug);expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:1,conflicts:0});expect(await snapshot(original.slug)).toEqual(approved);
  expect(await holdEditorial(original.slug,2,'fictional-owner')).toEqual([{slug:original.slug}]);const held=await snapshot(original.slug);
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:1});expect(await snapshot(original.slug)).toEqual(held);
  expect(await applyEditorialCompletion({...manifest,request_id:randomUUID()})).toMatchObject({completed:0});expect(await snapshot(original.slug)).toEqual(held);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE slug=$1 AND action='complete_owner_analysis'`,[original.slug]))[0].n).toBe('1');
 });
 it('does not reuse a request UUID for a different manifest or miscount its receipt',async()=>{
  const first=assignment('request-first'),second=assignment('request-second');await seed(first);await seed(second);
  const initial=request([first]);expect(await applyEditorialCompletion(initial)).toMatchObject({completed:1});
  const before=await snapshot(second.slug),changed={...request([second]),request_id:initial.request_id};
  expect(await applyEditorialCompletion(changed)).toMatchObject({completed:0,already:0,conflicts:1});expect(await snapshot(second.slug)).toEqual(before);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE action='completion_request' AND detail->>'request_id'=$1`,[initial.request_id]))[0].n).toBe('1');
 });
 it('treats old imports as superseded and cannot resurrect a deleted completed story',async()=>{
  const original=assignment('recreated');await seed(original);const manifest=request([original]);await applyEditorialCompletion(manifest);
  const oldBundle={version:1 as const,source_sha256:originalSha,items:[original]},completed=await snapshot(original.slug);
  const preview=await importEditorial(oldBundle,'fictional-original-retry',true);expect(preview.items?.[0].state).toBe('superseded');
  expect(await importEditorial(oldBundle,'fictional-original-retry',false)).toMatchObject({inserted:0,unchanged:0,superseded:1,conflicts:[]});expect(await snapshot(original.slug)).toEqual(completed);
  // Only this fictional row in this suite's network-none fixture database.
  await query('DELETE FROM posts WHERE slug=$1',[original.slug]);
  expect(await importEditorial(oldBundle,'fictional-deleted-retry',false)).toMatchObject({inserted:0,superseded:1,conflicts:[]});expect(await snapshot(original.slug)).toBeUndefined();
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0});expect(await snapshot(original.slug)).toBeUndefined();
  expect(await applyEditorialCompletion({...manifest,request_id:randomUUID()})).toMatchObject({completed:0});expect(await snapshot(original.slug)).toBeUndefined();
 });
 it('preserves an assignment deleted and reimported before its first completion',async()=>{
  const original=assignment('recreated-before-completion');await seed(original);const manifest=request([original]);
  // Simulate an editor deleting a private fixture, followed by an old importer retry.
  await query('DELETE FROM posts WHERE slug=$1',[original.slug]);await seed(original);const recreated=await snapshot(original.slug);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE action='import_draft' AND slug=$1`,[original.slug]))[0].n).toBe('2');
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:0,conflicts:1});expect(await snapshot(original.slug)).toEqual(recreated);
 });
 it.each(['revision','hash','source','date','schedule','kind','status','published','publication-history','managed'] as const)('preserves the row on a %s conflict',async kind=>{
  const original=assignment('conflict-'+kind);await seed(original);const manifest=request([original]);
  if(kind==='revision')manifest.targets[0].revision=99;
  if(kind==='hash')manifest.targets[0].hash='d'.repeat(64);
  if(kind==='source')await query(`UPDATE posts SET editorial_source=jsonb_set(editorial_source,'{metadata,source_sha256}',to_jsonb($2::text)) WHERE slug=$1`,[original.slug,'c'.repeat(64)]);
  if(kind==='date'){const shifted=new Date(Date.parse(original.scheduled_at)+86400000).toISOString();manifest.bundle.items[0].date=shifted.slice(0,10);manifest.bundle.items[0].scheduled_at=shifted;}
  if(kind==='schedule')manifest.bundle.items[0].scheduled_at=new Date(Date.parse(original.scheduled_at)+60000).toISOString();
  if(kind==='kind')await query(`UPDATE posts SET editorial_kind='article' WHERE slug=$1`,[original.slug]);
  if(kind==='status')await query(`UPDATE posts SET editorial_status='blocked' WHERE slug=$1`,[original.slug]);
  if(kind==='published')await query(`UPDATE posts SET published=true WHERE slug=$1`,[original.slug]);
  if(kind==='publication-history')await query(`UPDATE posts SET published_at=now()-interval '1 minute' WHERE slug=$1`,[original.slug]);
  if(kind==='managed')await query(`UPDATE posts SET editorial_managed=false WHERE slug=$1`,[original.slug]);
  const before=await snapshot(original.slug);expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:0,conflicts:1});expect(await snapshot(original.slug)).toEqual(before);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE slug=$1 AND action='complete_owner_analysis'`,[original.slug]))[0].n).toBe('0');
 });
 it('expires without mutating records or writing a misleading completion receipt',async()=>{
  const original=assignment('expired');await seed(original);const manifest=request([original]),start=Date.now()-7200000;
  manifest.requested_at=new Date(start).toISOString();manifest.expires_at=new Date(start+3600000).toISOString();const before=await snapshot(original.slug);
  expect(await applyEditorialCompletion(manifest)).toMatchObject({expired:true,completed:0});expect(await snapshot(original.slug)).toEqual(before);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE detail->>'request_id'=$1`,[manifest.request_id]))[0].n).toBe('0');
 });
 it('rejects injected asset or review attestations rather than treating supplied claims as checked facts',async()=>{
  const original=assignment('injected-review');await seed(original);const manifest=request([original]),before=await snapshot(original.slug);
  await expect(applyEditorialCompletion({...manifest,review:{facts_checked:true},assets:{hero:'https://example.test/unlicensed.jpg'}})).rejects.toThrow();
  expect(await snapshot(original.slug)).toEqual(before);
 });
 it('rolls back content, approval and request registration together when its audit write fails',async()=>{
  const original=assignment('audit-rollback');await seed(original);const manifest=request([original]),before=await snapshot(original.slug);
  await sql(`CREATE FUNCTION completion_fixture_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='complete_owner_analysis' THEN RAISE EXCEPTION 'fictional completion audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER completion_fixture_reject_audit BEFORE INSERT ON editorial_audit FOR EACH ROW EXECUTE FUNCTION completion_fixture_reject_audit();`);
  try{await expect(applyEditorialCompletion(manifest)).rejects.toThrow();expect(await snapshot(original.slug)).toEqual(before);expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE detail->>'request_id'=$1`,[manifest.request_id]))[0].n).toBe('0');}
  finally{await sql('DROP TRIGGER completion_fixture_reject_audit ON editorial_audit; DROP FUNCTION completion_fixture_reject_audit();');}
 });
 it('concurrent invocations produce one new revision and one completion audit record',async()=>{
  const original=assignment('concurrent');await seed(original);const manifest=request([original]);
  const results=await Promise.all([applyEditorialCompletion(manifest),applyEditorialCompletion(manifest)]);
  expect(results.reduce((sum,result)=>sum+result.completed,0)).toBe(1);expect((await snapshot(original.slug) as Record<string,unknown>).editorial_revision).toBe(2);
  expect((await query(`SELECT count(*)::text AS n FROM editorial_audit WHERE slug=$1 AND action='complete_owner_analysis'`,[original.slug]))[0].n).toBe('1');
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:1,conflicts:0});
 });
 it('preserves every legacy and previously approved first-ten field',async()=>{
  expect(await snapshot('completion-legacy-fixture')).toEqual(legacySnapshot);
  expect(await query(`SELECT to_jsonb(posts) AS snapshot FROM posts WHERE slug LIKE 'first-ten-completion-fixture-%' ORDER BY slug`)).toEqual(firstTenSnapshots);
 });
 it.skipIf(!process.env.UGT_EDITORIAL_COMPLETION_FIXTURE||!process.env.UGT_EDITORIAL_LIBRARY_FIXTURE)('completes the actual private63 against the original73 without committing source or publishing future material',async()=>{
  const original=editorialBundle(JSON.parse(await readFile(process.env.UGT_EDITORIAL_LIBRARY_FIXTURE!,'utf8'))),manifest=JSON.parse(await readFile(process.env.UGT_EDITORIAL_COMPLETION_FIXTURE!,'utf8'));
  // Reset only fictional managed fixture rows in this suite's isolated DB.
  await query('DELETE FROM posts WHERE editorial_managed');
  expect(await importEditorial(original,'private-original-fixture',false)).toMatchObject({inserted:73,conflicts:[]});
  const tenBefore=await query(`SELECT to_jsonb(posts) AS snapshot FROM posts WHERE editorial_kind='article' ORDER BY slug`);
  expect(await applyEditorialCompletion(manifest)).toMatchObject({expired:false,completed:63,already:0,conflicts:0});
  expect(await applyEditorialCompletion(manifest)).toMatchObject({completed:0,already:63,conflicts:0});
  const completedSnapshots=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug');
  expect(await importEditorial(original,'private-original-retry',false)).toMatchObject({inserted:0,unchanged:10,superseded:63,conflicts:[]});
  expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(completedSnapshots);
  expect((await query(`SELECT count(*)::text AS n FROM posts WHERE editorial_managed AND editorial_kind='assignment'`))[0].n).toBe('0');
  expect((await query(`SELECT count(*)::text AS n FROM posts WHERE editorial_managed AND editorial_revision=2 AND editorial_kind='article' AND editorial_review->>'facts_checked'='false'`))[0].n).toBe('63');
  expect((await query(PUBLIC_POST_SELECT)).map(row=>row.slug)).toEqual(['completion-legacy-fixture']);
  expect(await query(`SELECT to_jsonb(posts) AS snapshot FROM posts WHERE editorial_kind='article' AND editorial_revision=1 ORDER BY slug`)).toEqual(tenBefore);
  expect(await snapshot('completion-legacy-fixture')).toEqual(legacySnapshot);
 });
});
