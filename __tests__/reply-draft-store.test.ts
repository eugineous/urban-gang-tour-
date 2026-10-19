import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {ReplyDraftStore} from '@/lib/client/reply-draft-store';
const empty={subject:'',body:''},text={subject:'Reply',body:'Private text'},notify=vi.fn(),fetcher=vi.fn();
const response=(draft:unknown,status=200)=>new Response(JSON.stringify(status===200?{ok:true,draft:draft?{sendKey:'stable-send-key',...draft as object}:null}:{error:'draft_changed_elsewhere'}),{status});
beforeEach(()=>{fetcher.mockReset();notify.mockClear();vi.stubGlobal('fetch',fetcher)});
afterEach(()=>vi.unstubAllGlobals());
it('restores private text in a fresh controller after a confirmed save',async()=>{
 const store=new ReplyDraftStore('booking',notify);fetcher.mockResolvedValueOnce(response(null));await store.load('B-ABCD',empty);store.edit('B-ABCD',empty,text);
 fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));expect(await store.save('B-ABCD')).toBe(true);
 const cold=new ReplyDraftStore('booking',notify);fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));await cold.load('B-ABCD',empty);
 expect(cold.entries.get('B-ABCD')).toMatchObject({...text,status:'saved'});
});
it('late loading never replaces text typed while the load was pending',async()=>{
 let resolve!:(value:Response)=>void;fetcher.mockReturnValue(new Promise<Response>(r=>resolve=r));const store=new ReplyDraftStore('gmail',notify),loading=store.load('mail:a',empty);
 store.edit('mail:a',empty,{body:'Newer typing'});resolve(response({...text,version:'one',deleted:false}));await loading;
 expect(store.entries.get('mail:a')).toMatchObject({body:'Newer typing',version:'one',status:'unsaved'});
});
it('late saving acknowledges only its snapshot, not newer typing',async()=>{
 const store=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response(null));await store.load('a',empty);store.edit('a',empty,text);
 let resolve!:(value:Response)=>void;fetcher.mockReturnValueOnce(new Promise<Response>(r=>resolve=r));const saved=store.save('a');store.edit('a',empty,{body:'Later edit'});resolve(response({...text,version:'one',deleted:false}));await saved;
 expect(store.entries.get('a')).toMatchObject({body:'Later edit',status:'unsaved'});expect(store.dirty).toBe(true);
});
it('an accepted send cannot clear newer edits to the same message',async()=>{
 const store=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));await store.load('a',empty);store.edit('a',empty,{body:'New reply'});
 const calls=fetcher.mock.calls.length;expect(await store.clear('a',text)).toBe(true);expect(fetcher).toHaveBeenCalledTimes(calls);expect(store.entries.get('a')?.body).toBe('New reply');
});
it('a network failure retains text and does not claim a save',async()=>{
 const store=new ReplyDraftStore('booking',notify);fetcher.mockResolvedValueOnce(response(null));await store.load('B-ABCD',empty);store.edit('B-ABCD',empty,text);fetcher.mockRejectedValueOnce(Error('offline'));
 expect(await store.save('B-ABCD')).toBe(false);expect(store.entries.get('B-ABCD')).toMatchObject({...text,status:'error'});
});
it('a version conflict stops background overwrites and keeps local text',async()=>{
 const store=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));await store.load('a',empty);store.edit('a',empty,{body:'My changes'});fetcher.mockResolvedValueOnce(response(null,409));expect(await store.save('a')).toBe(false);
 store.edit('a',empty,{body:'My further changes'});const calls=fetcher.mock.calls.length;expect(await store.save('a')).toBe(false);expect(fetcher).toHaveBeenCalledTimes(calls);expect(store.entries.get('a')?.body).toBe('My further changes');
});
it('draft cleanup failures retain the send text and report failure',async()=>{
 const store=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));await store.load('a',empty);fetcher.mockRejectedValueOnce(Error('offline'));
 expect(await store.clear('a',text)).toBe(false);expect(store.entries.get('a')).toMatchObject({...text,status:'error'});
});
it('preserves the send reference across edits and reopening in a fresh tab',async()=>{
 const store=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response({...text,version:'one',deleted:false}));await store.load('a',empty);
 expect(store.sendReference('a',text)).toBe('stable-send-key');store.edit('a',empty,{body:'Changed'});fetcher.mockResolvedValueOnce(response({...text,body:'Changed',version:'two',deleted:false}));await store.save('a');
 expect(store.sendReference('a',{...text,body:'Changed'})).toBe('stable-send-key');expect(store.sendReference('a',text)).toBeNull();
 const cold=new ReplyDraftStore('gmail',notify);fetcher.mockResolvedValueOnce(response({...text,body:'Changed',version:'two',deleted:false}));await cold.load('a',empty);expect(cold.sendReference('a',{...text,body:'Changed'})).toBe('stable-send-key');
});
it('does not restore generated defaults after an explicitly cleared draft',async()=>{
 const store=new ReplyDraftStore('booking',notify);fetcher.mockResolvedValueOnce(response({subject:'',body:'',version:'one',deleted:true}));await store.load('B-ABCD',text);expect(store.entries.get('B-ABCD')).toMatchObject({subject:'',body:''});
});
