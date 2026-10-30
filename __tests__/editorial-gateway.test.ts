import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({session:true,perm:true,owner:true,db:true,limited:false,q:vi.fn(),importer:vi.fn(),approve:vi.fn(),hold:vi.fn(),edit:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.db,q:state.q}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.session,hasPerm:()=>state.perm,isSuperAdmin:()=>state.owner,adminActor:()=> 'fixture@example.test'}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>!state.limited,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/editorial-schema',()=>({ensureEditorialSchema:async()=>{}}));
vi.mock('@/lib/server/editorial',()=>({importEditorial:state.importer,reviewEditorial:state.approve,holdEditorial:state.hold,updateEditorial:state.edit}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {GET,POST} from '@/app/api/admin/editorial/route';
import {cached,invalidate} from '@/lib/server/microcache';
const req=(body:unknown,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/admin/editorial',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{state.session=true;state.perm=true;state.owner=true;state.db=true;state.limited=false;state.q.mockReset().mockResolvedValue([]);state.importer.mockReset();state.approve.mockReset();state.hold.mockReset().mockResolvedValue([{slug:'fictional'}]);});
it('rejects unauthenticated reads and writes without invoking storage',async()=>{
 state.session=false;const response=await GET(new Request('https://urbangangtour.co.ke/api/admin/editorial'));expect(response.status).toBe(401);expect(response.headers.get('Cache-Control')).toContain('no-store');expect((await POST(req({action:'import'}))).status).toBe(401);expect(state.q).not.toHaveBeenCalled();expect(state.importer).not.toHaveBeenCalled();
});
it('allows Content readers, but not crew mutation or untrusted origins',async()=>{
 state.perm=false;expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/editorial'))).status).toBe(403);state.perm=true;state.owner=false;expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/editorial'))).status).toBe(200);expect((await POST(req({action:'hold',slug:'fictional',revision:1}))).status).toBe(403);state.owner=true;expect((await POST(req({action:'hold',slug:'fictional',revision:1},'https://attacker.test'))).status).toBe(403);
});
it('bounds streamed bytes, rate limits and rejects extra privileged keys',async()=>{
 expect((await POST(req({action:'hold',slug:'fictional',revision:1,published:true}))).status).toBe(400);
 expect((await POST(req({action:'import',bundle:'x'.repeat(2*1024*1024)}))).status).toBe(413);state.limited=true;expect((await POST(req({action:'hold',slug:'fictional',revision:1}))).status).toBe(429);expect(state.hold).not.toHaveBeenCalled();
});
it('returns actionable conflicts and does not leak database failure detail',async()=>{
 state.hold.mockResolvedValueOnce([]);expect((await POST(req({action:'hold',slug:'fictional',revision:1}))).status).toBe(409);
 state.hold.mockRejectedValueOnce(Error('postgres://sensitive-fixture'));const response=await POST(req({action:'hold',slug:'fictional',revision:1}));expect(response.status).toBe(503);expect(await response.text()).not.toContain('postgres');
});
it('withdraws an already-cached public summary immediately after a committed hold',async()=>{
 invalidate('blog-published-post-summaries');
 await cached('blog-published-post-summaries',1000,async()=>['previously-public']);
 expect((await POST(req({action:'hold',slug:'fictional',revision:1}))).status).toBe(200);
 expect(await cached('blog-published-post-summaries',1000,async()=>[])).toEqual([]);
});
it('does not accept a brief as a completed article during import',async()=>{
 const response=await POST(req({action:'import',bundle:{version:1,source_sha256:'a'.repeat(64),items:[{slug:'fixture',date:'2026-10-20',scheduled_at:'2026-10-20T06:07:00+03:00',title:'Fixture',section:'Analysis',description:'',author:'Fixture desk',kind:'article',markdown:'## Proposed structure\n\nCollect interviews.',image_prompt:'Original illustration',metadata:{}}]}}));expect(response.status).toBe(400);expect(state.importer).not.toHaveBeenCalled();
});
