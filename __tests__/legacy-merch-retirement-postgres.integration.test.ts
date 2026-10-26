/** Real, network-none fixture PostgreSQL only. Never opens DATABASE_URL. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';

type Row=Record<string,unknown>;
const fixture=vi.hoisted(()=>({
 query:undefined as unknown as (sql:string,params?:unknown[])=>Promise<Row[]>,
 schema:undefined as unknown as (sql:string)=>Promise<void>,
 pool:undefined as unknown as ()=>unknown,
}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,db:()=>fixture.pool(),q:(sql:string,params?:unknown[])=>fixture.query(sql,params),qSchema:(sql:string)=>fixture.schema(sql)}));
import {ensureOpsSchema} from '@/lib/server/ops';
import {recordPaidMerchOrder} from '@/lib/server/inventory';
import {orderLines} from '@/lib/server/catalog';

const servicePath='../lib/server/legacy-merch-retirement';
async function apply(raw:unknown){
 const service=await import(servicePath).catch(()=>null);
 expect(service,'The guarded retirement service must exist').not.toBeNull();
 return service!.applyLegacyMerchRetirement(raw) as Promise<{request_id:string;manifest_hash:string;expired:boolean;retired:number;already:number;conflicts:number}>;
}

const container=process.env.UGT_EDITORIAL_SQL_CONTAINER,run=promisify(execFile);
const fixtureDatabase='legacy_merch_retirement_fixture_'+Date.now()+'_'+process.pid;
const env={...process.env,DOCKER_HOST:undefined,DOCKER_CONTEXT:undefined,DOCKER_TLS:undefined,DOCKER_TLS_VERIFY:undefined,DOCKER_CERT_PATH:undefined};
function launch(){
 if(container!=='ugt-editorial-fixture-20261019')throw Error('isolated_fixture_required');
 return execFile('docker',['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',fixtureDatabase,'--csv','-q','-v','ON_ERROR_STOP=1'],{env});
}
async function sql(input:string){
 const child=launch();let out='',error='';
 child.stdout?.on('data',value=>out+=value);child.stderr?.on('data',value=>error+=value);child.stdin?.end(input);
 await new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))});return out;
}
function records(text:string):Row[]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field=''}else field+=c;}
 if(field||row.length){row.push(field);rows.push(row);}const header=rows.shift()||[];
 return rows.filter(row=>row.length===header.length).map(row=>Object.fromEntries(header.map((key,i)=>{const value=row[i];return [key,value==='t'?true:value==='f'?false:value.startsWith('{')||value.startsWith('[')?JSON.parse(value):value];})));
}
const literal=(value:unknown):string=>value===null?'NULL':Array.isArray(value)?literal('{'+value.map(x=>JSON.stringify(String(x))).join(',')+'}'):typeof value==='boolean'||typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const prepared=(statement:string,params:unknown[]=[],name='fixture')=>params.length?`PREPARE ${name} AS ${statement}; EXECUTE ${name}(${params.map(literal).join(',')});`:statement;
const query=async(statement:string,params:unknown[]=[])=>records(await sql(prepared(statement,params)));

/** A real persistent psql session lets the unchanged inventory transaction run. */
function session(){
 const child=launch();let buffer='',error='',sequence=0;
 let pending:{marker:string;resolve:(rows:{rows:Row[]})=>void;reject:(error:Error)=>void}|null=null;
 const finished=new Promise<void>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{if(code===0)resolve();else reject(Error(error));pending?.reject(Error(error||'fixture_session_closed'));});});
 void finished.catch(()=>undefined);
 child.stdout?.on('data',value=>{buffer+=value;if(pending&&buffer.includes(pending.marker)){const output=buffer.slice(0,buffer.indexOf(pending.marker));buffer=buffer.slice(buffer.indexOf(pending.marker)+pending.marker.length).replace(/^\r?\n/,'');const active=pending;pending=null;active.resolve({rows:records(output)});}});
 child.stderr?.on('data',value=>error+=value);
 return {
  query:(statement:string,params:unknown[]=[])=>new Promise<{rows:Row[]}>((resolve,reject)=>{
   if(pending)return reject(Error('fixture_concurrent_session_query'));
   const name='fixture_'+(++sequence),marker='fixture_done_'+sequence;
   pending={marker,resolve,reject};child.stdin?.write(prepared(statement,params,name)+';\n\\echo '+marker+'\n');
  }),
  release:()=>undefined,
  end:async()=>{child.stdin?.end();await finished;},
 };
}
async function snapshot(id:string){return (await query('SELECT to_jsonb(products) AS snapshot FROM products WHERE id=$1',[id]))[0]?.snapshot as Row|undefined;}
async function receipts(requestId:string){return query(`SELECT actor,action,detail FROM audit_log WHERE detail->>'request_id'=$1 ORDER BY id`,[requestId]);}
function preserved(row:Row){return Object.fromEntries(Object.entries(row).filter(([key])=>!['active','updated_at'].includes(key)));}
function request(rows:Row[]){
 const start=Date.now();return {version:1,mode:'owner_retire_legacy_merch',request_id:randomUUID(),requested_at:new Date(start).toISOString(),expires_at:new Date(start+3600000).toISOString(),source_request:'Owner explicitly approved retiring all fourteen legacy products from public sale.',targets:rows.map(row=>({id:String(row.id),expected_image:String(row.image),expected_name:String(row.name),expected_price:Number(row.price)}))};
}
async function seed(id='p1'){
 const images:Record<string,string>={p1:'magenta-tee.png',p2:'crewneck.png',p3:'snapback.png',p4:'bucket-hat.png',p5:'tote.png',p6:'beanie.png',p7:'bottle.png',p8:'wristbands.png',p9:'gym-sack.png',p10:'baby-tee.png',p11:'jersey.png',p12:'waist-bag.png',p13:'lanyard.png',p14:'stickers.png'};
 await query(`INSERT INTO products(id,name,price,image,category,description,active,created_at,updated_at,inventory_tracked,reorder_point,cost_price,name_on_back_enabled,fixture_opaque)
 VALUES($1,$2,900,$3,'Preserve category','Preserve description',true,'2025-01-01T00:00:00Z','2025-01-02T00:00:00Z',true,3,400,true,'{"private":"preserve full record","nested":[true,null,7]}')`,[id,'Fictional '+id,'/assets/merch/'+images[id]]);
 await query(`INSERT INTO merch_inventory_moves(product_id,quantity,move_type,note,reference) VALUES($1,25,'opening','Genuine fixture opening record','fixture-opening')`,[id]);
 return (await snapshot(id))!;
}

