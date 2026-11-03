import {beforeEach,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:f.q,hasDb:()=>true,db:()=>null}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,hasPerm:()=>true,isAdmin:()=>true,isSuperAdmin:()=>true,adminActor:()=> 'fixture-admin'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
vi.mock('@/lib/server/notify',()=>({notifyPostPublished:vi.fn()}));
vi.mock('@/lib/server/indexnow',()=>({pingIndexNow:vi.fn()}));
import {POST} from '@/app/api/admin/save/route';
const save=(status:string,expectedStatus='paid')=>POST(new Request('https://example.invalid/api/admin/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'orderStatus',data:{id:'fixture',status,expectedStatus}})}));
beforeEach(()=>f.q.mockReset());
it('cannot invent a paid outcome or terminal failure',async()=>{
 for(const status of ['paid','failed','declined']){
  f.q.mockReset().mockResolvedValue([{status:'pending'}]);
  expect((await save(status,'pending')).status).toBe(409);
  expect(f.q).toHaveBeenCalledTimes(1);
 }
});
it('rejects stale staff state before mutation',async()=>{
 f.q.mockResolvedValue([{status:'paid'}]);
 expect((await save('fulfilled','pending')).status).toBe(409);
 expect(f.q).toHaveBeenCalledTimes(1);
});
it('rejects a concurrent refund instead of overwriting it',async()=>{
 f.q.mockResolvedValueOnce([{status:'paid'}]).mockResolvedValueOnce([]);
 expect((await save('fulfilled')).status).toBe(409);
 const [sql,args]=f.q.mock.calls[1];
 expect(sql).toContain('WHERE id=$1 AND status=$3');
 expect(sql).toContain("SELECT 'admin','order_status',$4 FROM changed");
 expect(args.slice(0,3)).toEqual(['fixture','fulfilled','paid']);
 expect(f.q).toHaveBeenCalledTimes(2);
});
it('commits legitimate fulfillment and its audit together',async()=>{
 f.q.mockResolvedValueOnce([{status:'paid'}]).mockResolvedValueOnce([{id:'fixture'}]);
 expect((await save('fulfilled')).status).toBe(200);
 expect(f.q).toHaveBeenCalledTimes(2);
});
it('audit storage failure cannot report success',async()=>{
 f.q.mockResolvedValueOnce([{status:'paid'}]).mockRejectedValueOnce(new Error('fixture audit unavailable'));
 expect((await save('fulfilled')).status).toBe(500);
 expect(f.q).toHaveBeenCalledTimes(2);
});
