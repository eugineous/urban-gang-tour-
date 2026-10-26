import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:vi.fn(async()=>{})}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not-found')}}));
import {q} from '@/lib/server/db';
import ProductPage,{dynamic,revalidate,generateMetadata} from '@/app/shop/[id]/page';
describe('approved product detail flow',()=>{
 it('rejects a missing or retired product during blocking metadata before the shell can stream',async()=>{
  vi.mocked(q).mockResolvedValue([]);
  await expect(generateMetadata({params:Promise.resolve({id:'p1'})})).rejects.toThrow('not-found');
  expect(vi.mocked(q).mock.calls.at(-1)?.[0]).toContain('p.active');
  await expect(ProductPage({params:Promise.resolve({id:'p1'})})).rejects.toThrow('not-found');
 });
 it('retains public metadata for a design-only preview without claiming sale inventory',async()=>{
  vi.mocked(q).mockResolvedValue([]);
  const metadata=await generateMetadata({params:Promise.resolve({id:'cb-hoodie'})});
  expect(metadata.title).toContain('Design Preview');
  expect(metadata.description).toContain('samples and stock unconfirmed');
 });
 it('uses a real live product even when its id also exists in the proposed collection',async()=>{
  expect(dynamic).toBe('force-dynamic');expect(revalidate).toBe(0);
  vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('product_reviews')?[]:[{id:'cb-hoodie',name:'Approved production hoodie',price:3700,image:'/assets/ugt-logo.png',category:'Apparel',variants:[],stock:5}]);
  const html=renderToStaticMarkup(await ProductPage({params:Promise.resolve({id:'cb-hoodie'})}));
  expect(html).toContain('Approved production hoodie');expect(html).toContain('Add to cart');expect(html).not.toContain('Save to design bag');
 });
 it('renders selectable server-provided prices without the retired design or extra logo',async()=>{vi.mocked(q).mockImplementation(async(sql:string)=>sql.includes('product_reviews')?[]:[{id:'test-product',name:'Real product',price:800,image:'/assets/ugt-logo.png',description:'Published product.',category:'Apparel',variants:[{label:'L',priceAdjustment:200}]}]);const html=renderToStaticMarkup(await ProductPage({params:Promise.resolve({id:'test-product'})}));expect(html).toContain('product-detail wrap');expect(html).toContain('Product options');expect(html).toContain('Add to cart · KES 1,000');expect(html).not.toContain('Choose options · Add to cart');expect(html).not.toContain('8px 8px 0');expect(html).toContain('"@type":"Product"')});
});
