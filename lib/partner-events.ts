/** Public, explicitly credited work; never an Urban Gang ticket inventory. */
export type PartnerDetails = {
  organizer: string;
  client: string;
  role: string;
  admission: 'external' | 'free' | 'invitation' | 'unconfirmed';
  ticketUrl: string;
  institutions: string[];
  posters: {url: string; caption: string}[];
  newsSlug: string;
  posterCaption?: string;
};

export const EMPTY_PARTNER: PartnerDetails = {organizer:'',client:'',role:'',admission:'external',ticketUrl:'',institutions:[],posters:[],newsSlug:'',posterCaption:''};
/** Missing legacy metadata is unknown, not an invented organiser or seller. */
export function publicPartnerDetails(value:unknown):PartnerDetails|null{
  return value==null?{...EMPTY_PARTNER,admission:'unconfirmed'}:parsePartnerDetails(value);
}
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// Links are rendered, never fetched server-side. Still reject credentials,
// local hosts, private IP literals and our own checkout as a partner seller.
export function externalTicketUrl(value: string): string | null {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/\.$/,'');
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') ||
      !host.includes('.') || host.endsWith('.local') || host.endsWith('.internal') ||
      host === 'localhost' || host.endsWith('.localhost') || host.includes(':') ||
      /^(0|10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^\d+\./.test(host) || host === 'urbangangtour.co.ke' || host.endsWith('.urbangangtour.co.ke') ||
      host.endsWith('.chatgpt.site')) return null;
    return u.href;
  } catch { return null; }
}

export function posterUrl(value: string): boolean {
  // Same-origin uploads or public HTTPS artwork; no scripts/data URLs.
  const normalized=normalizePosterUrl(value);
  return /^\/(?!\/)[^\s\\]*$/.test(normalized) || externalTicketUrl(normalized) !== null;
}

/** Normalize formatting only; never invent captions, dates, credits or a seller. */
export function normalizePosterUrl(value:string):string {
  const text=value.trim();
  try{const url=new URL(text);if(url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&['urbangangtour.co.ke','www.urbangangtour.co.ke'].includes(url.hostname.toLowerCase()))return url.pathname+url.search+url.hash;}catch{}
  return text;
}
function partnerObject(value:unknown):Record<string,unknown>|null {
  if(typeof value==='string'){try{value=JSON.parse(value)}catch{return null}}
  return plain(value)?value:null;
}
function normalizedNewsSlug(value:string):string {
  const text=value.trim();
  if(/^\/blog\/[a-z0-9-]{1,100}\/?$/.test(text))return text.split('/')[2];
  try{const url=new URL(text);if(url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&['urbangangtour.co.ke','www.urbangangtour.co.ke'].includes(url.hostname.toLowerCase())&&/^\/blog\/[a-z0-9-]{1,100}\/?$/.test(url.pathname))return url.pathname.split('/')[2]}catch{}
  return text;
}
export type PartnerPublicationField = 'organizer'|'client'|'role'|'image'|'eventDate'|'venue'|'ticketUrl'|'details'|'posters'|'newsSlug'|'posterCaption'|'institutions'|'admission';
export type PartnerPublicationIssue = {field:PartnerPublicationField;label:string;message:string;targetId?:string};
export function isPartnerDraft(status:unknown){return status==='draft'||status==='pending_review'}
/** Shared, field-addressable validation. Drafts retain unfinished poster rows privately. */
export function partnerDetailIssues(value:unknown,{draft=false}:{draft?:boolean}={}):PartnerPublicationIssue[] {
  const v=partnerObject(value),issues:PartnerPublicationIssue[]=[];
  const add=(field:PartnerPublicationField,label:string,message:string,targetId?:string)=>issues.push({field,label,message,...(targetId?{targetId}:{})});
  if(!v||Object.keys(v).some(key=>!Object.keys(EMPTY_PARTNER).includes(key))){add('details','Partner details','Check the format of the partner details.');return issues}
  for(const [key,label,limit] of [['organizer','Organiser',300],['client','Contracting company',200],['role','Our role',1200],['ticketUrl','Official ticket link',800],['newsSlug','Related story',100]] as const){
    const text=key==='newsSlug'&&typeof v[key]==='string'?normalizedNewsSlug(v[key] as string):v[key];
    if(typeof text!=='string'||text.length>limit)add(key,label,`Use no more than ${limit} characters for ${label.toLowerCase()}.`);
  }
  if(v.posterCaption!==undefined&&(typeof v.posterCaption!=='string'||v.posterCaption.length>300))add('posterCaption','Main poster caption','Keep the main poster caption within 300 characters.');
  if(!['external','free','invitation','unconfirmed'].includes(String(v.admission)))add('admission','Admission','Choose one of the admission options.');
  if(!Array.isArray(v.institutions)||v.institutions.length>12||v.institutions.some(i=>typeof i!=='string'||!i.trim()||i.length>200))add('institutions','Institutions','Add up to 12 institution names, no more than 200 characters each.');
  if(!Array.isArray(v.posters)||v.posters.length>8)add('posters','Additional posters','Use no more than eight additional posters.','event-additional-posters');
  else v.posters.forEach((poster,index)=>{
    const label=`Poster ${index+2}`;
    if(!plain(poster)||Object.keys(poster).some(key=>!['url','caption'].includes(key))){add('posters',label,`${label}: check the image and caption.`,`partner-poster-${index}`);return}
    if(typeof poster.url!=='string'||poster.url.length>800||(!poster.url.trim()?!draft:!posterUrl(poster.url)))add('posters',label,`${label}: upload an image or use a safe HTTPS image link.`,`partner-poster-${index}-url`);
    if(typeof poster.caption!=='string'||poster.caption.length>300||(!draft&&!poster.caption.trim()))add('posters',label,`${label}: ${typeof poster.caption==='string'&&poster.caption.length>300?'keep the caption within 300 characters.':'add a short caption before publishing.'}`,`partner-poster-${index}-caption`);
  });
  if(typeof v.ticketUrl==='string'&&v.ticketUrl.trim()&&!externalTicketUrl(v.ticketUrl.trim()))add('ticketUrl','Official ticket link','Use the organiser’s HTTPS ticket link, not an Urban Gang checkout link.');
  if(typeof v.newsSlug==='string'&&v.newsSlug.trim()&&!/^[a-z0-9-]{1,100}$/.test(normalizedNewsSlug(v.newsSlug)))add('newsSlug','Related story','Use a story slug or paste the Urban Gang story link.');
  return issues;
}
export function parsePartnerDetails(value: unknown,options:{draft?:boolean}={}): PartnerDetails | null {
  if(partnerDetailIssues(value,options).length)return null;
  const v=partnerObject(value)!;
  return {
    organizer:(v.organizer as string).trim(),client:(v.client as string).trim(),role:(v.role as string).trim(),
    admission:v.admission as PartnerDetails['admission'],ticketUrl:(v.ticketUrl as string).trim(),
    institutions:(v.institutions as string[]).map(s=>s.trim()),
    posters:(v.posters as PartnerDetails['posters']).map(p=>({url:normalizePosterUrl(p.url),caption:p.caption.trim()})),
    newsSlug:normalizedNewsSlug(v.newsSlug as string),
    posterCaption:typeof v.posterCaption==='string'?v.posterCaption.trim():'',
  };
}

