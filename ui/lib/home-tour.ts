export type PublicTourEvent = {
  id: string;
  slug?: string;
  kind: string;
  name: string;
  status: string;
  eventDate?: string | null;
  eventTime?: string;
  venue?: string;
  city?: string;
  image?: string;
  logo?: string;
  sellable?: boolean;
};

/** A published date is required; planning records never become announcements. */
export function nextTourEvent(events: PublicTourEvent[], now: number): PublicTourEvent | undefined {
  return events.filter(event => {
    if (!['school', 'ticketed'].includes(event.kind) || !['published', 'ongoing', 'rescheduled', 'sold_out', 'sales_paused'].includes(event.status)) return false;
    if (!event.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate)) return false;
    const date = new Date(event.eventDate + 'T12:00:00+03:00');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== event.eventDate) return false;
    return Date.parse(event.eventDate + 'T23:59:59+03:00') >= now;
  }).sort((a, b) => a.eventDate!.localeCompare(b.eventDate!) || a.id.localeCompare(b.id))[0];
}

export function tourEventAction(event: PublicTourEvent): {label: string; href: string; note: string} {
  if (event.kind === 'school') return {label: 'Explore the school tour', href: '/tour-stops', note: 'School programme · attendance is arranged with the institution.'};
  const href = event.slug ? '/events/' + encodeURIComponent(event.slug) : '/events';
  if (event.status === 'published' && event.sellable === true) return {label: 'View tickets', href, note: 'Public event · check ticket availability and entry details.'};
  return {label: 'View event details', href, note: event.status === 'sold_out' ? 'Tickets sold out · check the event for updates.' : event.status === 'sales_paused' ? 'Ticket sales are paused.' : 'See the latest schedule and attendance details.'};
}
