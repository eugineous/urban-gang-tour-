import {isPubliclyVisible, isSellable} from '../../lib/server/event-lifecycle';

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
  const date = eventDate(event);
  const status = text(event.status);
  const publicEvent = isPubliclyVisible(status) && (school || event.kind === 'ticketed');
  const datePassed = date !== null && Date.parse(date.value + 'T23:59:59+03:00') < now;
  const past = status === 'completed' || (datePassed && status !== 'postponed');
  const sellable = publicEvent && isSellable(status) && !school && !past && event.sellable === true;
  const labels: Record<string, string> = {
    published: past ? 'Date passed' : school ? 'School tour stop' : sellable ? 'Tickets on sale' : 'Details published',
    sales_paused: 'Ticket sales paused',
    sold_out: 'Sold out',
    postponed: 'Postponed',
    rescheduled: 'Rescheduled',
    completed: school ? 'Completed school stop' : 'Event completed',
  };
  const notes: Record<string, string> = {
    published: past ? 'This date has passed. View the event record.' : school ? 'A school tour stop. Public tickets are not sold here.' : sellable ? 'View ticket options and the latest availability.' : 'Ticket sales are not open. Check the event details for updates.',
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
    label: labels[status] || 'Event update',
    note: notes[status] || 'Check the latest event details.',
    dateLabel: status === 'postponed' ? 'New date to be confirmed' : date ? new Intl.DateTimeFormat('en-KE', {day:'numeric', month:'short', year:'numeric', timeZone:'Africa/Nairobi'}).format(date.date) : text(event.dateLabel) || 'Date to be confirmed',
    dateTime: status !== 'postponed' ? date?.value : undefined,
    href: school ? '/tour-stops' : detailAvailable ? '/events/' + slug : '/contact-us',
    action: school ? 'View the school tour' : !detailAvailable ? 'Ask about this event' : sellable ? 'View tickets' : 'View event details',
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
    .map(event => [event.id, event.kind, event.slug, event.status, event.sellable, event.eventDate, event.name, event.venue].join('|'))
    .sort().join('\n');
}
