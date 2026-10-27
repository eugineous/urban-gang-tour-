'use client';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {commerceMessages,type CommerceIssue} from '@/ui/i18n/catalogues/commerce';
import {formatKes} from '@/lib/i18n/format';
import {useEffect,useState} from 'react';
import {getMerchProduct} from '@/data/color-blast';
import {LIVE_CART_KEY,readLiveCart,type PreviewItem} from '@/lib/client/merch-preview-cart';
import GeneratedProductImage from './GeneratedProductImage';
export default function DesignBag(){
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
 const [items,setItems]=useState<PreviewItem[]>([]),[ready,setReady]=useState(false),[error,setError]=useState<CommerceIssue|null>(null);
 useEffect(()=>{const update=()=>setItems(readLiveCart().filter(x=>getMerchProduct(x.id)));update();setReady(true);addEventListener('storage',update);return()=>removeEventListener('storage',update)},[]);
 function save(next:PreviewItem[]){try{localStorage.setItem(LIVE_CART_KEY,JSON.stringify(next));setItems(next);dispatchEvent(new Event('ugt-design-bag-changed'));setError(null)}catch{setError({key:'bag.storage'})}}
 const total=items.reduce((n,x)=>n+(getMerchProduct(x.id)?.price||0)*x.qty,0);
 return <section className="wrap current-reading current-wide"><p className="eyebrow">{t('bag.label')}</p><h1>{t('bag.heading')}</h1><p>{t('bag.warning')}</p><div className="current-actions"><a href="/shop/lookbook">{t('bag.back')}</a><a href="/cart">{t('bag.cart')}</a></div>{!ready?<p role="status">{t('bag.loading')}</p>:!items.length?<p>{t('bag.empty')}</p>:<><div className="current-grid">{items.map((item,index)=>{const p=getMerchProduct(item.id)!;return <article className="current-card" key={item.id+item.variant}><div style={{height:240}}><GeneratedProductImage id={item.id} colour={item.variant?.split(' / ')[0]}/></div><h2><a lang="en-KE" href={'/shop/'+p.id}>{p.name}</a></h2><p lang="en-KE">{item.variant}</p><label>{t('quantity')} <input aria-label={t('quantity.for',{name:p.name})} type="number" min={1} max={20} value={item.qty} style={{width:80,minHeight:44}} onChange={e=>save(items.map((x,i)=>i===index?{...x,qty:Math.max(1,Math.min(20,Number(e.target.value)||1))}:x))}/></label><p>{t('bag.amount',{amount:money(p.price*item.qty)})}</p><button type="button" style={{minHeight:44,padding:'8px 16px'}} onClick={()=>save(items.filter((_,i)=>i!==index))}>{t('bag.remove',{name:p.name})}</button></article>})}</div><h2>{t('bag.total',{amount:money(total)})}</h2><p>{t('bag.confirm')}</p><div className="current-actions"><a className="button" href="/contact-us">{t('bag.ask')}</a><a href="/shop">{t('shop.merch')}</a></div></>}{error&&<p role="alert">{t(error.key,error.values)}</p>}</section>;
}
