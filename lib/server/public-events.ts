import {q,hasDb} from './db';
import {cached} from './microcache';
import {PUBLIC_EVENT_STATUSES,isPubliclyVisible} from './event-lifecycle';
import {publicPartnerDetails} from '../partner-events';
import {resolveManyEventTruths} from './event-truth';

export type PublicEvent={
 id:string;slug:string;kind:string;name:string;status:string;eventDate:string|null;
 dateLabel:string;eventTime:string;venue:string;city:string;image:string;description:string;
 accent:string;logo:string;testimonial:string;priority:number;tiers:unknown[];
 partnerDetails?:ReturnType<typeof publicPartnerDetails>;sellable:boolean;
};
type Row={id:string;slug:string;kind:string;name:string;status:string;event_date:string|null;date_label:string;event_time:string;venue:string;city:string;image:string;description:string;accent:string;logo:string;testimonial:string;priority:number;tiers:unknown;partner_details:unknown};
function tiers(value:unknown):unknown[]{try{const parsed=typeof value==='string'?JSON.parse(value):value;return Array.isArray(parsed)?parsed:[]}catch{return []}}
/** Whitelisted shared source for SSR, public API, timelines and portfolio cards. */
export async function readPublicEvents(kind?:string|null):Promise<PublicEvent[]>{
 if(!hasDb())throw Error('events_unavailable');
 const snapshot=await cached(`site-events:${kind||'all'}`,5_000,async()=>{
  const cols=`id,slug,kind,name,status,event_date::text AS event_date,date_label,event_time,venue,city,image,description,accent,logo,testimonial,priority,tiers,to_jsonb(tour_events)->'partner_details' AS partner_details`;
  const rows=kind?await q<Row>(`SELECT ${cols} FROM tour_events WHERE kind=$1 AND status=ANY($2) ORDER BY priority DESC,event_date ASC NULLS LAST`,[kind,[...PUBLIC_EVENT_STATUSES]]):await q<Row>(`SELECT ${cols} FROM tour_events WHERE status=ANY($1) ORDER BY priority DESC,event_date ASC NULLS LAST`,[[...PUBLIC_EVENT_STATUSES]]);
  const truths=await resolveManyEventTruths(rows.filter(row=>row.kind==='ticketed').map(row=>row.slug));
  const bySlug=new Map(truths.map(truth=>[truth.slug,truth]));
  const events=rows.filter(row=>isPubliclyVisible(row.status)&&(row.kind!=='partner'||publicPartnerDetails(row.partner_details))).map(row=>{
   const truth=bySlug.get(row.slug);
   return {id:row.id,slug:row.slug||'',kind:row.kind,name:row.name,status:row.status,eventDate:row.event_date||null,dateLabel:row.date_label||'',eventTime:row.event_time||'',venue:row.venue||'',city:row.city||'',image:row.image||'',description:row.description||'',accent:row.accent||'',logo:row.logo||'',testimonial:row.testimonial||'',priority:Number(row.priority)||0,tiers:row.kind==='ticketed'?truth?.tiers??tiers(row.tiers):[],partnerDetails:row.kind==='partner'?publicPartnerDetails(row.partner_details):undefined,sellable:row.kind==='ticketed'&&truth?.isSellable===true} satisfies PublicEvent;
  });
  return {events,expires:Date.now()+15_000};
 });
 if(snapshot.expires<=Date.now())throw Error('snapshot_expired');
 return snapshot.events;
}
