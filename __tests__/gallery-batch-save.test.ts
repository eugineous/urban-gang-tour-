import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),admin:true,perm:true,media:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.admin,hasPerm:()=>state.perm,isSuperAdmin:()=>false,adminActor:()=> 'fixture'}));
vi.mock('@/lib/server/media',()=>({isMediaUrl:(v:string)=>v.startsWith('/media/gallery/'),mediaGet:state.media,mediaDel:vi.fn()}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:async()=>{}}));
import {POST} from '@/app/api/admin/gallery/route';
const req=()=>new Request('https://urbangangtour.co.ke/api/admin/gallery',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'upload',data:{url:'/media/gallery/fixture.png',category:'New category',width:100,height:200}})});
beforeEach(()=>{state.admin=true;state.perm=true;state.q.mockReset().mockImplementation(async(sql:string)=>sql.startsWith('SELECT COALESCE')?[{next:10}]:[{id:1,published:false}]);state.media.mockResolvedValue({})});
it('preserves auth and module permissions for batch upload records',async()=>{state.admin=false;expect((await POST(req())).status).toBe(401);state.admin=true;state.perm=false;expect((await POST(req())).status).toBe(403);expect(state.q).not.toHaveBeenCalled()});
it('uses the existing unique URL index for retry-safe saves without overwriting captions or publishing',async()=>{
 expect((await POST(req())).status).toBe(200);const [sql,args]=state.q.mock.calls.find(([s])=>s.startsWith('INSERT INTO gallery_photos'))!;
 expect(sql).toContain('ON CONFLICT (url) DO UPDATE SET url=EXCLUDED.url');expect(sql).not.toMatch(/published|DO UPDATE SET caption/);expect(args[2]).toBe('New category');
});
