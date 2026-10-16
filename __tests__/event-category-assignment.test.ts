import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn(),allowed:true,write:true,existingCategory:'category-fixture'}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/event-categories',()=>({ensureEventCategorySchema:state.schema}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,isAdmin:()=>true,isSuperAdmin:()=>true,hasPerm:()=>true,adminActor:()=> 'fixture-editor'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:vi.fn()}));
vi.mock('next/server',async original=>({...await original<object>(),after:()=>{}}));
import {POST} from '@/app/api/admin/ops/route';
const save=(data:Record<string,unknown>)=>POST(new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'tourEvent.save',data:{kind:'school',name:'Fixture school',status:'announced',tiers:[],...data}})}));
beforeEach(()=>{vi.clearAllMocks();state.allowed=true;state.write=true;state.existingCategory='category-fixture';state.schema.mockResolvedValue(undefined);state.q.mockImplementation(async(sql:string,args:unknown[]=[])=>{
 if(sql.startsWith('SELECT id FROM event_categories'))return state.allowed?[{id:args[0]}]:[];
 if(sql.startsWith('SELECT event_date'))return [{kind:'school',event_date:null,category_id:state.existingCategory}];
 if(sql.startsWith('INSERT INTO tour_events')||sql.startsWith('UPDATE tour_events'))return state.write?[{id:'fixture',kind:'school',name:'Fixture school',status:'announced'}]:[];
 return [];
})});
it('assigns a category on creation without changing commercial kind or tiers',async()=>{
 expect((await save({categoryId:'category-fixture'})).status).toBe(200);const [sql,args]=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO tour_events'))!;expect(sql).toContain('category_id');expect(sql).toContain('WHERE $18::text IS NULL OR EXISTS');expect(args[17]).toBe('category-fixture');expect(args[0]).toBe('school');expect(args[13]).toBe('[]');
});
it('preserves the exact event version guard while changing or clearing a category',async()=>{
 for(const categoryId of ['category-fixture',null]){state.q.mockClear();expect((await save({id:'fixture',updatedAt:'2026-10-16 10:00:00.123456+00',categoryId})).status).toBe(200);const [sql,args]=state.q.mock.calls.find(([sql])=>sql.startsWith('UPDATE tour_events'))!;expect(sql).toContain('updated_at=$18::timestamptz');expect(sql).toContain('category_id=$19::text');expect(args[17]).toBe('2026-10-16 10:00:00.123456+00');expect(args[18]).toBe(categoryId)}
});
it('leaves assignments untouched when a legacy save omits the new field',async()=>{
 expect((await save({id:'fixture'})).status).toBe(200);const [sql,args]=state.q.mock.calls.find(([sql])=>sql.startsWith('UPDATE tour_events'))!;expect(sql).not.toContain('category_id=');expect(args).toHaveLength(18);expect(state.schema).not.toHaveBeenCalled();
});
it('rejects malformed and unavailable categories without writing an event',async()=>{
 expect((await save({categoryId:{id:'forged'}})).status).toBe(400);expect(state.schema).not.toHaveBeenCalled();state.allowed=false;expect((await save({categoryId:'category-paused'})).status).toBe(400);expect(state.q.mock.calls.some(([sql])=>sql.startsWith('INSERT INTO tour_events'))).toBe(false);
});
it('guards the write too if a category becomes unavailable after preflight',async()=>{
 state.write=false;expect((await save({categoryId:'category-fixture'})).status).toBe(400);expect((await save({id:'fixture',categoryId:'category-fixture'})).status).toBe(409);
});
