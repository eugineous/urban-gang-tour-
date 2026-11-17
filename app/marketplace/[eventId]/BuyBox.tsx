'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {useMessages,useInterfaceLanguage} from '@/ui/i18n/LanguageProvider';
import {commerceMessages,type CommerceIssue} from '@/ui/i18n/catalogues/commerce';
import {formatKes} from '@/lib/i18n/format';
import {paystackCheckoutAttempt,rememberPaystackOrder} from '@/lib/client/paystack-checkout-attempt';
import {useRouter} from 'next/navigation';
import {paymentPresentation} from '@/lib/client/payment-presentation';
import {useRef,useState} from 'react';
interface Tier{name:string;price:number;capacity:number|null}
export default function BuyBox({eventId,tiers}:{eventId:string;tiers:Tier[]}){
 const router=useRouter();
 const t=useMessages(commerceMessages);const {locale}=useInterfaceLanguage();const money=(amount:number)=>formatKes(amount,locale)??'';
 const [tier,setTier]=useState(0),[qty,setQty]=useState(1),[name,setName]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState<CommerceIssue|null>(null),[accepted,setAccepted]=useState(false);const lock=useRef(false);
 async function buy(e:React.FormEvent){
  e.preventDefault();if(lock.current)return;setErr(null);
  if(!tiers.length||tiers[tier]?.capacity===null||!Number.isSafeInteger(tiers[tier]?.capacity)||Number(tiers[tier]?.capacity)<qty){setErr({key:'marketplace.ticketsUnavailable'});return}
  if(!accepted){setErr({key:'marketplace.acceptTerms'});return}if(name.trim().length<2){setErr({key:'marketplace.holderNameRequired'});return}
  lock.current=true;setBusy(true);let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const saved=await paystackCheckoutAttempt();
   if(saved.recovered&&(saved.recovered.attemptState!=='prepared'||paymentPresentation(saved.recovered.paymentStatus).terminal)){
    const url=saved.recovered.authorizationUrl;
    if(!paymentPresentation(saved.recovered.paymentStatus).terminal&&saved.recovered.attemptState==='ready'&&typeof url==='string'&&/^https:\/\/checkout\.paystack\.com\/[A-Za-z0-9_-]{1,200}$/.test(url))location.assign(url);
    else router.push('/pay/success?ref='+encodeURIComponent(saved.recovered.id));return;
   }
   const controller=new AbortController();timer=setTimeout(()=>controller.abort(),20000);
   const r=await fetch('/api/marketplace/checkout',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,tier,qty,name:name.trim(),email:email.trim()||undefined,idempotencyKey:saved.key})});
   const data=await r.json().catch(()=>({}));
   if(typeof data.id==='string'&&/^ORD-[A-Z0-9-]{4,40}$/.test(data.id)){
    rememberPaystackOrder(saved.key,data.id,typeof data.attemptState==='string'?data.attemptState:'unknown');
    if(data.ok){if(data.attemptState==='ready'&&typeof data.authorizationUrl==='string'&&/^https:\/\/checkout\.paystack\.com\/[A-Za-z0-9_-]{1,200}$/.test(data.authorizationUrl))location.assign(data.authorizationUrl);else router.push('/pay/success?ref='+encodeURIComponent(data.id));return}
   }
   setErr({key:data.error==='paystack_not_configured'?'marketplace.cardUnavailable':['event_not_sellable','sold_out','insufficient_inventory'].includes(data.error)?'marketplace.ticketsUnavailable':'marketplace.startFailed'});
  }catch{setErr({key:'marketplace.connectionFailed'})}finally{if(timer)clearTimeout(timer);lock.current=false;setBusy(false)}
 }

 const unavailable=!tiers.length||!Number.isSafeInteger(tiers[tier]?.capacity)||Number(tiers[tier]?.capacity)<qty;
 return <form className="current-card current-buybox" onSubmit={buy}>
  <h2>{t('tickets.choose')}</h2>
  <label>{t('tickets.tier')}<select value={tier} onChange={e=>setTier(Number(e.target.value))} disabled={busy||!tiers.length}>{tiers.map((t,i)=><option key={i} value={i}>{t.name} · {money(t.price)}</option>)}</select></label>
  <label>{t('quantity')}<input type="number" min={1} max={20} required value={qty} disabled={busy} onChange={e=>setQty(Math.max(1,Math.min(20,Number(e.target.value)||1)))}/></label>
  <label>{t('marketplace.holder')}<input autoComplete="name" required minLength={2} maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
  <label>{t('checkout.email')}<input type="email" autoComplete="email" maxLength={200} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label>
  <p className="checkout-total">{t('checkout.total',{amount:money((tiers[tier]?.price||0)*qty)})}</p>
  <label className="buybox-consent"><input type="checkbox" required checked={accepted} disabled={busy} onChange={e=>setAccepted(e.target.checked)}/><MessageText catalogue={commerceMessages} message="marketplace.consent" values={{terms:<a href="/terms" target="_blank" rel="noopener">{t('terms')}</a>,refund:<a href="/refund-policy" target="_blank" rel="noopener">{t('refund')}</a>}}/></label>
  {err&&<p role="alert">{t(err.key,err.values)}</p>}{!err&&unavailable&&<p>{t('marketplace.ticketsUnavailable')}</p>}
  <button type="submit" className="button" disabled={busy||unavailable}>{busy?t('marketplace.opening'):t('marketplace.payCard')}</button><p>{t('marketplace.provider')}</p>
 </form>
}
