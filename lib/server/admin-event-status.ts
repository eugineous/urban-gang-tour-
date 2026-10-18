import { q } from './db';
import { isEventStatus, type EventStatus } from './event-lifecycle';
import { EMPTY_PARTNER, partnerPublicationError,partnerPublicationIssues,type PartnerPublicationIssue } from '../partner-events';

export class EventPublicationError extends Error {
  constructor(code:string,public readonly fields:PartnerPublicationIssue[]){super(code)}
}

export type EventStatusChange = {id:string;status:EventStatus;expectedStatus:EventStatus;updatedAt:string};
export function parseEventStatusChange(value: unknown): EventStatusChange | null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(key=>!['id','status','expectedStatus','updatedAt'].includes(key))||
    typeof v.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(v.id)||!isEventStatus(v.status)||!isEventStatus(v.expectedStatus)||
    typeof v.updatedAt!=='string'||v.updatedAt.length>50||!Number.isFinite(Date.parse(v.updatedAt)))return null;
  return v as EventStatusChange;
}
// Narrow update: never overwrite schedule, media, tiers or prices. The exact
// timestamp guards both concurrent state changes and edits made after loading.
export async function changeEventStatus(input:EventStatusChange,actor:string) {
  const [row]=await q("SELECT id,status,kind,name,event_date,venue,image,tiers,recovery,to_jsonb(tour_events)->'partner_details' AS partner_details FROM tour_events WHERE id=$1",[input.id]);
  if(!row)throw new Error('not_found');
  if(row.status!==input.expectedStatus)throw new Error('event_conflict');
  if(row.kind==='partner'){
    const details=row.partner_details??{...EMPTY_PARTNER,admission:'unconfirmed'};
    const error=partnerPublicationError(details,{status:input.status,image:row.image,eventDate:row.event_date,venue:row.venue});
    if(error)throw new EventPublicationError(error,partnerPublicationIssues(details,{status:input.status,image:row.image,eventDate:row.event_date,venue:row.venue}));
  }
  if(['announced','published','ongoing'].includes(input.status)){
    if(!row.name||(row.kind==='ticketed'&&input.status!=='announced'&&(!String(row.venue||'').trim()||!row.event_date)))throw new Error('event_details_required');
    let recovery=row.recovery;
    if(typeof recovery==='string'){try{recovery=JSON.parse(recovery)}catch{throw new Error('event_review_required')}}
    if(recovery&&recovery.verification_status!=='verified')throw new Error('event_review_required');
  }
  const rows=await q(`WITH changed AS (
    UPDATE tour_events SET status=$2,updated_at=now()
    WHERE id=$1 AND status=$3 AND updated_at=$4::timestamptz RETURNING *
  ), audited AS (
    INSERT INTO audit_log(actor,action,detail)
    SELECT $5,'ops.tourEvent.status',jsonb_build_object('id',id,'from',$3::text,'to',status) FROM changed
  ) SELECT * FROM changed`,[input.id,input.status,input.expectedStatus,input.updatedAt,actor]);
  if(!rows.length)throw new Error('event_conflict');
  return rows[0];
}
