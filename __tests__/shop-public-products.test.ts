import {beforeEach,expect,it,vi} from 'vitest';
const products=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/public-products',()=>({readPublicProducts:products}));
vi.mock('@/app/_lib/blog',()=>({getBlogPostSummaries:async()=>[]}));
vi.mock('@/lib/server/public-events',()=>({readPublicEvents:async()=>[]}));
vi.mock('@/lib/server/website-content',()=>({readWebsiteContent:async()=>null}));
vi.mock('@/ui/components/HostedSite',()=>({default:()=>null}));
import {RenderedPage} from '@/app/_components/RenderedPage';
beforeEach(()=>{products.mockReset()});
it('passes the authoritative public catalogue into the shop before hydration',async()=>{
 products.mockResolvedValue([{id:'approved-tee',name:'Approved Tee',price:1800,made_to_order:true,stock:null,variants:[]}]);
 const page=await RenderedPage({pathName:'/shop'});expect(page.props.initialProducts).toEqual([{id:'approved-tee',name:'Approved Tee',price:1800,made_to_order:true,stock:null,variants:[]}]);
});
it('retains client catalogue retry instead of fabricating SSR products on read failure',async()=>{
 products.mockRejectedValue(Error('catalog_unavailable'));const page=await RenderedPage({pathName:'/shop'});expect(page.props.initialProducts).toBeUndefined();expect(products).toHaveBeenCalledOnce();
});
