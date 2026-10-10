import {beforeEach,expect,it,vi} from 'vitest';
const query=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/db',()=>({q:query,hasDb:()=>true}));
vi.mock('@/lib/server/session',()=>({currentUser:()=>null}));
beforeEach(()=>{vi.resetModules();query.mockReset()});
it('initializes buyer session columns once across concurrent and subsequent requests',async()=>{
  query.mockResolvedValue([]);const {ensureBuyerSessionSchema}=await import('@/lib/server/customer-account');
  await Promise.all([ensureBuyerSessionSchema(),ensureBuyerSessionSchema(),ensureBuyerSessionSchema()]);await ensureBuyerSessionSchema();
  expect(query).toHaveBeenCalledTimes(1);
});
it('retries failed migrations instead of retaining a rejected initialization forever',async()=>{
  query.mockRejectedValueOnce(new Error('temporary database error')).mockResolvedValue([]);
  const {ensureBuyerSessionSchema}=await import('@/lib/server/customer-account');
  await expect(ensureBuyerSessionSchema()).rejects.toThrow('temporary');await expect(ensureBuyerSessionSchema()).resolves.toBeUndefined();expect(query).toHaveBeenCalledTimes(2);
});
