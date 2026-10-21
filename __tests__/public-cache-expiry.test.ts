import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({path:vi.fn(),tag:vi.fn(),invalidate:vi.fn(),catalog:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:state.path,revalidateTag:state.tag}));
vi.mock('@/lib/server/microcache',()=>({invalidate:state.invalidate}));
vi.mock('@/lib/server/catalog',()=>({invalidateCatalogCaches:state.catalog}));
import {bumpEventPublicTruth} from '@/lib/server/public-cache';
it('expires tags immediately rather than serving stale withdrawn event content on Next 16',()=>{
 bumpEventPublicTruth('example-event');
 expect(state.tag).toHaveBeenCalledWith('sitemap',{expire:0});expect(state.tag).toHaveBeenCalledWith('events',{expire:0});
 expect(state.path).toHaveBeenCalledWith('/events/example-event');expect(state.path).toHaveBeenCalledWith('/portfolio');
 expect(state.catalog).toHaveBeenCalled();expect(state.invalidate).toHaveBeenCalledWith('site-events:partner');
});
