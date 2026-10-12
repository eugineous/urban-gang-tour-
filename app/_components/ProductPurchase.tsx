'use client';

import {useState} from 'react';
import {readLiveCart,addCartItem,LIVE_CART_KEY} from '@/lib/client/live-cart';
import {normalizePrintableName,PRINTABLE_NAME_MAX_LENGTH} from '@/lib/shared/merch-personalization';
import styles from './Commerce.module.css';

type Variant={label:string;priceAdjustment:number;stock?:number|null};
const money=(amount:number)=>'KES '+amount.toLocaleString('en-KE');

export function ProductPurchase({id,price,variants,stock,nameOnBackEnabled=false}:{id:string;price:number;variants:Variant[];stock?:number|null;nameOnBackEnabled?:boolean}){
 const [variant,setVariant]=useState(variants.find(value=>value.stock!==0)?.label||variants[0]?.label||'');
 const [qty,setQty]=useState(1),[printedName,setPrintedName]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[added,setAdded]=useState(false);
 const option=variants.find(value=>value.label===variant);
 const unit=price+(option?.priceAdjustment||0);
 const total=unit*qty;
 const unavailable=stock===0||option?.stock===0;
 function resetNotice(){setAdded(false);setNotice('');setError('')}
 function add(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(unavailable)return;
  let printableName:string|undefined;
  try{printableName=normalizePrintableName(nameOnBackEnabled&&printedName.trim()?printedName:undefined)}catch{setError('Use up to 24 letters or numbers. Spaces, apostrophes, dots and hyphens are supported.');return}
  try{
   const saved=readLiveCart();
   const productQuantity=saved.filter(item=>item.id===id).reduce((sum,item)=>sum+item.qty,0);
   const variationQuantity=saved.filter(item=>item.id===id&&item.variant===(variant||undefined)).reduce((sum,item)=>sum+item.qty,0);
   if(typeof stock==='number'&&productQuantity+qty>stock||typeof option?.stock==='number'&&variationQuantity+qty>option.stock){setError('Your cart and this selection exceed the available stock. Reduce the quantity or review your cart.');return}
   const cart=addCartItem(saved,{id,qty,...(variant?{variant}:{}),...(printableName?{printableName}:{})});
   localStorage.setItem(LIVE_CART_KEY,JSON.stringify(cart));
   window.dispatchEvent(new Event('ugt-cart-changed'));
   setPrintedName(printableName||'');setError('');setAdded(true);setNotice('Added to your cart. Your options are saved for checkout.');
  }catch{setError('Your browser could not save the cart. Allow site storage and try again.')}
 }
 return <form className={`product-purchase ${styles.purchase}`} onSubmit={add}>
  <p className={styles.purchaseTotal}>{money(unit)} <span className={styles.availability}>{qty>1?'each':''}</span></p>
  <div className={styles.optionRow}>{!!variants.length&&<label>Choose your options<select aria-label="Product options" value={variant} onChange={event=>{setVariant(event.target.value);resetNotice()}}>{variants.map(value=><option key={value.label} value={value.label} disabled={value.stock===0}>{value.label}{value.stock===0?' · Out of stock':''}{value.priceAdjustment?' · '+(value.priceAdjustment>0?'+':'')+money(value.priceAdjustment):''}</option>)}</select></label>}<label>Quantity<input aria-label="Product quantity" type="number" min={1} max={Math.max(1,Math.min(20,stock??20,option?.stock??20))} value={qty} onChange={event=>{setQty(Math.max(1,Math.min(20,Number(event.target.value)||1)));resetNotice()}}/></label></div>
  {nameOnBackEnabled&&<div className={styles.personalization}><label htmlFor={'printed-name-'+id}>Free name printing on the back<input id={'printed-name-'+id} aria-describedby={'printed-name-help-'+id} maxLength={PRINTABLE_NAME_MAX_LENGTH} autoComplete="off" placeholder="Your name (optional)" value={printedName} onChange={event=>{setPrintedName(event.target.value);resetNotice()}}/></label><p id={'printed-name-help-'+id} className={styles.purchaseNote}>Up to 24 characters. Check the spelling before adding to your cart. Leave blank for no printed name.</p>{printedName.trim()&&<div className={styles.namePreview} aria-label="Printed name preview"><span>Name on the back</span><strong>{printedName.trim()}</strong><small>Free · spelling preview</small></div>}</div>}
  <p className={styles.availability} data-unavailable={unavailable}>{unavailable?'This option is out of stock.':typeof stock==='number'?stock+' available':'Availability is checked at checkout.'}</p>
  <button className="button" disabled={unavailable} type="submit">{unavailable?'Out of stock':'Add to cart · '+money(total)}</button>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {notice&&<p className={styles.addedStatus} role="status">{notice}</p>}
  {added&&<a className="button secondary" href="/cart">Review your cart</a>}
  <p className={styles.purchaseNote}>Your order is confirmed after payment. Choose pickup or available delivery at checkout.</p>
  <details><summary>Returns and refunds</summary><p>Review the <a href="/refund-policy">refund policy</a> before paying.</p></details>
 </form>;
}