export function partnerPublicationError(details: unknown, row: {status: unknown; image?: unknown; eventDate?: unknown; venue?: unknown}): string | null {
  // Publishing information is not activating ticket sales. Missing optional
  // attribution, media or schedules must not force administrators to invent it.
  const issues=partnerPublicationIssues(details,row);
  return issues.length?(issues[0].field==='image'?'invalid_partner_artwork':'invalid_partner_details'):null;
}

export type PartnerPublicationRow = {status:unknown;image?:unknown;eventDate?:unknown;venue?:unknown};
/** Exact missing fields, shared by the form and server. Never returns entered values. */
export function partnerPublicationChecks(details:PartnerDetails|null,row:PartnerPublicationRow):Array<PartnerPublicationIssue&{ready:boolean}>{
  const present=(value:unknown)=>typeof value==='string'?!!value.trim():value instanceof Date&&!Number.isNaN(value.getTime());
  const checks:Array<PartnerPublicationIssue&{ready:boolean}>=[
    {field:'organizer',label:'Organiser',message:'Add who presents or organises this event.',ready:!!details?.organizer.trim()},
    {field:'client',label:'Contracting company',message:'Add the company that contracted us.',ready:!!details?.client.trim()},
    {field:'role',label:'Our role',message:'Add our role and credited team.',ready:!!details?.role.trim()},
    {field:'image',label:'Main event artwork',message:'Upload or select the main event artwork.',ready:typeof row.image==='string'&&row.image.length<=400&&!!row.image.trim()&&posterUrl(row.image)},
    {field:'venue',label:'Venue',message:'Add the venue or location line.',ready:present(row.venue)},
  ];
  if(row.status!=='postponed')checks.push({field:'eventDate',label:'Event date',message:'Add a confirmed event date.',ready:present(row.eventDate)});
  if(details?.admission==='external'&&['published','ongoing','rescheduled'].includes(String(row.status)))checks.push({field:'ticketUrl',label:'Official ticket link',message:'Add the official HTTPS ticket seller link, or choose the correct admission type.',ready:!!details.ticketUrl&&externalTicketUrl(details.ticketUrl)!==null});
  if(!details)checks.push({field:'details',label:'Partner details',message:'Check partner details, ticket link and additional poster captions.',ready:false});
  return checks;
}
export function partnerPublicationIssues(details:unknown,row:PartnerPublicationRow):PartnerPublicationIssue[]{
  const issues=partnerDetailIssues(details,{draft:isPartnerDraft(row.status)});
  if(issues.length)return issues;
  if(row.image!=null&&row.image!==''&&(typeof row.image!=='string'||row.image.length>400||!posterUrl(row.image)))return [{field:'image',label:'Main event artwork',message:'Use an uploaded image or a safe HTTPS artwork link, or leave it empty.'}];
  return [];
}

export function partnerAdmission(details: PartnerDetails) {
  return details.admission === 'free' ? 'Free admission' : details.admission === 'invitation' ? 'By invitation' : details.admission === 'unconfirmed' ? 'Entry details to be confirmed' : 'Tickets via organiser';
}

export function partnerTicketAction(details: PartnerDetails, status: string, date: string | null, now: number) {
  const active = ['published','ongoing','rescheduled'].includes(status) && !!date && Date.parse(date+'T23:59:59+03:00') >= now;
  return active && details.admission === 'external' ? externalTicketUrl(details.ticketUrl) : null;
}
