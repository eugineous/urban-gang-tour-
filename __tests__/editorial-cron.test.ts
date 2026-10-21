import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({release:vi.fn(),library:vi.fn(),heartbeat:vi.fn(),storeGet:vi.fn(),storePut:vi.fn()}));
vi.mock('@/lib/server/editorial',()=>({releaseDueEditorial:state.release,importEditorial:vi.fn()}));
vi.mock('@/lib/server/editorial-library',()=>({importStagedEditorialLibrary:state.library,recordEditorialHeartbeat:state.heartbeat,applyStagedOwnerEditorialApproval:async()=>({staged:false}),applyStagedEditorialCompletion:async()=>({staged:false})}));
import {POST} from '@/app/api/internal/cron/editorial/route';
const req=(secret='')=>new Request('https://urbangangtour.co.ke/api/internal/cron/editorial',{method:'POST',headers:{'x-ugt-cron':secret}});
beforeEach(()=>{vi.stubEnv('UGT_CRON_SECRET','fixture-secret-not-real');state.release.mockReset().mockResolvedValue({released:0,held:10});state.library.mockReset().mockResolvedValue({staged:false});state.heartbeat.mockReset().mockResolvedValue(undefined)});
it('never treats a URL or missing/wrong credential as scheduler authority',async()=>{
 expect((await POST(req())).status).toBe(401);expect((await POST(req('wrong'))).status).toBe(401);expect(state.release).not.toHaveBeenCalled();vi.stubEnv('UGT_CRON_SECRET','');expect((await POST(req())).status).toBe(503);
});
it('records private monitoring without attempting research or social publishing',async()=>{
 const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toContain('no-store');expect(state.library).toHaveBeenCalledTimes(1);expect(state.heartbeat).toHaveBeenCalledWith({ok:true,released:0,held:10,library:{staged:false},completion:{staged:false},ownerApproval:{staged:false}});
});
it('holds on database failure and never leaks connection details',async()=>{
 state.release.mockRejectedValue(Error('postgres://private'));const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(503);expect(await response.text()).not.toContain('postgres');expect(state.heartbeat).toHaveBeenCalledWith({ok:false,error:'editorial_check_failed'});
});
