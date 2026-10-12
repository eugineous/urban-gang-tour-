// Proposed designs must never enter the server-backed purchase cart.
export type PreviewItem={id:string;qty:number;variant?:string};
export const LIVE_CART_KEY='ugt-design-preview-cart-v1';
export function readLiveCart():PreviewItem[]{
 try{const value=JSON.parse(localStorage.getItem(LIVE_CART_KEY)||'[]');return Array.isArray(value)?value.filter((x:PreviewItem)=>typeof x?.id==='string'&&/^cb-[a-z-]+$/.test(x.id)&&Number.isInteger(x.qty)&&x.qty>=1&&x.qty<=20&&typeof x.variant==='string'&&x.variant.length<=100):[]}catch{return []}
}
export function addCartItem(items:PreviewItem[],item:PreviewItem):PreviewItem[]{
 const match=items.find(x=>x.id===item.id&&x.variant===item.variant);
 return match?items.map(x=>x===match?{...x,qty:Math.min(20,x.qty+item.qty)}:x):[...items,{...item,qty:Math.max(1,Math.min(20,item.qty))}];
}
