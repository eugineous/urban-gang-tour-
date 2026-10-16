import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({admin:true,perm:true,origin:true,q:vi.fn(),audit:vi.fn(),bump:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true,db:()=>{throw new Error('Do not allocate a Pool for existence checks')}}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:state.audit}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.admin,isAdmin:()=>state.admin,isSuperAdmin:()=>true,hasPerm:(_req:Request,key:string)=>state.perm&&key==='events',adminActor:()=> 'fixture-owner'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>state.origin}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:state.bump}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:()=>{}}));
import {POST} from '@/app/api/admin/ops/route';
import {changeEventStatus} from '@/lib/server/admin-event-status';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const partner={...EMPTY_PARTNER,organizer:'Actual organiser',client:'Sherehe Vibes Africa',role:'Event hosting',ticketUrl:'https://tickets.example/event'};
const data={kind:'partner',name:'Partner fixture',status:'published',eventDate:'2026-11-06',venue:'Real venue',image:'/media/admin-events/original.jpg',partnerDetails:partner,tiers:[{name:'Forged UGT ticket',price:50}]};
const request=(value:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'tourEvent.save',data:value})});
beforeEach(()=>{vi.clearAllMocks();state.admin=true;state.perm=true;state.origin=true;state.q.mockReset().mockImplementation(async(sql:string)=>sql.startsWith('INSERT INTO tour_events')?[{id:'partner-fixture',slug:'partner-fixture'}]:[])});
it('enforces admin, Events permission and Origin before database writes',async()=>{
  state.admin=false;expect((await POST(request(data))).status).toBe(401);
  state.admin=true;state.perm=false;expect((await POST(request(data))).status).toBe(403);
  state.perm=true;state.origin=false;expect((await POST(request(data))).status).toBe(403);
  expect(state.q).not.toHaveBeenCalled();
});
it('saves credited metadata but strips all local ticket tiers',async()=>{
  const result=await POST(request(data));expect(result.status).toBe(200);
  const [sql,params]=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO tour_events'))!;
  expect(sql).toContain('partner_details');expect(params[13]).toBe('[]');expect(JSON.parse(params[16])).toEqual(partner);
  expect(state.audit).toHaveBeenCalledWith('ops.tourEvent.save',expect.objectContaining({kind:'partner'}));expect(state.bump).toHaveBeenCalledWith('partner-fixture');
});
it('can publish an external listing before the seller is confirmed without creating local tiers',async()=>{
  const result=await POST(request({...data,partnerDetails:{...partner,ticketUrl:''}}));expect(result.status).toBe(200);const params=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO tour_events'))![1];expect(params[13]).toBe('[]');expect(JSON.parse(params[16]).ticketUrl).toBe('');
});
it('allows incomplete drafts and genuinely free listings without a seller',async()=>{
  expect((await POST(request({...data,status:'draft',image:'',eventDate:null,partnerDetails:EMPTY_PARTNER}))).status).toBe(200);
  expect((await POST(request({...data,partnerDetails:{...partner,admission:'free',ticketUrl:''}}))).status).toBe(200);
});
it('rejects unsafe URLs or unrecognised partner metadata before writing',async()=>{
  for(const details of [{...partner,internalNotes:'private'},{...partner,ticketUrl:'javascript:alert(1)'},{...partner,posters:[{url:'data:image/png;base64,AAAA',caption:'Unsafe'}]}])expect((await POST(request({...data,partnerDetails:details}))).status).toBe(400);
  expect(state.q).not.toHaveBeenCalled();
});
it('preserves partner fields during an existing record priority update',async()=>{
  state.q.mockResolvedValueOnce([{kind:'partner',event_date:'2026-11-06'}]).mockResolvedValueOnce([{id:'partner-fixture'}]);
  expect((await POST(request({...data,id:'partner-fixture',priority:20}))).status).toBe(200);
  const [sql,params]=state.q.mock.calls[1];expect(sql).toContain('partner_details=$17::jsonb');expect(sql).toContain('AND kind=$1');expect(params[10]).toBe(20);expect(JSON.parse(params[16])).toEqual(partner);
});
it('cannot convert existing Urban Gang ticket inventory into a partner record',async()=>{
  state.q.mockResolvedValueOnce([{kind:'ticketed',event_date:'2026-11-06'}]);
  const result=await POST(request({...data,id:'owned-show'}));expect(result.status).toBe(400);expect(await result.json()).toMatchObject({error:'event_kind_immutable'});expect(state.q).toHaveBeenCalledTimes(1);
});
it('can publish a partner announcement with incomplete optional details',async()=>{
  const row={id:'partner',kind:'partner',status:'draft',name:'Draft partner',event_date:null,venue:'',image:'',partner_details:EMPTY_PARTNER};
  state.q.mockResolvedValueOnce([row]).mockResolvedValueOnce([{...row,status:'announced'}]);
  expect(await changeEventStatus({id:'partner',status:'announced',expectedStatus:'draft',updatedAt:'2026-10-15T10:00:00Z'},'fixture-owner')).toMatchObject({status:'announced'});expect(state.q).toHaveBeenCalledTimes(2);
});
it('still rejects unsafe supplied artwork instead of treating optional as unvalidated',async()=>{
 const result=await POST(request({...data,image:'javascript:alert(1)',partnerDetails:{...partner,admission:'free',ticketUrl:''}}));
 expect(result.status).toBe(400);expect(await result.json()).toMatchObject({error:'invalid_partner_artwork',fields:[{field:'image'}]});expect(state.q).not.toHaveBeenCalled();
});
it('returns exact blockers through the quick status endpoint too',async()=>{
 state.q.mockResolvedValueOnce([{id:'partner',kind:'partner',status:'pending_review',name:'Entered partner',event_date:'2026-11-08',venue:'Main campus',image:'javascript:alert(1)',partner_details:{...partner,admission:'free',ticketUrl:''}}]);
 const req=new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'tourEvent.status',data:{id:'partner',status:'published',expectedStatus:'pending_review',updatedAt:'2026-10-16T00:00:00Z'}})});
 const response=await POST(req);expect(response.status).toBe(400);expect(await response.json()).toMatchObject({error:'invalid_partner_artwork',fields:[{field:'image'}]});expect(state.q).toHaveBeenCalledTimes(1);
});
it('guards an entered edit against a newer saved version',async()=>{
 state.q.mockResolvedValueOnce([{kind:'partner',event_date:'2026-11-06'}]).mockResolvedValueOnce([]);
 const response=await POST(request({...data,id:'partner-fixture',updatedAt:'2026-10-16 00:00:00.123456+00'}));
 expect(response.status).toBe(409);expect(await response.json()).toMatchObject({error:'event_conflict'});expect(state.q.mock.calls[1][0]).toContain('updated_at=$18::timestamptz');expect(state.q.mock.calls[1][1][17]).toBe('2026-10-16 00:00:00.123456+00');
});
