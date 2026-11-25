import {afterEach,expect,it,vi} from 'vitest';
// @ts-expect-error The Worker wrapper is an unbundled ES module.
import {createWorker} from '../worker-runtime.mjs';
afterEach(()=>vi.restoreAllMocks());
const names=['payment-reconcile','urban-news','ticket-sweeper','editorial','email-delivery','content-announcements'];
const worker=createWorker({fetch:async()=>new Response('fixture')});
it('reports failed scheduled HTTP responses without exposing their bodies or replaying jobs',async()=>{
 const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const fetch=vi.fn(async(_request:Request)=>new Response('private customer/database detail',{status:503}));
 await expect(worker.scheduled({}, {UGT_CRON_SECRET:'fictional-secret',WORKER_SELF_REFERENCE:{fetch}})).rejects.toThrow('scheduled_job_failed');
 expect(fetch).toHaveBeenCalledTimes(names.length);
 for(const [index,name]of names.entries()){
  const request=fetch.mock.calls[index][0] as Request;
  expect(new URL(request.url).pathname).toBe('/api/internal/cron/'+name);
  expect(request.method).toBe('POST');expect(request.headers.get('x-ugt-cron')).toBe('fictional-secret');
  expect(warning).toHaveBeenCalledWith('[scheduled-job]',name,'http_failure',503);
 }
 expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private customer|fictional-secret/);
});
it('keeps all other natural dispatches when one transport throws, without raw errors',async()=>{
 const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const fetch=vi.fn((request:Request)=>{if(request.url.endsWith('/ticket-sweeper'))throw Error('private driver detail');return Promise.resolve(new Response('ok'));});
 await expect(worker.scheduled({}, {UGT_CRON_SECRET:'fictional-secret',WORKER_SELF_REFERENCE:{fetch}})).rejects.toThrow('scheduled_job_failed');
 expect(fetch).toHaveBeenCalledTimes(names.length);
 expect(warning).toHaveBeenCalledTimes(1);expect(warning).toHaveBeenCalledWith('[scheduled-job]','ticket-sweeper','transport_failure');
 expect(JSON.stringify(warning.mock.calls)).not.toContain('private driver');
});
it('does not dispatch when scheduled authorization is not configured',async()=>{
 const fetch=vi.fn(),waitUntil=vi.fn();await worker.scheduled({}, {WORKER_SELF_REFERENCE:{fetch}},{waitUntil});
 expect(fetch).not.toHaveBeenCalled();expect(waitUntil).not.toHaveBeenCalled();
});

it('bounds concurrent self-requests and waits for downstream work to finish',async()=>{
 let open=0,peak=0,complete=0;
 const fetch=vi.fn(async()=>{open++;peak=Math.max(peak,open);await new Promise(r=>setTimeout(r,5));open--;complete++;return new Response('ok')});
 await worker.scheduled({}, {UGT_CRON_SECRET:'fixture',WORKER_SELF_REFERENCE:{fetch}});
 expect(peak).toBe(2);expect(complete).toBe(names.length);
});
