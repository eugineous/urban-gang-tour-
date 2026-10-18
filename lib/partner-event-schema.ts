import {SITE} from './site';
import {publicImageUrl} from './public-image-url';
import {publicPartnerDetails} from './partner-events';
import {eventSchemaStatus,isPubliclyVisible} from './server/event-lifecycle';

export function partnerEventSchema(row:{name:string;slug:string;status:string;image?:string;description?:string;event_date?:string|null;event_time?:string;venue?:string;city?:string;previous_start_at?:string|null;partner_details:unknown}) {
  const details=publicPartnerDetails(row.partner_details);
  if(!details||!isPubliclyVisible(row.status))return null;
  const url=SITE.domain+'/events/'+encodeURIComponent(row.slug);
  const common={name:row.name,url,description:row.description,image:row.image?[publicImageUrl(row.image)]:undefined};
  if(row.status==='completed')return {'@context':'https://schema.org','@type':'CreativeWork',...common,
    creditText:details.role||undefined,contributor:{'@type':'Organization',name:'Urban Gang Tour',url:SITE.domain},
    about:details.institutions.map(name=>({'@type':'EducationalOrganization',name}))};
  const date=row.event_date?.slice(0,10);
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!row.venue)return null;
  const m=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(row.event_time||'');
  const time=m&&+m[1]>=1&&+m[1]<=12&&+m[2]<60?`T${String(+m[1]%12+(/pm/i.test(m[3])?12:0)).padStart(2,'0')}:${m[2]}:00+03:00`:'';
  return {'@context':'https://schema.org','@type':'Event',...common,startDate:date+time,
    ...(row.status==='rescheduled'&&row.previous_start_at?{previousStartDate:row.previous_start_at.slice(0,10)}:{}),
    eventStatus:eventSchemaStatus(row.status),eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
    location:{'@type':'Place',name:row.venue,address:{'@type':'PostalAddress',addressLocality:row.city||undefined,addressCountry:'KE'}},
    ...(details.organizer?{organizer:{'@type':'Organization',name:details.organizer}}:{}),
    ...(details.admission==='free'?{isAccessibleForFree:true}:{}),
    // We do not control the seller's inventory. Never invent an InStock Offer.
  };
}
