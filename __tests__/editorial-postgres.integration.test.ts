/** Explicit isolated fictional PostgreSQL only. NEVER opens DATABASE_URL. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {beforeAll,describe,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Record<string,unknown>[]>,schema:undefined as unknown as (sql:string)=>Promise<void>}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,params?:unknown[])=>fixture.query(sql,params),qSchema:(sql:string)=>fixture.schema(sql)}));
vi.mock('@/lib/server/media',()=>({mediaGet:vi.fn()}));
import {mediaGet} from '@/lib/server/media';
import {editorialBundle,type EditorialBundle,type EditorialItem} from '@/lib/editorial-import';
import {importEditorial,reviewEditorial,holdEditorial,updateEditorial,releaseDueEditorial,webpDimensions} from '@/lib/server/editorial';
import {PUBLIC_POST_PREDICATE,PUBLIC_POST_SELECT} from '@/lib/server/editorial-publication';
const container=process.env.UGT_EDITORIAL_SQL_CONTAINER,run=promisify(execFile);
const fixtureDatabase='editorial_fixture_'+Date.now();
const env={...process.env,DOCKER_HOST:undefined,DOCKER_CONTEXT:undefined,DOCKER_TLS:undefined,DOCKER_TLS_VERIFY:undefined,DOCKER_CERT_PATH:undefined};
async function sql(input:string){
 if(container!=='ugt-editorial-fixture-20261019')throw Error('isolated_fixture_required');
 const child=execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',fixtureDatabase,'--csv','-q','-v','ON_ERROR_STOP=1'],{env});
 let out='',error='';child.stdout?.on('data',v=>out+=v);child.stderr?.on('data',v=>error+=v);child.stdin?.end(input);
 await new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});return out;
}
function records(text:string):Record<string,unknown>[] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field=''}else field+=c}
 if(field||row.length){row.push(field);rows.push(row)}const header=rows.shift()||[];
 return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>{const value=row[i];return [key,value==='t'?true:value==='f'?false:value.startsWith('{')||value.startsWith('[')?JSON.parse(value):value]})));
}
const literal=(v:unknown):string=>v===null?'NULL':Array.isArray(v)?literal('{'+v.map(x=>JSON.stringify(String(x))).join(',')+'}'):typeof v==='boolean'||typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const query=async(statement:string,params:unknown[]=[])=>records(await sql(params.length?`PREPARE fixture AS ${statement}; EXECUTE fixture(${params.map(literal).join(',')});`:statement));
const item:EditorialItem={slug:'fictional-scheduled-guide',date:'2026-10-20',scheduled_at:'2026-10-20T03:07:00.000Z',title:'Fictional scheduled guide',section:'Analysis',description:'Fixture only',author:'Fictional editorial desk',kind:'article',markdown:'# Fixture\n\n'+('Useful fixture content. '.repeat(150)),image_prompt:'Original fixture still life',metadata:{}};
const bundle:EditorialBundle={version:1,source_sha256:'a'.repeat(64),items:[item,{...item,slug:'fictional-brief',title:'Fictional reporting assignment',date:'2026-10-21',scheduled_at:'2026-10-21T03:07:00.000Z',kind:'assignment',markdown:'## Proposed structure\n\nReporting assignment; do not publish.'}]};
const assets={hero:'/media/admin-stories/'+'a'.repeat(64)+'/hero.webp',og:'/media/admin-stories/'+'b'.repeat(64)+'/og.webp',alt:'Fictional planning desk',caption:'Editorial illustration: fixture',rights:'Fixture rights',provenance:'Fixture-only artwork',illustration:true};
const review={sources:[{url:'https://example.test/source',note:'Verified fictional fixture',checked_at:'2026-10-18T00:00:00Z'}],facts_checked:true,rights_checked:true,originality_checked:true,safeguarding_checked:true,disclosure:'Fictional analytical guide.'};
function image(width:number,height:number){const b=Buffer.alloc(30);b.write('RIFF');b.writeUInt32LE(22,4);b.write('WEBP',8);b.write('VP8X',12);b.writeUInt32LE(10,16);b.writeUIntLE(width-1,24,3);b.writeUIntLE(height-1,27,3);return {value:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),metadata:{contentType:'image/webp',size:b.length}}}
describe.skipIf(!container)('isolated Postgres editorial workflow',()=>{
 beforeAll(async()=>{
  const inspected=await run('docker',['--host=unix:///var/run/docker.sock','inspect',container!,'--format','{{.HostConfig.NetworkMode}}'],{env});expect(inspected.stdout.trim()).toBe('none');
  await run('docker',['--host=unix:///var/run/docker.sock','exec',container!,'createdb','-U','postgres',fixtureDatabase],{env});
  fixture.query=query;fixture.schema=async statement=>{await sql(statement)};
  await sql(`CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN,date DATE,updated_at TIMESTAMPTZ DEFAULT now()); INSERT INTO posts VALUES('legacy-fixture','Legacy fixture','News','/legacy.webp','Legacy fixture','["Historical fixture"]',true,'2020-01-01',now());`);
 });
 it('reads legacy published rows before the migration, without backdating or requiring new columns',async()=>{
  // editorial_status exists in current live deployments; install only that existing column.
  await sql('ALTER TABLE posts ADD COLUMN editorial_status TEXT');
  expect((await query(PUBLIC_POST_SELECT)).map(r=>r.slug)).toEqual(['legacy-fixture']);
 });
 it('imports atomically with an audit trail, preserves legacy content, and keeps every item private',async()=>{
  const preview=await importEditorial(bundle,'fixture-owner',true);expect(preview.items?.map(i=>i.state)).toEqual(['new','new']);expect((await query('SELECT count(*)::text AS n FROM posts'))[0].n).toBe('1');
  expect(await importEditorial(bundle,'fixture-owner',false)).toMatchObject({inserted:2,unchanged:0,conflicts:[]});
  expect(await importEditorial(bundle,'fixture-owner',false)).toMatchObject({inserted:0,unchanged:2,conflicts:[]});
  expect((await query(PUBLIC_POST_SELECT)).map(r=>r.slug)).toEqual(['legacy-fixture']);
  expect((await query('SELECT count(*)::text AS n FROM editorial_audit'))[0].n).toBe('2');
  expect(await importEditorial({...bundle,items:[{...item,title:'Different incoming content'}]},'fixture-owner',false)).toMatchObject({inserted:0,conflicts:[item.slug]});
 });
 it('requires images/evidence and never approves a reporting brief',async()=>{
  vi.mocked(mediaGet).mockResolvedValue(null);await expect(reviewEditorial(item.slug,1,'fixture-owner',review,assets)).rejects.toThrow('image_missing');
  vi.mocked(mediaGet).mockImplementation(async url=>url===assets.hero?image(1600,900):image(1200,630));
  await expect(reviewEditorial('fictional-brief',1,'fixture-owner',review,assets)).rejects.toThrow('editorial_conflict');
  expect(await reviewEditorial(item.slug,1,'fixture-owner',review,assets)).toEqual([{slug:item.slug}]);
  expect((await query('SELECT social_automation_enabled FROM posts WHERE slug=$1',[item.slug]))[0].social_automation_enabled).toBe(false);
 });
 it('uses the precise UTC boundary everywhere and invalidated approval cannot leak',async()=>{
  // Pin publication history for this fictional boundary; no production DB is involved.
  await sql(`UPDATE posts SET published_at=NULL WHERE slug='${item.slug}'`);
  const at=(instant:string)=>`SELECT slug FROM posts WHERE ${PUBLIC_POST_PREDICATE.replaceAll('now()',`'${instant}'::timestamptz`)}`;
  expect((await query(at('2026-10-20T03:06:59Z'))).map(r=>r.slug)).not.toContain(item.slug);
  expect((await query(at('2026-10-20T03:07:00Z'))).map(r=>r.slug)).toContain(item.slug);
  await sql(`UPDATE posts SET editorial_revision=2 WHERE slug='${item.slug}'`);
  expect((await query(at('2026-10-20T03:07:01Z'))).map(r=>r.slug)).not.toContain(item.slug);
  await sql(`UPDATE posts SET editorial_revision=1,scheduled_at=now()-interval '1 minute' WHERE slug='${item.slug}'`);
 });
 it('records due releases once; holds and retries cannot resurrect a live story',async()=>{
  expect(await releaseDueEditorial()).toMatchObject({released:1});expect(await releaseDueEditorial()).toMatchObject({released:0});
  expect(await holdEditorial(item.slug,99,'fixture-owner')).toEqual([]);expect(await holdEditorial(item.slug,1,'fixture-owner')).toEqual([{slug:item.slug}]);
  expect(await holdEditorial(item.slug,1,'fixture-owner')).toEqual([]);expect((await query(PUBLIC_POST_SELECT)).map(r=>r.slug)).not.toContain(item.slug);
  expect(await releaseDueEditorial()).toMatchObject({released:0});
 });
 it('edits a brief only with its current revision, retaining it privately',async()=>{
  const brief=bundle.items[1];expect(await updateEditorial({...brief,title:'Revised assignment'},99,'fixture-owner')).toEqual([]);
  expect(await updateEditorial({...brief,title:'Revised assignment'},1,'fixture-owner')).toEqual([{slug:brief.slug}]);
  const row=(await query('SELECT published,editorial_revision,editorial_review FROM posts WHERE slug=$1',[brief.slug]))[0];expect(row).toMatchObject({published:false,editorial_revision:'2',editorial_review:{}});
 });
 it.skipIf(!process.env.UGT_EDITORIAL_LIBRARY_FIXTURE)('validates the actual private 73-slot package without committing or publishing it',async()=>{
  const source=JSON.parse(await readFile(process.env.UGT_EDITORIAL_LIBRARY_FIXTURE!,'utf8'));const data=editorialBundle(source);
  expect(data.items).toHaveLength(73);expect(data.items.filter(i=>i.kind==='article')).toHaveLength(10);expect(data.items.filter(i=>i.kind==='assignment')).toHaveLength(63);
  const preview=await importEditorial(data,'private-fixture',true);expect(preview.items).toHaveLength(73);
  // Remove only this suite's two fictional managed fixtures, inside the
  // network-none test database, to test the real library's unique date slots.
  await query('DELETE FROM posts WHERE editorial_managed');
  expect(await importEditorial(data,'private-fixture',false)).toMatchObject({inserted:73,unchanged:0,conflicts:[]});
  expect(await importEditorial(data,'private-fixture',false)).toMatchObject({inserted:0,unchanged:73,conflicts:[]});
  const counts=await query(`SELECT count(*)::text AS total,count(*) FILTER(WHERE editorial_kind='article')::text AS articles,count(*) FILTER(WHERE published)::text AS public FROM posts WHERE editorial_managed`);
  expect(counts[0]).toEqual({total:'73',articles:'10',public:'0'});
  expect((await query(PUBLIC_POST_SELECT)).map(r=>r.slug)).toEqual(['legacy-fixture']);
  expect(webpDimensions(new ArrayBuffer(4))).toBeNull();
 });
});
