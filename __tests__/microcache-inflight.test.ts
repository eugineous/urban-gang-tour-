import {afterEach,beforeEach,expect,it,vi} from 'vitest';

let cached:typeof import('@/lib/server/microcache').cached;
let invalidate:typeof import('@/lib/server/microcache').invalidate;

function deferred<T>(){
 let resolve!:(value:T)=>void;
 let reject!:(reason:Error)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});
 return {promise,resolve,reject};
}

beforeEach(async()=>{
 vi.useFakeTimers();vi.setSystemTime(0);vi.resetModules();
 ({cached,invalidate}=await import('@/lib/server/microcache'));
});
afterEach(()=>vi.useRealTimers());

// A TTL-only hit check starts duplicate reads while the first read is pending.
it('coalesces pending reads after their freshness deadline',async()=>{
 const read=deferred<string>();let calls=0;
 const load=()=>{calls++;return read.promise};
 const first=cached('pending',100,load);
 vi.setSystemTime(100);
 const second=cached('pending',100,load);
 vi.setSystemTime(500);
 const third=cached('pending',100,load);
 expect(calls).toBe(1);
 expect(second).toBe(first);expect(third).toBe(first);
 read.resolve('public content');
 await expect(Promise.all([first,second,third])).resolves.toEqual(['public content','public content','public content']);
});

// Restarting freshness on settlement would retain an already-expired snapshot.
it('refreshes a settled read using its original start-time deadline',async()=>{
 const read=deferred<string>();let calls=0;
 const first=cached('start-time',100,()=>{calls++;return read.promise});
 vi.setSystemTime(150);read.resolve('old');await first;
 const refreshed=cached('start-time',100,async()=>{calls++;return 'new'});
 await expect(refreshed).resolves.toBe('new');expect(calls).toBe(2);
});

// Treating every entry as pending would prevent the normal settled TTL refresh.
it('reuses settled content before expiry and refreshes at expiry',async()=>{
 let calls=0;const load=async()=>`version ${++calls}`;
 await expect(cached('settled',100,load)).resolves.toBe('version 1');
 vi.setSystemTime(99);
 await expect(cached('settled',100,load)).resolves.toBe('version 1');
 vi.setSystemTime(100);
 await expect(cached('settled',100,load)).resolves.toBe('version 2');
});

// An invalidated flight must neither satisfy the new read nor overwrite it.
it('starts a new read after invalidation while an older read is pending',async()=>{
 const old=deferred<string>();let calls=0;
 const first=cached('invalidated',100,()=>{calls++;return old.promise});
 invalidate('invalidated');
 const second=cached('invalidated',100,async()=>{calls++;return 'current'});
 await expect(second).resolves.toBe('current');
 old.resolve('withdrawn');await expect(first).resolves.toBe('withdrawn');
 await expect(cached('invalidated',100,async()=>{calls++;return 'unexpected'})).resolves.toBe('current');
 expect(calls).toBe(2);
});

// Unconditionally deleting by key on rejection evicts a replacement flight.
it('keeps a newer entry when an invalidated older read rejects',async()=>{
 const old=deferred<string>(),current=deferred<string>();let calls=0;
 const first=cached('reject-old',100,()=>{calls++;return old.promise},false);
 invalidate('reject-old');
 const second=cached('reject-old',100,()=>{calls++;return current.promise},false);
 const rejected=expect(first).rejects.toThrow('old read failed');
 old.reject(Error('old read failed'));await rejected;
 const third=cached('reject-old',100,async()=>{calls++;return 'unexpected'},false);
 expect(third).toBe(second);expect(calls).toBe(2);
 current.resolve('current');
 await expect(Promise.all([second,third])).resolves.toEqual(['current','current']);
});

// Losing pending entries during size pruning also causes duplicate reads.
it('retains expired pending reads when pruning a large cache',async()=>{
 const read=deferred<string>();let calls=0;
 const first=cached('busy',100,()=>{calls++;return read.promise});
 vi.setSystemTime(150);
 await Promise.all(Array.from({length:100},(_,i)=>cached(`other-${i}`,100,async()=>'other')));
 const second=cached('busy',100,()=>{calls++;return read.promise});
 expect(calls).toBe(1);expect(second).toBe(first);
 read.resolve('busy result');await expect(second).resolves.toBe('busy result');
});

// A fail-closed caller must never receive its earlier successful snapshot.
it('rejects failed refreshes when stale fallback is disabled and permits retry',async()=>{
 await cached('fail-closed',100,async()=>'withdrawn',false);
 vi.setSystemTime(100);
 await expect(cached('fail-closed',100,async()=>{throw Error('unavailable')},false)).rejects.toThrow('unavailable');
 await expect(cached('fail-closed',100,async()=>'current',false)).resolves.toBe('current');
});

// A failed coalesced refresh keeps the existing optional stale-on-error policy.
it('shares an allowed stale fallback without extending its freshness deadline',async()=>{
 await cached('fallback',100,async()=>'previous');
 const read=deferred<string>();let calls=0;
 vi.setSystemTime(100);
 const first=cached('fallback',100,()=>{calls++;return read.promise});
 vi.setSystemTime(250);
 const second=cached('fallback',100,()=>{calls++;return read.promise});
 expect(calls).toBe(1);
 read.reject(Error('unavailable'));
 await expect(Promise.all([first,second])).resolves.toEqual(['previous','previous']);
 await expect(cached('fallback',100,async()=>'current')).resolves.toBe('current');
});
