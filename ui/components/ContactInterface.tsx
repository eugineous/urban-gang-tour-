'use client';
import {shellMessages,navigationMessageKey,navigationGroupKey,type ShellMessageKey} from '@/ui/i18n/catalogues/shell';
import {privacyMessages} from '@/ui/i18n/catalogues/privacy';
import {useMessages} from '@/ui/i18n/LanguageProvider';
import chrome from './ContactChrome.module.css';
import {FOOTER_NAVIGATION} from '@/lib/site-navigation';
import {InlineArrow} from './InlineArrow';import Link from './DocumentLink';import {useEffect,useRef,useState,type FormEvent} from 'react';import {MediaImage} from './MediaLibrary';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import LanguageChooser from '@/app/_components/LanguageChooser';
const phone='254799886247';const email='admin@urbangangtour.co.ke';
type ContactDraft={name:string;email:string;subject:string;message:string};
const emptyContact:ContactDraft={name:'',email:'',subject:'',message:''};
export function ContactForm({id='contact'}:{id?:string}){
 const t=useMessages(shellMessages),p=useMessages(privacyMessages);
 const [draft,setDraft]=useState<ContactDraft>(emptyContact),[busy,setBusy]=useState(false),[error,setError]=useState<ShellMessageKey|''>(''),[reference,setReference]=useState('');
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
    const messages:Record<string,ShellMessageKey>={too_many_requests:'contact.error.tooManyRequests',request_details_changed:'contact.error.detailsChanged',invalid_email:'contact.error.email',invalid_name:'contact.error.name',invalid_subject:'contact.error.subject',invalid_message:'contact.error.message',privacy_confirmation_required:'contact.error.privacy'};
    const key=typeof data.error==='string'&&Object.prototype.hasOwnProperty.call(messages,data.error)?messages[data.error]:'contact.error.unconfirmed';
    setError(key);return;
   }
   setReference(data.id);try{localStorage.removeItem('ugt-contact-draft');localStorage.removeItem('ugt-contact-attempt')}catch{}
  }catch{setError('contact.error.network')}
  finally{sending.current=false;setBusy(false)}
 }
 function startNew(){setDraft(emptyContact);setReference('');setError('');attempt.current=null;}
 return <form className="contact-compose" onSubmit={submit} aria-busy={busy}>
  <h3>{t('contact.formTitle')}</h3>
  <label htmlFor={id+'-name'}>{t('contact.name')}<input id={id+'-name'} name="name" required minLength={2} autoComplete="name" maxLength={100} value={draft.name} disabled={busy||!!reference} onChange={event=>update('name',event.target.value)}/></label>
  <label htmlFor={id+'-email'}>{t('contact.emailLabel')}<input id={id+'-email'} name="email" required type="email" autoComplete="email" maxLength={254} value={draft.email} disabled={busy||!!reference} onChange={event=>update('email',event.target.value)} placeholder="you@example.com"/></label>
  <label htmlFor={id+'-subject'}>{t('contact.subject')}<input id={id+'-subject'} name="subject" required minLength={2} maxLength={150} value={draft.subject} disabled={busy||!!reference} onChange={event=>update('subject',event.target.value)} placeholder={t('contact.subjectPlaceholder')}/></label>
  <label htmlFor={id+'-message'}>{t('contact.message')}<textarea id={id+'-message'} name="message" required minLength={10} rows={4} maxLength={3000} value={draft.message} disabled={busy||!!reference} onChange={event=>update('message',event.target.value)}/></label>
  <div aria-hidden="true" style={{position:'absolute',left:-10000,width:1,height:1,overflow:'hidden'}}><label>{t('contact.honeypot')}<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  {!reference&&<label className="checkbox"><input type="checkbox" required disabled={busy}/><span>{p('contact.noticePrefix')}<Link href="/privacy-policy">{p('contact.privacyPolicy')}</Link>{p('contact.noticeSuffix')}</span></label>}
  {error&&<p role="alert">{t(error)}</p>}
  {reference?<div className="contact-handoff" role="status" style={{overflowWrap:'anywhere'}}><p>{t('contact.saved')}</p><p>{t('contact.referencePrefix')}<strong>{reference}</strong></p><button className={`button secondary ${chrome.newMessage}`} type="button" onClick={startNew}>{t('contact.newMessage')}</button></div>:<button className="button" type="submit" disabled={busy}>{t(busy?'contact.sending':'contact.send')} <InlineArrow/></button>}
  {!reference&&<p className="form-note">{t('contact.draftNote')}<a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">{t('contact.whatsappUs')}</a>.</p>}
 </form>;
}
export function FloatingTalk(){const t=useMessages(shellMessages);const [footerVisible,setFooterVisible]=useState(false);useEffect(()=>{const footer=document.querySelector('[data-site-footer]');if(!footer||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>setFooterVisible(entry.isIntersecting));observer.observe(footer);return()=>observer.disconnect()},[]);return <Link className={chrome.floatingTalk} hidden={footerVisible} data-contact-launcher href="/contact-us"><MediaImage id="M231" alt=""/><span>{t('contact.talk')}</span><InlineArrow/></Link>}
export function ContactPage(){const t=useMessages(shellMessages);return <><section className="page-intro wrap"><div><p className="eyebrow">{t('contact.pageLabel')}</p><h1>{t('contact.pageTitle')}</h1></div><p>{t('contact.pageDescription')}</p></section><section className="contact-page-grid wrap"><article className="contact-person"><MediaImage id="M231" alt={t('contact.personAlt')} priority/><div><p className="eyebrow">{t('contact.services')}</p><h2>Eugine Micah</h2><p>{t('contact.personRole')}</p><div className={chrome.personLinks}><a href={'tel:+'+phone}>+254 799 886247</a><a href={'mailto:'+email}>{email}</a><a className="button" href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">{t('contact.whatsappChat')} <InlineArrow/></a></div></div></article><div className="contact-page-form"><ContactForm id="page-contact"/></div></section><section className="wrap contact-next"><div><h2>{t('contact.beforeConfirm')}</h2><p>{t('contact.agreement')}</p><Link href="/international">{t('contact.international')} <InlineArrow/></Link></div></section></>}
export function ContactFooter({onCookies,focusView,onFocus,path='/'}:{onCookies:()=>void;focusView:boolean;onFocus:()=>void;form?:boolean;path?:string}){
 const t=useMessages(shellMessages),p=useMessages(privacyMessages);
 const navLabel=(label:string,href:string)=>{const key=navigationMessageKey(href);return key?t(key):label};
 const groupLabel=(group:string)=>{const key=navigationGroupKey(group);return key?t(key):group};
 return <footer className={chrome.footer} data-site-footer aria-label={t('footer.label')}><div className={chrome.inner}>
  <div className={chrome.columns}>
   <div className={chrome.brand}><Link href="/" aria-label={t('brand.home')}><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width="72" height="54"/></Link><p>{t('footer.summary')}</p><nav className={chrome.contactLinks} aria-label={t('contact.label')}><a href={'mailto:'+email}>{t('contact.email')}</a><a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">WhatsApp</a></nav><div className={chrome.socials} aria-label={t('footer.follow')}>{[['Instagram','https://www.instagram.com/urban_newsgang'],['YouTube','https://www.youtube.com/@urban_newsgang'],['TikTok','https://www.tiktok.com/@urban_newsgang'],['Facebook','https://www.facebook.com/profile.php?id=61572771956199'],['X','https://x.com/urban_newsgang']].map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><img src={`/design-assets/social/${label.toLowerCase()}.svg`} width="22" height="22" alt=""/><span>{label}</span></a>)}</div></div>
   {FOOTER_NAVIGATION.map(group=><nav className={chrome.linkGroup} key={group.title} aria-label={groupLabel(group.title)}><h2>{groupLabel(group.title)}</h2>{group.items.map(([label,href])=><Link key={href} href={href}>{navLabel(label,href)}</Link>)}</nav>)}
  </div>
  <div className={chrome.language}><LanguageChooser path={path}/></div>
  <div className={chrome.bottom}><p>© {new Date().getFullYear()} Urban Gang Tour</p><nav className={chrome.legal} aria-label={t('footer.policies')}>{[['Privacy','/privacy-policy'],['Cookies','/cookie-policy'],['Terms','/terms'],['Refunds','/refund-policy']].map(([label,href])=><Link key={href} href={href}>{navLabel(label,href)}</Link>)}</nav><div className={chrome.preferences}><button type="button" onClick={onCookies}>{p('consent.settings')}</button><button type="button" aria-pressed={focusView} onClick={onFocus}>{p('focus.prefix')}{p(focusView?'focus.on':'focus.off')}</button></div></div>
 </div></footer>
}
