/** Real, network-none fixture PostgreSQL only. Never opens DATABASE_URL. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {beforeAll,describe,expect,it,vi} from 'vitest';

type Row=Record<string,unknown>;
type StoredImage={value:ArrayBuffer;metadata:{contentType:string;size:number}};
const fixture=vi.hoisted(()=>({query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Row[]>,schema:undefined as unknown as (sql:string)=>Promise<void>}));
const storedImages=vi.hoisted(()=>new Map<string,StoredImage>());
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,params?:unknown[])=>fixture.query(sql,params),qSchema:(sql:string)=>fixture.schema(sql)}));
vi.mock('@/lib/server/media',async importOriginal=>({...await importOriginal<typeof import('@/lib/server/media')>(),mediaGet:vi.fn(async(url:string)=>storedImages.get(url)||null)}));
import {type EditorialAsset} from '@/lib/editorial-import';
import {ensureEditorialSchema} from '@/lib/server/editorial-schema';
import {holdEditorial} from '@/lib/server/editorial';
import {mediaGet} from '@/lib/server/media';
import {PUBLIC_POST_SELECT} from '@/lib/server/editorial-publication';
import {applyStoryArtwork,storyArtworkVersion} from '@/lib/server/story-artwork';

const container=process.env.UGT_EDITORIAL_SQL_CONTAINER,run=promisify(execFile);
const fixtureDatabase='story_artwork_fixture_'+Date.now()+'_'+process.pid;
const env={...process.env,DOCKER_HOST:undefined,DOCKER_CONTEXT:undefined,DOCKER_TLS:undefined,DOCKER_TLS_VERIFY:undefined,DOCKER_CERT_PATH:undefined};
async function sql(input:string){
 if(container!=='ugt-editorial-fixture-20261019')throw Error('isolated_fixture_required');
 const child=execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',fixtureDatabase,'--csv','-q','-v','ON_ERROR_STOP=1'],{env});
 let out='',error='';child.stdout?.on('data',value=>out+=value);child.stderr?.on('data',value=>error+=value);child.stdin?.end(input);
 await new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});return out;
}
function records(text:string):Row[]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field=''}else field+=c;}
 if(field||row.length){row.push(field);rows.push(row);}const header=rows.shift()||[];
 return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>{const value=row[i];return [key,value==='t'?true:value==='f'?false:value.startsWith('{')||value.startsWith('[')?JSON.parse(value):value];})));
}
const literal=(value:unknown):string=>value===null?'NULL':Array.isArray(value)?literal('{'+value.map(x=>JSON.stringify(String(x))).join(',')+'}'):typeof value==='boolean'||typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const query=async(statement:string,params:unknown[]=[])=>records(await sql(params.length?`PREPARE fixture AS ${statement}; EXECUTE fixture(${params.map(literal).join(',')});`:statement));
async function lockRow(slug:string){
 if(container!=='ugt-editorial-fixture-20261019')throw Error('isolated_fixture_required');
 const child=execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',fixtureDatabase,'--csv','-q','-v','ON_ERROR_STOP=1'],{env});
 let output='',error='',acquired=false;
 const finished=new Promise<{code:number|null;error:string}>(resolve=>{child.on('error',failure=>resolve({code:1,error:String(failure)}));child.on('close',code=>resolve({code,error}));});
 const locked=new Promise<void>((resolve,reject)=>{
  child.stdout?.on('data',value=>{output+=value;if(output.includes('artwork_fixture_lock_acquired')){acquired=true;resolve();}});
  child.stderr?.on('data',value=>error+=value);child.on('error',reject);child.on('close',()=>{if(!acquired)reject(Error(error||'fixture_lock_not_acquired'));});
 });
 child.stdin?.write(`BEGIN; SELECT slug FROM posts WHERE slug=${literal(slug)} FOR UPDATE; SELECT 'artwork_fixture_lock_acquired' AS marker;\n`);
 let released=false;
 return {locked,release:async()=>{if(released)return;released=true;child.stdin?.end('COMMIT;\n');const result=await finished;if(result.code!==0)throw Error(result.error);}};
}
async function snapshot(slug:string){return (await query('SELECT to_jsonb(posts) AS snapshot FROM posts WHERE slug=$1',[slug]))[0]?.snapshot as Row|undefined;}
async function receipts(requestId:string){return query(`SELECT actor,action,slug,detail FROM editorial_audit WHERE detail->>'request_id'=$1 ORDER BY id`,[requestId]);}
function preserved(row:Row){return Object.fromEntries(Object.entries(row).filter(([key])=>!['image','asset_manifest','updated_at'].includes(key)));}
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
 return value;
}
let sequence=0;
async function seed(label:string,managed=true){
 const index=sequence++,slug='artwork-fixture-'+label+'-'+index,date=new Date(Date.UTC(2024,0,1+index)).toISOString().slice(0,10),hash=createHash('sha256').update(slug).digest('hex');
 const source={slug,title:'Preserve headline '+label,author:'Fictional fixture author',markdown:'# Fixture\n\nKeep every authored word.',metadata:{source_sha256:'a'.repeat(64),private_note:'Keep this exact source'}};
 const review={mode:'owner_approved_analysis',facts_checked:false,approved_revision:'7',approved_hash:hash,approved_by:'fixture-owner',disclosure:'Fictional analytical guide; no independently checked reporting.'};
 await query(`INSERT INTO posts(slug,headline,section,image,dek,body,published,date,updated_at,editorial_managed,editorial_kind,editorial_status,scheduled_at,published_at,editorial_revision,editorial_import_hash,editorial_source,editorial_review,asset_manifest,submitted_by,reviewed_by,reviewed_at,social_automation_enabled,social_posted_at,social_automation_claimed_at,social_automation_result,fixture_opaque)
 VALUES($1,$2,'Analysis','/assets/ugt-logo.png','Preserve the authored dek',$3::jsonb,true,$4::date,'2025-01-01T00:00:00Z',$5,'article','live',$4::date+interval '3 hours 7 minutes',$4::date+interval '3 hours 7 minutes',7,$6,$7::jsonb,$8::jsonb,$9::jsonb,'fixture-importer','fixture-owner','2024-01-01T12:00:00Z',false,'2024-01-01T13:00:00Z','2024-01-01T12:59:00Z','Preserve historical automation result',$10::jsonb)`,
 [slug,source.title,JSON.stringify(['Preserve paragraph one.','Preserve paragraph two, including punctuation!']),date,managed,hash,JSON.stringify(source),JSON.stringify(review),JSON.stringify({hero:'/assets/ugt-logo.png',og:'/assets/ugt-logo.png',alt:'Original brand logo',rights:'Owner supplied logo',legacy_extra:{keep:'Until artwork replacement'}}),JSON.stringify({nested:{z:3,a:[true,null,'keep']},legacy:!managed})]);
 return (await snapshot(slug))!;
}
async function image(width:number,height:number,label:string){
 const digest=createHash('sha256').update(label).digest(),bytes=await sharp({create:{width,height,channels:3,background:{r:digest[0],g:digest[1],b:digest[2]}}}).webp({quality:85}).toBuffer();
 const hash=createHash('sha256').update(bytes).digest('hex'),url=`/media/admin-stories/${hash}/${width===1600?'hero':'og'}.webp`;
 storedImages.set(url,{value:Uint8Array.from(bytes).buffer,metadata:{contentType:'image/webp',size:bytes.length}});
 return url;
}
async function assets(label:string):Promise<EditorialAsset>{
 return {hero:await image(1600,900,label+'-hero'),og:await image(1200,630,label+'-og'),alt:'Fictional illustration for '+label,caption:'AI-generated editorial illustration: fictional fixture label, not a live attribution.',rights:'Fixture artwork created solely for this isolated test.',provenance:'Real Sharp-generated test derivatives; no live upload or external source.',illustration:true};
}
async function request(rows:Row[],phase:'preview'|'apply'='apply'){
 const start=Date.now();
 return {version:1 as const,mode:'owner_approved_story_artwork' as const,phase,request_id:randomUUID(),requested_at:new Date(start).toISOString(),expires_at:new Date(start+3600000).toISOString(),source_request:'Owner explicitly instructs publishing these exact story illustrations in place of the logo, preserving all authored content and publication settings.',targets:await Promise.all(rows.map(async row=>({slug:String(row.slug),expected_image:String(row.image),expected_headline:String(row.headline),expected_date:String(row.date),expected_version:phase==='preview'?'0'.repeat(64):storyArtworkVersion(row),assets:await assets(String(row.slug))})))};
}

describe('story artwork full-record concurrency version',()=>{
 it('is canonical, includes opaque fields and hashes the complete saved record',()=>{
  const row={slug:'fixture',updated_at:'2026-10-25T00:00:00Z',body:['First.','Second.'],opaque:{z:3,a:{x:true}}},reordered={opaque:{a:{x:true},z:3},body:['First.','Second.'],updated_at:row.updated_at,slug:'fixture'};
  const expected=createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');
  expect(storyArtworkVersion(row)).toBe(expected);expect(storyArtworkVersion(reordered)).toBe(expected);
  for(const changed of [{...row,opaque:{z:4,a:{x:true}}},{...row,body:['Second.','First.']},{...row,updated_at:'2026-10-25T00:00:01Z'},{...row,unrecognised_column:'new editor value'}])expect(storyArtworkVersion(changed)).not.toBe(expected);
 });
});

describe.skipIf(!container)('isolated Postgres image-only published story artwork',{timeout:15000},()=>{
 beforeAll(async()=>{
  expect(container).toBe('ugt-editorial-fixture-20261019');
  const inspected=await run('docker',['--host=unix:///var/run/docker.sock','inspect',container!,'--format','{{.HostConfig.NetworkMode}}'],{env});expect(inspected.stdout.trim()).toBe('none');
  await run('docker',['--host=unix:///var/run/docker.sock','exec',container!,'createdb','-U','postgres',fixtureDatabase],{env});
  fixture.query=query;fixture.schema=async statement=>{await sql(statement);};
  await sql(`CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN,date DATE,updated_at TIMESTAMPTZ DEFAULT now(),fixture_opaque JSONB);`);
  await ensureEditorialSchema();
 },30000);
 it('previews exact current versions without changing any post or writing any audit receipt',async()=>{
  const rows=await Promise.all([seed('preview-managed'),seed('preview-legacy',false)]),manifest=await request(rows,'preview');
  const before=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug'),auditBefore=await query('SELECT to_jsonb(editorial_audit) AS snapshot FROM editorial_audit ORDER BY id');
  const result=await applyStoryArtwork(manifest);
  expect(result).toMatchObject({preview:true,targets:rows.map(row=>({slug:row.slug,version:storyArtworkVersion(row),matched:true}))});
  expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(before);expect(await query('SELECT to_jsonb(editorial_audit) AS snapshot FROM editorial_audit ORDER BY id')).toEqual(auditBefore);
 });
 it('updates all ten managed and legacy stories while preserving every other saved field and normal public artwork',async()=>{
  const rows=[];for(let i=0;i<10;i++)rows.push(await seed('ten-'+i,i%2===0));
  const unrelated=await seed('unrelated'),manifest=await request(rows),result=await applyStoryArtwork(manifest);
  expect(result).toMatchObject({preview:false,request_id:manifest.request_id,expired:false,updated:10,already:0,conflicts:0});
  const publicRows=await query(PUBLIC_POST_SELECT);
  for(const [index,before] of rows.entries()){
   const after=(await snapshot(String(before.slug)))!,art=manifest.targets[index].assets;
   expect(preserved(after)).toEqual(preserved(before));expect(after.image).toBe(art.hero);expect(after.asset_manifest).toEqual(art);
   expect(Date.parse(String(after.updated_at))).toBeGreaterThan(Date.parse(String(before.updated_at)));expect(storyArtworkVersion(after)).not.toBe(storyArtworkVersion(before));
   const publicRow=publicRows.find(row=>row.slug===before.slug)!;
   expect(publicRow).toMatchObject({image:art.hero,public_asset:{alt:art.alt,caption:art.caption,og:art.og}});
   expect(publicRow.public_asset).not.toHaveProperty('rights');expect(publicRow.public_asset).not.toHaveProperty('provenance');
  }
  expect(await snapshot(String(unrelated.slug))).toEqual(unrelated);
  const audit=await receipts(manifest.request_id);expect(audit.filter(row=>row.action==='story_artwork_request')).toHaveLength(1);
  expect(audit.filter(row=>rows.some(before=>row.slug===before.slug))).toHaveLength(10);
  for(const [index,before] of rows.entries())expect(audit.find(receipt=>receipt.slug===before.slug)?.detail).toMatchObject({previous_record:before,assets:manifest.targets[index].assets});
 });
 it('replays the same request without changing timestamps or duplicating receipts',async()=>{
  const row=await seed('replay'),manifest=await request([row]);expect(await applyStoryArtwork(manifest)).toMatchObject({updated:1});
  const before=await snapshot(String(row.slug)),audit=await receipts(manifest.request_id);
  expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:1,conflicts:0});expect(await snapshot(String(row.slug))).toEqual(before);expect(await receipts(manifest.request_id)).toEqual(audit);
 });
 it('cannot bind an existing UUID to altered targets, artwork or owner text',async()=>{
  const first=await seed('uuid-first'),second=await seed('uuid-second'),manifest=await request([first]);await applyStoryArtwork(manifest);
  const differentTarget={...await request([second]),request_id:manifest.request_id},differentArt={...manifest,targets:[{...manifest.targets[0],assets:await assets('uuid-altered-art')}]},differentText={...manifest,source_request:manifest.source_request+' Additional changed owner text.'};
  const before=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug'),audit=await receipts(manifest.request_id);
  for(const changed of [differentTarget,differentArt,differentText])expect(await applyStoryArtwork(changed)).toMatchObject({updated:0,already:0,conflicts:1});
  expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(before);expect(await receipts(manifest.request_id)).toEqual(audit);
 });
 it('does not overwrite an edit made after preview, even when the old image/headline/date still match',async()=>{
  const row=await seed('preview-race'),preview=await request([row],'preview'),result=await applyStoryArtwork(preview);
  const version=(result as {targets:{version:string}[]}).targets[0].version;
  await query(`UPDATE posts SET fixture_opaque=jsonb_set(fixture_opaque,'{nested,z}','999'::jsonb),updated_at=now() WHERE slug=$1`,[row.slug]);
  const changed=(await snapshot(String(row.slug)))!,manifest={...preview,phase:'apply' as const,targets:[{...preview.targets[0],expected_version:version}]};
  expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:0,conflicts:1});expect(await snapshot(String(row.slug))).toEqual(changed);
 });
 it.each(['image','headline','date','version'] as const)('rejects an explicit expected %s mismatch without partial batch writes',async kind=>{
  const rows=[await seed('batch-valid-'+kind),await seed('batch-conflict-'+kind)],manifest=await request(rows);
  if(kind==='image')manifest.targets[1].expected_image='/different-original.webp';
  if(kind==='headline')manifest.targets[1].expected_headline+=' edited';
  if(kind==='date')manifest.targets[1].expected_date='2000-01-01';
  if(kind==='version')manifest.targets[1].expected_version='0'.repeat(64);
  const before=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug');
  expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:0});expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(before);
  expect((await receipts(manifest.request_id)).filter(row=>rows.some(before=>row.slug===before.slug))).toHaveLength(0);
 });
 it.each(['held','future','private','invalid-approval','assignment','legacy-future'] as const)('never changes %s content or grants publication',async kind=>{
  const row=await seed('eligibility-'+kind,kind!=='legacy-future');
  if(kind==='held')await holdEditorial(String(row.slug),7,'fixture-owner');
  if(kind==='future')await query(`UPDATE posts SET scheduled_at=now()+interval '2 days',published_at=NULL WHERE slug=$1`,[row.slug]);
  if(kind==='private')await query('UPDATE posts SET published=false WHERE slug=$1',[row.slug]);
  if(kind==='invalid-approval')await query(`UPDATE posts SET editorial_review=jsonb_set(editorial_review,'{approved_revision}','"6"'::jsonb) WHERE slug=$1`,[row.slug]);
  if(kind==='assignment')await query(`UPDATE posts SET editorial_kind='assignment' WHERE slug=$1`,[row.slug]);
  if(kind==='legacy-future')await query(`UPDATE posts SET date=(now() AT TIME ZONE 'Africa/Nairobi')::date+2 WHERE slug=$1`,[row.slug]);
  const before=(await snapshot(String(row.slug)))!,manifest=await request([before]);
  expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:0,conflicts:1});expect(await snapshot(String(row.slug))).toEqual(before);
  expect((await query(PUBLIC_POST_SELECT)).map(post=>post.slug)).not.toContain(row.slug);
 });
 it('cannot use an old request or a fresh request ID to restore held artwork',async()=>{
  const row=await seed('hold-after-apply'),manifest=await request([row]);await applyStoryArtwork(manifest);await holdEditorial(String(row.slug),7,'fixture-owner');
  const held=await snapshot(String(row.slug));expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:1});
  expect(await applyStoryArtwork({...manifest,request_id:randomUUID()})).toMatchObject({updated:0});expect(await snapshot(String(row.slug))).toEqual(held);
 });
 it('never recreates a deleted story or overwrites a replacement record',async()=>{
  const row=await seed('deleted'),manifest=await request([row]);await applyStoryArtwork(manifest);
  // Only this fictional slug in this suite's isolated, network-none database.
  await query('DELETE FROM posts WHERE slug=$1',[row.slug]);expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0});expect(await snapshot(String(row.slug))).toBeUndefined();
  expect(await applyStoryArtwork({...manifest,request_id:randomUUID()})).toMatchObject({updated:0});expect(await snapshot(String(row.slug))).toBeUndefined();
  await query(`INSERT INTO posts SELECT * FROM jsonb_populate_record(NULL::posts,$1::jsonb)`,[JSON.stringify({...row,headline:'Replacement authored record',updated_at:new Date().toISOString()})]);
  const replacement=await snapshot(String(row.slug));expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0});expect(await applyStoryArtwork({...manifest,request_id:randomUUID()})).toMatchObject({updated:0});expect(await snapshot(String(row.slug))).toEqual(replacement);
 });
 it('rejects a deleted and recreated row before first apply even when every expected display field matches',async()=>{
  const row=await seed('recreated-before-apply'),manifest=await request([row]);
  await query('DELETE FROM posts WHERE slug=$1',[row.slug]);
  await query(`INSERT INTO posts SELECT * FROM jsonb_populate_record(NULL::posts,$1::jsonb)`,[JSON.stringify({...row,updated_at:new Date().toISOString()})]);
  const recreated=await snapshot(String(row.slug));expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0,already:0,conflicts:1});expect(await snapshot(String(row.slug))).toEqual(recreated);
 });
 it.each(['missing','digest','dimensions','content-type','metadata-size','malformed','forged-vp8x-header'] as const)('rejects %s asset bytes before changing any target',async kind=>{
  const rows=[await seed('asset-valid-'+kind),await seed('asset-invalid-'+kind)],manifest=await request(rows),bad=manifest.targets[1].assets;
  if(kind==='missing')storedImages.delete(bad.hero);
  if(kind==='digest'){const bytes=storedImages.get(bad.hero)!;bad.hero='/media/admin-stories/'+'f'.repeat(64)+'/hero.webp';storedImages.set(bad.hero,bytes);}
  if(kind==='dimensions')bad.hero=await image(800,450,'wrong-dimensions');
  if(kind==='content-type'){const original=storedImages.get(bad.hero)!;storedImages.set(bad.hero,{...original,metadata:{...original.metadata,contentType:'image/jpeg'}});}
  if(kind==='metadata-size'){const original=storedImages.get(bad.hero)!;storedImages.set(bad.hero,{...original,metadata:{...original.metadata,size:original.metadata.size+1}});}
  if(kind==='malformed'){const bytes=Buffer.from('This is not a WebP image.'),hash=createHash('sha256').update(bytes).digest('hex');bad.hero=`/media/admin-stories/${hash}/hero.webp`;storedImages.set(bad.hero,{value:Uint8Array.from(bytes).buffer,metadata:{contentType:'image/webp',size:bytes.length}});}
  if(kind==='forged-vp8x-header'){
   const bytes=Buffer.alloc(30);bytes.write('RIFF');bytes.writeUInt32LE(22,4);bytes.write('WEBP',8);bytes.write('VP8X',12);bytes.writeUInt32LE(10,16);bytes.writeUIntLE(1599,24,3);bytes.writeUIntLE(899,27,3);
   const hash=createHash('sha256').update(bytes).digest('hex');bad.hero=`/media/admin-stories/${hash}/hero.webp`;storedImages.set(bad.hero,{value:Uint8Array.from(bytes).buffer,metadata:{contentType:'image/webp',size:bytes.length}});
   await expect(sharp(bytes).toBuffer()).rejects.toThrow();
  }
  const before=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug');await expect(applyStoryArtwork(manifest)).rejects.toThrow();
  expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(before);expect(await receipts(manifest.request_id)).toHaveLength(0);
 });
 it('expires without changing content or registering an apply receipt',async()=>{
  const row=await seed('expired'),manifest=await request([row]),start=Date.now()-7200000;
  manifest.requested_at=new Date(start).toISOString();manifest.expires_at=new Date(start+3600000).toISOString();
  expect(await applyStoryArtwork(manifest)).toMatchObject({expired:true,updated:0});expect(await snapshot(String(row.slug))).toEqual(row);expect(await receipts(manifest.request_id)).toHaveLength(0);
 });
 it('does not write when a valid request expires while its image bytes are being verified',async()=>{
  const row=await seed('expires-during-verification'),manifest=await request([row]);manifest.expires_at=new Date(Date.now()+750).toISOString();let crossedExpiry=false;
  vi.mocked(mediaGet).mockImplementationOnce(async url=>{await query('SELECT pg_sleep(1.25)');crossedExpiry=Date.now()>Date.parse(manifest.expires_at);return storedImages.get(url)||null;});
  try{expect(await applyStoryArtwork(manifest)).toMatchObject({updated:0});expect(crossedExpiry).toBe(true);expect(await snapshot(String(row.slug))).toEqual(row);expect(await receipts(manifest.request_id)).toHaveLength(0);}
  finally{vi.mocked(mediaGet).mockImplementation(async url=>storedImages.get(url)||null);}
 });
 it('does not update any target after waiting on a row lock past the whole batch expiry',async()=>{
  const rows=[await seed('locked-expiry-first'),await seed('locked-expiry-second',false)],manifest=await request(rows),holder=await lockRow(String(rows[1].slug));
  let applying:ReturnType<typeof applyStoryArtwork>|undefined;
  try{
   await holder.locked;manifest.expires_at=new Date(Date.now()+1500).toISOString();applying=applyStoryArtwork(manifest);void applying.catch(()=>undefined);
   let blocked=false;
   for(let attempt=0;attempt<12&&!blocked;attempt++){
    const active=await query(`SELECT count(*)::text AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'`);blocked=Number(active[0].n)>0;
   }
   expect(blocked).toBe(true);
   await query('SELECT pg_sleep($1::double precision)',[Math.max(0,(Date.parse(manifest.expires_at)-Date.now())/1000)+0.2]);
   await holder.release();expect(await applying).toMatchObject({updated:0});
   for(const row of rows)expect(await snapshot(String(row.slug))).toEqual(row);
   expect((await receipts(manifest.request_id)).filter(receipt=>receipt.action==='publish_story_artwork')).toHaveLength(0);
  }finally{await holder.release();await applying?.catch(()=>undefined);}
 });
 it('rejects expanded authority, duplicate targets, over-ten batches and over-one-day expiry',async()=>{
  const row=await seed('strict-request'),manifest=await request([row]);
  const invalid=[{...manifest,published:true},{...manifest,targets:[{...manifest.targets[0],body:['Injected replacement content']}]},{...manifest,targets:[manifest.targets[0],manifest.targets[0]]},{...manifest,targets:Array.from({length:11},()=>manifest.targets[0])},{...manifest,expires_at:new Date(Date.parse(manifest.requested_at)+86400001).toISOString()},{...manifest,targets:[{...manifest.targets[0],assets:{...manifest.targets[0].assets,illustration:false}}]}];
  for(const value of invalid)await expect(applyStoryArtwork(value)).rejects.toThrow();
  expect(await snapshot(String(row.slug))).toEqual(row);expect(await receipts(manifest.request_id)).toHaveLength(0);
 });
 it('rolls back the whole batch and request registration when an audit write fails',async()=>{
  const rows=[await seed('rollback-first'),await seed('rollback-second')],manifest=await request(rows),before=await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug');
  await sql(`CREATE FUNCTION artwork_fixture_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.slug='${rows[1].slug}' THEN RAISE EXCEPTION 'fictional artwork audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER artwork_fixture_reject_audit BEFORE INSERT ON editorial_audit FOR EACH ROW EXECUTE FUNCTION artwork_fixture_reject_audit();`);
  try{await expect(applyStoryArtwork(manifest)).rejects.toThrow();expect(await query('SELECT to_jsonb(posts) AS snapshot FROM posts ORDER BY slug')).toEqual(before);expect(await receipts(manifest.request_id)).toHaveLength(0);}
  finally{await sql('DROP TRIGGER artwork_fixture_reject_audit ON editorial_audit; DROP FUNCTION artwork_fixture_reject_audit();');}
  expect(await applyStoryArtwork(manifest)).toMatchObject({updated:2,already:0,conflicts:0});
 });
 it('serializes concurrent double apply into one request receipt and one update per target',async()=>{
  const rows=[await seed('concurrent-first'),await seed('concurrent-second',false)],manifest=await request(rows),results=await Promise.all([applyStoryArtwork(manifest),applyStoryArtwork(manifest)]);
  expect(results.reduce((sum,result)=>sum+('updated' in result?Number(result.updated):0),0)).toBe(2);
  expect(results.reduce((sum,result)=>sum+('already' in result?Number(result.already):0),0)).toBe(2);
  const audit=await receipts(manifest.request_id);expect(audit.filter(row=>row.action==='story_artwork_request')).toHaveLength(1);
  for(const [index,row] of rows.entries()){expect(audit.filter(receipt=>receipt.slug===row.slug)).toHaveLength(1);const after=(await snapshot(String(row.slug)))!;expect(preserved(after)).toEqual(preserved(row));expect(after.image).toBe(manifest.targets[index].assets.hero);}
 });
});
