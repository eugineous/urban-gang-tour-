import {merchProducts,type MerchProduct} from '@/data/color-blast';
export type LiveShopProduct={id:string;name:string;price:number;image?:string;category?:string;description?:string;name_on_back_enabled?:boolean;made_to_order?:boolean;stock?:number|null;variants:{label:string;priceAdjustment:number;sku?:string;stock?:number|null}[]};
export type ShopCatalogueProduct=LiveShopProduct&{preview:boolean};
/** Discovery only. Never add proposed designs to the authoritative payment catalogue. */
export function buildShopCatalogue(live:LiveShopProduct[],designs:MerchProduct[]=merchProducts):ShopCatalogueProduct[]{
 const seen=new Set<string>(),result:ShopCatalogueProduct[]=[];
 for(const product of live){if(seen.has(product.id))continue;seen.add(product.id);result.push({...product,preview:false})}
 for(const design of designs){if(seen.has(design.id))continue;seen.add(design.id);result.push({...design,preview:true})}
 return result;
}
export function filterShopCatalogue(products:ShopCatalogueProduct[],{selected='',category='',query='',availability='all',sort='featured'}:{selected?:string;category?:string;query?:string;availability?:string;sort?:string}){
 const search=query.trim().toLocaleLowerCase('en-KE');
 return products.filter(product=>(!selected||product.id===selected)&&(!category||product.category===category)&&(availability==='all'||(availability==='designs'?product.preview:!product.preview))&&`${product.name} ${product.category||''} ${product.description||''}`.toLocaleLowerCase('en-KE').includes(search)).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);
}
