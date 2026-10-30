import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({owner:true,perm:true,q:vi.fn(),trash:vi.fn(),invalidate:vi.fn(),path:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,hasPerm:()=>state.perm,isAdmin:()=>true,isSuperAdmin:()=>state.owner,adminActor:()=> 'writer@example.test'}));
vi.mock('@/lib/server/content-workflow',()=>({ensureContentWorkflowSchema:async()=>{}}));
vi.mock('@/lib/server/story-workspace',()=>({trashStory:state.trash}));
vi.mock('@/lib/server/content-automation',()=>({ensureContentAutomationSchema:async()=>{},contentAutomationReady:()=>false,dispatchArticleAnnouncement:vi.fn()}));
vi.mock('@/lib/server/notify',()=>({notifyPostPublished:vi.fn()}));
vi.mock('@/lib/server/indexnow',()=>({pingIndexNow:vi.fn()}));
vi.mock('@/lib/server/microcache',async original=>{
 const actual=await original<typeof import('@/lib/server/microcache')>();
 return {...actual,invalidate:(key:string)=>{state.invalidate(key);actual.invalidate(key)}};
});
vi.mock('next/cache',()=>({revalidatePath:state.path,revalidateTag:vi.fn()}));
vi.mock('next/server',async original=>({...await original<object>(),after:vi.fn()}));
import {POST} from '@/app/api/admin/save/route';
import {cached,invalidate} from '@/lib/server/microcache';
const version='2026-10-16 00:00:00.123456+00';
const request=(kind:string,data:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/save',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','Content-Type':'application/json'},body:JSON.stringify({kind,data})});
beforeEach(()=>{state.owner=true;state.perm=true;state.q.mockReset().mockResolvedValue([]);state.trash.mockReset().mockResolvedValue([{slug:'story'}]);state.invalidate.mockClear();state.path.mockClear()});
it('rejects unversioned edits and malformed story fields',async()=>{
 expect((await POST(request('post',{headline:'Story'}))).status).toBe(400);
 expect((await POST(request('post',{headline:'Story',expectedVersion:null,other:'ignored?'}))).status).toBe(400);
 expect((await POST(request('post',{headline:'Story',date:'2026-02-30',expectedVersion:null}))).status).toBe(400);expect(state.q).not.toHaveBeenCalled();
});
it('does not overwrite a newer record or recreate a missing story from an old draft',async()=>{
 state.q.mockResolvedValueOnce([{published:true,version:'new version'}]);expect((await POST(request('post',{slug:'story',headline:'Changed',expectedVersion:version}))).status).toBe(409);expect(state.q).toHaveBeenCalledTimes(1);
 state.q.mockResolvedValue([]);expect((await POST(request('post',{slug:'story',headline:'Changed',expectedVersion:version}))).status).toBe(409);
});
it('checks conflicts atomically and publishes only on an explicit true flag',async()=>{
 state.q.mockResolvedValueOnce([]).mockResolvedValueOnce([{date:'2026-10-16',version}]);
 expect((await POST(request('post',{headline:'New story',expectedVersion:null}))).status).toBe(200);
 const [sql,args]=state.q.mock.calls[1];expect(sql).toContain('posts.updated_at::text=$12');expect(sql).toContain('$13::boolean');expect(sql).toContain('WHERE $12::text IS NULL ON CONFLICT (slug) DO NOTHING');expect(sql).not.toContain('DO UPDATE');expect(args).toHaveLength(13);expect(args[6]).toBe(false);expect(args[11]).toBe(null);expect(state.invalidate).toHaveBeenCalledWith('blog-published-posts');
});
it('rejects a conflict that occurs between reading and writing',async()=>{
 state.q.mockResolvedValueOnce([{published:true,version}]).mockResolvedValueOnce([]);
 expect((await POST(request('post',{slug:'story',headline:'Changed',published:true,expectedVersion:version}))).status).toBe(409);expect(state.invalidate).not.toHaveBeenCalled();
});
it('retains the crew publication gate and the own-draft restriction',async()=>{
 state.owner=false;state.q.mockResolvedValueOnce([{published:true,version}]);expect((await POST(request('post',{slug:'story',headline:'Changed',published:true,expectedVersion:version}))).status).toBe(403);
 state.q.mockResolvedValueOnce([{published:false,submitted_by:'another@example.test',version}]);expect((await POST(request('post',{slug:'story',headline:'Changed',expectedVersion:version}))).status).toBe(403);
});
it('moves to recoverable storage instead of directly deleting a post',async()=>{
 state.q.mockResolvedValue([{published:true,submitted_by:'writer@example.test'}]);const response=await POST(request('deletePost',{slug:'story',expectedVersion:version}));expect(await response.json()).toMatchObject({ok:true,recoverable:true});expect(state.trash).toHaveBeenCalledWith('story','writer@example.test',true,version);expect(state.q.mock.calls.every(([sql])=>!sql.includes('DELETE FROM posts'))).toBe(true);expect(state.path).toHaveBeenCalledWith('/blog/story');
});
it.each(['post','deletePost'])('invalidates public summaries immediately after a committed %s',async kind=>{
 invalidate('blog-published-post-summaries');
 await cached('blog-published-post-summaries',1000,async()=>['old-public-card']);
 if(kind==='post')state.q.mockResolvedValueOnce([]).mockResolvedValueOnce([{date:'2026-10-16',version}]);
 else state.q.mockResolvedValue([{published:true,submitted_by:'writer@example.test'}]);
 const data=kind==='post'?{headline:'New story',expectedVersion:null}:{slug:'story',expectedVersion:version};
 expect((await POST(request(kind,data))).status).toBe(200);
 expect(await cached('blog-published-post-summaries',1000,async()=>[])).toEqual([]);
});
