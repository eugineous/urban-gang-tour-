import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildShopCatalogue,filterShopCatalogue,type LiveShopProduct} from '@/lib/shop-discovery';
import {merchProducts} from '@/data/color-blast';
import DesignCatalogueCard from '@/app/_components/merch/DesignCatalogueCard';
const live:LiveShopProduct[]=[{id:'original-tee',name:'Original Tee',price:1000,category:'Apparel',stock:8,variants:[]},{id:'original-cap',name:'Original Cap',price:600,category:'Headwear',stock:0,variants:[]}];
describe('one truthful merchandise discovery catalogue',()=>{
 it('includes existing live products and all new designs without another landing page',()=>{
  const products=buildShopCatalogue(live);expect(products).toHaveLength(live.length+merchProducts.length);
  expect(products.filter(p=>!p.preview).map(p=>p.id)).toEqual(['original-tee','original-cap']);
  expect(products.filter(p=>p.preview)).toHaveLength(24);
 });
 it('gives the actual live product precedence when a design becomes a real product',()=>{
  const activated={...live[0],id:merchProducts[0].id,price:2100};
  const products=buildShopCatalogue([activated,activated]);
  expect(products.filter(p=>p.id===activated.id)).toEqual([{...activated,preview:false}]);
  expect(products).toHaveLength(24);
 });
 it('filters and sorts across both collections, retaining sold-out live records',()=>{
  const products=buildShopCatalogue(live);
  expect(filterShopCatalogue(products,{query:'hoodie'}).map(p=>p.id)).toEqual(['cb-hoodie']);
  expect(filterShopCatalogue(products,{availability:'available'}).map(p=>p.id)).toEqual(['original-tee','original-cap']);
  expect(filterShopCatalogue(products,{category:'Headwear'}).some(p=>p.id==='original-cap')).toBe(true);
  const sorted=filterShopCatalogue(products,{sort:'low'});expect(sorted[0].price).toBeLessThanOrEqual(sorted.at(-1)!.price);
  expect(filterShopCatalogue(products,{selected:'cb-hoodie'})).toHaveLength(1);
 });
 it('never renders a purchase action or available-stock claim for a proposed design',()=>{
  const product=buildShopCatalogue([])[0];
  const html=renderToStaticMarkup(DesignCatalogueCard({product}));
  expect(html).toContain('Design · not on sale');expect(html).toContain('Proposed KES');expect(html).toContain('/shop/'+product.id);
  expect(html).not.toContain('Add to cart');expect(html).not.toContain('/checkout');
 });
 it('does not mutate the live product list or design sources',()=>{
  const before=JSON.stringify([live,merchProducts]);buildShopCatalogue(live);expect(JSON.stringify([live,merchProducts])).toBe(before);
 });
});
