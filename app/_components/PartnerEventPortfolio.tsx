import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {EventDay,DiscoveryRegion} from '@/ui/components/PublicationDate';
import {EventStatus} from '@/ui/components/EventPosterCard';
import {readPublicEvents} from '@/lib/server/public-events';
import {ownedEventPresentation} from '@/ui/lib/owned-event-presentation';
import {EventArtwork} from './EventArtwork';
import styles from './PartnerEvents.module.css';

export default async function PartnerEventPortfolio({newsSlug,excludeSchool=false}:{newsSlug?:string;excludeSchool?:boolean}){
 let events:Awaited<ReturnType<typeof readPublicEvents>>=[];
 try{events=await readPublicEvents()}catch{return null}
 // Server request time preserves the existing public archive/status presentation.
 // eslint-disable-next-line react-hooks/purity
 const now=Date.now();
 const rows=events.filter(event=>/^[a-z0-9-]{1,80}$/.test(event.slug)&&(newsSlug?event.partnerDetails?.newsSlug===newsSlug:event.status==='completed'&&(!excludeSchool||event.kind!=='school')));
 if(!rows.length)return null;
 return <DiscoveryRegion className={'wrap '+styles.section} message={newsSlug?'details.related':'details.publishedArchive'}>
  <h2><MessageText catalogue={discoveryMessages} message={newsSlug?'details.theEvent':'details.completedRecords'}/></h2>
  <div className={styles.cards}>{rows.map(event=>{
   const view=ownedEventPresentation(event,now),partner=event.partnerDetails;
   return <article key={event.id}><a href={'/events/'+event.slug} tabIndex={-1} aria-hidden="true"><EventArtwork name={event.name} image={event.image} labelMessage="details.fromArchive"/></a>
    <p className={styles.status}><EventStatus event={event} now={now}/></p><h3 lang="en-KE"><a href={'/events/'+event.slug}>{event.name}</a></h3>
    <p><EventDay day={view.dateTime} postponed={event.status==='postponed'}/></p>{partner?.role&&<p lang="en-KE">{partner.role}</p>}{partner?.institutions.length? <p lang="en-KE">{partner.institutions.join(' · ')}</p>:null}{partner?.client&&<p><MessageText catalogue={discoveryMessages} message="details.for" values={{client:<span lang="en-KE">{partner.client}</span>}}/></p>}
    <a className={styles.action} href={'/events/'+event.slug}><MessageText catalogue={discoveryMessages} message="details.viewRecord"/></a>
   </article>;
  })}</div>
 </DiscoveryRegion>;
}
