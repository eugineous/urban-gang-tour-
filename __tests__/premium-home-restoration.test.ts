import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import Site from '@/ui/components/Site';
import {HomeMerch} from '@/ui/components/HomeDiscovery';
import type {LiveShopProduct} from '@/lib/shop-discovery';

const product=(id:string):LiveShopProduct&{active?:boolean}=>({id,name:'Published '+id,price:1800,image:'/uploads/'+id+'.webp',category:'Apparel',made_to_order:true,stock:null,variants:[]});
const render=()=>renderToStaticMarkup(createElement(Site,{path:'/',query:{},screens:[],products:[product('approved-tee')],events:[],posts:[],initialNow:0}));
it('restores the hosting, production and presenter journeys on the main homepage',()=>{
 const html=render();
 for(const href of ['/book?type=school','/book?type=campus','/work-with-us','/author/eugine-micah','/author/lucy-ogunde'])expect(html).toContain('href="'+href+'"');
 expect(html).toContain('id="experiences"');expect(html).toContain('Eugine Micah');expect(html).toContain('Lucy Ogunde');
 expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
});
it('opens the actual shop from the homepage hero instead of embedding the purchase catalogue',()=>{
 const html=render(),actions=html.split('data-home-actions')[1].split('</nav>')[0];
 expect(actions).toContain('href="/shop"');
 expect(html).not.toContain('id="merchandise-catalogue"');
 expect(html).not.toContain('Add to cart');
});
it('shows a compact truthful selection of published products without reverting to unconfirmed design previews',()=>{
 const html=renderToStaticMarkup(createElement(HomeMerch,{products:['tee','hoodie','cap','bag','jersey'].map(product)}));
 for(const id of ['tee','hoodie','cap','bag'])expect(html).toContain('href="/shop/'+id+'"');
 expect(html).not.toContain('href="/shop/jersey"');expect(html).not.toContain('not on sale');
 expect(html).toContain('/uploads/tee.webp');expect(html).toContain('KES 1,800');expect(html).toContain('Made to order');
});
it('does not promote retired or unpublished items in the restored homepage preview',()=>{
 const html=renderToStaticMarkup(createElement(HomeMerch,{products:[product('p1'),{...product('private'),active:false},product('approved-tee')]}));
 expect(html).not.toContain('href="/shop/p1"');expect(html).not.toContain('href="/shop/private"');expect(html).toContain('href="/shop/approved-tee"');
});
it('withdraws cached product offers when the live catalogue is unavailable',()=>{
 const html=renderToStaticMarkup(createElement(HomeMerch,{products:[product('approved-tee')],current:false}));
 expect(html).not.toContain('href="/shop/approved-tee"');expect(html).not.toContain('KES 1,800');expect(html).toContain('href="/shop"');expect(html).toContain('role="status"');
});
