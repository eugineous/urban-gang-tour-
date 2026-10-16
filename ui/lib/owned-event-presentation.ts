import {isPubliclyVisible, isSellable} from '../../lib/server/event-lifecycle';
import {publicPartnerDetails,partnerAdmission} from '../../lib/partner-events';
import {publicEventCategory} from '../../lib/event-categories';

export type OwnedEvent = Record<string, unknown>;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function eventDate(event: OwnedEvent) {
  const value = text(event.eventDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00+03:00');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return {value, date};
}

/** The API owns commercial availability; this helper only presents its truth. */
export function ownedEventPresentation(event: OwnedEvent, now: number) {
  const school = event.kind === 'school';
  const partner = event.kind === 'partner';
  const partnerDetails = partner ? publicPartnerDetails(event.partnerDetails) : null;
  const date = eventDate(event);
  const status = text(event.status);
  const publicEvent = isPubliclyVisible(status) && (school || event.kind === 'ticketed' || event.kind==='past' || (partner && !!partnerDetails));
  const datePassed = date !== null && Date.parse(date.value + 'T23:59:59+03:00') < now;
  const past = event.kind==='past'||status === 'completed' || (datePassed && !['postponed','ongoing'].includes(status));
  const sellable = publicEvent && isSellable(status) && event.kind === 'ticketed' && !past && event.sellable === true;
  const labels: Record<string, string> = {
    announced: 'Announced · details to follow',
    published: past ? datePassed?'Date passed':'Previous work' : school ? 'School tour stop' : sellable ? 'Tickets on sale' : 'Details published',
    ongoing: 'Happening now',
    sales_paused: 'Ticket sales paused',
    sold_out: 'Sold out',
    postponed: 'Postponed',
    rescheduled: 'Rescheduled',
    completed: school ? 'Completed school stop' : 'Event completed',
  };
  const notes: Record<string, string> = {
    announced: 'More details will be added here. Ticket sales are not open.',
    published: past ? 'View the event archive.' : school ? 'A school tour stop. Public tickets are not sold here.' : sellable ? 'View ticket options and the latest availability.' : 'Ticket sales are not open. Check the event details for updates.',
    ongoing: 'This event is in progress. Online ticket sales are closed.',
    sales_paused: school ? 'Check the school tour for the latest updates.' : 'Ticket sales are paused. Event details remain available.',
    sold_out: school ? 'Check the school tour for the latest updates.' : 'Tickets are sold out. View the event details.',
    postponed: 'The event has been postponed. Check for a confirmed new date.',
    rescheduled: 'The event date has changed. Check the updated details.',
    completed: school ? 'A completed school tour stop.' : 'This event has ended. Its public record remains available.',
  };
  const slug = text(event.slug);
  const detailAvailable = /^[a-z0-9-]{1,80}$/.test(slug);
  return {
    publicEvent,
    school,
    past,
    sellable,
    label: partner && partnerDetails && status === 'published' && !past ? partnerAdmission(partnerDetails) : labels[status] || 'Event update',
    note: partner && partnerDetails ? [past?'Past event':'Partner listing',partnerDetails.client?`For ${partnerDetails.client}`:'',partnerDetails.role].filter(Boolean).join(' · ') : notes[status] || 'Check the latest event details.',
    dateLabel: status === 'postponed' ? 'New date to be confirmed' : date ? new Intl.DateTimeFormat('en-KE', {day:'numeric', month:'short', year:'numeric', timeZone:'Africa/Nairobi'}).format(date.date) : text(event.dateLabel) || 'Date to be confirmed',
    dateTime: status !== 'postponed' ? date?.value : undefined,
    href: detailAvailable ? '/events/' + slug : school ? '/tour-stops' : '/contact-us',
    action: !detailAvailable ? school?'View the school tour':'Ask about this event' : sellable ? 'View tickets' : 'View event details',
  };
}

export function publicOwnedEvents(events: OwnedEvent[], now: number) {
  return events.filter(event => event && ownedEventPresentation(event, now).publicEvent && text(event.name))
    .sort((a, b) => Number(ownedEventPresentation(a, now).past) - Number(ownedEventPresentation(b, now).past)
      || (Number(b.priority) || 0) - (Number(a.priority) || 0)
      || (eventDate(a)?.date.getTime() ?? Infinity) - (eventDate(b)?.date.getTime() ?? Infinity));
}

export function ownedEventSignature(events: OwnedEvent[]) {
  return events.filter(event => event && isPubliclyVisible(event.status))
    .map(event => [event.id, event.kind, event.slug, event.status, event.sellable, event.eventDate, event.name, event.venue, JSON.stringify(event.partnerDetails || null),JSON.stringify(publicEventCategory(event.category))].join('|'))
    .sort().join('\n');
}

export function filterOwnedEvents(events:OwnedEvent[],filters:{kind:string;period:string;q:string;category?:string},now:number){
  const query=filters.q.trim().toLowerCase().slice(0,200);
  return publicOwnedEvents(events,now).filter(event=>(filters.kind==='all'||event.kind===filters.kind)&&
    (!filters.category||filters.category==='all'||publicEventCategory(event.category)?.id===filters.category)&&
    (filters.period==='all'||ownedEventPresentation(event,now).past===(filters.period==='past'))&&
    [event.name,event.venue,event.city,publicEventCategory(event.category)?.name,JSON.stringify(event.partnerDetails||{})].join(' ').toLowerCase().includes(query));
}
export function publicEventCategories(events:OwnedEvent[],now:number){
 const categories=new Map<string,{id:string;name:string}>();
 for(const event of publicOwnedEvents(events,now)){const category=publicEventCategory(event.category);if(category)categories.set(category.id,category)}
 return [...categories.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
