import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({release:vi.fn(),library:vi.fn(),artwork:vi.fn(),retirement:vi.fn(),activation:vi.fn(),heartbeat:vi.fn(),storeGet:vi.fn(),storePut:vi.fn(),after:vi.fn(),ping:vi.fn()}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:state.after}));
vi.mock('@/lib/server/indexnow',()=>({pingIndexNow:state.ping}));
vi.mock('@/lib/server/editorial',()=>({releaseDueEditorial:state.release,importEditorial:vi.fn()}));
vi.mock('@/lib/server/editorial-library',()=>({importStagedEditorialLibrary:state.library,recordEditorialHeartbeat:state.heartbeat,applyStagedOwnerEditorialApproval:async()=>({staged:false}),applyStagedEditorialCompletion:async()=>({staged:false}),applyStagedStoryArtwork:state.artwork,applyStagedLegacyMerchRetirement:state.retirement,applyStagedColorBlastActivation:state.activation}));
import {POST} from '@/app/api/internal/cron/editorial/route';
import {cached,invalidate} from '@/lib/server/microcache';
const req=(secret='')=>new Request('https://urbangangtour.co.ke/api/internal/cron/editorial',{method:'POST',headers:{'x-ugt-cron':secret}});
beforeEach(()=>{vi.stubEnv('UGT_CRON_SECRET','fixture-secret-not-real');state.release.mockReset().mockResolvedValue({released:0,held:10});state.library.mockReset().mockResolvedValue({staged:false});state.artwork.mockReset().mockResolvedValue({staged:false});state.retirement.mockReset().mockResolvedValue({staged:false});state.activation.mockReset().mockResolvedValue({staged:false});state.heartbeat.mockReset().mockResolvedValue(undefined);state.after.mockReset();state.ping.mockReset().mockResolvedValue(undefined)});
it('never treats a URL or missing/wrong credential as scheduler authority',async()=>{
 expect((await POST(req())).status).toBe(401);expect((await POST(req('wrong'))).status).toBe(401);expect(state.release).not.toHaveBeenCalled();expect(state.artwork).not.toHaveBeenCalled();expect(state.retirement).not.toHaveBeenCalled();expect(state.activation).not.toHaveBeenCalled();vi.stubEnv('UGT_CRON_SECRET','');expect((await POST(req())).status).toBe(503);
});
it('records private monitoring without attempting research or social publishing',async()=>{
 const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toContain('no-store');expect(state.library).toHaveBeenCalledTimes(1);expect(state.artwork).toHaveBeenCalledOnce();expect(state.retirement).toHaveBeenCalledOnce();expect(state.activation).toHaveBeenCalledOnce();expect(state.heartbeat).toHaveBeenCalledWith({ok:true,released:0,held:10,library:{staged:false},completion:{staged:false},ownerApproval:{staged:false},artwork:{staged:false},merchRetirement:{staged:false},colourBlastActivation:{staged:false}});
 expect(state.after).not.toHaveBeenCalled();expect(state.ping).not.toHaveBeenCalled();
});
it('makes committed releases visible immediately through the cached summary reader',async()=>{
 invalidate('blog-published-post-summaries');
 await cached('blog-published-post-summaries',1000,async()=>[] as string[]);
 state.release.mockResolvedValue({released:1,held:0,releasedSlugs:['public-guide']});
 expect((await POST(req('fixture-secret-not-real'))).status).toBe(200);
 expect(await cached('blog-published-post-summaries',1000,async()=>['public-guide'])).toEqual(['public-guide']);
});
it('holds on database failure and never leaks connection details',async()=>{
 state.release.mockRejectedValue(Error('postgres://private'));const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(503);expect(await response.text()).not.toContain('postgres');expect(state.heartbeat).toHaveBeenCalledWith({ok:false,error:'editorial_check_failed'});
 expect(state.after).not.toHaveBeenCalled();expect(state.ping).not.toHaveBeenCalled();
});
it('queues only committed valid article paths and preserves the private count-only contract',async()=>{
 state.release.mockResolvedValue({released:2,held:1,releasedSlugs:['public-guide','another-guide','../private-editorial','draft?secret=fixture']});
 const response=await POST(req('fixture-secret-not-real'));
 expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,released:2,held:1,library:{staged:false},completion:{staged:false},ownerApproval:{staged:false},artwork:{staged:false},merchRetirement:{staged:false},colourBlastActivation:{staged:false}});
 expect(state.ping).not.toHaveBeenCalled();expect(state.after).toHaveBeenCalledOnce();
 await (state.after.mock.calls[0][0] as ()=>Promise<void>)();
 expect(state.ping).toHaveBeenCalledWith(['/','/blog','/blog/public-guide','/blog/another-guide']);
 expect(state.heartbeat).toHaveBeenCalledWith({ok:true,released:2,held:1,library:{staged:false},completion:{staged:false},ownerApproval:{staged:false},artwork:{staged:false},merchRetirement:{staged:false},colourBlastActivation:{staged:false}});
});
it('does not queue a hint for an empty release or a malformed internal path',async()=>{
 state.release.mockResolvedValue({released:0,held:2,releasedSlugs:[]});
 expect((await POST(req('fixture-secret-not-real'))).status).toBe(200);
 state.release.mockResolvedValue({released:0,held:2,releasedSlugs:['/api/private','https://example.org/private']});
 expect((await POST(req('fixture-secret-not-real'))).status).toBe(200);
 state.release.mockResolvedValue({released:0,held:2,releasedSlugs:['not-a-committed-release']});
 expect((await POST(req('fixture-secret-not-real'))).status).toBe(200);
 expect(state.after).not.toHaveBeenCalled();expect(state.ping).not.toHaveBeenCalled();
});
it('keeps an accepted release successful when background registration fails',async()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 state.release.mockResolvedValue({released:1,held:0,releasedSlugs:['public-guide']});state.after.mockImplementation(()=>{throw Error('platform background unavailable')});
 const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(200);expect((await response.json()).released).toBe(1);
 expect(warn).toHaveBeenCalledWith('[editorial-indexing] background notification unavailable');expect(state.heartbeat).toHaveBeenCalledWith(expect.objectContaining({ok:true,released:1}));expect(state.ping).not.toHaveBeenCalled();warn.mockRestore();
});
it('contains notification failure after commit without changing publication monitoring',async()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 state.release.mockResolvedValue({released:1,held:0,releasedSlugs:['public-guide']});state.ping.mockRejectedValue(Error('provider payload must stay private'));
 const response=await POST(req('fixture-secret-not-real'));expect(response.status).toBe(200);
 await expect((state.after.mock.calls[0][0] as ()=>Promise<void>)()).resolves.toBeUndefined();
 expect(warn).toHaveBeenCalledWith('[editorial-indexing] crawl notification unavailable');expect(state.heartbeat).toHaveBeenCalledWith(expect.objectContaining({ok:true,released:1}));warn.mockRestore();
});
