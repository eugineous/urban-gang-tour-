import {afterEach,it,expect,vi} from 'vitest';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
it('aborts a stalled request instead of leaving an auth or payment screen working forever',async()=>{
 vi.useFakeTimers();vi.stubGlobal('fetch',(_input:any,init:any)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(init.signal.reason))));
 const result=fetchWithTimeout('/api/example',{},12000).catch(e=>e);
 await vi.advanceTimersByTimeAsync(12000);
 expect((await result).name).toBe('TimeoutError');
});
it('preserves caller cancellation and clears the request timer',async()=>{
 vi.useFakeTimers();const parent=new AbortController();let child:AbortSignal;
 vi.stubGlobal('fetch',(_input:any,init:any)=>{child=init.signal;return new Promise((_resolve,reject)=>child.addEventListener('abort',()=>reject(child.reason)))});
 const result=fetchWithTimeout('/api/example',{signal:parent.signal}).catch(e=>e);
 parent.abort();expect((await result).name).toBe('AbortError');expect(vi.getTimerCount()).toBe(0);
});
