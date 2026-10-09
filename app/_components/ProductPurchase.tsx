'use client';
import {useState} from 'react';
import {readLiveCart,addCartItem,LIVE_CART_KEY} from '@/lib/client/live-cart';
type Variant={label:string;priceAdjustment:number};
export function ProductPurchase({id,price,variants}:{id:string;price:number;variants:Variant[]}){
 const [variant,setVariant]=useState(variants[0]?.label||''),[qty,setQty]=useState(1),[notice,setNotice]=useState(''),[added,setAdded]=useState(false);
 const total=(price+(variants.find(v=>v.label===variant)?.priceAdjustment||0))*qty;
 function add(){try{const cart=addCartItem(readLiveCart(),{id,qty,...(variant?{variant}:{})});localStorage.setItem(LIVE_CART_KEY,JSON.stringify(cart));setAdded(true);setNotice('Added to your cart. Review your items before paying.')}catch{setNotice('Your browser could not save the cart. Allow site storage and try again.')}}
 return <div className="product-purchase">{!!variants.length&&<label>Choose your options<select aria-label="Product options" value={variant} onChange={e=>{setVariant(e.target.value);setAdded(false);setNotice('')}}>{variants.map(v=><option key={v.label} value={v.label}>{v.label}{v.priceAdjustment?' · '+(v.priceAdjustment>0?'+':'')+'KES '+v.priceAdjustment.toLocaleString('en-KE'):''}</option>)}</select></label>}<label>Quantity<input aria-label="Product quantity" type="number" min={1} max={20} value={qty} onChange={e=>{setQty(Math.max(1,Math.min(20,Number(e.target.value)||1)));setAdded(false);setNotice('')}}/></label><button className="button" onClick={add}>Add to cart · KES {total.toLocaleString('en-KE')}</button>{notice&&<p role="status">{notice}</p>}{added&&<a className="button secondary" href="/cart">Review your cart</a>}<p className="form-note">Choose your options, review your cart, then pay by M-Pesa or supported card checkout. Payment confirmation completes your order.</p><details><summary>Returns and refunds</summary><p>Read the <a href="/refund-policy">refund policy</a> before paying.</p></details></div>
}
