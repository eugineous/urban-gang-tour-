import {q,hasDb} from '@/lib/server/db';
import {cached} from '@/lib/server/microcache';
import {PUBLIC_EVENT_STATUSES} from '@/lib/server/event-lifecycle';
import {parsePartnerDetails} from '@/lib/partner-events';
import styles from './PartnerEvents.module.css';

async function partnerRecords() {
  if(!hasDb())return [];
  try {
    const snapshot=await cached('partner-portfolio',5_000,async()=>({rows:await q<{slug:string;name:string;status:string;image:string;description:string;event_date:string|null;partner_details:unknown}>(
      `SELECT slug,name,status,image,description,event_date::text AS event_date,
       to_jsonb(tour_events)->'partner_details' AS partner_details FROM tour_events
       WHERE kind='partner' AND status=ANY($1) AND slug!=''
       ORDER BY priority DESC,event_date DESC NULLS LAST LIMIT 60`,[[...PUBLIC_EVENT_STATUSES]]),expires:Date.now()+15_000}));
    return snapshot.expires>Date.now()?snapshot.rows:[];
  }catch{return []}
}

export default async function PartnerEventPortfolio({newsSlug}:{newsSlug?:string}) {
  const rows=(await partnerRecords()).filter(row=>{
    const partner=parsePartnerDetails(row.partner_details);
    return partner&&(!newsSlug||partner.newsSlug===newsSlug);
  });
  if(!rows.length)return null;
  return <section className={'wrap '+styles.section} aria-label={newsSlug?'Related event':'Contracted event portfolio'}>
    <h2>{newsSlug?'The event.':'Events & collaborations.'}</h2>
    <div className={styles.cards}>{rows.map(row=>{
      const partner=parsePartnerDetails(row.partner_details)!;
      return <article key={row.slug}>
        {row.image&&<a href={'/events/'+row.slug} tabIndex={-1} aria-hidden="true"><img src={row.image} alt="" loading="lazy"/></a>}
        <p className={styles.status}>{row.status==='completed'?'Past collaboration':row.status==='ongoing'?'Happening now':row.status==='postponed'?'Postponed':row.event_date&&Date.parse(row.event_date+'T23:59:59+03:00')<Date.now()?'Past date':'Upcoming collaboration'}</p>
        <h3><a href={'/events/'+row.slug}>{row.name}</a></h3><p>{partner.role}</p><p>{partner.institutions.join(' · ')}</p><p>For {partner.client}</p>
        <a className={styles.action} href={'/events/'+row.slug}>View event & credits →</a>
      </article>;
    })}</div>
  </section>;
}
