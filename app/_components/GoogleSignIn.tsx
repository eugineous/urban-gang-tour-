'use client';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import {accountMessages,type CustomerIssue} from '@/ui/i18n/catalogues/account';
import {useEffect,useRef,useState} from 'react';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
export function GoogleSignIn({endpoint,onSuccess}:{endpoint:string;onSuccess:(data:any)=>void}){
 const t=useMessages(accountMessages);
 // Keep the existing latest-callback bridge without restarting provider setup.
 // eslint-disable-next-line react-hooks/refs
 const holder=useRef<HTMLDivElement>(null),success=useRef(onSuccess);success.current=onSuccess;
 const [error,setError]=useState<CustomerIssue|null>(null);
 useEffect(()=>{let disposed=false,timer:ReturnType<typeof setInterval>|undefined;const controller=new AbortController();
 async function setup(){try{const r=await fetchWithTimeout(endpoint,{signal:controller.signal});const data=await r.json();if(disposed||!r.ok||!data.clientId)return;
 if(!(window as any).google?.accounts?.id&&!document.querySelector('script[data-ugt-gsi]')){const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.dataset.ugtGsi='true';document.body.appendChild(s)}
 let attempts=0;timer=setInterval(()=>{const g=(window as any).google?.accounts?.id;if(g&&holder.current){clearInterval(timer);g.initialize({client_id:data.clientId,callback:async(resp:any)=>{setError(null);try{const r=await fetchWithTimeout(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:resp.credential})});const d=await r.json();if(disposed)return;if(r.ok&&d.ok)success.current(d);else setError(d.error==='application_pending'?{"key":"copy.your_organizer_application_is_still_under_review"}:d.error==='account_not_found'?{"key":"copy.create_an_account_with_this_google_email_first"}: {"key":"copy.unable_to_sign_in_use_your_password_or_contact_us_for"})}catch{if(!disposed)setError({"key":"copy.sign_in_could_not_connect_please_try_again"})}}});g.renderButton(holder.current,{theme:'outline',size:'large',shape:'rectangular',text:'signin_with',width:Math.min(360,holder.current.clientWidth)});}else if(++attempts>40){clearInterval(timer);setError({"key":"copy.google_could_not_load_you_can_still_use_your_password"})}},250);
 }catch{ /* Password login remains available when optional configuration cannot load. */ }}setup();return()=>{disposed=true;controller.abort();clearInterval(timer)}},[endpoint]);
 return <div style={{marginBottom:16}}><div ref={holder} style={{minWidth:0}}/>{error&&<p role="alert" style={{fontSize:14,color:'#a00'}}>{error?t(error.key,error.values):null}</p>}</div>;
}
