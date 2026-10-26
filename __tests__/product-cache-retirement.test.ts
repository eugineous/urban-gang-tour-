import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({path:vi.fn(),tag:vi.fn(),invalidate:vi.fn(),catalog:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:state.path,revalidateTag:state.tag}));
vi.mock('@/lib/server/microcache',()=>({invalidate:state.invalidate}));
vi.mock('@/lib/server/catalog',()=>({invalidateCatalogCaches:state.catalog}));
import {bumpProductPublicTruth} from '@/lib/server/public-cache';
it('invalidates commercial snapshots and only the validated retired product paths',()=>{
 bumpProductPublicTruth(['p1','p14','../admin','https://other.test']);
 expect(state.catalog).toHaveBeenCalledOnce();expect(state.invalidate).toHaveBeenCalledWith('site-products');
 for(const path of ['/','/shop','/sitemap.xml','/image-sitemap.xml','/api/site-data/products','/shop/p1','/shop/p14'])expect(state.path).toHaveBeenCalledWith(path);
 expect(state.path).not.toHaveBeenCalledWith('/shop/../admin');expect(state.path).not.toHaveBeenCalledWith('/shop/https://other.test');
});
