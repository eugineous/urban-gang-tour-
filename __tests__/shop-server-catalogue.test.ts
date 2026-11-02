import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({products:vi.fn()}));
vi.mock('@/lib/server/public-products',()=>({readPublicProducts:fixture.products}));
import ShopPage from '@/app/shop/page';
beforeEach(()=>{vi.resetAllMocks()});
it('sends real product cards in the first shop HTML rather than waiting for browser fetching',async()=>{
 fixture.products.mockResolvedValue([{id:'approved-shop-tee',name:'Published shop tee',price:1800,image:'/uploads/approved-tee.webp',made_to_order:true,variants:[]}]);
 const html=renderToStaticMarkup(await ShopPage());
 expect(html).toContain('data-shop-product="approved-shop-tee"');expect(html).toContain('Published shop tee');expect(html).not.toContain('Loading the live catalogue');expect(fixture.products).toHaveBeenCalledOnce();
});
it('keeps the shop renderable and browser retry available when its public reader fails',async()=>{
 fixture.products.mockRejectedValue(Error('fixture unavailable'));
 const html=renderToStaticMarkup(await ShopPage());
 expect(html).toContain('<h1>Shop.</h1>');expect(html).toContain('Loading the live catalogue');expect(html).not.toContain('data-shop-product=');expect(fixture.products).toHaveBeenCalledOnce();
});
