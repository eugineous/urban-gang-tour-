'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {commerceMessages,checkoutIssueCodes,type CommerceIssue} from '@/ui/i18n/catalogues/commerce';
import {formatKes} from '@/lib/i18n/format';
import {readReferralCode,clearAffiliateReferral} from '@/lib/client/affiliate-referral';
import {readLiveCart,addCartItem,LIVE_CART_KEY,type CartItem} from '@/lib/client/live-cart';
import {startTransition,useEffect,useRef,useState} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {normalizePrintableName,PRINTABLE_NAME_MAX_LENGTH} from '@/lib/shared/merch-personalization';
import styles from './Commerce.module.css';
import {checkoutAttempt,readCheckoutAttempt,rememberCheckoutOrder} from '@/lib/client/checkout-attempt';
import {paystackCheckoutAttempt,readPaystackAttempt,rememberPaystackOrder} from '@/lib/client/paystack-checkout-attempt';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import LanguageChooser from './LanguageChooser';
import {buildShopCatalogue,filterShopCatalogue,type LiveShopProduct} from '@/lib/shop-discovery';
import ShopCatalogueView,{ShopIntro,ShopNoProductsNotice} from './ShopCatalogueView';
import shopStyles from './ShopCatalogue.module.css';
type Product=LiveShopProduct;
type Item=CartItem;
type Event={id:string;name:string;sellable?:boolean;tiers:{name:string;price:number;sellable?:boolean;remaining?:number|null;per_order_min?:number;per_order_max?:number}[]};
const storage=LIVE_CART_KEY;
function PrintedNameEditor({value,id,disabled,onSave}:{value?:string;id:string;disabled:boolean;onSave:(name:string|undefined)=>void}){
 const t=useMessages(commerceMessages);
 const [draft,setDraft]=useState(value||''),[error,setError]=useState<CommerceIssue|null>(null);
 useEffect(()=>setDraft(value||''),[value]);
 return <details className={styles.nameEditor}><summary>{value?t('personalization.edit'):t('personalization.add')}</summary><form onSubmit={event=>{event.preventDefault();try{const name=normalizePrintableName(draft.trim()?draft:undefined);onSave(name);setDraft(name||'');setError(null)}catch{setError({key:'personalization.invalid'})}}}><label htmlFor={id}>{t('personalization.label')}<input id={id} maxLength={PRINTABLE_NAME_MAX_LENGTH} disabled={disabled} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={t('personalization.placeholder')}/></label><p>{t('personalization.blank')}</p><button className="button secondary" type="submit" disabled={disabled}>{t('personalization.save')}</button>{error&&<p role="alert" className={styles.error}>{t(error.key,error.values)}</p>}</form></details>;
}
type CommerceProps={view?:'shop'|'cart'|'checkout';eventId?:string};
/** Keep the first server/client tree identical. Browser storage and fast
 * catalogue responses belong to a child mounted only after this shell hydrates. */
