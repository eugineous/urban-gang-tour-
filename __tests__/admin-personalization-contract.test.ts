import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),authorized:true,perm:true,audit:vi.fn()}));
vi.mock('@/lib/server/db',()=>({db:()=>({}),hasDb:()=>true,q:state.q}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.authorized,isSuperAdmin:()=>false,isAdmin:()=>state.authorized,hasPerm:()=>state.perm,adminActor:()=> 'fixture-admin'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:state.audit,createNumberedDocument:vi.fn(),LEAD_STAGES:[],DEFAULT_CHECKLIST_TEMPLATE:[]}));
vi.mock('@/lib/server/marketplace',()=>({getCommissionPercent:vi.fn(),setCommissionPercent:vi.fn(),sendOrganizerNotification:vi.fn(),ensureMarketplaceColumns:vi.fn()}));
vi.mock('@/lib/server/paystack',()=>({paystackCreateSubaccount:vi.fn()}));
vi.mock('@/lib/server/alert',()=>({alertCritical:vi.fn()}));
vi.mock('@/lib/server/client-errors',()=>({listClientErrors:vi.fn()}));
vi.mock('@/lib/server/indexnow',()=>({pingIndexNow:vi.fn()}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:vi.fn()}));
import {POST} from '@/app/api/admin/ops/route';
const base={name:'Rails Tee',price:1500,active:false};
const request=(data:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'product.save',data})});
beforeEach(()=>{
 vi.clearAllMocks();state.authorized=true;state.perm=true;
 state.q.mockImplementation(async(sql:string,params:unknown[])=>sql.includes('RETURNING *')?[{id:'rails-tee',name_on_back_enabled:params[10]===true}]:[]);
});
describe('administrator product printing opt-in',()=>{
 it('requires an authenticated products administrator',async()=>{
  state.authorized=false;expect((await POST(request({...base,nameOnBackEnabled:true}))).status).toBe(401);
  state.authorized=true;state.perm=false;expect((await POST(request({...base,nameOnBackEnabled:true}))).status).toBe(403);
  expect(state.q).not.toHaveBeenCalled();
 });
 it('accepts a boolean eligibility setting and records it in the existing product audit',async()=>{
  const response=await POST(request({...base,nameOnBackEnabled:true}));expect(response.status).toBe(200);
  const insert=state.q.mock.calls.find(([sql])=>sql.includes('INSERT INTO products '));
  expect(insert![1][10]).toBe(true);expect(insert![0]).toContain('name_on_back_enabled');
  expect(state.audit).toHaveBeenCalledWith('ops.product.save',expect.objectContaining({nameOnBackEnabled:true}));
 });
 it('does not infer eligibility from a product title and uses false for an omitted new setting',async()=>{
  expect((await POST(request({...base,name:'Free Name on Back Rails Tee'}))).status).toBe(200);
  const insert=state.q.mock.calls.find(([sql])=>sql.includes('INSERT INTO products '));
  expect(insert![1][10]).toBeNull();expect(insert![0]).toContain('COALESCE($11::boolean,false)');
 });
 it('preserves an existing eligibility setting when an older product editor omits it',async()=>{
  expect((await POST(request({...base,id:'rails-tee'}))).status).toBe(200);
  const update=state.q.mock.calls.find(([sql])=>sql.includes('UPDATE products SET'));
  expect(update![1][10]).toBeNull();expect(update![0]).toContain('name_on_back_enabled=COALESCE($11::boolean,name_on_back_enabled)');
 });
 it('rejects browser strings and unknown commercial fields',async()=>{
  const response=await POST(request({...base,nameOnBackEnabled:'true'}));
  expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'invalid_personalization_eligibility'});
  expect((await POST(request({...base,printingPrice:0}))).status).toBe(400);
  expect(state.q).not.toHaveBeenCalled();
 });
});
