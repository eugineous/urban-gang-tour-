import {ownedEventPresentation,publicOwnedEvents,type OwnedEvent} from '@/ui/lib/owned-event-presentation';
import {posterUrl} from './partner-events';

const text=(value:unknown)=>typeof value==='string'?value.trim():'';
/** Promote actual published records, never scraped ads, hidden drafts or stale sales claims. */
export function recentEventPlacements(events:OwnedEvent[],now:number,path=''){
 const candidates=publicOwnedEvents(events,now).filter(event=>{
  const slug=text(event.slug),view=ownedEventPresentation(event,now);
  return /^[a-z0-9-]{1,80}$/.test(slug)&&view.href!==path.replace(/\/$/,'')&&
   (event.status==='completed'||!view.past&&!['postponed','sales_paused','sold_out'].includes(text(event.status)));
 });
 return candidates.sort((a,b)=>{
  const oldA=a.status==='completed',oldB=b.status==='completed';
  if(oldA!==oldB)return Number(oldA)-Number(oldB);
  const dateA=Date.parse(text(a.eventDate)+'T12:00:00+03:00'),dateB=Date.parse(text(b.eventDate)+'T12:00:00+03:00');
  if(Number.isFinite(dateA)!==Number.isFinite(dateB))return Number(!Number.isFinite(dateA))-Number(!Number.isFinite(dateB));
  return (Number.isFinite(dateA)&&Number.isFinite(dateB)?(oldA?dateB-dateA:dateA-dateB):0)||text(a.name).localeCompare(text(b.name));
 }).slice(0,3).map(event=>{
  const view=ownedEventPresentation(event,now),image=text(event.image);
  return {id:text(event.id)||text(event.slug),name:text(event.name),href:view.href,image:image&&posterUrl(image)?image:'/assets/ugt-logo.png',
   date:view.dateLabel,dateTime:view.dateTime,location:[text(event.venue),text(event.city)].filter(Boolean).join(', '),
   label:event.status==='completed'?'Recent work':event.status==='ongoing'?'Happening now':event.status==='announced'?'Just announced':'Coming up'};
 });
}
