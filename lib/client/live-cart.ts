import {normalizePrintableName} from '@/lib/shared/merch-personalization';
export type CartItem={id:string;qty:number;variant?:string;printableName?:string};
export const LIVE_CART_KEY='ugt-live-cart-v1';
/** Refresh restored browser-history pages and background tabs from saved state. */
export function subscribeLiveCart(refresh:()=>void){
 const storage=(event:StorageEvent)=>{if(event.key===null||event.key===LIVE_CART_KEY||event.key==='ugt_cart')refresh()};
 const visible=()=>{if(!document.hidden)refresh()};
 window.addEventListener('ugt-cart-changed',refresh);window.addEventListener('storage',storage);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);
 return()=>{window.removeEventListener('ugt-cart-changed',refresh);window.removeEventListener('storage',storage);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible)};
}
export function readLiveCart():CartItem[]{
 try{
  const stored=JSON.parse(localStorage.getItem(LIVE_CART_KEY)||localStorage.getItem('ugt_cart')||'[]');
  if(!Array.isArray(stored))return [];
  return stored.flatMap((x:CartItem&{size?:string})=>{
   if(typeof x?.id!=='string'||!Number.isInteger(x.qty)||x.qty<1||x.qty>20||(x.variant!==undefined&&(typeof x.variant!=='string'||x.variant.length>100)))return [];
   try{const printableName=normalizePrintableName(x.printableName);return [{id:x.id,qty:x.qty,variant:x.variant||(typeof x.size==='string'?x.size:undefined),...(printableName!==undefined?{printableName}:{})}]}catch{return []}
  });
 }catch{return []}
}
export function addCartItem(items:CartItem[],item:CartItem){
 const printableName=normalizePrintableName(item.printableName);
 const normalized={...item,...(printableName!==undefined?{printableName}:{})};
 const found=items.find(x=>x.id===normalized.id&&x.variant===normalized.variant&&x.printableName===printableName);
 return found?items.map(x=>x===found?{...x,qty:Math.min(20,x.qty+normalized.qty)}:x):[...items,{...normalized,qty:Math.max(1,Math.min(20,normalized.qty))}];
}
