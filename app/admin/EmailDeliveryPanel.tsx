'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {effectFeedback,emailRetryFeedback} from '@/lib/client/payment-effect-feedback';
import type {PaymentEffectRecord} from '@/lib/server/payment-confidence';
type Job={id:string;order_id?:string;booking_id?:string;status:string;attempts:number;last_error:string|null;updated_at:string};
const jobStyle={border:'1px solid #ddd',padding:16,borderRadius:12,overflowWrap:'anywhere' as const,minWidth:0};
const effectNames:Record<string,string>={reservation:'Ticket reservation',inventory:'Merchandise inventory',tickets:'Tickets',receipt:'Receipt preparation'};

export default function EmailDeliveryPanel(){
 const [jobs,setJobs]=useState<Job[]>([]),[effects,setEffects]=useState<PaymentEffectRecord[]>([]);
 const [configured,setConfigured]=useState<boolean|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checked,setChecked]=useState('');
 const [actionFeedback,setActionFeedback]=useState('');
 const flight=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null);
 const load=useCallback(async()=>{
  if(flight.current)return;
  flight.current=true;setBusy(true);
  const controller=new AbortController();request.current=controller;
  try{
   const r=await fetchWithTimeout('/api/admin/email-delivery',{cache:'no-store',signal:controller.signal});
   const d=await r.json();
   const partial=!!d.module_errors&&typeof d.module_errors==='object'&&Object.keys(d.module_errors).length>0;
   if(!Array.isArray(d.jobs)||(!r.ok&&d.configured!==false&&!partial))throw Error('Could not load delivery status.');
   if(!mounted.current)return;
   setJobs([...d.jobs,...(Array.isArray(d.contact_jobs)?d.contact_jobs:[])]);
   setEffects(Array.isArray(d.payment_jobs)?d.payment_jobs:[]);
   setConfigured(d.configured===true);
   setError(partial?'Some delivery records are unavailable. Available records are shown; missing status does not mean payment failed.':'');
   setChecked(new Date().toLocaleTimeString('en-KE',{timeZone:'Africa/Nairobi'}));
  }catch{
   if(mounted.current&&!controller.signal.aborted)setError('Could not refresh delivery status. Showing the last available records; no payment or delivery action was retried.');
  }finally{flight.current=false;if(mounted.current)setBusy(false);}
 },[]);
 useEffect(()=>{
  mounted.current=true;void load();
  const refresh=()=>{if(!document.hidden&&navigator.onLine)void load();};
  const timer=setInterval(refresh,10000);
  addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{mounted.current=false;clearInterval(timer);request.current?.abort();removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[load]);
 async function retry(id:string){
  if(flight.current)return;
  flight.current=true;setBusy(true);
  const controller=new AbortController();request.current=controller;
  try{
   const r=await fetchWithTimeout('/api/admin/email-delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id}),signal:controller.signal});
   const data=await r.json();
   if(mounted.current)setActionFeedback(emailRetryFeedback(data.outcome));
  }catch{if(mounted.current&&!controller.signal.aborted)setActionFeedback(emailRetryFeedback(null));}
  finally{flight.current=false;if(mounted.current){setBusy(false);void load();}}
 }
 return <section className="modern-card" aria-labelledby="email-delivery-title">
  <div className="modern-actions"><h2 id="email-delivery-title">Payment follow-up & email</h2><button className="button secondary" type="button" onClick={()=>void load()} disabled={busy} style={{minHeight:44}}>{busy?'Checking…':'Refresh status'}</button></div>
  <p role="status">{checked?'Last checked '+checked+' EAT. Updates every 10 seconds while this page is visible.':'Checking saved delivery records…'}</p>
  <p>Payment confirmation lives in the Orders ledger. A preparation or email issue does not mean a payment failed. Refresh only reads status—it never charges a customer.</p>
  {error&&<p role="alert">{error}</p>}
  {actionFeedback&&<p role="status">{actionFeedback}</p>}
  <h3>Document preparation</h3>
  {!effects.length&&checked&&<p>No recent preparation jobs are available. Older orders may not have a recorded job; check their Orders record.</p>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:12}}>{effects.map(job=>{
   const feedback=effectFeedback(job.status);
   return <article key={job.order_id+job.effect} style={jobStyle}><strong>{effectNames[job.effect]||'Payment follow-up'} · {job.order_id}</strong><p>{job.gateway.toUpperCase()} · {feedback.label} · {job.attempts} attempts</p>{feedback.review&&<p>Inspect this order and provider record before taking action. Do not ask the customer to pay again solely because preparation is delayed.</p>}<p>Updated {new Date(job.updated_at).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</p></article>;
  })}</div>
  <h3>Email delivery</h3><p>Accepted means the email provider accepted the message. It does not confirm inbox delivery.</p>
  {configured===false&&<p role="alert">Email is not configured. Saved messages remain available; configure the verified sending domain and server email key before retrying.</p>}
  {!jobs.length&&configured!==null&&<p>No email jobs have been recorded.</p>}
  <div style={{display:'grid',gap:12}}>{jobs.map(job=><article key={job.id} style={jobStyle}><strong>{job.booking_id?'Contact enquiry':'Receipt'} · {job.booking_id||job.order_id}</strong><p>{job.status} · {job.attempts} attempts</p><p>Updated {new Date(job.updated_at).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</p>{['queued','blocked'].includes(job.status)&&<button className="button secondary" type="button" disabled={busy||configured!==true} style={{minHeight:44}} onClick={()=>void retry(job.id)}>Retry saved email</button>}{job.status==='failed'&&<p>Needs operator review. Automatic retries stopped to protect against duplicate delivery.</p>}</article>)}</div>
 </section>;
}