export function LiveCommerce({view='shop',eventId}:CommerceProps){
 const t=useMessages(commerceMessages);
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 return <>{mounted?<CommerceClient view={view} eventId={eventId}/>:<section className={view==='shop'?shopStyles.page:`${styles.page} wrap`}><CommerceIntro view={view} eventId={eventId}/><p className={styles.loading} role="status">{t('shop.loading')}</p></section>}{view==='checkout'&&<div className="wrap"><LanguageChooser path="/checkout"/></div>}</>;
}
function CommerceIntro({view,eventId,eventName,selected='',cartCount=0,featuredProduct}:{view:'shop'|'cart'|'checkout';eventId?:string;eventName?:string;selected?:string;cartCount?:number;featuredProduct?:Product}){
 const t=useMessages(commerceMessages);
 if(view==='shop'&&!eventId)return <ShopIntro selected={selected} cartCount={cartCount} featuredProduct={featuredProduct}/>;
 return <header className={styles.intro}><div><p className="eyebrow">{eventId?t('tickets'):t('shop.urbanMerch')}</p><h1>{eventId?(eventName?<span lang="en-KE">{eventName}</span>:t('tickets.heading')):view==='shop'?t('shop.heading'):view==='cart'?t('cart.heading'):t('checkout.heading')}</h1></div><div className={styles.introCopy}><p>{eventId?t('tickets.intro'):view==='shop'?t('shop.fullIntro'):view==='cart'?t('cart.intro'):t('checkout.intro')}</p><nav className={styles.actions} aria-label={t('shop.navigation')}>{selected&&<a href="/shop">{t('shop.viewAll')}</a>}<a href={view==='shop'?'#merchandise-catalogue':'/shop'}>{view==='shop'?t('shop.browse'):t('shop.continue')}</a>{view==='shop'&&<a className="button secondary" href="/cart">{t('cart.viewCount',{count:cartCount})}</a>}{view==='checkout'&&!eventId&&<a href="/cart">{t('cart.review')}</a>}</nav></div></header>;
}
function CommerceClient({view='shop',eventId}:CommerceProps){
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
 const [referralCode,setReferralCode]=useState('');useEffect(()=>{const load=()=>setReferralCode(readReferralCode()||'');load();window.addEventListener('ugt-referral-changed',load);return()=>window.removeEventListener('ugt-referral-changed',load)},[]);
 const [fulfillmentMethod,setFulfillmentMethod]=useState<'pickup'|'delivery'>('pickup'),[address,setAddress]=useState({line1:'',city:'',postalCode:''}),[fulfillmentOptions,setFulfillmentOptions]=useState<{pickup:{location:string};delivery:{enabled:boolean;fee:number|null}}|null>(null);
 const [fulfillmentLoading,setFulfillmentLoading]=useState(true),[fulfillmentError,setFulfillmentError]=useState<CommerceIssue|null>(null),[fulfillmentRetry,setFulfillmentRetry]=useState(0);
 const [quote,setQuote]=useState<{key:string;total:number;promoApplied:boolean;savings:number;deliveryFee:number}|null>(null),[quoting,setQuoting]=useState(false),[quoteError,setQuoteError]=useState<CommerceIssue|null>(null);
 const quoteRequest=useRef<AbortController|null>(null);
 const [search,setSearch]=useState('');const [sort,setSort]=useState('featured');const [category,setCategory]=useState('');const [availability,setAvailability]=useState('all');const [printableNames,setPrintableNames]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState('');const [products,setProducts]=useState<Product[]>([]);const [event,setEvent]=useState<Event>();const [items,setItems]=useState<Item[]>([]);const [ready,setReady]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState<CommerceIssue|null>(null);const [notice,setNotice]=useState<CommerceIssue|null>(null);const [retry,setRetry]=useState(0);const [tier,setTier]=useState(0);const [qty,setQty]=useState(1);const [variants,setVariants]=useState<Record<string,string>>({});const [method,setMethod]=useState('mpesa');const [promo,setPromo]=useState('');const [busy,setBusy]=useState(false);const pending=useRef(false);const key=useRef('');const [form,setForm]=useState({name:'',email:'',phone:''});
 // Storage and a warm catalogue may resolve before sibling SSR boundaries
 // hydrate. Keep their first updates interruptible rather than replacing
 // still-hydrating markup with a synchronous populated cart.
 useEffect(()=>{const selectedItem=new URLSearchParams(location.search).get('item')||'',savedItems=readLiveCart();startTransition(()=>{setSelected(selectedItem);setItems(savedItems);setReady(true)})},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(storage,JSON.stringify(items));window.dispatchEvent(new Event('ugt-cart-changed'))}catch{setNotice({key:'cart.keepPageOpen'})}},[items,ready]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError(null);fetchWithTimeout(eventId?'/api/site-data/events':'/api/site-data/products',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();if(!d.ok)throw Error();startTransition(()=>{if(eventId){const current=d.events?.find((e:Event)=>e.id===eventId);setEvent(current);const first=current?.tiers.findIndex((t:Event['tiers'][number])=>t.sellable!==false);setTier(first>=0?first:0);setQty(current?.tiers[first>=0?first:0]?.per_order_min||1)}else setProducts(d.products||[])});}).catch(()=>{if(!controller.signal.aborted)setError({key:'catalogue.loadFailed'});}).finally(()=>{if(!controller.signal.aborted)startTransition(()=>setLoading(false))});return()=>controller.abort()},[eventId,retry]);
 useEffect(()=>{
  if(eventId||view!=='checkout')return;
  const controller=new AbortController();startTransition(()=>{setFulfillmentLoading(true);setFulfillmentError(null)});
  fetchWithTimeout('/api/checkout/fulfillment',{signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error();const d=await r.json();
   if(typeof d.pickup?.location!=='string'||typeof d.delivery?.enabled!=='boolean'||d.delivery.enabled&&(!Number.isSafeInteger(d.delivery.fee)||d.delivery.fee<0))throw Error();
   if(!controller.signal.aborted)setFulfillmentOptions(d);
  }).catch(()=>{if(!controller.signal.aborted)setFulfillmentError({key:'fulfillment.loadFailed'})}).finally(()=>{if(!controller.signal.aborted)setFulfillmentLoading(false)});
  return()=>controller.abort();
 },[eventId,view,fulfillmentRetry]);
 const fulfillment={method:fulfillmentMethod,...(fulfillmentMethod==='delivery'?{address:{line1:address.line1,city:address.city,...(address.postalCode?{postalCode:address.postalCode}:{})}}:{})};
 const deliveryFee=fulfillmentMethod==='delivery'?(fulfillmentOptions?.delivery.fee||0):0;
 const productFor=(item:Item)=>products.find(p=>p.id===item.id);const amount=(item:Item)=>{const p=productFor(item);return (p?.price||0)+(p?.variants.find(v=>v.label===item.variant)?.priceAdjustment||0)};
 const unavailable=items.some(i=>{const p=productFor(i);if(!p)return true;const variant=p.variants.find(v=>v.label===i.variant);if(i.variant&&!variant||i.printableName&&!p.name_on_back_enabled)return true;const productQty=items.filter(item=>item.id===i.id).reduce((sum,item)=>sum+item.qty,0);const variantQty=items.filter(item=>item.id===i.id&&item.variant===i.variant).reduce((sum,item)=>sum+item.qty,0);return typeof p.stock==='number'&&productQty>p.stock||typeof variant?.stock==='number'&&variantQty>variant.stock});
 const catalogue=buildShopCatalogue(products);
 const matches=filterShopCatalogue(catalogue,{selected,category,query:search,availability,sort});
 const categories=[...new Set(catalogue.map(p=>p.category).filter((value):value is string=>!!value))];
 const variationFor=(p:Product)=>variants[p.id]||p.variants.find(v=>v.stock!==0)?.label||p.variants[0]?.label;
 const selectionFull=(p:Product)=>{const variation=variationFor(p);const variant=p.variants.find(v=>v.label===variation);const productQty=items.filter(i=>i.id===p.id).reduce((sum,i)=>sum+i.qty,0);const variantQty=items.filter(i=>i.id===p.id&&i.variant===variation).reduce((sum,i)=>sum+i.qty,0);return typeof p.stock==='number'&&productQty>=p.stock||typeof variant?.stock==='number'&&variantQty>=variant.stock};
 const quoteKey=JSON.stringify({items,promo,fulfillment});const approvedQuote=quote?.key===quoteKey?quote:null;
 useEffect(()=>{quoteRequest.current?.abort();setQuoting(false);setQuoteError(null);return()=>quoteRequest.current?.abort()},[quoteKey]);
 const estimated=eventId?(event?.tiers[tier]?.price||0)*qty:items.reduce((sum,i)=>sum+amount(i)*i.qty,0)+deliveryFee;
 const total=approvedQuote?.total??estimated;
 async function checkQuote(){quoteRequest.current?.abort();const controller=new AbortController();quoteRequest.current=controller;setQuoting(true);setQuoteError(null);const requestKey=quoteKey;try{const r=await fetchWithTimeout('/api/checkout/quote',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({items,promoCode:promo||undefined,fulfillment})});const d=await r.json();if(controller.signal.aborted)return;if(!r.ok||!Number.isSafeInteger(d.total)||d.total<1)throw Error();setQuote({key:requestKey,total:d.total,promoApplied:d.promoApplied,savings:Number.isSafeInteger(d.savings)&&d.savings>=0?d.savings:0,deliveryFee:Number.isSafeInteger(d.deliveryFee)&&d.deliveryFee>=0?d.deliveryFee:0});if(promo&&!d.promoApplied)setQuoteError({key:'quote.promoNotApplied'})}catch{if(!controller.signal.aborted)setQuoteError({key:'quote.failed'})}finally{if(!controller.signal.aborted)setQuoting(false)}}
 function add(p:Product){if(selectionFull(p))return;const variant=variationFor(p);let printableName:string|undefined;try{printableName=normalizePrintableName(p.name_on_back_enabled&&printableNames[p.id]?.trim()?printableNames[p.id]:undefined)}catch{setNotice({key:'personalization.invalidPrintedName'});return}setItems(old=>addCartItem(old,{id:p.id,qty:1,variant,...(printableName?{printableName}:{})}));;setNotice({key:'cart.productAdded',values:{name:p.name}})}
 async function pay(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(pending.current)return;if(!eventId&&(fulfillmentLoading||fulfillmentError||!fulfillmentOptions)){setFulfillmentError({key:'fulfillment.loadFailed'});return}if(eventId?(!event?.sellable||!event.tiers[tier]||event.tiers[tier].sellable===false):(!items.length||unavailable)){setError({key:'checkout.selectionUnavailable'});return}pending.current=true;setBusy(true);setError(null);
 try{
  if(method==='card'&&!eventId){
   const saved=await paystackCheckoutAttempt();key.current=saved.key;
   if(saved.recovered&&(paymentPresentation(saved.recovered.paymentStatus).terminal||saved.recovered.attemptState!=='prepared')){
    const url=saved.recovered.authorizationUrl;
    window.location.assign(!paymentPresentation(saved.recovered.paymentStatus).terminal&&saved.recovered.attemptState==='ready'&&typeof url==='string'&&new URL(url).protocol==='https:'?url:'/pay/success?ref='+encodeURIComponent(saved.recovered.id));return;
   }
   const body={items,name:form.name||undefined,phone:form.phone||undefined,email:form.email||undefined,promoCode:promo||undefined,fulfillment,...(referralCode?{referralCode}:{})};
   const options={method:'POST',headers:{'Content-Type':'application/json'}};
   let r=await fetchWithTimeout('/api/paystack/checkout',{...options,body:JSON.stringify({...body,idempotencyKey:saved.key})});let d=await r.json();
   if(r.status===503&&d.error==='card_not_configured'&&!d.id&&!d.orderId){
    // This response precedes Paystack order/provider creation. Stripe has its
    // own strict request schema and does not accept the Paystack attempt key.
    r=await fetchWithTimeout('/api/stripe/checkout',{...options,body:JSON.stringify(body)});d=await r.json();
    const url=d.url;
    if(r.ok&&typeof url==='string'&&new URL(url).protocol==='https:'){
     if(d.orderId||d.id)try{sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id:d.orderId||d.id,items}))}catch{}
     window.location.assign(url);return;
    }
   }else{
    const id=typeof d.id==='string'&&d.id?d.id:typeof d.orderId==='string'&&d.orderId?d.orderId:null;
    if(id)rememberPaystackOrder(saved.key,id,typeof d.attemptState==='string'?d.attemptState:'unknown');
    if(r.ok&&id){
     try{sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id,items}))}catch{}
     const url=d.authorizationUrl;
     window.location.assign(d.attemptState==='ready'&&typeof url==='string'&&new URL(url).protocol==='https:'?url:'/pay/success?ref='+encodeURIComponent(id));return;
    }
   }
   setError({key:typeof d.error==='string'&&Object.prototype.hasOwnProperty.call(checkoutIssueCodes,d.error)?checkoutIssueCodes[d.error]:'checkout.cardUnavailable'});return;
  }
  const saved=await checkoutAttempt();key.current=saved.key;if(saved.recovered&&saved.recovered.attemptState!=='prepared'){window.location.assign('/pay/success?ref='+encodeURIComponent(saved.recovered.id));return}const r=await fetchWithTimeout('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,email:form.email||undefined,idempotencyKey:key.current,promoCode:promo||undefined,...(referralCode?{referralCode}:{}),...(eventId?{ticket:{eventId,tier,qty}}:{items,fulfillment})})});const d=await r.json();if(typeof d.id==='string'&&d.id)rememberCheckoutOrder(key.current,d.id,d.attemptState||'unknown');if(r.ok&&typeof d.id==='string'&&d.id){try{sessionStorage.setItem('ugt-checkout-order',JSON.stringify({id:d.id,items,eventId}))}catch{}window.location.assign('/pay/success?ref='+encodeURIComponent(d.id));return}setError({key:typeof d.error==='string'&&Object.prototype.hasOwnProperty.call(checkoutIssueCodes,d.error)?checkoutIssueCodes[d.error]:'checkout.startFailed'});
 }catch(error){const code=error instanceof Error?error.message:'';setError({key:code==='checkout_recovery_session_lost'?'checkout.recoverySessionLost':code==='checkout_storage_unavailable'?'checkout.storageUnavailable':method==='card'?'checkout.cardUncertain':'checkout.paymentUncertain'})}finally{pending.current=false;setBusy(false)}}
 const selectedTier=event?.tiers[tier];
 const ticketMinimum=selectedTier?.per_order_min||1;
 const ticketMaximum=Math.max(ticketMinimum,Math.min(selectedTier?.per_order_max||20,selectedTier?.remaining??20));
 const cartCount=items.reduce((sum,item)=>sum+item.qty,0);
 const subtotal=items.reduce((sum,item)=>sum+amount(item)*item.qty,0);
 const summary=<aside className={styles.summary} aria-label={t('checkout.summary')}><p className="eyebrow">{t('checkout.selection')}</p><h2 className={styles.summaryTotal}>{t('checkout.total',{amount:money(total)})}</h2><dl><div><dt>{t('items.count',{count:cartCount})}</dt><dd>{money(subtotal)}</dd></div>{view==='checkout'&&<div><dt>{fulfillmentMethod==='delivery'?t('fulfillment.delivery'):t('fulfillment.pickup')}</dt><dd>{money(approvedQuote?.deliveryFee??deliveryFee)}</dd></div>}{!!approvedQuote?.savings&&<div><dt>{t('checkout.savings')}</dt><dd>−{money(approvedQuote.savings)}</dd></div>}</dl>{view==='cart'&&!unavailable&&!loading&&<a className="button" href="/checkout">{t('checkout.secure')}</a>}<p>{approvedQuote?t('checkout.confirmed'):t('checkout.confirmLater')}</p><p>{t('checkout.providers')} <a href="/refund-policy">{t('refund.read')}</a>.</p></aside>;
 const savedAttempt=ready?(method==='card'&&!eventId?readPaystackAttempt():readCheckoutAttempt()):null;
 const paymentForm=(view==='checkout'||eventId)&&!loading&&(eventId?event?.sellable:items.length>0&&!unavailable)?<form className={`modern-form ${styles.checkoutForm} ${eventId?styles.ticketForm:''}`} onSubmit={pay} aria-busy={busy}>
  {event&&<fieldset><legend>{t('tickets.choose')}</legend><label>{t('tickets.tier')}<select value={tier} onChange={e=>{const index=Number(e.target.value);setTier(index);setQty(event?.tiers[index]?.per_order_min||1);}}>{event.tiers.map((option,i)=><option key={i} value={i} disabled={option.sellable===false}>{option.name} · {money(option.price)}{option.sellable===false?t('tickets.unavailable'):''}</option>)}</select></label><label>{t('tickets')}<input type="number" min={ticketMinimum} max={ticketMaximum} value={qty} onChange={e=>{setQty(Math.min(ticketMaximum,Math.max(ticketMinimum,Number(e.target.value)||ticketMinimum)));}}/></label><h2>{t('checkout.total',{amount:money(total)})}</h2></fieldset>}
  {!eventId&&<fieldset><legend>{t('fulfillment.step')}</legend>{fulfillmentLoading&&<p role="status">{t('fulfillment.loading')}</p>}{fulfillmentError&&<div role="alert"><p className={styles.error}>{t(fulfillmentError.key,fulfillmentError.values)}</p><button type="button" className="button secondary" onClick={()=>setFulfillmentRetry(value=>value+1)}>{t('fulfillment.retry')}</button></div>}<label>{t('fulfillment.method')}<select value={fulfillmentMethod} disabled={busy||fulfillmentLoading||!!fulfillmentError} onChange={e=>{setFulfillmentMethod(e.target.value as 'pickup'|'delivery');}}><option value="pickup">{t('fulfillment.pickup')} · {money(0)}</option>{fulfillmentOptions?.delivery.enabled&&<option value="delivery">{t('fulfillment.delivery')} · {money(fulfillmentOptions.delivery.fee||0)}</option>}</select></label>{fulfillmentMethod==='pickup'?<p>{fulfillmentOptions?.pickup.location?<span lang="en-KE">{fulfillmentOptions.pickup.location}</span>:t('fulfillment.pickupNote')}</p>:<>{(['line1','city','postalCode'] as const).map(field=><label key={field}>{field==='line1'?t('fulfillment.address'):field==='city'?t('fulfillment.city'):t('fulfillment.postal')}<input name={field} required={field!=='postalCode'} maxLength={field==='postalCode'?20:200} autoComplete={field==='line1'?'address-line1':field==='city'?'address-level2':'postal-code'} value={address[field]} onChange={e=>{setAddress({...address,[field]:e.target.value});}}/></label>)}<p>{t('fulfillment.feeNote',{amount:money(deliveryFee)})}</p></>}</fieldset>}
  <fieldset className={styles.paymentStep}><legend>{eventId?t('checkout.details'):t('checkout.detailsStep')}</legend>{!eventId&&<label>{t('checkout.method')}<select value={method} onChange={e=>{setMethod(e.target.value);}}><option value="mpesa">M-Pesa</option><option value="card">{t('checkout.card')}</option></select></label>}{((method==='card'&&fulfillmentMethod!=='delivery'?['email']:['name','phone','email']) as ('name'|'phone'|'email')[]).map(field=><label key={field}>{field==='name'?t('checkout.name'):field==='phone'?(method==='card'?t('checkout.deliveryPhone'):t('checkout.phone')):t('checkout.email')}<input name={field} required={field!=='email'} type={field==='email'?'email':field==='phone'?'tel':'text'} autoComplete={field==='phone'?'tel':field} minLength={field==='name'?2:undefined} maxLength={field==='name'?100:field==='email'?200:20} placeholder={field==='phone'?t('checkout.phoneHint'):undefined} value={form[field]} onChange={e=>{setForm({...form,[field]:e.target.value});}}/></label>)}<p className="form-note">{t('checkout.emailHelp')}</p></fieldset>
  {!eventId&&<fieldset className={styles.paymentStep}><legend>{t('checkout.reviewStep')}</legend><label>{t('checkout.promo')}<input maxLength={60} value={promo} onChange={e=>{setPromo(e.target.value);}}/></label><button type="button" className="button secondary" disabled={quoting||busy} onClick={checkQuote}>{quoting?t('checkout.quoting'):t('checkout.checkQuote')}</button>{approvedQuote&&<div role="status" className={styles.quoteResult}><p>{t('checkout.quoteTotal',{amount:money(approvedQuote.total)})}</p>{approvedQuote.savings>0&&<p>{t('checkout.youSave',{amount:money(approvedQuote.savings)})}</p>}{approvedQuote.deliveryFee>0&&<p>{t('checkout.includesDelivery',{amount:money(approvedQuote.deliveryFee)})}</p>}</div>}{quoteError&&<p role="alert" className={styles.error}>{t(quoteError.key,quoteError.values)}</p>}</fieldset>}
  {referralCode&&<p>{t('checkout.referral')} <button type="button" onClick={()=>{clearAffiliateReferral();setReferralCode('')}}>{t('checkout.clearReferral')}</button></p>}
  <label className="checkbox"><input type="checkbox" required/> <MessageText catalogue={commerceMessages} message="checkout.consent" values={{terms:<a href="/terms" target="_blank" rel="noopener">{t('terms')}</a>,refund:<a href="/refund-policy" target="_blank" rel="noopener">{t('refund')}</a>,privacy:<a href="/privacy-policy" target="_blank" rel="noopener">{t('privacy')}</a>}}/></label><p>{method==='card'?t('checkout.cardNote'):t('checkout.mpesaNote')}</p><button type="submit" className="button" disabled={busy||(!eventId&&(fulfillmentLoading||!!fulfillmentError||!fulfillmentOptions))}>{busy?t('checkout.starting'):method==='card'?t('checkout.continueCard'):t('checkout.payMpesa',{amount:money(total)})}</button>
 </form>:null;
 return <section className={`modern-page ${view==='shop'?shopStyles.page:styles.page}`}>
  <CommerceIntro view={view} eventId={eventId} eventName={event?.name} selected={selected} cartCount={cartCount} featuredProduct={products.find(product=>product.made_to_order&&product.id==='cb-oversized-tee')}/>
  {notice&&<div className={styles.notice} role="status"><span>{t(notice.key,notice.values)}</span><a href="/cart">{t('cart.view')}</a></div>}
  {loading&&<p className={styles.loading} role="status">{t('shop.loading')}</p>}
  {savedAttempt?.orderId&&view==='checkout'&&<p role="status"><MessageText catalogue={commerceMessages} message="checkout.saved" values={{order:<a href={'/pay/success?ref='+encodeURIComponent(savedAttempt.orderId)}>{t('checkout.existing')}</a>}}/></p>}
  {error&&<div className="modern-alert" role="alert">{t(error.key,error.values)} {!busy&&<button type="button" onClick={()=>setRetry(n=>n+1)}>{t('checkout.reload')}</button>}</div>}
  {!loading&&!error&&view==='shop'&&!products.length&&<div className={styles.empty}><ShopNoProductsNotice/></div>}
  {view==='shop'&&<ShopCatalogueView products={matches} categories={categories} availability={availability} search={search} sort={sort} category={category} printableNames={printableNames} onAvailability={setAvailability} onSearch={setSearch} onSort={setSort} onCategory={setCategory} variationFor={variationFor} selectionFull={selectionFull} onVariation={(id,value)=>setVariants({...variants,[id]:value})} onName={(id,value)=>setPrintableNames({...printableNames,[id]:value})} onAdd={add}/>}
  {!loading&&!error&&view==='shop'&&catalogue.length>0&&!matches.length&&<div className={styles.empty} role="status"><h2>{selected?t('shop.unavailable'):t('shop.emptySearch')}</h2><p>{selected?t('shop.chooseAnother'):t('shop.trySearch')}</p><button type="button" className="button" onClick={()=>{setSearch('');setSelected('');setCategory('');setAvailability('all')}}>{t('shop.viewAll')}</button></div>}
  {view!=='shop'&&!eventId&&ready&&(!items.length?<div className={styles.empty}><h2>{t('cart.empty')}</h2><p>{t('cart.browse')}</p><a className="button" href="/shop">{t('shop.merch')}</a></div>:<div className={`${styles.transactionGrid} ${view==='cart'?styles.cartOnly:''}`}><section className={styles.cartItems} aria-label={t('cart.items')}><h2>{view==='checkout'?t('cart.reviewItems'):t('cart.items')} · {cartCount}</h2>{items.map((i,index)=>{const product=productFor(i);return <article className={styles.cartLine} key={i.id+'-'+i.variant+'-'+index}><a href={'/shop/'+encodeURIComponent(i.id)} className={styles.cartImage} aria-label={t('product.view',{name:product?.name||t('shop.merchandise')})}>{product?.image?<img src={product.image} alt="" loading="lazy"/>:<span className={styles.imageEmpty}>{t('product.noImage')}</span>}</a><div><h2>{product?<a lang="en-KE" href={'/shop/'+encodeURIComponent(i.id)}>{product.name}</a>:t('product.unavailable')}</h2><p>{i.variant?<span lang="en-KE">{i.variant} · </span>:''}{money(amount(i))} {t('each')}</p>{i.printableName&&<p>{t('personalization.label')}: <strong lang="">{i.printableName}</strong> · {t('free')}</p>}<div className={styles.cartControls}><label>{t('quantity')} <input aria-label={t('quantity.for',{name:product?.name||i.id})} type="number" min={1} max={20} value={i.qty} onChange={e=>{setItems(old=>old.map((x,n)=>n===index?{...x,qty:Math.min(20,Math.max(1,Number(e.target.value)||1))}:x));}}/></label><button type="button" aria-label={t('remove.product',{name:product?.name||t('shop.merchandise')})} onClick={()=>{setItems(old=>old.filter((_,n)=>n!==index));}}>{t('remove')}</button></div>{product?.name_on_back_enabled&&<PrintedNameEditor id={'cart-name-'+index} value={i.printableName} disabled={busy} onSave={name=>{setItems(old=>old.map((line,n)=>{if(n!==index)return line;const {printableName:_previous,...base}=line;return {...base,...(name?{printableName:name}:{})}}));}}/>}</div></article>})}{unavailable&&!loading&&<p role="alert" className={styles.error}>{t('cart.reduce')}</p>}{view==='checkout'&&summary}</section>{view==='cart'?summary:paymentForm}</div>)}
  {eventId&&!loading&&(!event||!event.sellable)&&<div className={styles.empty}><h2>{t('tickets.closed')}</h2><a className="button" href="/events">{t('tickets.other')}</a></div>}
  {eventId&&paymentForm}
 </section>
}
