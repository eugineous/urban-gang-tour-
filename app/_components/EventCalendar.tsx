'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/discovery';
import {buildEventCalendar,calendarEndDate,type CalendarEvent} from '@/lib/event-calendar';
export function EventCalendar(event:CalendarEvent) {
  const compact=event.date.replaceAll('-',''),end=calendarEndDate(event.date);
  if(!end)return null;
  function download(){const text=buildEventCalendar(event);if(!text)return;const href=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=href;link.download='urban-gang-tour-event.ics';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000)}
  return <><a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${compact}/${end}&details=${encodeURIComponent('Event date reminder. Check confirmed start and end times: '+event.url)}&location=${encodeURIComponent(event.venue)}`} target="_blank" rel="noopener noreferrer"><MessageText catalogue={discoveryMessages} message="calendar.save"/></a><button className="button secondary" onClick={download}><MessageText catalogue={discoveryMessages} message="calendar.download"/></button><small><MessageText catalogue={discoveryMessages} message="calendar.original"/></small></>;
}
