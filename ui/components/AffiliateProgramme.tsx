'use client';
import {formatKes} from '@/lib/i18n/format';
import {OriginalContent} from '@/ui/i18n/OriginalContent';

import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {formsMessages,type CustomerIssue,factoryIssue,fromError,statusIssue} from '@/ui/i18n/catalogues/forms';
import {useEffect,useState} from 'react';
import Link from './DocumentLink';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
type Program={enabled:boolean;rateBps:number|null;termsVersion:string;terms:string;eligibleEventIds:string[]};
type Application={id:string;status:string;accepted_terms_version?:string};
type Earnings={earned_kes:number;recorded_payout_kes:number;balance_kes:number;sales:{order_id:string;event_id:string;commission_kes:number;status:string}[];payouts:{id:string;amount:number;reference:string;created_at:string}[]};
export default function AffiliateProgramme(){
 const t=useMessages(formsMessages);const {locale}=useInterfaceLanguage();const money=(value:number)=>formatKes(value,locale)??'';
 const[application,setApplication]=useState<Application|null>(null),[program,setProgram]=useState<Program|null>(null),[earnings,setEarnings]=useState<Earnings|null>(null),[message,setMessage]=useState<CustomerIssue|null>({"key":"copy.loading_programme"}),[busy,setBusy]=useState(false),[accepted,setAccepted]=useState(false);
 async function load(){try{const r=await fetchWithTimeout('/api/affiliates');const b=await r.json();if(r.status===401){setApplication(null);setProgram(null);setEarnings(null);setAccepted(false)}if(!r.ok)throw Error(r.status===401?'Sign in to submit or view your application.':'The programme is temporarily unavailable. Please retry.');setApplication(b.application);setProgram(b.program);setEarnings(b.earnings);setMessage(null)}catch(e){setMessage(fromError(e))}}
 useEffect(()=>{void load()},[]);
 const active=application?.status==='approved'&&program?.enabled&&application.accepted_terms_version===program.termsVersion;
 async function acceptTerms(e:React.FormEvent){e.preventDefault();if(!accepted||!program)return;setBusy(true);try{const r=await fetchWithTimeout('/api/affiliates/terms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({termsVersion:program.termsVersion})});if(!r.ok)throw Error('Terms may have changed. Refresh and review them again.');await load()}catch(e){setMessage(fromError(e))}finally{setBusy(false)}}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const b=Object.fromEntries(new FormData(e.currentTarget));try{const r=await fetchWithTimeout('/api/affiliates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw Error(r.status===401?'Please sign in before applying.':'Could not submit. Please retry.');await load()}catch(error){setMessage(fromError(error))}finally{setBusy(false)}}
 return <>
  <section className="page-intro wrap"><div><p className="eyebrow">{t("copy.referral_programme")}</p><h1>{t("copy.event_referral")}<br/>{t("copy.programme_2")}</h1></div><p><span lang="en-KE">Refer audiences to eligible Urban Gang Tour ticketed events. External ticket sellers and merchandise purchases are excluded.</span></p></section>
  <section className="booking-layout wrap">
   <div className="booking-pitch"><h2>{t("copy.know_the_terms_before_you_share")}</h2><ol><li><span lang="en-KE">Sign in and tell us about your audience.</span></li><li><span lang="en-KE">Our team reviews your application.</span></li><li><span lang="en-KE">Accept the current programme terms.</span></li><li><span lang="en-KE">Share your link and follow verified sales here.</span></li></ol>
    {program?.enabled ? <><p>{t("copy.commission")} {(Number(program.rateBps)/100).toFixed(2)}<span lang="en-KE">% of eligible paid ticket revenue after refunds. Pending, cancelled and failed payments earn nothing.</span></p><p>{t("copy.terms_version")} {program.termsVersion}</p><OriginalContent disclose><div style={{whiteSpace:'pre-wrap'}}>{program.terms}</div></OriginalContent><p>{t("copy.eligible_event_ids")} {program.eligibleEventIds.join(', ')}</p></> : program ? <p><span lang="en-KE">The team has not enabled commission terms. Applications can be reviewed, but links and sales attribution stay inactive until configured.</span></p> : <p><span lang="en-KE">Sign in to view current programme terms. If they cannot load, use Refresh programme to retry.</span></p>}
    <Link className="button secondary" href="/account">{t("copy.your_account")}</Link>
   </div>
   <div className="booking-form"><p role="status">{message?t(message.key,message.values):null}</p><button className="button secondary" type="button" disabled={busy} onClick={()=>void load()}>{t("copy.refresh_programme")}</button>
    {application ? <>
      <h2>{t("copy.application")} {t(statusIssue(application.status).key)}{t("copy.")}</h2>
      {application.status==='approved' && program?.enabled && !active && <form onSubmit={acceptTerms}><label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> {t("copy.i_have_read_and_accept_programme_terms")} {program.termsVersion}{t("copy.")}</label><button type="submit" className="button" disabled={!accepted||busy}>{t("copy.accept_terms_and_activate_link")}</button></form>}
      {active && <><h3>{t("copy.your_referral_link")}</h3><a style={{overflowWrap:'anywhere'}} href={'/events?ref='+application.id}>{'https://urbangangtour.co.ke/events?ref='+application.id}</a><p><span lang="en-KE">Attribution lasts for this browser tab, up to 24 hours. Buyers can remove it before checkout. Self-referrals are excluded.</span></p></>}
      {earnings && <>
       <h3>{t("copy.your_commission_ledger")}</h3><p>{t(factoryIssue("Earned:").key)} {money(earnings.earned_kes)} · {t(factoryIssue("Recorded payouts:").key)} {money(earnings.recorded_payout_kes)}</p><p>{t(factoryIssue("Balance:").key)} {money(earnings.balance_kes)}</p><p><span lang="en-KE">Refunds can reduce earnings after a payout. A recorded payout is a ledger entry, not an automatic transfer.</span></p>
       {earnings.sales.length ? earnings.sales.map(s=><p key={s.order_id}>{s.order_id} · {t(statusIssue(s.status).key)} · {money(Number(s.commission_kes))}</p>) : <p>{t("copy.no_attributed_sales_yet")}</p>}
       {earnings.payouts.map(p=><p key={p.id}>{t(factoryIssue("Payout").key)} {money(p.amount)} · {p.reference}</p>)}
      </>}
    </> : <form onSubmit={submit}><h2>{t("copy.apply_to_refer_events")}</h2><label>{t("copy.your_name")}<input name="name" required autoComplete="name" maxLength={100}/></label><label>{t("copy.where_would_you_share_events")}<textarea name="audience" required rows={3} minLength={10} maxLength={1000}/></label><button className="button" type="submit" disabled={busy}>{busy?t("copy.submitting"):t("copy.submit_application")}</button><p>{t("copy.your_application_is_securely_saved_to_your_account")}</p></form>}
   </div>
  </section>
 </>;
}
