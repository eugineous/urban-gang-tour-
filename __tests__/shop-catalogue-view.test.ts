// Server-rendered presentation and callback contracts, not browser/payment tests.
import {Children,createElement,isValidElement,type ChangeEvent,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import ShopCatalogueView,{ShopDesignCard,ShopIntro,ShopLiveProductCard,ShopNoProductsNotice} from '@/app/_components/ShopCatalogueView';
import {buildShopCatalogue,filterShopCatalogue,type LiveShopProduct} from '@/lib/shop-discovery';
import {merchProducts} from '@/data/color-blast';

const product:LiveShopProduct={
 id:'original tee',name:'Original Tour Tee',price:1500,image:'/uploads/original-tee.jpg',category:'Apparel',
 description:'Original supplied artwork on the live tee.',stock:8,name_on_back_enabled:true,
 variants:[{label:'Black / M',priceAdjustment:0,stock:0},{label:'White / L',priceAdjustment:200,stock:4}],
};
const productProps=()=>({product,variation:'White / L',full:false,printableName:'Amina',onVariation:vi.fn(),onName:vi.fn(),onAdd:vi.fn()});
type NodeProps={children?:ReactNode;[name:string]:unknown};
function elements(node:ReactNode):ReactElement<NodeProps>[] {
 const result:ReactElement<NodeProps>[]=[];
 Children.forEach(node,child=>{
  if(!isValidElement<NodeProps>(child))return;
  result.push(child);result.push(...elements(child.props.children));
 });
 return result;
}
function catalogueProps(products=buildShopCatalogue([product])){
 return {products,categories:['Apparel','Headwear'],availability:'all',search:'',sort:'featured',category:'',
  printableNames:{[product.id]:'Amina'},onAvailability:vi.fn(),onSearch:vi.fn(),onSort:vi.fn(),onCategory:vi.fn(),
  variationFor:()=> 'White / L',selectionFull:()=>false,onVariation:vi.fn(),onName:vi.fn(),onAdd:vi.fn()};
}

describe('current collection shop presentation',()=>{
 it('keeps legacy p1 artwork in its live product card rather than the featured hero',()=>{
  const legacy={...product,id:'p1',name:'Magenta Oversized Tee',image:'/assets/merch/magenta-tee.png',price:900,stock:null,variants:[]};
  const hero=renderToStaticMarkup(createElement(ShopIntro));
  expect(hero).toContain('data-studio-product="cb-oversized-tee"');
  expect(hero).not.toContain('/shop/p1');expect(hero).not.toContain('/assets/merch/magenta-tee.png');
  const card=renderToStaticMarkup(createElement(ShopLiveProductCard,{...productProps(),product:legacy}));
  expect(card).toContain('href="/shop/p1"');expect(card).toContain('src="/assets/merch/magenta-tee.png"');
  expect(card).toContain('KES 900');expect(card).not.toContain('8 available');
 });
 it('explains when no products are on sale while preserving all 24 design previews',()=>{
  const notice=renderToStaticMarkup(createElement(ShopNoProductsNotice));
  expect(notice).toContain('No products currently on sale.');
  expect(notice).toContain('href="/shop/lookbook"');
  expect(notice).toContain('Samples and stock are unconfirmed.');
  expect(notice).not.toContain('The next drop is being prepared.');
  expect(notice).not.toContain('Add to cart');expect(notice).not.toContain('/checkout');
  const catalogue=renderToStaticMarkup(createElement(ShopCatalogueView,catalogueProps(buildShopCatalogue([]))));
  expect(catalogue.match(/data-shop-design=/g)).toHaveLength(24);
  expect(catalogue).toContain('24 items');
  expect(catalogue).not.toContain('data-shop-product=');
 });
 it('renders one shop heading, catalogue anchor and real cart/lookbook destinations',()=>{
  const html=renderToStaticMarkup(createElement(ShopIntro,{cartCount:3,selected:product.id}));
  expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  expect(html).toContain('<h1>Shop.</h1>');expect(html).toContain('href="#merchandise-catalogue"');
  expect(html).toContain('href="/cart"');expect(html).toContain('View cart (3)');
  expect(html).toContain('href="/shop"');expect(html).toContain('href="/shop/lookbook"');
  expect(html).toContain('data-studio-product="cb-oversized-tee"');
  expect(html).toContain('Color Blast · design preview · not on sale');
  expect(html).not.toContain('/uploads/original-tee.jpg');expect(html).not.toContain('KES');
 });
 it('shows the existing studio preview before live products load without purchase claims',()=>{
  const html=renderToStaticMarkup(createElement(ShopIntro));
  expect(html).toContain('data-studio-product="cb-oversized-tee"');
  expect(html).toContain('/assets/color-blast/generated/primary.webp');
  expect(html).toContain('not on sale');expect(html).not.toContain('View all merchandise');
  expect(html).toContain('View cart (0)');expect(html).not.toContain('/checkout');
  expect(html).not.toContain('Add to cart');expect(html).not.toContain('In stock');
 });
 it('renders the exact artwork, encoded detail URL and selected-variation price',()=>{
  const html=renderToStaticMarkup(createElement(ShopLiveProductCard,productProps()));
  expect(html).toContain('data-shop-product="original tee"');expect(html).toContain('src="/uploads/original-tee.jpg"');
  expect(html).toContain('href="/shop/original%20tee"');expect(html).toContain('KES 1,700');
  expect(html).toMatch(/<option[^>]*value="Black \/ M"[^>]*disabled=""/);
  expect(html).toContain('aria-label="Variation for Original Tour Tee"');
  expect(html).toContain('aria-label="Printed name for Original Tour Tee"');
  expect(html).toContain('maxLength="24"');expect(html).toContain('value="Amina"');
 });
 it('only presents printed-name controls for an explicit live-product opt-in',()=>{
  for(const enabled of [false,undefined]){
   const html=renderToStaticMarkup(createElement(ShopLiveProductCard,{...productProps(),product:{...product,name_on_back_enabled:enabled}}));
   expect(html).not.toContain('Printed name for');expect(html).not.toContain('Name on the back');
  }
 });
 it('shows sold-out and cart-limit states without offering an enabled add button',()=>{
  const sold=renderToStaticMarkup(createElement(ShopLiveProductCard,{...productProps(),variation:'Black / M',full:true}));
  expect(sold).toContain('Out of stock');expect(sold).toMatch(/<button[^>]*disabled=""[^>]*>Out of stock<\/button>/);
  const full=renderToStaticMarkup(createElement(ShopLiveProductCard,{...productProps(),full:true}));
  expect(full).toContain('Your cart has the available quantity');expect(full).toMatch(/<button[^>]*disabled=""[^>]*>In your cart<\/button>/);
 });
 it('connects product selection, personalization and add actions to their existing callbacks',()=>{
  const props=productProps(),nodes=elements(ShopLiveProductCard(props));
  const select=nodes.find(node=>node.type==='select');const input=nodes.find(node=>node.type==='input');
  const button=nodes.find(node=>node.type==='button');
  expect(select).toBeDefined();expect(input).toBeDefined();expect(button).toBeDefined();
  (select!.props.onChange as (event:ChangeEvent<HTMLSelectElement>)=>void)({target:{value:'Black / M'}} as ChangeEvent<HTMLSelectElement>);
  (input!.props.onChange as (event:ChangeEvent<HTMLInputElement>)=>void)({target:{value:'Lucy'}} as ChangeEvent<HTMLInputElement>);
  (button!.props.onClick as ()=>void)();
  expect(props.onVariation).toHaveBeenCalledWith('Black / M');expect(props.onName).toHaveBeenCalledWith('Lucy');expect(props.onAdd).toHaveBeenCalledOnce();
 });
 it('keeps design previews clearly separate from live stock and purchase actions',()=>{
  const design=buildShopCatalogue([])[0];const html=renderToStaticMarkup(createElement(ShopDesignCard,{product:design}));
  expect(html).toContain('data-shop-design="'+design.id+'"');expect(html).toContain('Design · not on sale');
  expect(html).toContain('Proposed KES');
  expect(html).toContain('href="/shop/'+design.id+'"');expect(html).not.toContain('href="/shop/design-bag"');
  expect(html).not.toContain('Add to cart');expect(html).not.toContain('/checkout');expect(html).not.toContain('<button');
 });
 it('renders all fourteen supplied live fixtures alongside every preview in one catalogue',()=>{
  const live=Array.from({length:14},(_,i)=>({...product,id:'live-'+i,name:'Live product '+i}));
  const products=buildShopCatalogue(live);const props=catalogueProps(products);
  const html=renderToStaticMarkup(createElement(ShopCatalogueView,props));
  expect(products).toHaveLength(14+merchProducts.length);
  expect(html.match(/data-shop-product=/g)).toHaveLength(14);expect(html.match(/data-shop-design=/g)).toHaveLength(24);
  expect(html.match(/data-design-collection-note/g)).toHaveLength(1);
  expect(html.match(/href="\/shop\/design-bag"/g)).toHaveLength(1);
  expect(html).toContain('Designs are not on sale. Samples, final prices and stock are unconfirmed.');
  expect(html.match(/Design · not on sale/g)).toHaveLength(24);expect(html.match(/Proposed KES/g)).toHaveLength(24);
  expect(html).toContain('id="merchandise-catalogue"');expect(html).toContain('38 items');
  expect(html).toContain('Merchandise categories');expect(html).toContain('All merchandise &amp; designs');
  expect(html).toContain('Price: low to high');expect(html).toContain('Price: high to low');
  expect(props.onAdd).not.toHaveBeenCalled();
 });
 it('passes search, collection, sort and category choices to the existing catalogue state',()=>{
  const props=catalogueProps();const nodes=elements(ShopCatalogueView(props));
  const search=nodes.find(node=>node.type==='input'&&node.props.type==='search');
  const availability=nodes.find(node=>node.type==='select'&&node.props.value==='all');
  const sort=nodes.find(node=>node.type==='select'&&node.props.value==='featured');
  const category=nodes.find(node=>node.type==='button'&&node.props.children==='Apparel');
  (search!.props.onChange as (event:ChangeEvent<HTMLInputElement>)=>void)({target:{value:'hoodie'}} as ChangeEvent<HTMLInputElement>);
  (availability!.props.onChange as (event:ChangeEvent<HTMLSelectElement>)=>void)({target:{value:'designs'}} as ChangeEvent<HTMLSelectElement>);
  (sort!.props.onChange as (event:ChangeEvent<HTMLSelectElement>)=>void)({target:{value:'low'}} as ChangeEvent<HTMLSelectElement>);
  (category!.props.onClick as ()=>void)();
  expect(props.onSearch).toHaveBeenCalledWith('hoodie');expect(props.onAvailability).toHaveBeenCalledWith('designs');
  expect(props.onSort).toHaveBeenCalledWith('low');expect(props.onCategory).toHaveBeenCalledWith('Apparel');
 });
 it('renders filtered or empty data truthfully without inventing replacement products',()=>{
  const filtered=filterShopCatalogue(buildShopCatalogue([product]),{query:'hoodie'});
  const html=renderToStaticMarkup(createElement(ShopCatalogueView,catalogueProps(filtered)));
  expect(html).toContain('1 item');expect(html.match(/data-shop-design=/g)).toHaveLength(1);expect(html).not.toContain('data-shop-product=');
  const empty=renderToStaticMarkup(createElement(ShopCatalogueView,catalogueProps([])));
  expect(empty).toContain('0 items');expect(empty).not.toContain('data-shop-product=');expect(empty).not.toContain('data-shop-design=');
 });
});
