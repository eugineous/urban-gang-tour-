import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not-found')}}));
import {q} from '@/lib/server/db';
import ProductPage from '@/app/shop/[id]/page';
describe('approved product detail flow',()=>{
 it('renders selectable server-provided prices without the retired design or extra logo',async()=>{vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('product_reviews')?[]:[{id:'test-product',name:'Real product',price:800,image:'/assets/ugt-logo.png',description:'Published product.',category:'Apparel',variants:[{label:'L',priceAdjustment:200}]}]);const html=renderToStaticMarkup(await ProductPage({params:Promise.resolve({id:'test-product'})}));expect(html).toContain('product-detail wrap');expect(html).toContain('Product options');expect(html).toContain('Add to bag · KES 1,000');expect(html).not.toContain('Choose options · Add to bag');expect(html).not.toContain('8px 8px 0');expect(html).toContain('"@type":"Product"')});
});
