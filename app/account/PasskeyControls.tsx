'use client';
import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {browserSupportsWebAuthn,startAuthentication,startRegistration} from '@simplewebauthn/browser';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {useInterfaceLanguage,useMessages} from '@/ui/i18n/LanguageProvider';
import {passkeyMessages} from '@/ui/i18n/catalogues/passkeys';
import styles from './PasskeyControls.module.css';

type Message=keyof typeof passkeyMessages.en;
type KeySummary={id:string;created_at:string;last_used_at:string|null};
type PasskeyUser={id:number;email:string|null;phone:string|null;name:string|null};
class RequestFailure extends Error{constructor(readonly code:string){super(code)}}
async function post(body:Record<string,unknown>){
 const response=await fetchWithTimeout('/api/account/passkeys',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();if(!response.ok||result.ok!==true)throw new RequestFailure(result.error||'passkey_failed');return result;
}
function issue(error:unknown):Message{
 if(error instanceof RequestFailure){
  if(error.code==='authentication_failed')return 'wrongPassword';if(error.code==='verified_email_required')return 'verify';
  if(error.code==='login_required')return 'expired';if(error.code==='too_many_requests')return 'rate';if(error.code==='passkey_limit')return 'limit';
 }
 if(error instanceof Error&&(error.name==='NotAllowedError'||error.name==='AbortError'||('code' in error&&error.code==='ERROR_CEREMONY_ABORTED')))return 'cancelled';
 return 'failed';
}
const noSubscription=()=>()=>{};
function useSupported(){return useSyncExternalStore<boolean|null>(noSubscription,browserSupportsWebAuthn,()=>null)}

/** Explicit login gesture only; password remains the parent account form. */
export function PasskeySignIn({onSuccess}:{onSuccess:(data:{user:PasskeyUser})=>void}){
 const t=useMessages(passkeyMessages),supported=useSupported(),pending=useRef(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState<Message|null>(null);
 const signIn=async()=>{
  if(pending.current||!supported)return;pending.current=true;setBusy(true);setMessage(null);
  try{
   const prepared=await post({action:'login-options'});
   const credential=await startAuthentication({optionsJSON:prepared.options});
   const result=await post({action:'login-finish',challenge:prepared.options.challenge,credential});
   if(!result.user||!Number.isSafeInteger(result.user.id))throw new RequestFailure('passkey_failed');onSuccess({user:result.user});
  }catch(error){setMessage(issue(error))}finally{pending.current=false;setBusy(false)}
 };
 return <div className={styles.controls}>
  <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={!supported||busy} onClick={()=>void signIn()}>{t(busy?'busy':'signIn')}</button>
  <p className={styles.fallback}>{t(supported===false?'unsupported':'fallback')}</p>
  {message&&<p role="alert" className={styles.error}>{t(message)}</p>}
 </div>;
}

/** The server independently checks verified email and current password. */
export function PasskeyManager({verified}:{verified:boolean}){
 const t=useMessages(passkeyMessages),{locale}=useInterfaceLanguage(),supported=useSupported(),inputId=useId(),pending=useRef(false);
 const [keys,setKeys]=useState<KeySummary[]>([]),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState(false),[reload,setReload]=useState(0),[message,setMessage]=useState<Message|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetchWithTimeout('/api/account/passkeys',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.passkeys)||!data.passkeys.every((key:KeySummary)=>typeof key.id==='string'&&typeof key.created_at==='string'))throw Error();return data.passkeys as KeySummary[]})
   .then(data=>{if(!controller.signal.aborted)setKeys(data)})
   .catch(()=>{if(!controller.signal.aborted)setLoadError(true)})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return ()=>controller.abort();
 },[reload]);
 const refresh=()=>{setLoading(true);setLoadError(false);setReload(value=>value+1)};
 const manage=async(action:'add'|'revoke',id?:string)=>{
  if(pending.current||!password||(action==='add'&&(!verified||!supported)))return;
  pending.current=true;setBusy(true);setMessage(null);
  try{
   if(action==='add'){
    const prepared=await post({action:'register-options',password});
    const credential=await startRegistration({optionsJSON:prepared.options});
    await post({action:'register-finish',challenge:prepared.options.challenge,credential});setMessage('added');
   }else{await post({action:'revoke',id,password});setMessage('removed')}
   setPassword('');refresh();
  }catch(error){setMessage(issue(error))}finally{pending.current=false;setBusy(false)}
 };
 const date=(value:string)=>{const at=new Date(value);return Number.isFinite(at.getTime())?new Intl.DateTimeFormat(locale==='en'?'en-KE':locale,{dateStyle:'medium',timeZone:'Africa/Nairobi'}).format(at):''};
 return <section className={styles.panel} aria-labelledby={inputId+'-title'}>
  <h3 id={inputId+'-title'}>{t('title')}</h3><p>{t('description')}</p>
  {!verified&&<p>{t('verify')}</p>}
  {supported===false&&<p className={styles.fallback}>{t('unsupported')}</p>}
  {loading&&<p role="status">{t('loading')}</p>}
  {loadError&&<p role="alert">{t('unavailable')} <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={refresh}>{t('retry')}</button></p>}
  {!loading&&!loadError&&keys.length===0&&<p>{t('empty')}</p>}
  {(verified||keys.length>0)&&<div className={styles.controls}>
   <label htmlFor={inputId}>{t('password')}<input id={inputId} className={styles.input} type="password" autoComplete="current-password" maxLength={100} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
   {verified&&<button type="button" className={styles.button} disabled={!supported||busy||loading||loadError||!password||keys.length>=10} onClick={()=>void manage('add')}>{t(busy?'busy':'add')}</button>}
   {keys.length>=10&&<p>{t('limit')}</p>}
  </div>}
  {keys.length>0&&<ul className={styles.list}>{keys.map((key,index)=><li key={key.id} className={styles.key}>
   <div>{t('key',{number:index+1})}<small>{t('created',{date:date(key.created_at)})}</small></div>
   <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy||!password} aria-label={`${t('remove')} ${t('key',{number:index+1})}`} onClick={()=>void manage('revoke',key.id)}>{t('remove')}</button>
  </li>)}</ul>}
  {message&&<p role={message==='added'||message==='removed'?'status':'alert'} className={message==='added'||message==='removed'?styles.status:styles.error}>{t(message)}</p>}
 </section>;
}
