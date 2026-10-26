'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {commerceMessages,type CommerceIssue} from '@/ui/i18n/catalogues/commerce';
import {formatKes} from '@/lib/i18n/format';

import {useState} from 'react';
import {readLiveCart,addCartItem,LIVE_CART_KEY} from '@/lib/client/live-cart';
import {normalizePrintableName,PRINTABLE_NAME_MAX_LENGTH} from '@/lib/shared/merch-personalization';
import styles from './Commerce.module.css';

type Variant={label:string;priceAdjustment:number;stock?:number|null};

export function ProductPurchase({id,price,variants,stock,nameOnBackEnabled=false}:{id:string;price:number;variants:Variant[];stock?:number|null;nameOnBackEnabled?:boolean}){
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
 const [variant,setVariant]=useState(variants.find(value=>value.stock!==0)?.label||variants[0]?.label||'');
 const [qty,setQty]=useState(1),[printedName,setPrintedName]=useState(''),[notice,setNotice]=useState<CommerceIssue|null>(null),[error,setError]=useState<CommerceIssue|null>(null),[added,setAdded]=useState(false);
 const option=variants.find(value=>value.label===variant);
 const unit=price+(option?.priceAdjustment||0);
 const total=unit*qty;
 const unavailable=stock===0||option?.stock===0;
 function resetNotice(){setAdded(false);setNotice(null);setError(null)}
 function add(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(unavailable)return;
  let printableName:string|undefined;
  try{printableName=normalizePrintableName(nameOnBackEnabled&&printedName.trim()?printedName:undefined)}catch{setError({key:'personalization.invalid'});return}
  try{
   const saved=readLiveCart();
   const productQuantity=saved.filter(item=>item.id===id).reduce((sum,item)=>sum+item.qty,0);
   const variationQuantity=saved.filter(item=>item.id===id&&item.variant===(variant||undefined)).reduce((sum,item)=>sum+item.qty,0);
   if(typeof stock==='number'&&productQuantity+qty>stock||typeof option?.stock==='number'&&variationQuantity+qty>option.stock){setError({key:'cart.exceedsStock'});return}
   const cart=addCartItem(saved,{id,qty,...(variant?{variant}:{}),...(printableName?{printableName}:{})});
   localStorage.setItem(LIVE_CART_KEY,JSON.stringify(cart));
   window.dispatchEvent(new Event('ugt-cart-changed'));
   setPrintedName(printableName||'');setError(null);setAdded(true);setNotice({key:'cart.optionsSaved'});
  }catch{setError({key:'cart.storageUnavailable'})}
 }
 return <form className={`product-purchase ${styles.purchase}`} onSubmit={add}>
  <p className={styles.purchaseTotal}>{money(unit)} <span className={styles.availability}>{qty>1?t('each'):''}</span></p>
  <div className={styles.optionRow}>{!!variants.length&&<label>{t('product.chooseOptions')}<select aria-label={t('product.optionsLabel')} value={variant} onChange={event=>{setVariant(event.target.value);resetNotice()}}>{variants.map(value=><option key={value.label} value={value.label} disabled={value.stock===0}>{value.label}{value.stock===0?' · '+t('stock.out'):''}{value.priceAdjustment?' · '+(value.priceAdjustment>0?'+':'')+money(value.priceAdjustment):''}</option>)}</select></label>}<label>{t('quantity')}<input aria-label={t('quantity.product')} type="number" min={1} max={Math.max(1,Math.min(20,stock??20,option?.stock??20))} value={qty} onChange={event=>{setQty(Math.max(1,Math.min(20,Number(event.target.value)||1)));resetNotice()}}/></label></div>
  {nameOnBackEnabled&&<div className={styles.personalization}><label htmlFor={'printed-name-'+id}>{t('personalization.printFree')}<input id={'printed-name-'+id} aria-describedby={'printed-name-help-'+id} maxLength={PRINTABLE_NAME_MAX_LENGTH} autoComplete="off" placeholder={t('personalization.placeholder')} value={printedName} onChange={event=>{setPrintedName(event.target.value);resetNotice()}}/></label><p id={'printed-name-help-'+id} className={styles.purchaseNote}>{t('personalization.help')}</p>{printedName.trim()&&<div className={styles.namePreview} aria-label={t('personalization.preview')}><span>{t('personalization.label')}</span><strong lang="">{printedName.trim()}</strong><small>{t('personalization.spelling')}</small></div>}</div>}
  <p className={styles.availability} data-unavailable={unavailable}>{unavailable?t('stock.optionOut'):typeof stock==='number'?t('stock.available',{count:stock}):t('stock.check')}</p>
  <button className="button" disabled={unavailable} type="submit">{unavailable?t('stock.out'):t('cart.addAmount',{amount:money(total)})}</button>
  {error&&<p className={styles.error} role="alert">{t(error.key,error.values)}</p>}
  {notice&&<p className={styles.addedStatus} role="status">{t(notice.key,notice.values)}</p>}
  {added&&<a className="button secondary" href="/cart">{t('cart.review')}</a>}
  <p className={styles.purchaseNote}>{t('purchase.note')}</p>
  <details><summary>{t('purchase.returns')}</summary><p><MessageText catalogue={commerceMessages} message="purchase.reviewPolicy" values={{policy:<a href="/refund-policy">{t('refund')}</a>}}/></p></details>
 </form>;
}