describe.skipIf(!container)('isolated Postgres guarded legacy merchandise retirement',{timeout:20000},()=>{
 beforeAll(async()=>{
  expect(container).toBe('ugt-editorial-fixture-20261019');
  const inspected=await run('docker',['--host=unix:///var/run/docker.sock','inspect',container!,'--format','{{.HostConfig.NetworkMode}}'],{env});expect(inspected.stdout.trim()).toBe('none');
  await run('docker',['--host=unix:///var/run/docker.sock','exec',container!,'createdb','-U','postgres',fixtureDatabase],{env});
  fixture.query=query;fixture.schema=async statement=>{await sql(statement);};
  fixture.pool=()=>{let client:ReturnType<typeof session>|undefined;return {connect:async()=>client=session(),end:async()=>client?.end()};};
  // The deployed ops schema references these historic tables before their
  // own CREATE statements; mirror the existing deployment prerequisites.
  await sql(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB,total INT,status TEXT);
   CREATE TABLE merch_suppliers(id SERIAL PRIMARY KEY,name TEXT,status TEXT);
   CREATE TABLE merch_supplier_quotes(id SERIAL PRIMARY KEY,supplier_id INT,product_id TEXT,status TEXT);`);
  await ensureOpsSchema();await sql('ALTER TABLE products ADD COLUMN fixture_opaque JSONB;');
 },30000);
 beforeEach(async()=>{await sql('TRUNCATE products,audit_log,orders RESTART IDENTITY CASCADE;');});

 it('retires all fourteen atomically, changes only active and modification time, and keeps complete private journal records',async()=>{
  const rows=[];for(let i=1;i<=14;i++)rows.push(await seed('p'+i));
  const inventoryBefore=await query('SELECT to_jsonb(merch_inventory_moves) AS record FROM merch_inventory_moves ORDER BY id'),manifest=request(rows);
  const outcome=await apply(manifest);expect(outcome).toMatchObject({request_id:manifest.request_id,expired:false,retired:14,already:0,conflicts:0});expect(outcome.manifest_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(Object.keys(outcome).sort()).toEqual(['already','conflicts','expired','manifest_hash','request_id','retired']);
  const audit=await receipts(manifest.request_id);expect(audit.filter(row=>row.action==='legacy_merch_retirement_request')).toHaveLength(1);
  for(const before of rows){const after=(await snapshot(String(before.id)))!;expect(after.active).toBe(false);expect(Date.parse(String(after.updated_at))).toBeGreaterThanOrEqual(Date.parse(manifest.requested_at));expect(preserved(after)).toEqual(preserved(before));expect(audit.find(row=>(row.detail as Row).product_id===before.id)?.detail).toMatchObject({previous_record:before,manifest_hash:outcome.manifest_hash,source_request:manifest.source_request});}
  expect(await query('SELECT to_jsonb(merch_inventory_moves) AS record FROM merch_inventory_moves ORDER BY id')).toEqual(inventoryBefore);
 });
 it.each(['missing','inactive','image','name','price','created_after','updated_after','null_created','null_updated'])('rejects the entire batch when one target conflicts: %s',async kind=>{
  const rows=[await seed('p1'),await seed('p2')],manifest=request(rows);
  const updates:Record<string,string>={missing:"DELETE FROM merch_inventory_moves WHERE product_id='p2'; DELETE FROM products WHERE id='p2'",inactive:"UPDATE products SET active=false WHERE id='p2'",image:"UPDATE products SET image='/assets/merch/jersey.png' WHERE id='p2'",name:"UPDATE products SET name='Edited product' WHERE id='p2'",price:"UPDATE products SET price=901 WHERE id='p2'",created_after:"UPDATE products SET created_at=clock_timestamp()+interval '1 second' WHERE id='p2'",updated_after:"UPDATE products SET updated_at=clock_timestamp()+interval '1 second' WHERE id='p2'",null_created:"UPDATE products SET created_at=NULL WHERE id='p2'",null_updated:"UPDATE products SET updated_at=NULL WHERE id='p2'"};
  await sql(updates[kind]);const before=await query('SELECT to_jsonb(products) AS record FROM products ORDER BY id');
  expect(await apply(manifest)).toMatchObject({retired:0,already:0,conflicts:2});expect(await query('SELECT to_jsonb(products) AS record FROM products ORDER BY id')).toEqual(before);expect((await receipts(manifest.request_id)).filter(row=>row.action==='retire_legacy_merch_product')).toHaveLength(0);
 });
 it('never replays an applied request after an operator restores a product',async()=>{
  const row=await seed(),manifest=request([row]);expect(await apply(manifest)).toMatchObject({retired:1});
  await sql("UPDATE products SET active=true,updated_at=clock_timestamp() WHERE id='p1'");const restored=await snapshot('p1'),audit=await receipts(manifest.request_id);
  expect(await apply(manifest)).toMatchObject({retired:0,already:1,conflicts:0});expect(await snapshot('p1')).toEqual(restored);expect(await receipts(manifest.request_id)).toEqual(audit);
 });
 it('binds the request UUID to the complete immutable manifest',async()=>{
  const first=await seed('p1'),second=await seed('p2'),manifest=request([first]);await apply(manifest);
  const changed={...manifest,targets:request([second]).targets};expect(await apply(changed)).toMatchObject({retired:0,already:0,conflicts:1});expect(await snapshot('p2')).toEqual(second);
 });
 it('does nothing for an already expired manifest without writing a request journal',async()=>{
  const row=await seed(),manifest=request([row]);manifest.requested_at=new Date(Date.now()-7200000).toISOString();manifest.expires_at=new Date(Date.now()-3600000).toISOString();
  expect(await apply(manifest)).toMatchObject({expired:true,retired:0,already:0,conflicts:0});expect(await snapshot('p1')).toEqual(row);expect(await receipts(manifest.request_id)).toHaveLength(0);
 });
 it('rolls back the whole retirement and request journal if one audit receipt fails',async()=>{
  const rows=[await seed('p1'),await seed('p2')],manifest=request(rows);
  await sql(`CREATE FUNCTION retirement_fixture_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='retire_legacy_merch_product' AND NEW.detail->>'product_id'='p2' THEN RAISE EXCEPTION 'fictional retirement audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER retirement_fixture_reject_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION retirement_fixture_reject_audit();`);
  try{await expect(apply(manifest)).rejects.toThrow();for(const row of rows)expect(await snapshot(String(row.id))).toEqual(row);expect(await receipts(manifest.request_id)).toHaveLength(0);}
  finally{await sql('DROP TRIGGER retirement_fixture_reject_audit ON audit_log; DROP FUNCTION retirement_fixture_reject_audit();');}
  expect(await apply(manifest)).toMatchObject({retired:2,already:0,conflicts:0});
 });
 it('serializes concurrent copies into one mutation and one receipt per target',async()=>{
  const rows=[await seed('p1'),await seed('p2')],manifest=request(rows),results=await Promise.all([apply(manifest),apply(manifest)]);
  expect(results.reduce((n,result)=>n+result.retired,0)).toBe(2);expect(results.reduce((n,result)=>n+result.already,0)).toBe(2);
  const audit=await receipts(manifest.request_id);expect(audit.filter(row=>row.action==='legacy_merch_retirement_request')).toHaveLength(1);expect(audit.filter(row=>row.action==='retire_legacy_merch_product')).toHaveLength(2);
 });
 it('checks one batch expiry after waiting for every row lock',async()=>{
  const rows=[await seed('p1'),await seed('p2')],manifest=request(rows),holder=session();let applying:ReturnType<typeof apply>|undefined;
  try{
   await holder.query('BEGIN');await holder.query("SELECT id FROM products WHERE id='p2' FOR UPDATE");manifest.expires_at=new Date(Date.now()+1500).toISOString();applying=apply(manifest);void applying.catch(()=>undefined);
   let blocked=false;for(let attempt=0;attempt<20&&!blocked;attempt++){const active=await query("SELECT count(*)::text AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");blocked=Number(active[0].n)>0;}expect(blocked).toBe(true);
   await query('SELECT pg_sleep($1::double precision)',[Math.max(0,(Date.parse(manifest.expires_at)-Date.now())/1000)+0.2]);await holder.query('COMMIT');
   expect(await applying).toMatchObject({expired:true,retired:0,already:0});for(const row of rows)expect(await snapshot(String(row.id))).toEqual(row);expect((await receipts(manifest.request_id)).filter(row=>row.action==='retire_legacy_merch_product')).toHaveLength(0);
  }finally{await holder.query('ROLLBACK').catch(()=>undefined);await holder.end();await applying?.catch(()=>undefined);}
 });
 it('preserves accepted pending receipts and lets the real inventory settlement fulfill retired products',async()=>{
  const row=await seed(),items=[{id:'p1',name:'Accepted historical name',unit:900,qty:2,variant:'L',printableName:'Amina'}],receipt=orderLines(items);
  await query("INSERT INTO orders(id,items,total,status) VALUES('ORD-RETIREMENT-FIXTURE',$1::jsonb,1800,'pending')",[JSON.stringify(items)]);await query("INSERT INTO merch_variants(product_id,label,sku,price_adjustment,active) VALUES('p1','L','FIXTURE-L',0,true)");
  await apply(request([row]));await sql("UPDATE orders SET status='paid' WHERE id='ORD-RETIREMENT-FIXTURE'");
  await recordPaidMerchOrder({id:'ORD-RETIREMENT-FIXTURE',items,status:'paid'});await recordPaidMerchOrder({id:'ORD-RETIREMENT-FIXTURE',items,status:'paid'});
  expect(orderLines(items)).toEqual(receipt);expect((await query("SELECT quantity::text AS quantity FROM merch_inventory_moves WHERE move_type='online_sale' AND reference='ORD-RETIREMENT-FIXTURE'")).map(row=>row.quantity)).toEqual(['-2']);expect(await query("SELECT order_id,status FROM merch_fulfillments WHERE order_id='ORD-RETIREMENT-FIXTURE'")).toEqual([{order_id:'ORD-RETIREMENT-FIXTURE',status:'new'}]);expect((await snapshot('p1'))?.active).toBe(false);
 });
});
