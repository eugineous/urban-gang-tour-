'use client';
import GeneratedProductImage from './GeneratedProductImage';
import {getColourPreview} from '@/data/merch-gallery';
import type {LiveShopProduct} from '@/lib/shop-discovery';

/** Shared display only: never changes catalogue prices, availability or cart data. */
export default function ProductImage({product,variant}:{product:LiveShopProduct;variant?:string}){
 const colour=variant?.split(' / ')[0]||'Black';
 const tile=product.made_to_order?getColourPreview(product.id,colour):undefined;
 if(tile)return <GeneratedProductImage id={product.id} colour={colour} tile={tile}/>;
 return product.image?<img src={product.image} alt={product.name} loading="lazy" decoding="async"/>:null;
}
