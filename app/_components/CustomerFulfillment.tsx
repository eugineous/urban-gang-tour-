'use client';
import {formatKes} from '@/lib/i18n/format';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,type CustomerIssue,statusIssue} from '@/ui/i18n/catalogues/account';
import {useEffect,useState} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
export default function CustomerFulfillment({orderId}:{orderId:string}){
 const t=useMessages(accountMessages);const {locale}=useInterfaceLanguage();const money=(value:number)=>formatKes(value,locale)??'';
 const [data,setData]=useState<any>(null),[error,setError]=useState<CustomerIssue|null>(null),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError(null);
  fetchWithTimeout('/api/orders/tracking?id='+encodeURIComponent(orderId),{signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error();const next=await response.json();if(!controller.signal.aborted)setData(next);})
   .catch(()=>{if(!controller.signal.aborted)setError({key:'copy.we_could_not_load_tracking_please_retry'});});
  return()=>controller.abort();
 },[orderId,refresh]);
 return <section className="modern-card"><h2>{t("copy.your_order_progress")}</h2>{error?<p role="alert">{error?t(error.key,error.values):null}</p>:!data?<p role="status">{t("copy.loading_order_progress")}</p>:<><p>{t("copy.payment")} <strong>{t(statusIssue(data.paymentStatus).key)}</strong></p>{data.preference&&<p>{data.preference.method==='delivery'?t("copy.delivery"):t("copy.collection")} {t("copy.selected")}{Number(data.preference.fee)>0?' · '+money(Number(data.preference.fee)):''}</p>}<p role="status">{data.fulfillment?t(statusIssue(data.fulfillment.status,'fulfillment').key):t("copy.no_merchandise_handover_has_been_recorded_yet")}</p>{data.fulfillment?.handoff_method&&<p>{t("copy.handover")} {t(statusIssue(data.fulfillment.handoff_method,'handoff').key)}</p>}{data.fulfillment?.reference&&<p>{t("copy.tracking_reference")} {data.fulfillment.reference}</p>}{data.history?.length>0&&<ol aria-label={t("copy.recorded_order_updates")}>{data.history.map((update:any,index:number)=><li key={index}><strong>{t(statusIssue(update.status,'fulfillment').key)}</strong><br/><time dateTime={update.created_at}>{new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(update.created_at))}</time></li>)}</ol>}</>}<button className="button" type="button" onClick={()=>setRefresh(v=>v+1)}>{t("copy.refresh_progress")}</button></section>}
