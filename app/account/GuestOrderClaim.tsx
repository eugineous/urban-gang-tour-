'use client';
import {useId,useRef,useState,type FormEvent} from 'react';
import {guestTicketDestination} from '@/lib/client/guest-ticket-destination';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {guestOrderClaimMessages} from './guest-order-claim-messages';
import styles from './GuestOrderClaim.module.css';

type Props={verified:boolean;onClaimed?:()=>void};
type Feedback='invalid'|'denied'|'rate'|'unavailable'|'success';

export default function GuestOrderClaim({verified,onClaimed}:Props) {
 const t=useMessages(guestOrderClaimMessages),id=useId(),input=useRef<HTMLInputElement>(null),pending=useRef(false);
 const [value,setValue]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback|null>(null);
 const failed=feedback!==null&&feedback!=='success';
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(!verified||pending.current)return;
  const destination=guestTicketDestination(value);
  if(!destination?.startsWith('/tickets/')){setFeedback('invalid');input.current?.focus();return;}
  pending.current=true;setBusy(true);setFeedback(null);
  let claimed=false;
  try {
   const response=await fetchWithTimeout('/api/account/orders/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:destination.slice('/tickets/'.length)})});
   const data:unknown=await response.json();
   if(response.ok&&data&&typeof data==='object'&&'ok' in data&&data.ok===true){setValue('');setFeedback('success');claimed=true;}
   else {setFeedback(response.status===400?'invalid':response.status===404?'denied':response.status===429?'rate':'unavailable');input.current?.focus();}
  }catch{setFeedback('unavailable');input.current?.focus();}
  finally{pending.current=false;setBusy(false);}
  if(claimed)onClaimed?.();
 }
 return <details className={styles.claim}>
  <summary>{t('title')}</summary>
  <p id={id+'-help'}>{t('explain')}</p>
  {!verified&&<p id={id+'-verify'}>{t('verify')}</p>}
  <form className={styles.form} onSubmit={submit} aria-busy={busy}>
   <label htmlFor={id+'-reference'}>{t('label')}</label>
   <input ref={input} id={id+'-reference'} value={value} onChange={event=>{setValue(event.target.value);setFeedback(null)}} maxLength={512} required autoComplete="off" autoCapitalize="off" spellCheck={false} readOnly={busy} aria-invalid={failed||undefined} aria-describedby={[id+'-help',!verified?id+'-verify':'',failed?id+'-error':''].filter(Boolean).join(' ')}/>
   <button type="submit" disabled={!verified||busy}>{t(busy?'pending':'submit')}</button>
   {busy&&<p role="status">{t('pending')}</p>}
   {feedback&&<p id={failed?id+'-error':undefined} role={failed?'alert':'status'} className={failed?styles.error:undefined}>{t(feedback)}</p>}
  </form>
 </details>;
}
