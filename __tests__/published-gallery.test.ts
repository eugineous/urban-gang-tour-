import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),configured:true}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>state.configured}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{}}));
import {publishedGallery} from '@/lib/server/published-gallery';
import {invalidate} from '@/lib/server/microcache';
import PublishedGallery from '@/app/_components/PublishedGallery';
import {PhotoGallery} from '@/app/_components/PhotoGallery';
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));state.configured=true;invalidate('site-gallery');state.q.mockReset().mockResolvedValue([{id:1,url:'/media/gallery/one.png',caption:'Verified caption',category:'New category',alt_text:'Verified description',sort_order:10,private_notes:'Do not expose'}])});
afterEach(()=>vi.useRealTimers());
it('shares a whitelisted published-only data source between page and API',async()=>{
 const photos=await publishedGallery();expect(state.q.mock.calls[0][0]).toContain('WHERE published=true');expect(photos[0]).toEqual({id:1,url:'/media/gallery/one.png',caption:'Verified caption',category:'New category',altText:'Verified description',sortOrder:10});await publishedGallery();expect(state.q).toHaveBeenCalledTimes(1);
});
it('connects the published photos to the real viewer and category filters',async()=>{
 const tree=await PublishedGallery();expect(tree).toBeTruthy();const viewer=tree!.props.children[1];expect(viewer.type).toBe(PhotoGallery);expect(viewer.props.photos[0]).toMatchObject({id:'1',category:'New category'});
});
it('does not revive unpublished photographs indefinitely during an outage',async()=>{
 await publishedGallery();state.q.mockRejectedValue(new Error('offline'));vi.setSystemTime(new Date('2026-10-16T12:00:06Z'));expect(await publishedGallery()).toHaveLength(1);vi.setSystemTime(new Date('2026-10-16T12:00:16Z'));expect(await publishedGallery()).toEqual([]);
});
it('does not show a false archive fallback when the configured gallery is empty',async()=>{state.q.mockResolvedValue([]);expect(await PublishedGallery()).toBeNull();state.configured=false;expect(await publishedGallery()).toEqual([])});
