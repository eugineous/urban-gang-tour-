import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({admin:true,perm:true,origin:true,limit:true,db:true,list:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.admin,hasPerm:(_req:Request,key:string)=>state.perm&&key==='events',adminActor:()=> 'fixture-editor'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>state.origin}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.db}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>state.limit,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/event-categories',()=>({listEventCategories:state.list,saveEventCategory:state.save}));
import {GET,POST} from '@/app/api/admin/event-categories/route';
import {parseEventCategory,categoryId,publicEventCategory} from '@/lib/event-categories';
const row={id:'category-fixture',name:'Campus events',active:true,version:1};
const req=(body:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/event-categories',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();state.admin=true;state.perm=true;state.origin=true;state.limit=true;state.db=true;state.list.mockResolvedValue([row]);state.save.mockResolvedValue(row)});
it('requires a real session and Events permission for reads and writes',async()=>{
 state.admin=false;for(const response of [await GET(req({})),await POST(req({action:'create',name:'Campus'}))]){expect(response.status).toBe(401);expect(response.headers.get('cache-control')).toContain('no-store')}
 state.admin=true;state.perm=false;expect((await GET(req({}))).status).toBe(403);expect((await POST(req({action:'create',name:'Campus'}))).status).toBe(403);expect(state.list).not.toHaveBeenCalled();expect(state.save).not.toHaveBeenCalled();
});
it('enforces Origin, rate limits and database availability before work',async()=>{
 state.origin=false;expect((await POST(req({action:'create',name:'Campus'}))).status).toBe(403);state.origin=true;state.limit=false;expect((await POST(req({action:'create',name:'Campus'}))).status).toBe(429);state.limit=true;state.db=false;expect((await GET(req({}))).status).toBe(503);expect(state.save).not.toHaveBeenCalled();expect(state.list).not.toHaveBeenCalled();
});
it('normalises a name and confirms only the returned saved row',async()=>{
 const response=await POST(req({action:'create',name:'  Campus   events  '}));expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,row});expect(state.save).toHaveBeenCalledWith({action:'create',name:'Campus events'},'fixture-editor');expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('returns private category lists and keeps driver details out of failures',async()=>{
 expect(await (await GET(req({}))).json()).toEqual({ok:true,rows:[row]});state.list.mockRejectedValue(Error('password=private'));const response=await GET(req({}));expect(response.status).toBe(503);expect(await response.text()).not.toContain('password');
});
it('returns conflicts rather than silently merging stale or duplicate names',async()=>{
 for(const error of [Error('category_conflict'),Error('category_exists'),Object.assign(Error('private database text'),{code:'23505'})]){state.save.mockRejectedValueOnce(error);const response=await POST(req({action:'create',name:'Campus'}));expect(response.status).toBe(409);expect(await response.text()).not.toContain('private database text')}
});
it('rejects oversized, unknown-field, malformed and bypass-shaped category payloads',async()=>{
 for(const data of [{action:'create',name:''},{action:'create',name:'X',role:'super_admin'},{action:'delete',name:'X'},{action:'update',id:'../admin',name:'X',active:true,version:1},{action:'update',id:row.id,name:'X',active:'yes',version:1},{action:'update',id:row.id,name:'X',active:true,version:0},{action:'create',name:'X\nY'}])expect((await POST(req(data))).status).toBe(400);
 expect((await POST(req({action:'create',name:'X'.repeat(5000)}))).status).toBe(413);expect(state.save).not.toHaveBeenCalled();
});
it('validates stable IDs and only publishes id/name category fields',()=>{
 expect(categoryId('category-test')).toBe(true);expect(categoryId('../admin')).toBe(false);expect(parseEventCategory({action:'update',...row})).toEqual({action:'update',...row});expect(publicEventCategory({...row,privateNote:'not public'})).toEqual({id:row.id,name:row.name});expect(publicEventCategory({id:'unsafe/value',name:'X'})).toBeNull();
});
