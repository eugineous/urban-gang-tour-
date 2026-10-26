import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {EventDay,DiscoveryRegion} from '@/ui/components/PublicationDate';
import {OriginalContent} from '@/ui/i18n/OriginalContent';
import {SITE} from '@/lib/site';
import {publicPartnerDetails,partnerTicketAction} from '@/lib/partner-events';
import {partnerEventSchema} from '@/lib/partner-event-schema';
import {getBlogPost} from '@/app/_lib/blog';
import {JsonLd} from './JsonLd';
import {EventCalendar} from './EventCalendar';
import styles from './PartnerEvents.module.css';
import {EventArtwork,OriginalEventPoster} from './EventArtwork';

export type PartnerEventRecord={name:string;slug:string;status:string;image:string;description:string;event_date:string|null;event_time:string;venue:string;city:string;previous_start_at?:string|null;partner_details:unknown};
export default async function PartnerEventDetails({event}:{event:PartnerEventRecord}) {
  const partner=publicPartnerDetails(event.partner_details);
  if(!partner)return null;
  const date=event.event_date?.slice(0,10)||null;
  const schema=partnerEventSchema(event);
  const completed=event.status==='completed';
  const news=partner.newsSlug?await getBlogPost(partner.newsSlug):null;
  // Server request time determines the existing official-ticket eligibility gate.
  // eslint-disable-next-line react-hooks/purity
  const external=partnerTicketAction(partner,event.status,date,Date.now());
  const labels={completed:'status.pastCollaboration',ongoing:'status.ongoing',postponed:'status.postponedDate',rescheduled:'status.rescheduled',sales_paused:'status.sales_paused',sold_out:'status.sold_out',announced:'status.announced'} as const;
  const admission={free:'admission.free',invitation:'admission.invitation',unconfirmed:'card.entry',external:'admission.external'} as const;
  return <div className="event-detail-page wrap">
    {schema&&<JsonLd data={schema}/>}
    <DiscoveryRegion as="nav" className="detail-breadcrumbs" message="breadcrumb"><a href="/events"><MessageText catalogue={discoveryMessages} message="events"/></a><span aria-hidden="true">/</span><span aria-current="page" lang="en-KE">{event.name}</span></DiscoveryRegion>
    <section className="event-detail-hero"><div><p className="eyebrow"><MessageText catalogue={discoveryMessages} message={labels[event.status as keyof typeof labels]||'status.partner'}/></p><h1 lang="en-KE">{event.name}</h1><OriginalContent disclose><p>{event.description}</p></OriginalContent><p><EventDay day={date} postponed={event.status==='postponed'} long/> · {event.venue?<span lang="en-KE">{event.venue}</span>:<MessageText catalogue={discoveryMessages} message="card.venue"/>}</p></div>{event.image?<OriginalEventPoster name={event.name} image={event.image} caption={partner.posterCaption}/>:<EventArtwork name={event.name}/>}</section>
    <section className="event-detail-grid"><div><h2><MessageText catalogue={discoveryMessages} message={completed?'details.involvement':'details.title'}/></h2>{partner.role&&<p lang="en-KE">{partner.role}</p>}<dl>{([['details.organizer',partner.organizer],['details.company',partner.client],['details.venue',event.venue],['details.time',event.event_time]] as const).map(([label,value])=><div key={label}><dt><MessageText catalogue={discoveryMessages} message={label}/></dt><dd>{value?<span lang="en-KE">{value}</span>:<MessageText catalogue={discoveryMessages} message="details.confirm"/>}</dd></div>)}</dl>{partner.institutions.length>0&&<p className={styles.institutions} lang="en-KE">{partner.institutions.join(' · ')}</p>}<div className="modern-actions"><a href="/portfolio"><MessageText catalogue={discoveryMessages} message="details.portfolio"/></a>{news&&<a href={'/blog/'+news.slug}><MessageText catalogue={discoveryMessages} message="details.readStory"/></a>}{!completed&&event.status!=='postponed'&&date&&<EventCalendar name={event.name} date={date} start={schema&&'startDate' in schema&&String(schema.startDate).includes('T')?String(schema.startDate):null} venue={event.venue} url={SITE.domain+'/events/'+event.slug}/>}</div></div>
    <aside className="modern-card"><h2><MessageText catalogue={discoveryMessages} message={completed?'details.archive':'details.entry'}/></h2><p><MessageText catalogue={discoveryMessages} message={completed?'details.ended':admission[partner.admission]}/></p>{external&&<a className="button" href={external} target="_blank" rel="noopener noreferrer"><MessageText catalogue={discoveryMessages} message="details.seller"/></a>}{!completed&&partner.admission==='external'&&!external&&<p><MessageText catalogue={discoveryMessages} message={['sales_paused','sold_out','postponed'].includes(event.status)?'details.entryUpdates':'details.noTicketInfo'}/></p>}<p className="form-note"><MessageText catalogue={discoveryMessages} message={partner.admission==='external'?'details.collaboratorExternal':'details.collaborator'}/></p><a href="/book"><MessageText catalogue={discoveryMessages} message="details.bring"/></a></aside></section>
    {partner.posters.length>0&&<section className={styles.posters} aria-labelledby="original-posters-title"><h2 id="original-posters-title"><MessageText catalogue={discoveryMessages} message="details.posters"/></h2><div>{partner.posters.map(p=><figure key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer"><img lang="en-KE" src={p.url} alt={p.caption} loading="lazy"/></a><figcaption lang="en-KE">{p.caption}</figcaption></figure>)}</div></section>}
  </div>;
}
