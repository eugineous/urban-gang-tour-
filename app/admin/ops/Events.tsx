'use client';

// Tour events: ticketed concerts (real prices, real payments), school tour
// stops, and past-client showcase logos. Single source of truth for
// the public event feed, the ticket checkout
// pricing layer (lib/server/catalog.ts) and the /events JSON-LD — see
// app/api/site-data/events/route.ts for the public read side.

import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENT_STATUSES, isPubliclyVisible, type EventStatus } from '@/lib/server/event-lifecycle';
import ImageUploadField from '../ImageUploadField';
import {EMPTY_PARTNER,parsePartnerDetails,normalizePosterUrl,partnerPublicationError,partnerPublicationChecks,partnerPublicationIssues,partnerAdmission,type PartnerDetails,type PartnerPublicationIssue,type PartnerPublicationField} from '@/lib/partner-events';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';
import {PARTNER_EVENT_DRAFTS} from '@/lib/partner-event-drafts';
import EventBriefImport from './EventBriefImport';
import EventCategoryField from './EventCategoryField';
import {useUnsavedWarning} from '@/lib/client/use-unsaved-warning';
import styles from './Events.module.css';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3,
  Chip, fmtDate, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

type Kind = 'ticketed' | 'school' | 'past' | 'partner';
// Full lifecycle — mirrors lib/server/event-lifecycle.ts, which is the single
// source of truth the server validates against.
type Status = EventStatus;

interface Tier { name: string; price: number; capacity?: number | null; per_order_min?: number; per_order_max?: number }

// Provenance for a row recovered from source history rather than entered as a
// live operational record. `unverified` means the values come from an old
// commit — see lib/server/recovered-legacy-events.ts.
interface RecoveryInfo {
  recovered_from_commit: string; recovered_at: string;
  verification_status: 'unverified' | 'verified' | 'rejected';
  verified_at: string | null; verified_by: string | null; recovery_notes: string;
}

interface TourEvent {
  id: string; slug?: string; updated_at: string; kind: Kind; name: string; event_date: string | null; date_label: string;
  event_time: string; venue: string; city: string; accent: string; status: Status;
  priority: number; image: string; description: string; tiers: Tier[] | string;
  logo: string; testimonial: string;
  recovery?: RecoveryInfo | null;
  previous_start_at?: string | null;
  partner_details?: PartnerDetails | string | null;
  category_id?:string|null;
}

const EMPTY = {
  id: '' as string, updatedAt:'',categoryId:'',kind: 'school' as Kind, name: '', eventDate: '', dateLabel: '',
  eventTime: '', venue: '', city: '', accent: '', status: 'draft' as Status,
  priority: 0, image: '', description: '', tiers: [{ name: 'Regular', price: 0 }] as Tier[],
  logo: '', testimonial: '', partnerDetails: {...EMPTY_PARTNER},
};

type Feedback={kind:'error'|'success';message:string;fields?:PartnerPublicationIssue[]};
const FIELD_IDS:Record<PartnerPublicationField,string>={organizer:'partner-organizer',client:'partner-client',role:'partner-role',image:'event-main-artwork',eventDate:'tour-event-date',venue:'tour-event-venue',ticketUrl:'partner-ticket-url',details:'event-partner-details',posters:'event-additional-posters',newsSlug:'partner-news-slug',posterCaption:'event-poster-caption',institutions:'partner-institutions',admission:'partner-admission'};
function preparedPartner(details:PartnerDetails):PartnerDetails{return {...details,institutions:details.institutions.map(value=>value.trim()).filter(Boolean),posters:details.posters.filter(poster=>poster.url.trim()||poster.caption.trim())}}
async function eventRequest(body?:unknown){
  const response=await fetchWithTimeout('/api/admin/ops'+(body?'':'?view=tourEvents'),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'},20000);
  return {status:response.status,data:await response.json().catch(()=>({}))};
}
const eventPost=(kind:string,data:unknown)=>eventRequest({kind,data});
function confirmedEvent(row:TourEvent|undefined,kind:Kind,status:Status):row is TourEvent{return !!row&&typeof row.id==='string'&&!!row.id&&row.kind===kind&&row.status===status&&typeof row.name==='string'}

const KIND_LABEL: Record<Kind, string> = { ticketed: 'Ticketed', school: 'School Tour', past: 'Past Client', partner:'Contracted / partner event' };
const KIND_TABS: (Kind | 'all')[] = ['all', 'ticketed', 'partner', 'school', 'past'];
const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft', pending_review: 'Pending review', announced:'Announced · public, no ticket sales', published: 'Upcoming · published', ongoing: 'Happening now',
  sales_paused: 'Sales paused', sold_out: 'Sold out', postponed: 'Postponed',
  rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed', archived: 'Archived',
};

function visibilityNote(status: Status, kind: Kind): string {
  if (!isPubliclyVisible(status)) return 'Hidden from the public site';
  if (status==='announced')return 'Public announcement · ticket sales are off';
  if (status === 'ongoing') return 'Public · happening now · online sales closed';
  if (status === 'completed') return 'Public history · no ticket sales';
  if (kind === 'partner') return 'Public partner listing · no Urban Gang checkout';
  if (kind !== 'ticketed') return 'Public information · no ticket sales';
  if (status !== 'published') return 'Public event · ticket sales closed';
  return 'Public event · sales depend on available inventory and sale window';
}

