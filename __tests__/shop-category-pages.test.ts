import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
import type {PublicProduct} from '@/lib/server/public-products';

const readProducts=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/public-products',()=>({readPublicProducts:readProducts}));
import CategoryPage,{generateMetadata} from '@/app/shop/category/[slug]/page';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
import {shopCategoryLinks} from '@/lib/shop-categories';
import {buildShopCatalogue} from '@/lib/shop-discovery';
import {SITE} from '@/lib/site';

const product=(id:string,category:string):PublicProduct=>({id,name:id,category,price:1800,stock:null,image:'/assets/ugt-logo.png',description:'Approved merchandise.',name_on_back_enabled:false,made_to_order:true,variants:[]});
const products=[product('live-tee','Apparel'),product('live-cap','Headwear'),product('live-limited','Limited Run')];
beforeEach(()=>{readProducts.mockReset().mockResolvedValue(products)});

// Catches category routes leaking other products or unlabelled design previews.
it('server renders only the chosen public category with a factual heading and All merchandise exit',async()=>{
 const html=renderToStaticMarkup(await CategoryPage({params:Promise.resolve({slug:'apparel'})}));
 expect(html).toContain('<h1 lang="en-KE">Apparel</h1>');
 expect(html).toContain('href="/shop">All merchandise</a>');
 expect(html).toContain('data-shop-product="live-tee"');expect(html).toContain('data-shop-design="cb-hoodie"');
 expect(html).not.toContain('data-shop-product="live-cap"');expect(html).not.toContain('data-shop-product="live-limited"');
 expect(html).not.toContain('data-shop-design="cb-snapback"');expect(html).toContain('Design · not on sale');
 expect(html).not.toContain('data-shop-collection=');
});

it('resolves every published category link to a nonempty category-only page, including owner-managed names',async()=>{
 const catalogue=buildShopCatalogue(products);
 for(const category of shopCategoryLinks(catalogue.map(product=>product.category||''))){
  const html=renderToStaticMarkup(await CategoryPage({params:Promise.resolve({slug:category.slug})}));
  const ids=[...html.matchAll(/data-shop-(?:product|design)="([^"]+)"/g)].map(match=>match[1]);
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.every(id=>catalogue.find(product=>product.id===id)?.category===category.name)).toBe(true);
 }
});

it('keeps the normal shop catalogue complete when no category is fixed',()=>{
 const html=renderToStaticMarkup(createElement(LiveCommerce,{initialProducts:products}));
 expect(html).toContain('<h1>Shop.</h1>');
 for(const id of ['live-tee','live-cap','live-limited'])expect(html).toContain(`data-shop-product="${id}"`);
 expect(html).toContain('href="#merchandise-catalogue"');
});

it('publishes unique category canonicals and matching social metadata',async()=>{
 const apparel=await generateMetadata({params:Promise.resolve({slug:'apparel'})});
 const headwear=await generateMetadata({params:Promise.resolve({slug:'headwear'})});
 expect(apparel.alternates?.canonical).toBe(SITE.domain+'/shop/category/apparel');
 expect(headwear.alternates?.canonical).toBe(SITE.domain+'/shop/category/headwear');
 expect(apparel.title).toContain('Apparel');expect(headwear.title).toContain('Headwear');
 expect(apparel.openGraph).toMatchObject({url:SITE.domain+'/shop/category/apparel',title:apparel.title,description:apparel.description});
 expect(apparel.twitter).toMatchObject({title:apparel.title,description:apparel.description});
});

it.each(['unknown','../apparel','Apparel','apparel%2fheadwear','apparel/headwear','-apparel','apparel-','a'.repeat(101)])('returns404 for an unknown or unsafe category slug: %s',async slug=>{
 await expect(CategoryPage({params:Promise.resolve({slug})})).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'});
 await expect(generateMetadata({params:Promise.resolve({slug})})).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'});
});

it('does not advertise an ambiguous or unsafe category URL',()=>{
 expect(shopCategoryLinks(['Apparel','Apparel','Headwear','!!!','Fresh & New','Fresh New'])).toEqual([
  {name:'Apparel',slug:'apparel',href:'/shop/category/apparel'},
  {name:'Headwear',slug:'headwear',href:'/shop/category/headwear'},
 ]);
});

it('opens a known public design category with truthful loading and retry when the live source is unavailable',async()=>{
 readProducts.mockRejectedValue(new Error('catalog_unavailable'));
 const html=renderToStaticMarkup(await CategoryPage({params:Promise.resolve({slug:'apparel'})}));
 expect(html).toContain('<h1 lang="en-KE">Apparel</h1>');expect(html).toContain('Loading the live catalogue');
 expect(html).not.toContain('data-shop-product=');expect(html).not.toContain('No products currently on sale');
 expect((await generateMetadata({params:Promise.resolve({slug:'apparel'})})).alternates?.canonical).toBe(SITE.domain+'/shop/category/apparel');
});

it('preserves an unavailable live-only category source instead of inventing a name or false404',async()=>{
 readProducts.mockRejectedValue(new Error('catalog_unavailable'));
 await expect(CategoryPage({params:Promise.resolve({slug:'limited-run'})})).rejects.toThrow('catalog_unavailable');
});
