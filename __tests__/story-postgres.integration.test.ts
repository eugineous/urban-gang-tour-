/** Opt-in, real Postgres checks. Never uses DATABASE_URL or a hosted database. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {beforeAll,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Record<string,unknown>[]>,schema:undefined as unknown as (sql:string)=>Promise<void>,owner:true,removeAfterRead:false}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:(sql:string,params?:unknown[])=>state.query(sql,params),qSchema:(sql:string)=>state.schema(sql)}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,hasPerm:()=>true,isAdmin:()=>true,isSuperAdmin:()=>state.owner,adminActor:()=> 'fixture@example.test'}));
vi.mock('@/lib/server/content-workflow',()=>({ensureContentWorkflowSchema:async()=>{}}));
vi.mock('@/lib/server/content-automation',()=>({ensureContentAutomationSchema:async()=>{},contentAutomationReady:()=>false,dispatchArticleAnnouncement:vi.fn()}));
vi.mock('@/lib/server/notify',()=>({notifyPostPublished:vi.fn()}));
vi.mock('@/lib/server/indexnow',()=>({pingIndexNow:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn(),revalidateTag:vi.fn()}));
vi.mock('next/server',async original=>({...await original<object>(),after:vi.fn()}));
import {saveStoryDraft,trashStory,restoreStory} from '@/lib/server/story-workspace';
import {storyDraftContent} from '@/lib/story-draft';
import {POST} from '@/app/api/admin/save/route';

const container=process.env.UGT_STORY_SQL_CONTAINER;
const run=promisify(execFile);
// Restrict the selector to the explicitly created, isolated fictional fixture.
async function sql(input:string){
 if(container!=='ugt-story-fixture-20261016')throw Error('isolated_fixture_required');
 const child=execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','--csv','-q','-v','ON_ERROR_STOP=1'],{env:{...process.env,DOCKER_HOST:undefined,DOCKER_CONTEXT:undefined,DOCKER_TLS:undefined,DOCKER_TLS_VERIFY:undefined,DOCKER_CERT_PATH:undefined}});
 let output='',error='';child.stdout?.on('data',data=>output+=data);child.stderr?.on('data',data=>error+=data);child.stdin?.end(input);
 await new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});
 return output;
}
function records(text:string):Record<string,unknown>[] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
 else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field=''}else field+=c}
 if(field||row.length){row.push(field);rows.push(row)}const header=rows.shift()||[];
 return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>{const value=row[i];return [key,key==='revision'||key==='count'?Number(value):value==='t'?true:value==='f'?false:value.startsWith('{')||value.startsWith('[')?JSON.parse(value):value]})));
}
const literal=(value:unknown)=>value===null?'NULL':typeof value==='boolean'?String(value):typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
async function query(statement:string,params:unknown[]=[]){
 const rows=records(await sql(params.length?`PREPARE fixture AS ${statement}; EXECUTE fixture(${params.map(literal).join(',')});`:statement));
 if(state.removeAfterRead&&statement.startsWith('SELECT published, social_posted_at')){state.removeAfterRead=false;await sql("DELETE FROM posts WHERE slug='racing-story'")}
 return rows;
}
const request=(data:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/save',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','Content-Type':'application/json'},body:JSON.stringify({kind:'post',data})});
const version=async(slug:string)=>(await query('SELECT updated_at::text AS version FROM posts WHERE slug=$1',[slug]))[0].version as string;

describe.skipIf(!container)('isolated Postgres story workflow',()=>{
 beforeAll(async()=>{
  const inspected=await run('docker',['--host=unix:///var/run/docker.sock','inspect',container!,'--format','{{.HostConfig.NetworkMode}}']);expect(inspected.stdout.trim()).toBe('none');
  state.query=query;state.schema=async statement=>{await sql(statement)};
  await sql(`CREATE TABLE posts(slug TEXT PRIMARY KEY,headline TEXT NOT NULL,section TEXT,image TEXT,dek TEXT,body JSONB,published BOOLEAN,date DATE,editorial_status TEXT,submitted_by TEXT DEFAULT '',reviewed_by TEXT DEFAULT '',reviewed_at TIMESTAMPTZ,social_posted_at TIMESTAMPTZ,social_automation_claimed_at TIMESTAMPTZ,social_automation_result TEXT,social_automation_enabled BOOLEAN DEFAULT false,updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE audit_log(id SERIAL PRIMARY KEY,actor TEXT,action TEXT,detail JSONB);`);
 });
 it('saves revisions atomically, reconciles retries, and rejects foreign or stale writes',async()=>{
  const id='12953bc3-0e73-4b35-bb5b-0b4827bc578a',content=storyDraftContent({headline:'Private fixture',body:'Quoted "text", apostrophe\'s and\nnewlines.'});
  expect(await saveStoryDraft(id,'fixture@example.test',0,content)).toMatchObject({revision:1});
  expect(await saveStoryDraft(id,'fixture@example.test',0,content)).toMatchObject({revision:1});
  expect(await saveStoryDraft(id,'another@example.test',1,content)).toBeNull();
  expect(await saveStoryDraft(id,'fixture@example.test',1,{...content,headline:'Second version'})).toMatchObject({revision:2});
  expect(await saveStoryDraft(id,'fixture@example.test',1,{...content,headline:'Stale version'})).toBeNull();
  expect(await query('SELECT count(*) AS count FROM admin_story_revisions')).toEqual([{count:2}]);
  expect(await query('SELECT count(*) AS count FROM posts')).toEqual([{count:0}]);
 });
 it('creates and edits through the real publishing SQL, with no implicit publication',async()=>{
  expect((await POST(request({slug:'fixture-story',headline:'Fixture story',expectedVersion:null}))).status).toBe(200);
  expect((await query("SELECT published FROM posts WHERE slug='fixture-story'"))[0].published).toBe(false);
  const initial=await version('fixture-story');
  expect((await POST(request({slug:'fixture-story',headline:'Published fixture',published:true,expectedVersion:initial}))).status).toBe(200);
  expect((await POST(request({slug:'fixture-story',headline:'Stale fixture',published:true,expectedVersion:initial}))).status).toBe(409);
 });
 it('does not recreate a record removed between the read and guarded update',async()=>{
  expect((await POST(request({slug:'racing-story',headline:'Race fixture',expectedVersion:null}))).status).toBe(200);
  const initial=await version('racing-story');state.removeAfterRead=true;
  expect((await POST(request({slug:'racing-story',headline:'Should not return',expectedVersion:initial}))).status).toBe(409);
  expect(await query("SELECT slug FROM posts WHERE slug='racing-story'")).toEqual([]);
 });
 it('moves a full snapshot to Trash and restores only as an unpublished draft',async()=>{
  expect(await trashStory('fixture-story','fixture@example.test',true,'stale')).toEqual([]);
  expect(await trashStory('fixture-story','fixture@example.test',false,await version('fixture-story'))).toEqual([]);
  expect(await trashStory('fixture-story','fixture@example.test',true,await version('fixture-story'))).toEqual([{slug:'fixture-story'}]);
  expect(await restoreStory('fixture-story','another@example.test',false)).toEqual([]);
  expect(await restoreStory('fixture-story','fixture@example.test',false)).toEqual([{slug:'fixture-story'}]);
  expect((await query("SELECT published,editorial_status FROM posts WHERE slug='fixture-story'"))[0]).toEqual({published:false,editorial_status:'draft'});
 });
 it('keeps Trash intact when a slug has been reused',async()=>{
  await trashStory('fixture-story','fixture@example.test',true,await version('fixture-story'));
  await POST(request({slug:'fixture-story',headline:'Different fixture',expectedVersion:null}));
  expect(await restoreStory('fixture-story','fixture@example.test',true)).toEqual([]);
  expect(await query('SELECT count(*) AS count FROM admin_story_trash')).toEqual([{count:1}]);
 });
 it('rolls back the deletion if snapshot storage fails',async()=>{
  await POST(request({slug:'rollback-story',headline:'Rollback fixture',expectedVersion:null}));
  await sql("ALTER TABLE admin_story_trash ADD CONSTRAINT fixture_failure CHECK(slug<>'rollback-story')");
  await expect(trashStory('rollback-story','fixture@example.test',true,await version('rollback-story'))).rejects.toThrow();
  expect(await query("SELECT slug FROM posts WHERE slug='rollback-story'")).toEqual([{slug:'rollback-story'}]);
 });
});
