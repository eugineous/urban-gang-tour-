import {readPublicEvents} from '@/lib/server/public-events';
import {ownedEventPresentation} from '@/ui/lib/owned-event-presentation';
import {EventArtwork} from './EventArtwork';
import styles from './PartnerEvents.module.css';

export default async function PartnerEventPortfolio({newsSlug,excludeSchool=false}:{newsSlug?:string;excludeSchool?:boolean}){
 let events:Awaited<ReturnType<typeof readPublicEvents>>=[];
 try{events=await readPublicEvents()}catch{return null}
 const now=Date.now();
 const rows=events.filter(event=>/^[a-z0-9-]{1,80}$/.test(event.slug)&&(newsSlug?event.partnerDetails?.newsSlug===newsSlug:event.status==='completed'&&(!excludeSchool||event.kind!=='school')));
 if(!rows.length)return null;
 return <section className={'wrap '+styles.section} aria-label={newsSlug?'Related event':'Published event archive'}>
  <h2>{newsSlug?'The event.':'Completed event records.'}</h2>
  <div className={styles.cards}>{rows.map(event=>{
   const view=ownedEventPresentation(event,now),partner=event.partnerDetails;
   return <article key={event.id}><a href={'/events/'+event.slug} tabIndex={-1} aria-hidden="true"><EventArtwork name={event.name} image={event.image} label="From the archive"/></a>
    <p className={styles.status}>{view.label}</p><h3><a href={'/events/'+event.slug}>{event.name}</a></h3>
    <p>{view.dateLabel}</p>{partner?.role&&<p>{partner.role}</p>}{partner?.institutions.length? <p>{partner.institutions.join(' · ')}</p>:null}{partner?.client&&<p>For {partner.client}</p>}
    <a className={styles.action} href={'/events/'+event.slug}>View event record →</a>
   </article>;
  })}</div>
 </section>;
}
