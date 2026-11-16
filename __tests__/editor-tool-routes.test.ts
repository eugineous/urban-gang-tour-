import {beforeEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({session:false,owner:false,origin:true,check:vi.fn(),upload:vi.fn(),draft:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.session,isSuperAdmin:()=>state.owner,adminActor:()=> 'fixture-owner'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>state.origin,sameOrigin:()=>state.origin}));
vi.mock('@/lib/server/editor-tools',async original=>({...await original<object>(),checkToolCredential:state.check,uploadToolPoster:state.upload,createToolDraft:state.draft}));
import {POST as issue,GET,DELETE} from '@/app/api/admin/connected-tools/route';
import {POST as poster} from '@/app/api/editor-tools/posters/route';
import {POST as draft} from '@/app/api/editor-tools/drafts/route';
beforeEach(()=>{state.session=false;state.owner=false;state.origin=true;vi.clearAllMocks()});
const request=(body:unknown,headers={})=>new Request('https://urbangangtour.co.ke/api/editor-tools/drafts',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
it('rejects bearer credentials and crew sessions on owner management',async()=>{
 for(const session of [false,true]){state.session=session;for(const route of [issue,GET,DELETE])expect((await route(request({}))).status).toBe(401)}
});
it('requires Origin for owner mutations',async()=>{
 state.session=true;state.owner=true;state.origin=false;expect((await issue(request({}))).status).toBe(403);expect((await DELETE(request({}))).status).toBe(403);
});
it('never grants editor operations to cookie sessions or malformed bearers',async()=>{
 state.session=true;state.owner=true;
 expect((await draft(request({}))).status).toBe(401);expect((await poster(request({}))).status).toBe(401);expect(state.check).not.toHaveBeenCalled();
});
it('preflights credential/scope before reading image data or performing side effects',async()=>{
 state.check.mockRejectedValueOnce(new (await import('@/lib/server/editor-tools')).ToolError('invalid_credential_or_scope',401));
 const response=await poster(request({huge:'x'.repeat(100)},{authorization:'Bearer ugt_edit_'+'a'.repeat(43)}));
 expect(response.status).toBe(401);expect(state.upload).not.toHaveBeenCalled();
});
it('rejects foreign browser origins and authority escalation before writes',async()=>{
 const headers={authorization:'Bearer ugt_edit_'+'a'.repeat(43)};state.origin=false;
 expect((await draft(request({},headers))).status).toBe(403);state.origin=true;
 expect((await draft(request({requestId:'66320821-83a0-4ca7-a72c-825698117305',kind:'school',name:'Poster',status:'published'},headers))).status).toBe(400);
 expect(state.draft).not.toHaveBeenCalled();
});
