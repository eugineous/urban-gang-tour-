'use client';
import {useEffect,useId,useMemo,useState} from 'react';
import {TRANSLATION_LANGUAGES,LANGUAGE_CHOICE_KEY,preferredTranslationLanguage,googleTranslationUrl,translationLanguage} from '@/lib/translation-options';
export default function LanguageChooser({path}:{path:string}){
 const [selected,setSelected]=useState('en'),[browserLanguage,setBrowserLanguage]=useState('en'),[automatic,setAutomatic]=useState(true),[ready,setReady]=useState(false);
 const id=useId();
 useEffect(()=>{
  const sync=()=>{let saved:string|null=null;try{saved=localStorage.getItem(LANGUAGE_CHOICE_KEY)}catch{}const languages=navigator.languages?.length?navigator.languages:[navigator.language];setAutomatic(!translationLanguage(saved));setBrowserLanguage(preferredTranslationLanguage(languages));setSelected(preferredTranslationLanguage(languages,saved));setReady(true);};
  const storage=(event:StorageEvent)=>{if(event.key===LANGUAGE_CHOICE_KEY||event.key===null)sync();};
  sync();addEventListener('languagechange',sync);addEventListener('storage',storage);return()=>{removeEventListener('languagechange',sync);removeEventListener('storage',storage);};
 },[]);
 // Native options provide the platform's own keyboard/picker behaviour. Generate
 // localised names only after hydration because device ICU data can differ.
 const items=useMemo(()=>TRANSLATION_LANGUAGES.map(item=>{let native=item.name;if(ready)try{native=new Intl.DisplayNames([item.code],{type:'language'}).of(item.code)||item.name}catch{}return {...item,native};}),[ready]);
 const translated=googleTranslationUrl(path,selected),name=items.find(item=>item.code===selected)?.name||selected;
 function choose(value:string){
  const browser=value==='auto';
  const code=browser?preferredTranslationLanguage(navigator.languages?.length?navigator.languages:[navigator.language]):translationLanguage(value);
  if(!code)return;
  setAutomatic(browser);setSelected(code);if(browser)setBrowserLanguage(code);try{if(browser)localStorage.removeItem(LANGUAGE_CHOICE_KEY);else localStorage.setItem(LANGUAGE_CHOICE_KEY,code)}catch{}
 }
 return <div className="language-control" data-language-control>
  <label className="language-label" htmlFor={id}>Language</label>
  <select id={id} className="language-select" aria-label="Choose language" aria-describedby={id+'-help'} value={automatic?'auto':selected} onChange={event=>choose(event.target.value)} title={`Language: ${name}${automatic?' (browser)':''}`}>
   <option value="auto">{browserLanguage.split('-')[0].toUpperCase()} · Browser language (automatic)</option>
   {items.map(item=><option key={item.code} value={item.code}>{item.code.toUpperCase()} · {item.native}{item.native!==item.name?' — '+item.name:''}</option>)}
  </select>
  {translated?<a className="language-apply" href={translated} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Translate this page to ${name} with Google Translate`} title={`Open this public page in ${name} with Google Translate`}>Go</a>:<span className="language-private" title="Use your browser’s Translate feature on forms and private pages.">Browser</span>}
  <span className="language-help" id={id+'-help'}>{translated?'Choose a language, then Go. Google opens separately and receives this public page address only when you click Go. Machine translations can be imperfect.':'Use your browser’s Translate feature on this page. Private pages and forms are not sent to Google.'}</span>
 </div>;
}
