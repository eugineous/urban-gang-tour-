'use client';
import chrome from './ContactChrome.module.css';
import {FOOTER_NAVIGATION} from '@/lib/site-navigation';
import {InlineArrow} from './InlineArrow';import Link from './DocumentLink';import {useEffect,useRef,useState,type FormEvent} from 'react';import {MediaImage} from './MediaLibrary';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import LanguageChooser from '@/app/_components/LanguageChooser';
const phone='254799886247';const email='admin@urbangangtour.co.ke';
type ContactDraft={name:string;email:string;subject:string;message:string};
const emptyContact:ContactDraft={name:'',email:'',subject:'',message:''};
export function ContactForm({id='contact'}:{id?:string}){
 const [draft,setDraft]=useState<ContactDraft>(emptyContact),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reference,setReference]=useState('');
 const sending=useRef(false),attempt=useRef<{snapshot:string;requestId:string}|null>(null);
 useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('ugt-contact-draft')||'null');if(stored&&typeof stored.name==='string'&&typeof stored.email==='string'&&typeof stored.message==='string')setDraft({name:stored.name,email:stored.email,subject:typeof stored.subject==='string'?stored.subject:'',message:stored.message});const saved=JSON.parse(localStorage.getItem('ugt-contact-attempt')||'null');if(saved&&typeof saved.snapshot==='string'&&typeof saved.requestId==='string')attempt.current=saved;}catch{}},[]);
 function update(key:keyof ContactDraft,value:string){const next={...draft,[key]:value};setDraft(next);setError('');try{localStorage.setItem('ugt-contact-draft',JSON.stringify(next))}catch{}}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current||reference)return;
  const form=event.currentTarget,snapshot=JSON.stringify(draft);
  if(attempt.current?.snapshot!==snapshot){attempt.current={snapshot,requestId:crypto.randomUUID()};try{localStorage.setItem('ugt-contact-attempt',JSON.stringify(attempt.current))}catch{}}
  sending.current=true;setBusy(true);setError('');
  try{
   const response=await fetchWithTimeout('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,requestId:attempt.current!.requestId,privacyAccepted:true,website:String(new FormData(form).get('website')||'')})},15000);
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true||typeof data.id!=='string'){
    const messages:Record<string,string>={too_many_requests:'Please wait a few minutes before sending again. Your draft is kept.',request_details_changed:'This retry reference belongs to an earlier message. Edit your message before trying again.',invalid_email:'Check your email address.',invalid_name:'Add your name.',invalid_subject:'Add a short subject without line breaks.',invalid_message:'Add a message of at least 10 characters.',privacy_confirmation_required:'Confirm the privacy notice before sending.'};
    setError(messages[data.error]||'We could not confirm your enquiry. Your draft is kept; please retry or use WhatsApp.');return;
   }
   setReference(data.id);try{localStorage.removeItem('ugt-contact-draft');localStorage.removeItem('ugt-contact-attempt')}catch{}
  }catch{setError('We could not confirm whether your enquiry was saved. Your draft and retry reference are kept; retry safely or contact us on WhatsApp.')}
  finally{sending.current=false;setBusy(false)}
 }
 function startNew(){setDraft(emptyContact);setReference('');setError('');attempt.current=null;}
 return <form className="contact-compose" onSubmit={submit} aria-busy={busy}>
  <h3>Send an enquiry</h3>
  <label htmlFor={id+'-name'}>Your name<input id={id+'-name'} name="name" required minLength={2} autoComplete="name" maxLength={100} value={draft.name} disabled={busy||!!reference} onChange={event=>update('name',event.target.value)}/></label>
  <label htmlFor={id+'-email'}>Email<input id={id+'-email'} name="email" required type="email" autoComplete="email" maxLength={254} value={draft.email} disabled={busy||!!reference} onChange={event=>update('email',event.target.value)} placeholder="you@example.com"/></label>
  <label htmlFor={id+'-subject'}>Subject<input id={id+'-subject'} name="subject" required minLength={2} maxLength={150} value={draft.subject} disabled={busy||!!reference} onChange={event=>update('subject',event.target.value)} placeholder="What can we help with?"/></label>
  <label htmlFor={id+'-message'}>Message<textarea id={id+'-message'} name="message" required minLength={10} rows={4} maxLength={3000} value={draft.message} disabled={busy||!!reference} onChange={event=>update('message',event.target.value)}/></label>
  <div aria-hidden="true" style={{position:'absolute',left:-10000,width:1,height:1,overflow:'hidden'}}><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  {!reference&&<label className="checkbox"><input type="checkbox" required disabled={busy}/><span>I have read the <Link href="/privacy-policy">privacy policy</Link>.</span></label>}
  {error&&<p role="alert">{error}</p>}
  {reference?<div className="contact-handoff" role="status" style={{overflowWrap:'anywhere'}}><p>Your enquiry is saved for the team.</p><p>Reference: <strong>{reference}</strong></p><button className={`button secondary ${chrome.newMessage}`} type="button" onClick={startNew}>New message</button></div>:<button className="button" type="submit" disabled={busy}>{busy?'Sending…':'Send message'} <InlineArrow/></button>}
  {!reference&&<p className="form-note">Your draft stays in this browser until your enquiry is saved. Prefer a chat? <a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">WhatsApp us</a>.</p>}
 </form>;
}
export function FloatingTalk(){const [footerVisible,setFooterVisible]=useState(false);useEffect(()=>{const footer=document.querySelector('[data-site-footer]');if(!footer||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>setFooterVisible(entry.isIntersecting));observer.observe(footer);return()=>observer.disconnect()},[]);return <Link className={chrome.floatingTalk} hidden={footerVisible} data-contact-launcher href="/contact-us"><MediaImage id="M231" alt=""/><span>Let’s talk</span><InlineArrow/></Link>}
export function ContactPage(){return <><section className="page-intro wrap"><div><p className="eyebrow">Contact Urban Gang Tour</p><h1>Contact the team.</h1></div><p>Ask about event bookings, live hosting or production.</p></section><section className="contact-page-grid wrap"><article className="contact-person"><MediaImage id="M231" alt="Eugine Micah holding his phone" priority/><div><p className="eyebrow">Events, hosting & production</p><h2>Eugine Micah</h2><p>TV presenter · MC · Event host</p><div className={chrome.personLinks}><a href={'tel:+'+phone}>+254 799 886247</a><a href={'mailto:'+email}>{email}</a><a className="button" href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <InlineArrow/></a></div></div></article><div className="contact-page-form"><ContactForm id="page-contact"/></div></section><section className="wrap contact-next"><div><h2>Before we confirm</h2><p>We agree the programme, date and quote with you first.</p><Link href="/international">International enquiries <InlineArrow/></Link></div></section></>}
export function ContactFooter({onCookies,focusView,onFocus,path='/'}:{onCookies:()=>void;focusView:boolean;onFocus:()=>void;form?:boolean;path?:string}){
 return <footer className={chrome.footer} data-site-footer aria-label="Urban Gang Tour footer"><div className={chrome.inner}>
  <div className={chrome.columns}>
   <div className={chrome.brand}><Link href="/" aria-label="Urban Gang Tour home"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width="72" height="54"/></Link><p>Events, hosting and production in Kenya.</p><nav className={chrome.contactLinks} aria-label="Contact Urban Gang Tour"><a href={'mailto:'+email}>Email us</a><a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">WhatsApp</a></nav><div className={chrome.socials} aria-label="Follow Urban Gang Tour">{[['Instagram','https://www.instagram.com/urban_newsgang'],['YouTube','https://www.youtube.com/@urban_newsgang'],['TikTok','https://www.tiktok.com/@urban_newsgang'],['Facebook','https://www.facebook.com/profile.php?id=61572771956199'],['X','https://x.com/urban_newsgang']].map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><img src={`/design-assets/social/${label.toLowerCase()}.svg`} width="22" height="22" alt=""/><span>{label}</span></a>)}</div></div>
   {FOOTER_NAVIGATION.map(group=><nav className={chrome.linkGroup} key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.items.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>)}
  </div>
  <div className={chrome.language}><LanguageChooser path={path}/></div>
  <div className={chrome.bottom}><p>© {new Date().getFullYear()} Urban Gang Tour</p><nav className={chrome.legal} aria-label="Policies">{[['Privacy','/privacy-policy'],['Cookies','/cookie-policy'],['Terms','/terms'],['Refunds','/refund-policy']].map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav><div className={chrome.preferences}><button type="button" onClick={onCookies}>Cookie settings</button><button type="button" aria-pressed={focusView} onClick={onFocus}>Focus view: {focusView?'on':'off'}</button></div></div>
 </div></footer>
}
