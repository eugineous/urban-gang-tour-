import {q} from './db';
let migration:Promise<void>|null=null;
export function ensureProductPresentationSchema(){if(!migration)migration=(async()=>{await q("ALTER TABLE products ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb");await q("ALTER TABLE products ADD COLUMN IF NOT EXISTS size_guide TEXT NOT NULL DEFAULT ''")})().catch(e=>{migration=null;throw e});return migration;}
export function isProductImageUrl(value:unknown):value is string{
 if(typeof value!=='string'||!value||value.length>500||/[\s\\\u0000-\u001f]/.test(value))return false;
 if(value.startsWith('/')&&!value.startsWith('//'))return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!!url.hostname&&!url.username&&!url.password}catch{return false}
}
export function productPresentation(input:{photos?:unknown;sizeGuide?:unknown}){const photos=input.photos===undefined?[]:input.photos;if(!Array.isArray(photos)||photos.length>12||photos.some(x=>!isProductImageUrl(x)))throw Error('invalid_product_photos');if(input.sizeGuide!==undefined&&(typeof input.sizeGuide!=='string'||input.sizeGuide.length>4000))throw Error('invalid_size_guide');return{photos:[...new Set(photos as string[])],sizeGuide:typeof input.sizeGuide==='string'?input.sizeGuide.trim():''};}
