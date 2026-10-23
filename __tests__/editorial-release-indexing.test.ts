import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q}));
vi.mock('@/lib/server/editorial-schema',()=>({ensureEditorialSchema:async()=>{}}));
vi.mock('@/lib/server/media',()=>({mediaGet:vi.fn()}));
import {releaseDueEditorial} from '@/lib/server/editorial';
import {PUBLIC_POST_PREDICATE} from '@/lib/server/editorial-publication';
beforeEach(()=>state.q.mockReset());
it('derives crawl hints only from rows committed by the existing public eligibility update',async()=>{
 state.q.mockResolvedValueOnce([{slug:'public-guide'},{slug:'second-guide'}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{count:'3'}]);
 expect(await releaseDueEditorial()).toEqual({released:2,held:3,releasedSlugs:['public-guide','second-guide']});
 expect(state.q.mock.calls[0][0]).toContain("editorial_status='approved_for_auto_release'");
 expect(state.q.mock.calls[0][0]).toContain(PUBLIC_POST_PREDICATE);
 expect(state.q.mock.calls[0][0]).toContain('SELECT slug FROM saved');
 expect(state.q.mock.calls[1][1]).toEqual([2]);
});
it('returns no new crawl hints when a retry commits no additional release',async()=>{
 state.q.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{count:'1'}]);
 expect(await releaseDueEditorial()).toEqual({released:0,held:1,releasedSlugs:[]});
});
