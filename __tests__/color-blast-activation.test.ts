import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({products:[] as any[],variants:[] as any[],journal:null as any,conflict:false,variantFailure:false,queries:[] as string[],draft:null as any}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{}}));
vi.mock('@/lib/server/db',()=>({qSchema:async()=>{},db:()=>({end:async()=>{},connect:async()=>({release:()=>{},query:async(sql:string,args:any[]=[])=>{
 state.queries.push(sql);
 if(sql.includes('clock_timestamp() <'))return {rows:[{valid:true}]};
 if(sql==='BEGIN'){state.draft={products:[...state.products],variants:[...state.variants],journal:state.journal};return {rows:[]};}
 if(sql==='ROLLBACK'){state.draft=null;return {rows:[]};}
 if(sql==='COMMIT'){if(state.draft){Object.assign(state,state.draft);state.draft=null;}return {rows:[]};}
 if(sql.includes('SELECT request_id,manifest_hash'))return {rows:state.journal?[state.journal]:[]};
 if(sql.includes('SELECT id FROM products'))return {rows:state.conflict?[{id:'cb-hoodie'}]:state.products.map(product=>({id:product.id}))};
 if(sql.includes('SELECT product_id FROM merch_variants'))return {rows:[]};
 if(sql.includes('INSERT INTO products')){state.draft.products.push(...JSON.parse(args[0]));return {rows:JSON.parse(args[0]).map((product:any)=>({id:product.id}))};}
 if(sql.includes('INSERT INTO merch_variants')){if(state.variantFailure)throw Error('fixture database interruption');state.draft.variants.push(...JSON.parse(args[0]));return {rows:[]};}
 if(sql.includes('INSERT INTO color_blast_activation_requests')){state.draft.journal={request_id:args[0],manifest_hash:args[1],collection_hash:args[2]};return {rows:[]};}
 return {rows:[]};
}})})}));
const servicePath='../lib/server/color-blast-activation';
async function service(){const loaded=await import(servicePath).catch(()=>null);expect(loaded,'The exact guarded collection activation service must exist').not.toBeNull();return loaded!;}
beforeEach(()=>{state.products=[];state.variants=[];state.journal=null;state.conflict=false;state.variantFailure=false;state.queries=[];state.draft=null;});
const requestId='e555e555-2026-4028-8000-012345678901';
async function manifest(phase='apply'){const api=await service();return {...api.buildColorBlastActivationManifest({requestId,requestedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()}),phase};}
describe('exact owner-approved Color Blast activation',()=>{
 it('activates exactly24 made-to-order products and187 genuine variants at current standard prices',async()=>{
  const api=await service(),result=await api.applyColorBlastActivation(await manifest());
  expect(result).toMatchObject({activated:24,conflicts:0,already:0});
  expect(state.products).toHaveLength(24);expect(state.variants).toHaveLength(187);
  expect(state.products.find(product=>product.id==='cb-oversized-tee')).toMatchObject({price:1800,made_to_order:true,inventory_tracked:false,name_on_back_enabled:false});
  expect(state.products.find(product=>product.id==='cb-hoodie')).toMatchObject({price:3500});
  expect(state.products.find(product=>product.id==='cb-bookmark')).toMatchObject({price:80});
  expect(state.variants).toContainEqual({product_id:'cb-oversized-tee',label:'Black / XS',sku:'UGT-CB-OVERSIZED-TEE-1-1',price_adjustment:0,active:true});
  expect(state.queries.some(sql=>/INSERT INTO merch_inventory_moves|UPDATE products|DELETE FROM/.test(sql))).toBe(false);
  expect(state.products.some(product=>/^p\d+$/.test(product.id))).toBe(false);
 });
 it('previews absence conflicts without creating any products or activation receipt',async()=>{
  const api=await service();expect(await api.applyColorBlastActivation(await manifest('preview'))).toMatchObject({eligible:24,activated:0});
  expect(state.products).toEqual([]);expect(state.journal).toBeNull();
 });
 it('aborts the entire batch if any target product already exists',async()=>{
  state.conflict=true;const api=await service();expect(await api.applyColorBlastActivation(await manifest())).toMatchObject({activated:0,conflicts:24});
  expect(state.products).toEqual([]);expect(state.variants).toEqual([]);expect(state.journal).toBeNull();
 });
 it('does not reactivate or overwrite a later staff edit when a completed request is replayed',async()=>{
  const api=await service(),input=await manifest();await api.applyColorBlastActivation(input);
  state.products.find(product=>product.id==='cb-hoodie').active=false;
  expect(await api.applyColorBlastActivation(input)).toMatchObject({activated:0,already:24});
  expect(state.products.find(product=>product.id==='cb-hoodie').active).toBe(false);expect(state.variants).toHaveLength(187);
 });
 it('rejects request reuse with changed validity instead of silently accepting altered authority',async()=>{
  const api=await service(),input=await manifest();await api.applyColorBlastActivation(input);
  expect(await api.applyColorBlastActivation({...input,expires_at:new Date(Date.now()+7200000).toISOString()})).toMatchObject({activated:0,conflicts:24});
 });
 it('rolls back product insertion if variant insertion is interrupted',async()=>{
  state.variantFailure=true;const api=await service();await expect(api.applyColorBlastActivation(await manifest())).rejects.toThrow('fixture database interruption');
  expect(state.products).toEqual([]);expect(state.journal).toBeNull();expect(state.queries).toContain('ROLLBACK');
 });
 it('does nothing after expiry',async()=>{
  const api=await service(),input=await manifest();input.requested_at=new Date(Date.now()-7200000).toISOString();input.expires_at=new Date(Date.now()-3600000).toISOString();
  expect(await api.applyColorBlastActivation(input)).toMatchObject({expired:true,activated:0});expect(state.queries).toEqual([]);
 });
 it.each(['collection_hash','source_request','targets','price','expires_at'])('rejects forged or broadened %s authority before touching storage',async field=>{
  const api=await service(),input:any=await manifest();
  if(field==='targets')input.targets[0]={id:'p1',expected_absent:true};else if(field==='price')input.price=1;else if(field==='expires_at')input.expires_at=new Date(Date.now()+86400000).toISOString();else input[field]='forged';
  await expect(api.applyColorBlastActivation(input)).rejects.toThrow();expect(state.queries).toEqual([]);
 });
});
