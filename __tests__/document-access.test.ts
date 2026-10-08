import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({admin:vi.fn(),perm:vi.fn(),organizer:vi.fn(),q:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:mocks.admin,hasPerm:mocks.perm}));
vi.mock('@/lib/server/organizer-session',()=>({currentApprovedOrganizer:mocks.organizer}));
vi.mock('@/lib/server/db',()=>({q:mocks.q,db:()=>({})}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'test'}));
vi.mock('@/lib/server/origin',()=>({sameOrigin:()=>true}));
vi.mock('@/lib/server/tickets',()=>({codeAuthentic:()=>true}));
import {GET} from '@/app/api/admin/tickets/[code]/holder/route';
import {PUT} from '@/app/api/organizer/events/[id]/design/route';
beforeEach(()=>{vi.clearAllMocks();mocks.admin.mockResolvedValue(false);mocks.perm.mockReturnValue(false);mocks.q.mockResolvedValue([])});
describe('private document boundaries',()=>{
 it('never queries contact information for anonymous or unauthorized staff',async()=>{const args={params:Promise.resolve({code:'code'})};expect((await GET(new Request('https://example.com'),args)).status).toBe(401);mocks.admin.mockResolvedValue(true);expect((await GET(new Request('https://example.com'),args)).status).toBe(403);expect(mocks.q).not.toHaveBeenCalled()});
 it('scopes design writes to the approved organizer and hides other events',async()=>{mocks.organizer.mockResolvedValue({organizer:{id:'owner'},status:200});const req=new Request('https://example.com',{method:'PUT',body:JSON.stringify({design:'summer',name:'Sample',accent:'#123456'})});expect((await PUT(req,{params:Promise.resolve({id:'someone-elses-event'})})).status).toBe(404);expect(mocks.q.mock.calls[0][0]).toContain('organizer_id=$3');expect(mocks.q.mock.calls[0][1][2]).toBe('owner')});
 it('rejects organizer price and status tampering before writing',async()=>{mocks.organizer.mockResolvedValue({organizer:{id:'owner'},status:200});const req=new Request('https://example.com',{method:'PUT',body:JSON.stringify({design:'summer',name:'Sample',accent:'#123456',status:'paid'})});expect((await PUT(req,{params:Promise.resolve({id:'event'})})).status).toBe(400);expect(mocks.q).not.toHaveBeenCalled()});
});
