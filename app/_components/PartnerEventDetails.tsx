import {SITE} from '@/lib/site';
import {parsePartnerDetails,partnerAdmission,partnerTicketAction} from '@/lib/partner-events';
import {partnerEventSchema} from '@/lib/partner-event-schema';
import {getBlogPost} from '@/app/_lib/blog';
import {JsonLd} from './JsonLd';
import {EventCalendar} from './EventCalendar';
import styles from './PartnerEvents.module.css';

export type PartnerEventRecord={name:string;slug:string;status:string;image:string;description:string;event_date:string|null;event_time:string;venue:string;city:string;previous_start_at?:string|null;partner_details:unknown};
export default async function PartnerEventDetails({event}:{event:PartnerEventRecord}) {
  const partner=parsePartnerDetails(event.partner_details);
  if(!partner)return null;
  const date=event.event_date?.slice(0,10)||null;
  const schema=partnerEventSchema(event);
  const completed=event.status==='completed';
  const news=partner.newsSlug?await getBlogPost(partner.newsSlug):null;
  const external=partnerTicketAction(partner,event.status,date,Date.now());
  const dateLabel=date?new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Nairobi'}).format(new Date(date+'T12:00:00+03:00')):'Date to be confirmed';
  const labels:Record<string,string>={completed:'Past collaboration',ongoing:'Happening now',postponed:'Postponed · new date to be confirmed',rescheduled:'Rescheduled',sales_paused:'Ticket sales paused',sold_out:'Sold out'};
  return <div className="event-detail-page wrap">
    {schema&&<JsonLd data={schema}/>}
    <nav className="detail-breadcrumbs" aria-label="Breadcrumb"><a href="/events">Events</a><span aria-hidden="true">/</span><span aria-current="page">{event.name}</span></nav>
    <section className="event-detail-hero"><div><p className="eyebrow">{labels[event.status]||'Partner event'}</p><h1>{event.name}</h1><p>{event.description}</p><p>{dateLabel} · {event.venue}</p></div>{event.image&&<a href={event.image} target="_blank" rel="noopener noreferrer" aria-label={'View full original poster for '+event.name}><img src={event.image} alt={event.name+' — original event poster'}/></a>}</section>
    <section className="event-detail-grid"><div><h2>{completed?'Our involvement.':'The collaboration.'}</h2><p>{partner.role}</p><dl>{[['Organiser / presenters',partner.organizer],['Contracting company',partner.client],['Venue',event.venue],['Time',event.event_time||'To be confirmed']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{partner.institutions.length>0&&<p className={styles.institutions}>{partner.institutions.join(' · ')}</p>}<div className="modern-actions"><a href="/portfolio">Our event portfolio</a>{news&&<a href={'/blog/'+news.slug}>Read the story</a>}{!completed&&event.status!=='postponed'&&date&&<EventCalendar name={event.name} date={date} start={schema&&'startDate' in schema&&String(schema.startDate).includes('T')?String(schema.startDate):null} venue={event.venue} url={SITE.domain+'/events/'+event.slug}/>}</div></div>
    <aside className="modern-card"><h2>{completed?'Event archive.':'Entry details.'}</h2><p>{completed?'This event has ended. Ticket sales are closed.':partnerAdmission(partner)}</p>{external&&<a className="button" href={external} target="_blank" rel="noopener noreferrer">Buy from the official seller ↗</a>}{!completed&&partner.admission==='external'&&!external&&<p>{['sales_paused','sold_out','postponed'].includes(event.status)?'See the organiser for the latest entry updates.':'Ticket information is not currently available.'}</p>}<p className="form-note">Urban Gang Tour is a contracted collaborator, not the ticket seller. The organiser handles entry arrangements{partner.admission==='external'?', payments and ticket support':''}.</p><a href="/book">Bring us to your event</a></aside></section>
    {partner.posters.length>0&&<section className={styles.posters} aria-label="Original event posters"><h2>Event posters.</h2><div>{partner.posters.map(p=><figure key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={p.caption} loading="lazy"/></a><figcaption>{p.caption}</figcaption></figure>)}</div></section>}
  </div>;
}
