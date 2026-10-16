import {EMPTY_PARTNER,externalTicketUrl,type PartnerDetails} from './partner-events';

export type ImportedEventBrief={
  kind:'partner'|'school'|'ticketed'|'past';name:string;priority:number;description:string;
  eventDate:string;dateLabel:string;eventTime:string;venue:string;city:string;
  partnerDetails:PartnerDetails;warnings:string[];posterCaption:string;
};
const key=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/\*/g,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();
const aliases:Record<string,string>={
  name:'name','event name':'name',title:'name',kind:'kind','event kind':'kind',priority:'priority',description:'description',tagline:'description',
  date:'eventDate','event date':'eventDate','date label':'dateLabel',time:'eventTime','event time':'eventTime',venue:'venue','location line':'location',city:'city',
  'presented / organised by':'organizer','presented / organized by':'organizer',organiser:'organizer',organizer:'organizer','organised by':'organizer','organized by':'organizer',
  'contracting company':'client',client:'client','our role & credited team':'role','our role':'role',role:'role',
  admission:'admission','official ticket seller url':'ticketUrl','official ticket seller url (https)':'ticketUrl','ticket url':'ticketUrl',
  institutions:'institutions','institutions (one per line)':'institutions','related news story slug':'newsSlug','news slug':'newsSlug',
  'poster caption / accessible description':'posterCaption','primary poster caption / accessible description':'posterCaption',
  'poster caption':'posterCaption',
  lifecycle:'status',status:'status',
};
// Pasted prose is data, never a command or executable HTML. Deliberate blanks
// must not become public claims such as client="Not confirmed".
const value=(s:string)=>/^(?:leave blank\b|not (?:yet )?(?:confirmed|specified|provided)\b|unknown\b|tba\b|to be confirmed\b)/i.test(s.trim())?'':s.trim();
function dateValue(s:string):string{
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?s:'';
  }
  const m=/^(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i.exec(s);
  if(!m)return '';
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].slice(0,3).toLowerCase());
  return month<0?'':dateValue(`${m[3]}-${String(month+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
}
function timeValue(s:string){
  const m=/^(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?(?:\s+till late)?$/i.exec(s);
  if(!m)return '';
  let h=+m[1];const min=+(m[2]||'0');if(min>59||h>23||(m[3]&&(h<1||h>12)))return '';
  if(m[3])h=h%12+(/pm/i.test(m[3])?12:0);
  return `${h%12||12}:${String(min).padStart(2,'0')} ${h<12?'AM':'PM'}`;
}
function makeDraft(fields:Map<string,string>):ImportedEventBrief{
  const warnings:string[]=[];
  const get=(k:string)=>value(fields.get(k)||'');
  const limited=(k:string,max:number)=>{const v=get(k);if(v.length>max)warnings.push(`${k} was shortened to ${max} characters. Review it.`);return v.slice(0,max)};
  const kindText=get('kind').toLowerCase();
  const kind:ImportedEventBrief['kind']=/partner|contracted/.test(kindText)?'partner':/school/.test(kindText)?'school':/past client|^past$/.test(kindText)?'past':/ticketed/.test(kindText)?'ticketed':'partner';
  if(!kindText||!/(?:partner|contracted|school|past|ticketed)/.test(kindText))warnings.push('Event kind needs review; defaulted to contracted / partner event.');
  const date=get('eventDate'),eventDate=dateValue(date),time=get('eventTime'),eventTime=timeValue(time);
  if(date&&!eventDate)warnings.push('Date is incomplete or invalid. Confirm the full date including year.');
  if(time&&!eventTime)warnings.push('Start time needs review; it was left blank.');
  const admissionText=get('admission').toLowerCase();
  const admission:PartnerDetails['admission']=/^free(?:\b|$)/.test(admissionText)?'free':/invitation/.test(admissionText)?'invitation':/external|ticket|another platform/.test(admissionText)?'external':'unconfirmed';
  const ticketInput=get('ticketUrl'),ticketUrl=ticketInput?externalTicketUrl(ticketInput)||'':'';
  if(ticketInput&&!ticketUrl)warnings.push('Unsafe or invalid external ticket URL was omitted. Use an official HTTPS seller.');
  const institutions=get('institutions').split(/\n|;/).map(s=>s.replace(/^[-•]\s*/,'').trim()).filter(Boolean);
  if(institutions.length>12)warnings.push('Only the first 12 institutions were imported.');
  const news=get('newsSlug');if(news&&!/^[a-z0-9-]{1,100}$/.test(news))warnings.push('Invalid news slug was omitted.');
  const priority=get('priority');if(priority&&!/^-?\d{1,4}$/.test(priority))warnings.push('Invalid priority was replaced with zero.');
  if(kind==='ticketed')warnings.push('Ticket prices and capacity are not imported. Configure and verify them in Tickets.');
  if(kind==='partner'&&(!get('client')||!get('role')))warnings.push('Confirm the contracting company and our credited role before publishing.');
  return {kind,name:limited('name',200),priority:/^-?\d{1,4}$/.test(priority)?+priority:0,description:limited('description',2000),
    eventDate,dateLabel:limited('dateLabel',60)||(!eventDate?date.slice(0,60):''),eventTime,
    venue:(get('venue')||get('location')).slice(0,300),city:limited('city',100),
    partnerDetails:{...EMPTY_PARTNER,organizer:limited('organizer',300),client:limited('client',200),role:limited('role',1200),admission,ticketUrl,institutions:institutions.slice(0,12).map(s=>s.slice(0,200)),posters:[],newsSlug:/^[a-z0-9-]{1,100}$/.test(news)?news:'',posterCaption:limited('posterCaption',300)},
    warnings,posterCaption:limited('posterCaption',300)};
}

export type EventBriefImport={events:ImportedEventBrief[];error?:string};
export function parseEventBrief(input:string):EventBriefImport{
  if(!input.trim())return {events:[],error:'Paste your event text first.'};
  if(input.length>60_000)return {events:[],error:'Paste at most 60,000 characters at a time.'};
  const text=input.replace(/\r\n?/g,'\n').trim().replace(/^```(?:json|text)?\s*\n?/i,'').replace(/\n?```$/,'');
  const events:ImportedEventBrief[]=[];
  if(/^[\[{]/.test(text)){
    let parsed:unknown;try{parsed=JSON.parse(text)}catch{return {events:[],error:'This looks like JSON but is incomplete. Paste the complete code block, or use labelled event text.'}}
    const entries=Array.isArray(parsed)?parsed:[parsed];
    if(!entries.length)return {events:[],error:'No events found in this JSON array.'};
    if(entries.length>20)return {events:[],error:'Import at most 20 events at a time.'};
    for(const entry of entries){
      if(!entry||typeof entry!=='object'||Array.isArray(entry))return {events:[],error:'Each JSON event must be an object with a name.'};
      const fields=new Map<string,string>();
      for(const [label,v] of Object.entries(entry)){
        if(label==='partnerDetails'&&v&&typeof v==='object'&&!Array.isArray(v)){
          for(const [nested,nv]of Object.entries(v)){const target=aliases[key(nested)];if(target&&(typeof nv==='string'||(nested==='institutions'&&Array.isArray(nv)&&nv.every(s=>typeof s==='string'))))fields.set(target,Array.isArray(nv)?nv.join('\n'):String(nv));}
        }else{
          const target=aliases[key(label)];
          if(target&&(typeof v==='string'||typeof v==='number'||(target==='institutions'&&Array.isArray(v)&&v.every(s=>typeof s==='string'))))fields.set(target,Array.isArray(v)?v.join('\n'):String(v));
        }
      }
      const draft=makeDraft(fields);if(!draft.name)return {events:[],error:'Every event needs a Name or name field.'};events.push(draft);
    }
  }else{
    const lines=text.replace(/\*\*/g,'').split('\n');
    let fields=new Map<string,string>(),active='';
    for(const raw of lines){
      const line=raw.replace(/^\s*(?:#{1,6}\s+|[-•]\s+)/,'').trimEnd();
      const match=/^([^:\n]{1,90}):\s*(.*)$/.exec(line);
      const field=match?aliases[key(match[1])]:undefined;
      if(field){
        if(field==='name'&&fields.get('name')){events.push(makeDraft(fields));fields=new Map();}
        active=field;fields.set(field,match![2].trim());
      }else if(active){fields.set(active,(fields.get(active)||'')+'\n'+line);}
    }
    if(fields.get('name'))events.push(makeDraft(fields));
    if(events.length>20)return {events:[],error:'Import at most 20 events at a time.'};
    if(!events.length)return {events:[],error:'No labelled event found. Include Name:, Date:, Venue: and Description:, or use the copyable template.'};
  }
  if(events.some(e=>!e.name))return {events:[],error:'Every event needs a name.'};
  return {events};
}

export const CHATGPT_EVENT_PROMPT=`Write my event as plain text using the labels below, one event at a time. Use only confirmed facts. Leave unknown values blank; never invent dates, prices, results or team roles. Return only this filled template in a copyable code block. Use YYYY-MM-DD for Date. Kind is Contracted / partner event, School tour stop, Ticketed concert or Past client. Admission is Free admission, Tickets sold by organiser / another platform, By invitation or Not yet confirmed. Do not include prices or executable code.\n\nName:\nKind: Contracted / partner event\nPriority: 0\nDescription:\nPresented / organised by:\nContracting company:\nOur role & credited team:\nAdmission: Not yet confirmed\nOfficial ticket seller URL:\nInstitutions:\nRelated news story slug:\nDate:\nTime:\nVenue:\nCity:\nPoster caption / accessible description:`;
