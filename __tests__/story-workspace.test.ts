import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({admin:true,perm:true,owner:false,q:vi.fn(),schema:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q,qSchema:state.schema}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.admin,hasPerm:()=>state.perm,isSuperAdmin:()=>state.owner,adminActor:()=> 'writer@example.test'}));
vi.mock('@/lib/server/content-workflow',()=>({ensureContentWorkflowSchema:async()=>{}}));
import {GET,POST} from '@/app/api/admin/story-workspace/route';
import {saveStoryDraft,trashStory,restoreStory} from '@/lib/server/story-workspace';
import {storyDraftContent} from '@/lib/story-draft';
const id='12953bc3-0e73-4b35-bb5b-0b4827bc578a';
const content=()=>storyDraftContent({headline:'Private story',body:'First paragraph\n\nSecond paragraph',published:true});
const request=(body:unknown,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/admin/story-workspace',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{state.admin=true;state.perm=true;state.owner=false;state.q.mockReset().mockResolvedValue([]);state.schema.mockResolvedValue(undefined)});
it('requires a current content session and matching origin before any database access',async()=>{
 state.admin=false;expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/story-workspace'))).status).toBe(401);
 state.admin=true;state.perm=false;expect((await POST(request({}))).status).toBe(403);
 state.perm=true;expect((await POST(request({},'https://evil.example'))).status).toBe(403);expect(state.q).not.toHaveBeenCalled();
});
it('rejects arbitrary storage fields, malformed revisions, invalid dates and oversized payloads',async()=>{
 for(const body of [{action:'saveDraft',id,revision:0,content:{...content(),secret:'not allowed'}},{action:'saveDraft',id,revision:-1,content:content()},{action:'saveDraft',id,revision:0,content:{...content(),date:'2026-02-30'}},{action:'saveDraft',id,revision:0,content:content(),published:true}])expect((await POST(request(body))).status).toBe(400);
 expect((await POST(request({text:'x'.repeat(170001)}))).status).toBe(413);expect(state.q).not.toHaveBeenCalled();
});
it('whitelists story fields and retains incomplete text without making it public',()=>{
 expect(storyDraftContent({_draftId:id,headline:'',body:['One','Two'],version:'private',published:false})).toEqual({...content(),headline:'',body:'One\n\nTwo',published:false});
 expect(()=>storyDraftContent({body:['bad\0text']})).toThrow('invalid_body');
});
it('saves a private copy and its revision atomically without touching posts',async()=>{
 state.q.mockResolvedValue([{id,revision:1,updated_at:'2026-10-16'}]);
 expect((await POST(request({action:'saveDraft',id,revision:0,content:content()}))).status).toBe(200);
 const [sql,args]=state.q.mock.calls[0];expect(sql).toContain('INSERT INTO admin_story_revisions');expect(sql).toContain('actor=$2 AND revision=$3');expect(sql).not.toMatch(/UPDATE posts|INSERT INTO posts/);expect(args[1]).toBe('writer@example.test');
});
it('reconciles an identical retry but rejects a changed or foreign saved version',async()=>{
 state.q.mockResolvedValueOnce([]).mockResolvedValueOnce([{id,revision:2}]);expect(await saveStoryDraft(id,'writer',1,content())).toMatchObject({revision:2});
 expect(state.q.mock.calls[1][0]).toContain('actor=$2 AND revision=$3::int+1 AND content=$4::jsonb');
 state.q.mockResolvedValue([]);expect((await POST(request({action:'saveDraft',id,revision:1,content:content()}))).status).toBe(409);
});
it('reads only own drafts and cannot read another author through revision IDs',async()=>{
 expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/story-workspace?id='+id+'&revision=1'))).status).toBe(404);
 expect(state.q.mock.calls[0][0]).toContain('id=$1 AND actor=$2');expect(state.q).toHaveBeenCalledTimes(1);
});
it('lists own drafts even for owners and scopes the Trash list explicitly',async()=>{
 const response=await GET(new Request('https://urbangangtour.co.ke/api/admin/story-workspace'));expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(state.q.mock.calls[0][0]).toContain('WHERE actor=$1');expect(state.q.mock.calls[1][1]).toEqual(['writer@example.test',false]);
});
it('archives with a version check, retains the full removed row, and logs in the same statement',async()=>{
 await trashStory('story','writer',false,'2026-10-16 00:00:00+00');const [sql,args]=state.q.mock.calls[0];expect(sql).toContain('updated_at::text=$4');expect(sql).toContain('(NOT published AND submitted_by=$2)');expect(sql).toContain('to_jsonb(removed)');expect(sql).toContain("'trash_story'");expect(sql).toContain('NOT EXISTS');expect(args[2]).toBe(false);
});
it('restores only as a draft, never overwrites a reused slug, and retains Trash on a conflict',async()=>{
 await restoreStory('story','writer',false);const [sql]=state.q.mock.calls[0];expect(sql).toContain('removed_by=$2');expect(sql).toContain('ON CONFLICT (slug) DO NOTHING');expect(sql).toContain("false,");expect(sql).toContain("'draft'");expect(sql).toContain('slug IN (SELECT slug FROM restored)');expect(sql).not.toContain('DO UPDATE');
 expect((await POST(request({action:'restoreStory',slug:'story'}))).status).toBe(409);
});
