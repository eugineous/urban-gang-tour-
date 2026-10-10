'use client';
import {useEffect,useState} from 'react';
import Link from './DocumentLink';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
type Program={enabled:boolean;rateBps:number|null;termsVersion:string;terms:string;eligibleEventIds:string[]};
type Application={id:string;status:string;accepted_terms_version?:string};
type Earnings={earned_kes:number;recorded_payout_kes:number;balance_kes:number;sales:{order_id:string;event_id:string;commission_kes:number;status:string}[];payouts:{id:string;amount:number;reference:string;created_at:string}[]};
export default function AffiliateProgramme(){
 const[application,setApplication]=useState<Application|null>(null),[program,setProgram]=useState<Program|null>(null),[earnings,setEarnings]=useState<Earnings|null>(null),[message,setMessage]=useState('Loading programme…'),[busy,setBusy]=useState(false),[accepted,setAccepted]=useState(false);
 async function load(){try{const r=await fetchWithTimeout('/api/affiliates');const b=await r.json();if(r.status===401){setApplication(null);setProgram(null);setEarnings(null);setAccepted(false)}if(!r.ok)throw Error(r.status===401?'Sign in to submit or view your application.':'The programme is temporarily unavailable. Please retry.');setApplication(b.application);setProgram(b.program);setEarnings(b.earnings);setMessage('')}catch(e){setMessage(e instanceof Error?e.message:'Please retry.')}}
 useEffect(()=>{void load()},[]);
 const active=application?.status==='approved'&&program?.enabled&&application.accepted_terms_version===program.termsVersion;
 async function acceptTerms(e:React.FormEvent){e.preventDefault();if(!accepted||!program)return;setBusy(true);try{const r=await fetchWithTimeout('/api/affiliates/terms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({termsVersion:program.termsVersion})});if(!r.ok)throw Error('Terms may have changed. Refresh and review them again.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Could not accept terms.')}finally{setBusy(false)}}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const b=Object.fromEntries(new FormData(e.currentTarget));try{const r=await fetchWithTimeout('/api/affiliates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw Error(r.status===401?'Please sign in before applying.':'Could not submit. Please retry.');await load()}catch(error){setMessage(error instanceof Error?error.message:'Could not submit.')}finally{setBusy(false)}}
 return <>
  <section className="page-intro wrap"><div><p className="eyebrow">Referral programme</p><h1>Share the event.<br/>Grow the audience.</h1></div><p>Refer audiences to eligible Urban Gang Tour ticketed events. External ticket sellers and merchandise purchases are excluded.</p></section>
  <section className="booking-layout wrap">
   <div className="booking-pitch"><h2>Know the terms before you share.</h2><ol><li>Sign in and tell us about your audience.</li><li>Our team reviews your application.</li><li>Accept the current programme terms.</li><li>Share your link and follow verified sales here.</li></ol>
    {program?.enabled ? <><p>Commission: {(Number(program.rateBps)/100).toFixed(2)}% of eligible paid ticket revenue after refunds. Pending, cancelled and failed payments earn nothing.</p><p>Terms version: {program.termsVersion}</p><div style={{whiteSpace:'pre-wrap'}}>{program.terms}</div><p>Eligible event IDs: {program.eligibleEventIds.join(', ')}</p></> : program ? <p>The team has not enabled commission terms. Applications can be reviewed, but links and sales attribution stay inactive until configured.</p> : <p>Sign in to view current programme terms. If they cannot load, use Refresh programme to retry.</p>}
    <Link className="button secondary" href="/account">Your account</Link>
   </div>
   <div className="booking-form"><p role="status">{message}</p><button className="button secondary" type="button" disabled={busy} onClick={()=>void load()}>Refresh programme</button>
    {application ? <>
      <h2>Application {application.status}.</h2>
      {application.status==='approved' && program?.enabled && !active && <form onSubmit={acceptTerms}><label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> I have read and accept programme terms {program.termsVersion}.</label><button className="button" disabled={!accepted||busy}>Accept terms and activate link</button></form>}
      {active && <><h3>Your referral link</h3><a style={{overflowWrap:'anywhere'}} href={'/events?ref='+application.id}>{'https://urbangangtour.co.ke/events?ref='+application.id}</a><p>Attribution lasts for this browser tab, up to 24 hours. Buyers can remove it before checkout. Self-referrals are excluded.</p></>}
      {earnings && <>
       <h3>Your commission ledger</h3><p>Earned: KES {earnings.earned_kes.toLocaleString()} · Recorded payouts: KES {earnings.recorded_payout_kes.toLocaleString()}</p><p>Balance: KES {earnings.balance_kes.toLocaleString()}</p><p>Refunds can reduce earnings after a payout. A recorded payout is a ledger entry, not an automatic transfer.</p>
       {earnings.sales.length ? earnings.sales.map(s=><p key={s.order_id}>{s.order_id} · {s.status} · KES {Number(s.commission_kes).toLocaleString()}</p>) : <p>No attributed sales yet.</p>}
       {earnings.payouts.map(p=><p key={p.id}>Payout KES {p.amount.toLocaleString()} · {p.reference}</p>)}
      </>}
    </> : <form onSubmit={submit}><h2>Your audience, your impact.</h2><label>Your name<input name="name" required autoComplete="name" maxLength={100}/></label><label>Where would you share events?<textarea name="audience" required rows={3} minLength={10} maxLength={1000}/></label><button className="button" type="submit" disabled={busy}>{busy?'Submitting…':'Submit application'}</button><p>Your application is securely saved to your account.</p></form>}
   </div>
  </section>
 </>;
}
