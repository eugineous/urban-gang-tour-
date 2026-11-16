'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {accountSecurityMessages} from '@/ui/i18n/catalogues/account-security';
import styles from './AccountSecurity.module.css';
import GuestOrderClaim from './GuestOrderClaim';
import {PasskeyManager} from './PasskeyControls';
type Settings={email:string|null;verified:boolean;pendingEmail:string|null;deliveryConfigured:boolean};
type Issue='invalid'|'wrong'|'cooldown'|'unavailable'|'existing';
export default function AccountSecurity({onVerified,onClaimed}:{onVerified?:()=>void;onClaimed?:()=>void}){
 const t=useMessages(accountSecurityMessages),[settings,setSettings]=useState<Settings|null>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[error,setError]=useState<Issue|null>(null),[queued,setQueued]=useState(false),[busy,setBusy]=useState(false),pending=useRef(false);
 async function load(signal?:AbortSignal){const r=await fetchWithTimeout('/api/account/verification',{signal});const value=await r.json();if(!r.ok||typeof value.verified!=='boolean'||typeof value.deliveryConfigured!=='boolean')throw Error();if(!signal?.aborted){setSettings(value);if(value.email)setEmail(value.email)}}
 useEffect(()=>{const controller=new AbortController();load(controller.signal).catch(()=>{if(!controller.signal.aborted)setError('unavailable')});return()=>controller.abort()},[]);
 async function submit(event:FormEvent,action:'send'|'confirm'){
  event.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError(null);
  try{const r=await fetchWithTimeout('/api/account/verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='send'?{action,email,password}:{action,code})});const value=await r.json();
   if(!r.ok||value.ok!==true){const errors:Record<string,Issue>={invalid_or_expired_code:'invalid',wrong_credentials:'wrong',verification_recently_requested:'cooldown',too_many_requests:'cooldown',email_change_unavailable:'existing',email_in_use:'existing'};setError(errors[String(value.error)]||'unavailable');return}
   if(value.verified===true){setSettings(current=>current?{...current,verified:true}:current);setCode('');setPassword('');onVerified?.();return}
   if(action==='send'&&value.state==='queued'){setPassword('');setQueued(true);setSettings(current=>current?{...current,pendingEmail:email}:current);await load();return}throw Error();
  }catch{setError('unavailable')}finally{pending.current=false;setBusy(false)}
 }
 return <section className={styles.panel} aria-labelledby="account-security-title"><h2 id="account-security-title">{t('title')}</h2>
  {!settings&&!error&&<p role="status">{t('loading')}</p>}
  {settings?.verified?<p role="status">{t('verified')}</p>:settings&&<><p>{t('note')}</p>
   {settings.deliveryConfigured?<><form className={styles.form} onSubmit={e=>submit(e,'send')} aria-busy={busy}><label>{t('email')}<input type="email" required autoComplete="email" maxLength={254} value={email} readOnly={!!settings.email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label><label>{t('password')}<input type="password" required minLength={6} maxLength={100} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><button className="button" disabled={busy} type="submit">{t('send')}</button></form>
   {settings.pendingEmail&&<form className={styles.form} onSubmit={e=>submit(e,'confirm')} aria-busy={busy}><p>{t('pending',{email:settings.pendingEmail})}</p><label>{t('code')}<input required inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} autoComplete="one-time-code" value={code} onChange={e=>{setCode(e.target.value);setError(null)}} disabled={busy}/></label><button className="button" type="submit" disabled={busy}>{t('confirm')}</button></form>}</>:<p>{t('unavailable')}</p>}
  </>}
  {queued&&!settings?.verified&&<p className={styles.notice} role="status">{t('queued')}</p>}
  {error&&<p className={`${styles.error} ${styles.notice}`} role="alert">{t(error)}</p>}
  {!settings&&error&&<button className="button secondary" type="button" onClick={()=>{setError(null);load().catch(()=>setError('unavailable'))}}>{t('retry')}</button>}
  {error==='unavailable'||settings?.deliveryConfigured===false?<a href="/contact-us">{t('contact')}</a>:null}
  {settings&&<><PasskeyManager verified={settings.verified}/><GuestOrderClaim verified={settings.verified} onClaimed={onClaimed}/></>}
 </section>;
}
