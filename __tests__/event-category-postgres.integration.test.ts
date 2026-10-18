// Opt-in real PostgreSQL verification. Fixed local Docker socket, no network,
// no DATABASE_URL, no production credentials or reachable database hosts.
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const adapter=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:adapter.q,qSchema:adapter.schema,hasDb:()=>true}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,isAdmin:()=>true,isSuperAdmin:()=>true,hasPerm:()=>true,adminActor:()=> 'local-fixture'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:vi.fn()}));
vi.mock('next/server',async original=>({...await original<object>(),after:()=>{}}));
import {POST} from '@/app/api/admin/ops/route';
import {EVENT_CATEGORY_SCHEMA,saveEventCategory} from '@/lib/server/event-categories';
const enabled=process.env.UGT_CATEGORY_PG_FIXTURE==='1';
const container='ugt-category-fixture-20261016';
const env={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const docker=(args:string[],input?:string)=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,input,encoding:'utf8',timeout:15_000,stdio:['pipe','pipe','pipe']}).trim();
const sql=(input:string)=>docker(['exec','-i',container,'psql','-X','-U','postgres','-qAt','-v','ON_ERROR_STOP=1'],`SET statement_timeout='5s';\n${input}`);
const literal=(value:unknown)=>value===null||value===undefined?'NULL':typeof value==='number'||typeof value==='boolean'?String(value):"'"+String(value).replaceAll("'","''")+"'";
function query(statement:string,args:unknown[]=[]){
 let result:string;
 if(statement.startsWith('WITH saved AS'))result=statement.replace('SELECT * FROM saved',"SELECT coalesce(json_agg(saved),'[]') FROM saved");
 else if(/^(INSERT|UPDATE)/.test(statement))result=`WITH result AS (${statement}) SELECT coalesce(json_agg(result),'[]') FROM result`;
 else result=`SELECT coalesce(json_agg(result),'[]') FROM (${statement}) result`;
 return JSON.parse(sql(`SET standard_conforming_strings=on; PREPARE fixture AS ${result}; EXECUTE fixture${args.length?'('+args.map(literal).join(',')+')':''};`));
}
let created=false;
beforeAll(async()=>{
 if(!enabled)return;
 docker(['run','--rm','-d','--network','none','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine']);created=true;
 expect(docker(['inspect',container,'--format','{{.HostConfig.NetworkMode}}'])).toBe('none');
 // The image's temporary init server accepts Unix sockets before restarting;
 // require the final TCP listener so schema checks cannot race that restart.
 await vi.waitFor(()=>expect(docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'])).toContain('accepting connections'),{timeout:10_000});
 const source=readFileSync(new URL('../lib/server/ops.ts',import.meta.url),'utf8');
 const start=source.indexOf('CREATE TABLE IF NOT EXISTS audit_log ('),end=source.indexOf('CREATE TABLE IF NOT EXISTS products (',start);
 expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);sql(source.slice(start,end));
 sql("INSERT INTO tour_events(id,kind,name,status,tiers) VALUES ('legacy','school','Existing fixture','draft','[]');");
 adapter.q.mockImplementation(async(statement:string,args:unknown[]=[])=>query(statement,args));
 adapter.schema.mockImplementation(async(statement:string)=>{sql(statement)});
},20_000);
afterAll(()=>{if(created)docker(['stop',container])},20_000);
it.skipIf(!enabled)('runs actual category storage and event-assignment SQL without changing legacy or commercial data',async()=>{
 const category=await saveEventCategory({action:'create',name:"Campus's events"},'local-fixture');
 expect(category).toMatchObject({name:"Campus's events",active:true,version:1});
 sql(EVENT_CATEGORY_SCHEMA); // Idempotent additive DDL.
 expect(query("SELECT name,status,tiers,category_id FROM tour_events WHERE id='legacy'")).toEqual([{name:'Existing fixture',status:'draft',tiers:[],category_id:null}]);
 await expect(saveEventCategory({action:'create',name:"CAMPUS'S EVENTS"},'local-fixture')).rejects.toThrow('category_exists');
 const save=async(data:Record<string,unknown>)=>{
  const response=await POST(new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'tourEvent.save',data:{kind:'school',name:'Category fixture',status:'announced',tiers:[],...data}})}));
  return {status:response.status,body:await response.json()};
 };
 const first=await save({categoryId:category.id});expect(first.status).toBe(200);expect(first.body.row).toMatchObject({category_id:category.id,status:'announced',kind:'school',tiers:[]});
 const id=first.body.row.id;
 const renamed=await saveEventCategory({action:'update',...category,name:'Campus culture'},'local-fixture');
 const paused=await saveEventCategory({action:'update',...renamed,active:false},'local-fixture');expect(paused.version).toBe(3);
 await expect(saveEventCategory({action:'update',...renamed,name:'Stale rename'},'local-fixture')).rejects.toThrow('category_conflict');
 expect((await save({name:'Cannot newly assign paused',categoryId:category.id})).status).toBe(400);
 expect((await save({id,categoryId:category.id,description:'Keep existing paused category'})).status).toBe(200);
 expect((await save({id,description:'Legacy client omits category'})).body.row.category_id).toBe(category.id);
 const version=query('SELECT updated_at::text AS version FROM tour_events WHERE id=$1',[id])[0].version;
 expect((await save({id,updatedAt:version,categoryId:null})).body.row.category_id).toBeNull();
 expect((await save({id,updatedAt:version,categoryId:null})).status).toBe(409);
 expect((await save({name:'Legacy new event'})).status).toBe(200);
 expect(query('SELECT name,active,version FROM event_categories WHERE id=$1',[category.id])).toEqual([{name:'Campus culture',active:false,version:3}]);
 expect(query('SELECT action FROM audit_log ORDER BY id').map((row:{action:string})=>row.action)).toEqual(['eventCategory.create','eventCategory.update','eventCategory.update']);
 expect(query('SELECT kind,status,tiers FROM tour_events WHERE id=$1',[id])).toEqual([{kind:'school',status:'announced',tiers:[]}]);
 expect(()=>sql(`DELETE FROM event_categories WHERE id=${literal(category.id)}`)).not.toThrow(); // Now unassigned; test real restrictive FK below.
 const next=await saveEventCategory({action:'create',name:'Retained category'},'local-fixture');
 expect((await save({id,categoryId:next.id})).status).toBe(200);
 expect(()=>sql(`DELETE FROM event_categories WHERE id=${literal(next.id)}`)).toThrow();
},30_000);
