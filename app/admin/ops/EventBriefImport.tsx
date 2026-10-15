'use client';
import {useState} from 'react';
import {CHATGPT_EVENT_PROMPT,parseEventBrief,type ImportedEventBrief} from '@/lib/event-brief-import';
import styles from './Events.module.css';
import {btn,btnDark,btnMagenta,inp} from './ui';

export default function EventBriefImport({onUse,onCancel}:{onUse:(draft:ImportedEventBrief)=>void;onCancel:()=>void}){
  const [text,setText]=useState(''),[events,setEvents]=useState<ImportedEventBrief[]>([]),[selected,setSelected]=useState(0),[message,setMessage]=useState(''),[showPrompt,setShowPrompt]=useState(false);
  const draft=events[selected];
  function parse(){const result=parseEventBrief(text);setEvents(result.events);setSelected(0);setMessage(result.error||'');}
  async function copy(){setShowPrompt(true);try{await navigator.clipboard.writeText(CHATGPT_EVENT_PROMPT);setMessage('Prompt copied. Give it to ChatGPT with your event details.')}catch{setMessage('Select and copy the prompt below.')}}
  return <section className={styles.importer} aria-label="Paste event brief">
    <h3>Paste from ChatGPT</h3><p>Paste one event—or several labelled events. Review the result, then upload your original posters. Nothing is saved or published by importing.</p>
    <label htmlFor="event-brief-paste">Event text</label><textarea id="event-brief-paste" style={{...inp,minHeight:220}} maxLength={60000} value={text} onChange={e=>{setText(e.target.value);setEvents([]);setMessage('')}} placeholder={'Name: My event\nKind: Contracted / partner event\nDate: 2026-11-06\nVenue: Event venue\nDescription: Your event description'}/>
    <div className={styles.actions}><button style={btnMagenta} onClick={parse}>Preview import</button><button style={btn} onClick={()=>void copy()}>Copy ChatGPT prompt</button><button style={btnDark} onClick={onCancel}>Cancel import</button></div>
    {message&&<p role="status">{message}</p>}
    {showPrompt&&<label>Copyable prompt<textarea style={{...inp,minHeight:180}} value={CHATGPT_EVENT_PROMPT} readOnly onFocus={e=>e.target.select()}/></label>}
    {draft&&<section aria-label="Imported event preview" className={styles.importPreview}>
      {events.length>1&&<label htmlFor="import-event-choice">Choose an event ({events.length} found)<select id="import-event-choice" style={inp} value={selected} onChange={e=>setSelected(+e.target.value)}>{events.map((event,i)=><option key={i} value={i}>{event.name}</option>)}</select></label>}
      <h4>{draft.name}</h4><p><strong>Private draft</strong> · {draft.kind==='partner'?'Contracted / partner event':draft.kind}</p>
      <dl>{[['Date',draft.eventDate||draft.dateLabel||'Needs confirmation'],['Time',draft.eventTime||'Not supplied'],['Venue',draft.venue||'Needs confirmation'],['City',draft.city||'Not supplied'],['Organiser',draft.partnerDetails.organizer||'Not supplied'],['Contracting company',draft.partnerDetails.client||'Needs confirmation'],['Our role',draft.partnerDetails.role||'Needs confirmation'],['Admission',draft.partnerDetails.admission],['Official ticket URL',draft.partnerDetails.ticketUrl||'None'],['Institutions',draft.partnerDetails.institutions.join(' · ')||'None'],['News slug',draft.partnerDetails.newsSlug||'None']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className={styles.importDescription}>{draft.description||'No description supplied.'}</p>
      {draft.posterCaption&&<p>Poster caption reference: {draft.posterCaption}</p>}
      {draft.warnings.length>0&&<ul>{draft.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}
      <p>Always imported as a new draft. Uploaded images, existing records, prices and publication status are never overwritten.</p>
      <button style={btnMagenta} onClick={()=>onUse(draft)}>Use this draft</button>
    </section>}
  </section>;
}