function safeJson(v: string): RecoveryInfo | null {
  try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : null; } catch { return null; }
}

function parseTiers(v: Tier[] | string): Tier[] {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// tourEvent.save replaces every editable field, rather than accepting a
// partial patch. Priority shortcuts must retain the full existing record.
function eventSavePayload(r: TourEvent, priority: number) {
  return {
    id: r.id, updatedAt:r.updated_at,kind: r.kind, name: r.name, eventDate: r.event_date ? fmtDate(r.event_date) : null,
    dateLabel: r.date_label || '', eventTime: r.event_time || '', venue: r.venue || '', city: r.city || '',
    accent: r.accent || '', status: r.status, priority, image: r.image || '',
    description: r.description || '', tiers: parseTiers(r.tiers),
    logo: r.logo || '', testimonial: r.testimonial || '',
    partnerDetails: r.kind === 'partner' ? parsePartnerDetails(r.partner_details,{draft:true}) : null,
  };
}

export default function Events() {
  const [rows, setRows] = useState<TourEvent[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [importing,setImporting]=useState(false);
  useUnsavedWarning(!!edit||importing);
  const [kindTab, setKindTab] = useState<Kind | 'all'>('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageBusy,setImageBusy]=useState(false);
  const [categoryBusy,setCategoryBusy]=useState(false),[categoryDirty,setCategoryDirty]=useState(false),[categoryLoaded,setCategoryLoaded]=useState(false);
  const [statusFilter,setStatusFilter]=useState('all');
  const [pendingStatus,setPendingStatus]=useState<{row:TourEvent;status:Status}|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, say] = useToast();
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const [focusField,setFocusField]=useState<string|null>(null);
  const requestPending=useRef(false),initialEdit=useRef('');
  const beginEdit=(next:typeof EMPTY)=>{initialEdit.current=JSON.stringify(next);setFeedback(null);setPendingStatus(null);setCategoryLoaded(false);setEdit(next)};
  useEffect(()=>{
    if(!edit||!focusField)return;
    const section=document.getElementById(FIELD_IDS[focusField as PartnerPublicationField]||focusField);
    for(let ancestor=section?.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
    const control=section?.matches('input,select,textarea')?section:section?.querySelector<HTMLElement>('input,select,textarea');
    if(control){(control as HTMLElement).focus();control.scrollIntoView({block:'center',behavior:'smooth'});setFocusField(null)}
  },[edit,focusField]);
  const editorPartner=edit?preparedPartner(edit.partnerDetails):null;
  const editorChecks=edit?.kind==='partner'?partnerPublicationChecks(editorPartner,{status:isPubliclyVisible(edit.status)?edit.status:'published',image:edit.image,eventDate:edit.eventDate,venue:edit.venue}):[];
  const editorIssues=edit?.kind==='partner'?partnerPublicationIssues(editorPartner,{status:'announced',image:edit.image}):[];
  const issueKey=(issue:PartnerPublicationIssue)=>issue.targetId||issue.field;
  const fieldError=(target:string)=>!!feedback?.fields?.some(issue=>issueKey(issue)===target)&&editorIssues.some(issue=>issueKey(issue)===target);
  const showFeedback=()=>{
    if(!feedback)return null;
    const fields=(feedback.fields||[]).filter(issue=>!edit||editorIssues.some(current=>issueKey(current)===issueKey(issue)));
    const corrected=!!feedback.fields?.length&&!fields.length&&!!edit;
    return <section className={feedback.kind==='error'&&!corrected?styles.error:styles.success} role={feedback.kind==='error'&&!corrected?'alert':'status'} aria-live="polite"><p>{corrected?'The highlighted details are corrected. Save or publish to confirm the change.':feedback.message}</p>{!!fields.length&&<ul>{fields.map(issue=><li key={issueKey(issue)}>{edit?<button type="button" onClick={()=>setFocusField(issueKey(issue))}>{issue.message}</button>:issue.message}</li>)}</ul>}</section>;
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { status, data } = await eventRequest();
      if (status >= 400 || data.error || !Array.isArray(data.rows)) {
        setLoadError(status === 401 || status === 403
          ? 'Your session does not have access to tour events. Sign in with an account assigned the Events module.'
          : 'Tour events could not be loaded. Retry to view the current records.');
        return;
      }
      setRows(data.rows.map((r: any) => ({
        ...r,
        tiers: parseTiers(r.tiers),
        recovery: typeof r.recovery === 'string' ? safeJson(r.recovery) : (r.recovery || null),
      })));
    } catch {
      setLoadError('Tour events could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = async (asDraft=false,statusOverride?:Status) => {
    if(requestPending.current||busy||imageBusy||categoryBusy)return;
    if(categoryDirty){setFeedback({kind:'error',message:'Save or cancel your category edit first. Your event entries are still here.'});document.getElementById('category-name')?.focus();return;}
    if (!edit || !edit.name.trim()) { setFeedback({kind:'error',message:'Add the event name. Your other entries are still here.'});document.getElementById('tour-event-name')?.focus();return; }
    const targetStatus=asDraft?'draft':statusOverride||edit.status;
    const partnerDetails=preparedPartner(edit.partnerDetails);
    if(edit.kind==='partner'){
      const row={status:targetStatus,image:edit.image,eventDate:edit.eventDate,venue:edit.venue};
      const error=partnerPublicationError(partnerDetails,row);
      if(error){const fields=partnerPublicationIssues(partnerDetails,row);setFeedback({kind:'error',message:'Not saved. Correct the highlighted fields; your entries and uploaded images are kept. Unfinished poster captions can be saved as a draft.',fields});setFocusField(fields[0]?issueKey(fields[0]):'details');return}
    }
    requestPending.current=true;setFeedback(null);
    setBusy(true);
    const submittedCategory=categoryLoaded||edit.categoryId?edit.categoryId||null:undefined;
    try {
    const { status, data } = await eventPost('tourEvent.save', {
      id: edit.id || undefined, updatedAt:edit.updatedAt||undefined,kind: edit.kind, name: edit.name, eventDate: edit.eventDate || null,
      dateLabel: edit.dateLabel, eventTime: edit.eventTime, venue: edit.venue, city: edit.city,
      accent: edit.accent, status: targetStatus, priority: edit.priority, image: normalizePosterUrl(edit.image),
      description: edit.description, tiers: edit.kind === 'ticketed' ? edit.tiers : [],
      logo: edit.logo, testimonial: edit.testimonial,
      partnerDetails: edit.kind === 'partner' ? partnerDetails : null,
      categoryId:submittedCategory,
    });
    if (status >= 400 || data.error) { setFeedback({kind:'error',message:status===409?'This event has a newer saved version. Your entries are still here; compare with the current record before trying again.':partnerErrorMessage(data.error || 'save_failed'),fields:Array.isArray(data.fields)?data.fields:undefined});return; }
    if(!data.ok||!confirmedEvent(data.row,edit.kind,targetStatus)||(edit.id&&data.row.id!==edit.id)){setFeedback({kind:'error',message:'The server did not confirm this save. Your entries are still here. Reload the event list in another tab before retrying.'});return}
    if(submittedCategory!==undefined&&data.row.category_id!==submittedCategory){setFeedback({kind:'error',message:'The server did not confirm the category selection. Your event entries are still here. Check the saved event in another tab before retrying.'});return}
    setRows(current=>[data.row,...current.filter(row=>row.id!==data.row.id)]);
    setFeedback({kind:'success',message:targetStatus==='draft'?'Draft saved. It is not public.':isPubliclyVisible(targetStatus)?'Event saved and published.':'Event saved. It is not public.'});
    setEdit(null);
    await reload();
    } catch {
      setFeedback({kind:'error',message:'The save could not be confirmed. Your entries are still here. Check the event list before retrying.'});
    } finally {
      setBusy(false);requestPending.current=false;
    }
  };


  const updateStatus=async()=>{
    if(!pendingStatus||busy||requestPending.current)return;
    const details=pendingStatus.row.partner_details??{...EMPTY_PARTNER,admission:'unconfirmed'};
    const fields=pendingStatus.row.kind==='partner'?partnerPublicationIssues(details,{status:pendingStatus.status,image:pendingStatus.row.image,eventDate:pendingStatus.row.event_date,venue:pendingStatus.row.venue}):[];
    if(fields.length){setFeedback({kind:'error',message:'Not published. The saved record still needs these items. Open Edit event to add them.',fields});return}
    requestPending.current=true;setFeedback(null);
    setBusy(true);
    try{
      const {row,status:next}=pendingStatus;
      const result=await eventPost('tourEvent.status',{id:row.id,status:next,expectedStatus:row.status,updatedAt:row.updated_at});
      if(result.status>=400||result.data.error){setFeedback({kind:'error',message:result.status===409?'This event changed. Reload and review before trying again.':partnerErrorMessage(result.data.error),fields:Array.isArray(result.data.fields)?result.data.fields:undefined});return}
      if(!result.data.ok||!confirmedEvent(result.data.row,row.kind,next)||result.data.row.id!==row.id){setFeedback({kind:'error',message:'The server did not confirm the status change. The current saved status is still shown until you reload and check.'});return}
      setRows(current=>current.map(item=>item.id===row.id?result.data.row:item));setPendingStatus(null);setFeedback({kind:'success',message:isPubliclyVisible(next)?'Status saved. This event is public.':'Status saved. This event is hidden from the public site.'});await reload();
    }catch{setFeedback({kind:'error',message:'Connection interrupted. Reload to check the saved status before retrying.'})}
    finally{setBusy(false);requestPending.current=false}
  };

  // One-time recovery of the three LEGACY ticketed events that shipped before
  // the DB cutover (lib/server/recovered-legacy-events.ts). These are evidence
  // recovered from source history, NOT verified commercial facts: a date that
  // has passed is recorded as `completed` (history, never sellable), and a
  // future date stays `draft` until a human confirms it. Nothing is published,
  // nothing is emailed, and a second run cannot duplicate or overwrite.
  const recoverLegacyEvents = async () => {
    if (!confirm('Recover the 3 legacy pre-migration ticketed events?\n\nExperience Hub Dance Event · Urban Festival Of Colours · Campus Rave\n\nThese are RECOVERED FROM SOURCE HISTORY, not verified current facts. A past date is recorded as completed (history, not sellable). A future date stays a draft until you confirm it. Each row is marked UNVERIFIED until you publish it.')) return;
    setBusy(true);
    try {
    const { status, data } = await eventPost('tourEvent.recoverLegacyEvents', {});
    if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'events could not be recovered')); return; }
    const recovered: Record<string, string> = data.recovered || {};
    const ids = Object.keys(recovered);
    say(ids.length
      ? `Recovered ${ids.length} (${Array.from(new Set(Object.values(recovered))).join('/')}) — confirm each date before publishing.`
      : 'Already present — nothing recovered, nothing overwritten.');
    await reload();
    } catch {
      say('Could not recover the records. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  // "Prioritize / non-prioritize": a one-click pin to the top of its kind, or
  // drop back to 0 — priority is still a plain int under the hood (so an
  // admin who wants finer control can still edit it directly in the form).
  const maxPriorityFor = (kind: Kind) => rows.filter((r) => r.kind === kind).reduce((m, r) => Math.max(m, r.priority), 0);
  const setPriority = async (r: TourEvent, priority: number) => {
    setBusy(true);
    try {
      const { status, data } = await eventPost('tourEvent.save', eventSavePayload(r, priority));
      if (status >= 400 || data.error) { say('Failed: ' + (data.error || 'priority could not be saved')); return; }
      say('Priority saved');
      await reload();
    } catch {
      say('Could not update the priority. Check your connection and retry.');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (r?: TourEvent,targetStatus?:Status) => {
    if (!r) { beginEdit({ ...EMPTY, kind: kindTab === 'all' ? 'school' : kindTab }); return; }
    beginEdit({
      id: r.id, updatedAt:r.updated_at,categoryId:r.category_id||'',kind: r.kind, name: r.name, eventDate: fmtDate(r.event_date), dateLabel: r.date_label || '',
      eventTime: r.event_time || '', venue: r.venue || '', city: r.city || '', accent: r.accent || '',
      status: r.status, priority: r.priority, image: r.image || '', description: r.description || '',
      tiers: parseTiers(r.tiers).length ? parseTiers(r.tiers) : [{ name: 'Regular', price: 0 }],
      logo: r.logo || '', testimonial: r.testimonial || '',
      partnerDetails: parsePartnerDetails(r.partner_details,{draft:true}) || {...EMPTY_PARTNER},
    });
    if(targetStatus)setEdit(current=>current?{...current,status:targetStatus}:current);
  };

  const setTier = (i: number, patch: Partial<Tier>) => {
    if (!edit) return;
    const tiers = edit.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setEdit({ ...edit, tiers });
  };

  const byKind = rows.filter((r) => (kindTab === 'all' || r.kind === kindTab) && (showCancelled || statusFilter==='cancelled' || r.status !== 'cancelled') && (statusFilter==='all'||r.status===statusFilter));
  const visible = useSearch(byKind, qy);
  const publicCount = rows.filter(r => isPubliclyVisible(r.status)).length;
  const reviewCount = rows.filter(r => r.status === 'draft' || r.status === 'pending_review').length;
  const publishedTicketCount = rows.filter(r => r.kind === 'ticketed' && r.status === 'published').length;

  if(importing)return <EventBriefImport onCancel={()=>setImporting(false)} onUse={draft=>{
    beginEdit({...EMPTY,...draft,id:'',image:'',status:'draft',tiers:[]});setImporting(false);
  }}/>;

  if (edit) {
    return (
      <div style={{...card,minWidth:0}} className={styles.editor}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT EVENT' : 'NEW EVENT'}</h3>
        <p role="status">{busy?'Saving your entries…':!edit.id?'New event — not saved yet.':JSON.stringify(edit)!==initialEdit.current?'Unsaved changes — save event to keep them.':'Showing the saved event details.'}</p>
        {showFeedback()}
        {edit.kind==='partner'&&<section className={styles.readiness} aria-label="Event details checklist"><strong>Optional details — add what you know.</strong><p>You can publish an announcement without artwork, a date, venue or credits. Missing details are shown as unconfirmed.</p><ul>{editorChecks.map(check=><li key={check.field} data-ready={check.ready}>{check.ready?<span>✓ {check.label}: Added</span>:<button type="button" onClick={()=>setFocusField(check.field)}>{check.label}: {check.field==='details'?'Check details':'Not added'}</button>}</li>)}</ul></section>}
        <fieldset disabled={busy} className={styles.formFields}>

        {/* Overview */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Overview</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-kind">Kind *</label>
              <select id="tour-event-kind" style={inp} value={edit.kind} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind })}>
                <option value="ticketed">Ticketed concert</option>
                <option value="school">School tour stop</option>
                <option value="past">Past client</option>
                <option value="partner">Contracted / partner event</option>
              </select>
            </div>
            <div><label style={label} htmlFor="tour-event-name">Name *</label><input id="tour-event-name" style={inp} maxLength={200} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Lari Boys High School" /></div>
            <div><label style={label} htmlFor="tour-event-priority">Priority (higher shows first)</label><input id="tour-event-priority" style={inp} type="number" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) || 0 })} /></div>
          </div>
          <EventCategoryField value={edit.categoryId} onChange={categoryId=>setEdit(current=>current?{...current,categoryId}:current)} disabled={busy} onBusy={setCategoryBusy} onDirty={setCategoryDirty} onLoaded={setCategoryLoaded}/>
          <div style={{ marginTop: 10 }}>
            <label style={label} htmlFor="tour-event-description">{edit.kind === 'ticketed' ? 'Tagline' : 'Description'}</label>
            <input id="tour-event-description" style={inp} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </div>
          {edit.kind === 'past' && (
            <div style={{ marginTop: 10 }}>
              <label style={label} htmlFor="tour-event-testimonial">Testimonial</label>
              <textarea id="tour-event-testimonial" style={{ ...inp, minHeight: 70 }} value={edit.testimonial} onChange={(e) => setEdit({ ...edit, testimonial: e.target.value })} />
            </div>
          )}
        </div>

        {edit.kind==='partner'&&<fieldset id="event-partner-details" className={styles.partnerFields}>
          <legend>Partner & admission</legend>
          {PARTNER_EVENT_DRAFTS.find(d=>d.name===edit.name)&&<p role="note">Brief review: {PARTNER_EVENT_DRAFTS.find(d=>d.name===edit.name)?.review}</p>}
          <p>This is your work on another organiser’s event. It never creates Urban Gang tickets or takes payments here.</p>
          {([['organizer','Presented / organised by'],['client','Contracting company'],['role','Our role & credited team']] as const).map(([key,title])=><div key={key}><label htmlFor={'partner-'+key}>{title}</label><input id={'partner-'+key} style={inp} value={edit.partnerDetails[key]} aria-invalid={!!feedback?.fields?.some(issue=>issue.field===key)&&!edit.partnerDetails[key].trim()} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,[key]:e.target.value}})}/></div>)}
          <div><label htmlFor="partner-admission">Admission</label><select id="partner-admission" style={inp} value={edit.partnerDetails.admission} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,admission:e.target.value as PartnerDetails['admission']}})}><option value="external">Tickets sold by organiser / another platform</option><option value="free">Free admission</option><option value="invitation">By invitation</option><option value="unconfirmed">Not yet confirmed</option></select></div>
          {edit.partnerDetails.admission==='external'&&<div><label htmlFor="partner-ticket-url">Official ticket seller URL (HTTPS)</label><input id="partner-ticket-url" style={inp} type="url" placeholder="https://official-ticket-seller.example/event" value={edit.partnerDetails.ticketUrl} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,ticketUrl:e.target.value}})}/></div>}
          <label htmlFor="partner-institutions">Institutions (one per line)<textarea id="partner-institutions" style={inp} value={edit.partnerDetails.institutions.join('\n')} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,institutions:e.target.value.split('\n')}})}/></label>
          <label htmlFor="partner-news-slug">Related story (slug or Urban Gang story link)<input id="partner-news-slug" style={inp} value={edit.partnerDetails.newsSlug} aria-invalid={fieldError('newsSlug')||undefined} placeholder="unifest-2026-university-of-nairobi" onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,newsSlug:e.target.value}})}/></label>
          <p>Only verified facts and published stories appear publicly. Past listings keep their credits but do not advertise active ticket sales.</p>
        </fieldset>}

        {/* Schedule */}
        {edit.kind !== 'past' && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Schedule</p>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div><label style={label} htmlFor="tour-event-date">Date {edit.kind === 'school' ? '(leave blank if TBA)' : '*'}</label><input id="tour-event-date" style={inp} type="date" value={edit.eventDate} onChange={(e) => setEdit({ ...edit, eventDate: e.target.value })} /></div>
              {edit.kind === 'school' && !edit.eventDate && (
                <div><label style={label} htmlFor="tour-event-date-label">Date label (shown instead, e.g. &quot;Date to be confirmed&quot;)</label><input id="tour-event-date-label" style={inp} value={edit.dateLabel} onChange={(e) => setEdit({ ...edit, dateLabel: e.target.value })} placeholder="Date to be confirmed" /></div>
              )}
              {(edit.kind === 'ticketed'||edit.kind==='partner') && (
                <div><label style={label} htmlFor="tour-event-time">Time</label><input id="tour-event-time" style={inp} value={edit.eventTime} onChange={(e) => setEdit({ ...edit, eventTime: e.target.value })} placeholder="2:00 PM" /></div>
              )}
            </div>
          </div>
        )}

        {/* Venue */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Venue</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-venue">{edit.kind === 'ticketed' ? 'Venue' : 'Location line'}</label><input id="tour-event-venue" style={inp} value={edit.venue} onChange={(e) => setEdit({ ...edit, venue: e.target.value })} placeholder={edit.kind === 'ticketed' ? 'KICC Grounds' : 'Kimende, Lari, Kiambu County'} /></div>
            {(edit.kind === 'ticketed'||edit.kind==='partner') && (
              <div><label style={label} htmlFor="tour-event-city">City</label><input id="tour-event-city" style={inp} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Nairobi" /></div>
            )}
          </div>
        </div>

        {/* Tickets */}
        {edit.kind === 'ticketed' && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Tickets</p>
            <span style={label}>Ticket tiers (real prices — checkout charges exactly this)</span>
            {edit.tiers.map((t, i) => (
              <fieldset key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
                <legend>Tier {i + 1}</legend>
                <label style={label}>Name<input aria-label={`Ticket tier ${i + 1} name`} style={inp} value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="Tier name" /></label>
                <label style={label}>Price · KES<input aria-label={`Ticket tier ${i + 1} price in KES`} style={inp} type="number" min={0} step={1} value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })} /></label>
                <label style={label}>Total capacity<input aria-label={`Ticket tier ${i + 1} capacity`} style={inp} type="number" min={0} step={1} value={t.capacity ?? ''} onChange={(e) => setTier(i, { capacity: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Required to open sales" /></label>
                <label style={label}>Minimum per order<input aria-label={`Ticket tier ${i + 1} minimum per order`} style={inp} type="number" min={1} max={20} step={1} value={t.per_order_min ?? 1} onChange={(e) => setTier(i, { per_order_min: Number(e.target.value) })} /></label>
                <label style={label}>Maximum per order<input aria-label={`Ticket tier ${i + 1} maximum per order`} style={inp} type="number" min={t.per_order_min ?? 1} max={20} step={1} value={t.per_order_max ?? 20} onChange={(e) => setTier(i, { per_order_max: Number(e.target.value) })} /></label>
                <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: edit.tiers.filter((_, idx) => idx !== i) })}>Remove</button>
              </fieldset>
            ))}
            <button style={btnSmall} onClick={() => setEdit({ ...edit, tiers: [...edit.tiers, { name: '', price: 0 }] })}>+ Add tier</button>
            <p style={{fontSize:12,color:'#555'}}>Capacity is the total allocation, including issued tickets and active reservations. Blank capacity keeps sales closed. Do not rename or reorder tiers after orders have been created; tier indexes identify existing tickets.</p>
          </div>
        )}

        {/* Media */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Media</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div id="event-main-artwork"><ImageUploadField label="Event artwork" purpose="events" value={edit.image} disabled={busy||imageBusy} onBusyChange={setImageBusy} onChange={url=>setEdit(current=>current?{...current,image:url}:current)}/></div>
            {edit.kind==='partner'&&<div><label htmlFor="event-poster-caption">Poster caption / accessible description</label><textarea id="event-poster-caption" style={inp} maxLength={300} value={edit.partnerDetails.posterCaption||''} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,posterCaption:e.target.value}})}/></div>}
            {edit.kind === 'ticketed' && (
              <div><label style={label} htmlFor="tour-event-accent">Accent colour (hex)</label><input id="tour-event-accent" style={inp} value={edit.accent} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} placeholder="#E6218C" /></div>
            )}
            {edit.kind === 'past' && (
              <ImageUploadField label="Client logo" purpose="events" value={edit.logo} disabled={busy||imageBusy} onBusyChange={setImageBusy} onChange={url=>setEdit(current=>current?{...current,logo:url}:current)}/>
            )}
          </div>
          {edit.kind==='partner'&&<div id="event-additional-posters" className={styles.partnerFields}>
            <h4>Additional original posters</h4>
            <p>Upload each poster and add a short caption before publishing. Unfinished rows can be saved privately as a draft.</p>
            {edit.partnerDetails.posters.map((poster,index)=><fieldset key={index}><legend>Poster {index+2}</legend>
              <ImageUploadField inputId={`partner-poster-${index}`} validationError={fieldError(`partner-poster-${index}-url`)?'Use an uploaded image or a safe HTTPS image link.':undefined} label={`Additional poster ${index+2}`} purpose="events" value={poster.url} disabled={busy||imageBusy} onBusyChange={setImageBusy} onChange={url=>setEdit(current=>current?{...current,partnerDetails:{...current.partnerDetails,posters:current.partnerDetails.posters.map((p,i)=>i===index?{...p,url}:p)}}:current)}/>
              <label htmlFor={`partner-poster-${index}-caption`}>Caption / accessible description<input id={`partner-poster-${index}-caption`} style={inp} maxLength={300} aria-invalid={fieldError(`partner-poster-${index}-caption`)||undefined} aria-describedby={fieldError(`partner-poster-${index}-caption`)?`partner-poster-${index}-caption-error`:undefined} value={poster.caption} onChange={e=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,posters:edit.partnerDetails.posters.map((p,i)=>i===index?{...p,caption:e.target.value}:p)}})}/></label>
              {fieldError(`partner-poster-${index}-caption`)&&<p id={`partner-poster-${index}-caption-error`}>Add a short caption for Poster {index+2}, or save this event as a draft.</p>}
              <button style={btnSmall} disabled={busy||imageBusy} onClick={()=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,posters:edit.partnerDetails.posters.filter((_,i)=>i!==index)}})}>Remove poster</button>
            </fieldset>)}
            <button style={btnSmall} disabled={busy||imageBusy||edit.partnerDetails.posters.length>=8} onClick={()=>setEdit({...edit,partnerDetails:{...edit.partnerDetails,posters:[...edit.partnerDetails.posters,{url:'',caption:''}]}})}>+ Add poster variant</button>
          </div>}
        </div>

        {/* Lifecycle */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: OC.magenta }}>Lifecycle</p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div><label style={label} htmlFor="tour-event-status">Status</label>
              <select id="tour-event-status" style={inp} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })} aria-describedby="tour-event-visibility">
                {EVENT_STATUSES.map(status => <option value={status} key={status}>{STATUS_LABEL[status]} ({isPubliclyVisible(status) ? 'public' : 'hidden'})</option>)}
              </select>
            </div>
          </div>
          <div id="tour-event-visibility" style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            {visibilityNote(edit.status, edit.kind)}.
            {edit.kind === 'school' && ' A school stop is information about the tour, not a public ticket offer.'}
            {edit.status === 'cancelled' && ' Review affected orders and arrange any refunds through event operations.'}
            {!edit.id && ' New records start as drafts. Confirm the date, venue, media permissions and commercial details before publishing.'}
          </div>
        </div>

        <div className={styles.savebar}>
          <button style={btnMagenta} disabled={busy||imageBusy||categoryBusy} onClick={()=>void save()}>{categoryBusy?'Saving category…':imageBusy?'Wait for artwork…':busy ? 'Saving…' : 'Save event'}</button>
          {!isPubliclyVisible(edit.status)&&<button style={btn} disabled={busy||imageBusy||categoryBusy} onClick={()=>void save(false,'announced')}>Publish announcement</button>}
          {edit.kind==='partner'&&isPubliclyVisible(edit.status)&&!isPubliclyVisible(rows.find(row=>row.id===edit.id)?.status||'draft')&&<button style={btn} disabled={busy||imageBusy||categoryBusy} onClick={()=>void save(true)}>Save private draft</button>}
          <button style={btnDark} disabled={busy||imageBusy||categoryBusy} onClick={() => {if((!categoryDirty&&JSON.stringify(edit)===initialEdit.current)||confirm('Close without saving these changes? Cancel to keep your entries.')){setEdit(null);setFeedback(null)}}}>Cancel</button>
        </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <Toast msg={toast} />
      {showFeedback()}
      <div style={{...card,minWidth:0}}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>TOUR EVENTS</h3>
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search events..." />
          <button style={btnMagenta} disabled={busy||loading||!!loadError} onClick={()=>setImporting(true)}>Paste from ChatGPT</button>
          <button style={btn} disabled={busy || loading || !!loadError} onClick={() => openEdit()}>+ New event</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <label style={{width:'100%',maxWidth:320}}>Status filter <select style={inp} aria-label="Filter events by status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{EVENT_STATUSES.map(status=><option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
          {KIND_TABS.map((k) => (
            <button key={k} style={{ ...btnSmall, background: kindTab === k ? OC.magenta : '#fff', color: kindTab === k ? '#fff' : '#111' }} onClick={() => setKindTab(k)}>
              {k === 'all' ? 'All' : KIND_LABEL[k]}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginLeft: 8 }}>
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show cancelled
          </label>
        </div>
        {!loading && !loadError && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }} aria-label="Event publishing overview">
          <Chip text={`${publicCount} public records`} bg="#E7F5EE" color={OC.green} />
          <Chip text={`${reviewCount} drafts / awaiting review`} bg="#FDF2D9" color={OC.orange} />
          <Chip text={`${publishedTicketCount} published ticketed events`} />
        </div>}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Publish confirmed events, update their status, and manage artwork here. Ticket sales also require available inventory.
        </div>
        {loading && <p role="status">Loading tour events…</p>}
        {loadError && <div role="alert" style={{ background: '#FBE7E7', padding: 14, borderRadius: 10, marginBottom: 14 }}><p style={{ margin: '0 0 10px' }}>{loadError}</p><button style={btnSmall} onClick={reload}>Retry loading events</button></div>}
        {!loading&&!loadError&&!rows.some(r=>r.kind==='ticketed')&&<details className={styles.summary}><summary>Legacy event recovery · advanced</summary><p>Restore old source records for review. Nothing is put on sale, and existing records are not overwritten.</p><button style={btnSmall} disabled={busy} onClick={()=>void recoverLegacyEvents()}>Recover legacy events</button></details>}
        <nav className={styles.tools} aria-label="Event tools"><a href="/admin?tab=Promos">Checkout discounts</a><a href="/admin?tab=Campaigns">Banners & pop-ups</a><a href="/admin?tab=Event%20Operations">Event operations</a></nav>
        {!loading&&!loadError&&<details className={styles.summary}><summary>Supplied event briefs · start a draft</summary><p>Five unique events from your posters. Review artwork, dates, admission and team roles before publishing. Nothing is automatically published.</p><div className={styles.actions}>{PARTNER_EVENT_DRAFTS.map(draft=><button key={draft.key} style={btnSmall} disabled={rows.some(r=>r.kind==='partner'&&r.name===draft.name)} onClick={()=>beginEdit({...EMPTY,kind:'partner',name:draft.name,eventDate:draft.eventDate,dateLabel:draft.dateLabel,eventTime:draft.eventTime,venue:draft.venue,city:draft.city,description:draft.description,partnerDetails:{...draft.partnerDetails}})}>{draft.name}{rows.some(r=>r.kind==='partner'&&r.name===draft.name)?' · already saved':''}</button>)}</div></details>}
        {!loading && !loadError && <div className={styles.cards}>
          {visible.map(r=><article key={r.id} className={styles.event}>
            {r.image&&<img src={r.image} alt="" className={styles.cover}/>}
            <div className={styles.content}>
              <div className={styles.tags}><Chip text={KIND_LABEL[r.kind]}/><Chip text={r.status==='published'&&r.event_date&&Date.parse(fmtDate(r.event_date)+'T23:59:59+03:00')<Date.now()?'Date passed · review status':STATUS_LABEL[r.status]||r.status}/>{r.priority>0&&<Chip text="Featured"/>}</div>
              <h3>{r.name}</h3>
              <p>{r.event_date?fmtDate(r.event_date):r.date_label||'Date to be confirmed'}{r.event_time?' · '+r.event_time:''}<br/>{[r.venue,r.city].filter(Boolean).join(', ')||'Venue to be confirmed'}</p>
              {r.kind==='ticketed'&&<p>{parseTiers(r.tiers).map(t=>t.name+' · KES '+t.price.toLocaleString()).join(' / ')}</p>}
              {r.kind==='partner'&&<p>{partnerAdmission(parsePartnerDetails(r.partner_details)||EMPTY_PARTNER)} · {parsePartnerDetails(r.partner_details)?.client||'Client to be confirmed'}</p>}
              <p>{visibilityNote(r.status,r.kind)}</p>
              {r.recovery&&r.recovery.verification_status!=='verified'&&<p>Recovered record · review its details before publishing.</p>}
              <label>Event status<select aria-label={'Status for '+r.name} disabled={busy} value={pendingStatus?.row.id===r.id?pendingStatus.status:r.status} onChange={e=>{setFeedback(null);setPendingStatus({row:r,status:e.target.value as Status})}}>{EVENT_STATUSES.map(status=><option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
              {pendingStatus?.row.id===r.id&&<section className={styles.confirm} aria-label="Confirm event status"><strong>Change to {STATUS_LABEL[pendingStatus.status]}?</strong><p>Not applied yet. Saved status: {STATUS_LABEL[r.status]}.</p>{r.kind==='partner'&&partnerPublicationIssues(r.partner_details??{...EMPTY_PARTNER,admission:'unconfirmed'},{status:pendingStatus.status,image:r.image,eventDate:r.event_date,venue:r.venue}).length>0?<div className={styles.error}><p>Not ready to publish. Your saved details are kept.</p><ul>{partnerPublicationIssues(r.partner_details??{...EMPTY_PARTNER,admission:'unconfirmed'},{status:pendingStatus.status,image:r.image,eventDate:r.event_date,venue:r.venue}).map(issue=><li key={issueKey(issue)}>{issue.message}</li>)}</ul><button style={btn} onClick={()=>{const issue=partnerPublicationIssues(r.partner_details??{...EMPTY_PARTNER,admission:'unconfirmed'},{status:pendingStatus.status,image:r.image,eventDate:r.event_date,venue:r.venue})[0];openEdit(r,pendingStatus.status);setFocusField(issueKey(issue))}}>Edit missing details</button></div>:<p>{visibilityNote(pendingStatus.status,r.kind)}. This does not send messages or issue refunds.</p>}<div className={styles.actions}><button style={btnMagenta} disabled={busy} onClick={()=>void updateStatus()}>Confirm status</button><button style={btnSmall} disabled={busy} onClick={()=>{setPendingStatus(null);setFeedback(null)}}>Keep current</button></div></section>}
              <div className={styles.actions}>
                <button style={btnSmall} disabled={busy} onClick={()=>openEdit(r)}>Edit event</button>
                <button style={btnSmall} disabled={busy} onClick={()=>setPriority(r,r.priority>0?0:maxPriorityFor(r.kind)+10)}>{r.priority>0?'Unfeature':'Feature'}</button>
                {isPubliclyVisible(r.status)&&<a href={r.kind==='ticketed'||r.kind==='partner'?'/events/'+encodeURIComponent(r.slug||r.id):r.kind==='school'?'/tour-stops':'/clients'} target="_blank" rel="noopener noreferrer">View public page</a>}
              </div>
            </div>
          </article>)}
          {!visible.length&&<p>No events match this view. Adjust the filters or create an event.</p>}
        </div>}
      </div>
    </div>
  );
}

function partnerErrorMessage(code:string){
  if(code==='invalid_event_category'||code==='event_category_unavailable')return 'This category is unavailable for assignment. Refresh categories and choose an active one, or save without a category. Your other entries are kept.';
  if(code==='invalid_partner_artwork')return 'Use an uploaded image or a safe HTTPS artwork link, or leave artwork empty.';
  if(code==='event_details_required')return 'Ticket sales need a confirmed date and venue. Use Publish announcement to share details without opening sales.';
  const messages:Record<string,string>={partner_details_required:'Not published. Complete the missing items listed below; your other entries are kept.',partner_ticket_url_required:'Not published. Add the official ticket link or correct the admission type.',invalid_partner_details:'Check the ticket link and additional poster captions. Your entries are kept.',event_details_required:'Add the venue and event date before publishing.',event_review_required:'Open Edit and review this recovered record before publishing.',event_kind_immutable:'An existing event’s kind cannot change. Create a separate partner listing to preserve ticket history.',unauthorized:'Your session expired. Your entries are still here; sign in again in another tab, then retry.',forbidden:'This account does not have permission to save events.'};
  return messages[code]||'The event could not be saved. Your entries are still here.';
}
