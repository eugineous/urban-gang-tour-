import {beforeAll,beforeEach,afterAll,expect,it,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const state=vi.hoisted(()=>({query:vi.fn(),schema:vi.fn(),pool:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.query,qSchema:state.schema,db:state.pool}));
const enabled=process.env.UGT_MEDIA_BUDGET_PG_FIXTURE==='1',test=it.skipIf(!enabled),fixture=new DisposablePostgres();
let budget:typeof import('@/lib/server/media-budget');
const hash=(n:number)=>n.toString(16).padStart(64,'0');
beforeAll(async()=>{if(!enabled)return;const loaded=await import('../lib/server/media-budget').catch(()=>null);expect(loaded,'persistent upload budget must exist').not.toBeNull();budget=loaded!;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});state.schema.mockImplementation((s:string)=>fixture.schema(s));state.query.mockImplementation((s:string,a:unknown[])=>fixture.query(s,a));state.pool.mockImplementation(()=>fixture.pool());await budget.mediaBudgetStatus(async()=>[]);},30000);
beforeEach(async()=>{if(enabled)await fixture.query('TRUNCATE media_storage_objects,media_storage_budget,media_storage_writes');});
afterAll(()=>{if(enabled)fixture.stop()},15000);
test('seeds existing allocation only once and preserves concurrent new reservations',async()=>{
 const inventory=vi.fn(async()=>[{key:hash(1),bytes:100}]);
 expect(await budget.reserveMediaStorage(hash(2),50,inventory)).toBe(true);
 await budget.markMediaStored(hash(2));expect(await budget.reserveMediaStorage(hash(2),50,inventory)).toBe(false);
 expect(await budget.mediaBudgetStatus(inventory)).toMatchObject({usedBytes:150,assets:2,dailyWrites:1});expect(inventory).toHaveBeenCalledTimes(1);
});
test('serializes final-byte claims so simultaneous uploads cannot exceed the fixed cap',async()=>{
 await budget.mediaBudgetStatus(async()=>[{key:hash(1),bytes:budget.MEDIA_STORAGE_LIMIT-15}]);
 const result=await Promise.allSettled([budget.reserveMediaStorage(hash(2),10,async()=>[]),budget.reserveMediaStorage(hash(3),10,async()=>[])]);
 expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(result.filter(x=>x.status==='rejected')).toHaveLength(1);
 expect((await budget.mediaBudgetStatus(async()=>[])).usedBytes).toBe(budget.MEDIA_STORAGE_LIMIT-5);
},20000);
test('retains ambiguous failed-upload reservations and releases only after explicit deletion',async()=>{
 await budget.reserveMediaStorage(hash(1),80,async()=>[]);expect((await budget.mediaBudgetStatus(async()=>[])).usedBytes).toBe(80);
 await budget.releaseMediaStorage(hash(1));await budget.releaseMediaStorage(hash(1));expect((await budget.mediaBudgetStatus(async()=>[])).usedBytes).toBe(0);
});
test('rejects conflicting sizes for the same immutable key',async()=>{
 await budget.reserveMediaStorage(hash(1),10,async()=>[]);await expect(budget.reserveMediaStorage(hash(1),11,async()=>[])).rejects.toThrow('media_storage_conflict');
});
test('enforces the persistent daily write budget across independent database clients',async()=>{
 await budget.mediaBudgetStatus(async()=>[]);await fixture.query("INSERT INTO media_storage_writes(attempted_at) SELECT now()-interval '23 hours 59 minutes' FROM generate_series(1,99)");
 await budget.reserveMediaStorage(hash(1),1,async()=>[]);await expect(budget.reserveMediaStorage(hash(2),1,async()=>[])).rejects.toThrow('media_daily_limit');
 // Expiring earlier attempts cannot also reset a write made just now.
 await fixture.query("UPDATE media_storage_writes SET attempted_at=now()-interval '25 hours' WHERE attempted_at<now()-interval '1 hour'");expect(await budget.reserveMediaStorage(hash(2),1,async()=>[])).toBe(true);expect((await budget.mediaBudgetStatus(async()=>[])).dailyWrites).toBe(2);
});
test('blocks additions to an already over-budget legacy namespace while preserving its files',async()=>{
 expect((await budget.mediaBudgetStatus(async()=>[{key:hash(1),bytes:budget.MEDIA_STORAGE_LIMIT+1}])).usedBytes).toBe(budget.MEDIA_STORAGE_LIMIT+1);
 await expect(budget.reserveMediaStorage(hash(2),1,async()=>[])).rejects.toThrow('media_storage_limit');expect((await budget.mediaBudgetStatus(async()=>[])).assets).toBe(1);
});
