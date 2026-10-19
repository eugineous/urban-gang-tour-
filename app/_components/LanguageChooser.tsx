'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {TRANSLATION_LANGUAGES,LANGUAGE_CHOICE_KEY,preferredTranslationLanguage,googleTranslationUrl,localWelcomeLanguage} from '@/lib/translation-options';
export default function LanguageChooser({path}:{path:string}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState('en'),[query,setQuery]=useState('');
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const sync=()=>{let saved:string|null=null;try{saved=localStorage.getItem(LANGUAGE_CHOICE_KEY)}catch{}setSelected(preferredTranslationLanguage(navigator.languages?.length?navigator.languages:[navigator.language],saved));};
  const storage=(event:StorageEvent)=>{if(event.key===LANGUAGE_CHOICE_KEY||event.key===null)sync();};
  sync();addEventListener('languagechange',sync);addEventListener('storage',storage);return()=>{removeEventListener('languagechange',sync);removeEventListener('storage',storage);};
 },[]);
 useEffect(()=>{const current=dialog.current;if(!open||!current)return;const previous=document.body.style.overflow,returnFocus=trigger.current;document.body.style.overflow='hidden';current.showModal();dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:true}));return()=>{current.close();document.body.style.overflow=previous;dispatchEvent(new CustomEvent('ugt-overlay-change',{detail:false}));returnFocus?.focus();};},[open]);
 // Native names are browser-generated only after opening. Different ICU data
 // on server/device must not create a hydration mismatch or 194 hidden cards.
 const items=useMemo(()=>open?TRANSLATION_LANGUAGES.map(item=>{let native=item.name;try{native=new Intl.DisplayNames([item.code],{type:'language'}).of(item.code)||item.name}catch{}return {...item,native};}):[],[open]);
 const matches=items.filter(item=>`${item.name} ${item.native} ${item.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const translated=googleTranslationUrl(path,selected),local=localWelcomeLanguage(selected);
 function choose(code:string){setSelected(code);try{localStorage.setItem(LANGUAGE_CHOICE_KEY,code)}catch{}}
 return <>
  <button type="button" ref={trigger} className="language-toggle" aria-label="Choose language" title="Language / Lugha" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{setQuery('');setOpen(true)}}><span aria-hidden="true">A<span>文</span></span><span className="language-toggle-copy">Language</span></button>
  {open&&createPortal(<dialog id={id} ref={dialog} className="language-dialog" aria-labelledby={id+'-title'} onCancel={event=>{event.preventDefault();setOpen(false)}} onClose={()=>setOpen(false)}>
   <div className="language-dialog-head"><h2 id={id+'-title'}>Read in your language</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Close language choices">Close ×</button></div>
   <p>Suggested from your saved choice or browser language. You can change it below.</p>
   <label className="language-search">Find a language<input type="search" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. Arabic, Kiswahili, हिन्दी" autoComplete="off"/></label>
   <div className="language-results" role="group" aria-label="Language choices">{matches.map(item=><button key={item.code} type="button" aria-pressed={selected===item.code} onClick={()=>choose(item.code)}><strong dir="auto">{item.native}</strong><span>{item.name} · {item.code}</span></button>)}</div>
   <p className="language-result-count" role="status">{matches.length} language options · selected: {items.find(item=>item.code===selected)?.name||selected}</p>
   <div className="language-dialog-actions">{translated?<a className="button" href={translated} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open this page in Google Translate ↗</a>:<p>For privacy, we do not send this page to Google. Use your browser’s Translate feature for forms and private pages.</p>}{local&&<a href={'/welcome/'+local}>Read the welcome page here</a>}<button type="button" onClick={()=>{try{localStorage.removeItem(LANGUAGE_CHOICE_KEY)}catch{}setSelected(preferredTranslationLanguage(navigator.languages||[navigator.language]));}}>Use browser language</button></div>
   <p className="language-privacy">Google opens separately and receives only the public page address after you click. Machine translations may be imperfect and availability varies by region. Checkout, forms and legal decisions need extra care. No Google script runs on this site.</p>
  </dialog>,document.body)}
 </>;
}
