import {publicOwnedEvents,type OwnedEvent} from './owned-event-presentation';
/** An elapsed date is not evidence of delivery. Only explicit completed records belong here. */
export function completedSchoolWork(events:OwnedEvent[],now:number){
 return publicOwnedEvents(events,now).filter(event=>event.kind==='school'&&event.status==='completed'&&typeof event.slug==='string'&&/^[a-z0-9-]{1,80}$/.test(event.slug));
}
