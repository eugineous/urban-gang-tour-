import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HomeMerch} from '@/ui/components/HomeDiscovery';
import ProductImage from '@/app/_components/merch/ProductImage';
import {merchProducts} from '@/data/color-blast';
it('shows the actual merchandise preview instead of the catalogue artwork placeholder',()=>{
 const html=renderToStaticMarkup(createElement(HomeMerch,{products:[{id:'cb-oversized-tee',name:'Color Blast tee',price:1800,made_to_order:true,image:'/assets/color-blast/original-artwork.png',variants:[]}]}));
 expect(html).toContain('data-studio-product="cb-oversized-tee"');
 expect(html).not.toContain('src="/assets/color-blast/original-artwork.png"');
});
it.each(merchProducts)('renders a product-specific preview for $id',product=>{
 const html=renderToStaticMarkup(createElement(ProductImage,{product:{...product,made_to_order:true}}));
 expect(html).toContain('data-studio-product="'+product.id+'"');
});
it('uses the selected colour when a matching view exists',()=>{
 const html=renderToStaticMarkup(createElement(ProductImage,{product:{...merchProducts.find(p=>p.id==='cb-oversized-tee')!,made_to_order:true},variant:'White / M'}));
 expect(html).toContain('data-example-colour="White"');
});
it('preserves ordinary catalogue photography for other products',()=>{
 const html=renderToStaticMarkup(createElement(ProductImage,{product:{id:'other',name:'Other product',price:100,image:'/photos/item.jpg',variants:[]}}));
 expect(html).toContain('src="/photos/item.jpg"');
 expect(html).not.toContain('data-studio-product');
});
