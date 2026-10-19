import {beforeAll,afterAll,beforeEach,it,expect,vi} from 'vitest';
import {DisposablePostgres} from './helpers/disposable-postgres';
const db=vi.hoisted(()=>({q:vi.fn(),qSchema:vi.fn()}));
vi.mock('@/lib/server/db',()=>db);
import {ensureReplyDraftSchema,readReplyDraft,writeReplyDraft} from '@/lib/server/reply-drafts';
const enabled=process.env.UGT_REPLY_DRAFT_PG_FIXTURE==='1',fixture=new DisposablePostgres(),test=it.skipIf(!enabled);
const text={subject:'Reply',body:'Private fixture text'};
beforeAll(async()=>{if(!enabled)return;fixture.start();await vi.waitFor(()=>expect(fixture.ready()).toBe(true),{timeout:10000});db.q.mockImplementation((sql:string,args:unknown[])=>fixture.query(sql,args));db.qSchema.mockImplementation((sql:string)=>fixture.schema(sql));await ensureReplyDraftSchema()},20000);
beforeEach(async()=>{if(enabled)await fixture.query('TRUNCATE admin_reply_drafts')});
afterAll(()=>{if(enabled)fixture.stop()},20000);
test('twenty competing first saves cannot silently overwrite each other',async()=>{
 const outcomes=await Promise.allSettled(Array.from({length:20},(_,i)=>writeReplyDraft('one','gmail','mail:a',null,{...text,body:'Edit '+i})));
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(19);
 expect((await fixture.query('SELECT count(*) AS n FROM admin_reply_drafts'))[0].n).toBe('1');
},20000);
test('versioned editing rejects stale tabs and acknowledges identical lost-response retries',async()=>{
 const first=await writeReplyDraft('one','booking','B-ABCD',null,text);
 const changed=await writeReplyDraft('one','booking','B-ABCD',first.version,{...text,body:'Newer'});
 expect(changed.sendKey).toBe(first.sendKey);
 await expect(writeReplyDraft('one','booking','B-ABCD',first.version,{...text,body:'Stale'})).rejects.toThrow('draft_changed_elsewhere');
 expect(await writeReplyDraft('one','booking','B-ABCD',first.version,{...text,body:'Newer'})).toEqual(changed);
});
test('staff and channel isolation are enforced in every read and write predicate',async()=>{
 const first=await writeReplyDraft('one','gmail','a',null,text);
 expect(await readReplyDraft('two','gmail','a')).toBeNull();expect(await readReplyDraft('one','booking','a')).toBeNull();
 await expect(writeReplyDraft('two','gmail','a',first.version,{...text,body:'Other staff'})).rejects.toThrow('draft_changed_elsewhere');
 expect((await readReplyDraft('one','gmail','a'))?.body).toBe(text.body);
});
test('clear erases text, survives restart and blocks delayed writes from resurrecting it',async()=>{
 const first=await writeReplyDraft('one','gmail','a',null,text),cleared=await writeReplyDraft('one','gmail','a',first.version,null);
 expect(cleared).toMatchObject({subject:'',body:'',deleted:true});
 await expect(writeReplyDraft('one','gmail','a',null,text)).rejects.toThrow('draft_changed_elsewhere');
 await expect(writeReplyDraft('one','gmail','a',first.version,text)).rejects.toThrow('draft_changed_elsewhere');
 vi.resetModules();const cold=await import('@/lib/server/reply-drafts');expect(await cold.readReplyDraft('one','gmail','a')).toEqual(cleared);
 expect(await cold.writeReplyDraft('one','gmail','a',first.version,null)).toEqual(cleared);
 const renewed=await cold.writeReplyDraft('one','gmail','a',cleared.version,{...text,body:'Explicit new draft'});expect(renewed.deleted).toBe(false);expect(renewed.sendKey).not.toBe(first.sendKey);
});
test('migrates a previous opaque send reference into durable storage',async()=>{
 const legacy='a'.repeat(32),first=await writeReplyDraft('one','gmail','a',null,text,legacy);expect(first.sendKey).toBe(legacy);
 const updated=await writeReplyDraft('one','gmail','a',first.version,{...text,body:'New text'});expect(updated.sendKey).toBe(legacy);
});
