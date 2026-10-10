export type CalendarEvent={name:string;date:string;start:string|null;venue:string;url:string};
const escapeText=(text:string)=>text.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const compactTime=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line:string){let text='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){text+='\r\n ';bytes=1;}text+=char;bytes+=size;}return text;}
export function calendarEndDate(date:string){const next=new Date(date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(next.getTime())||next.toISOString().slice(0,10)!==date)return null;next.setUTCDate(next.getUTCDate()+1);return next.toISOString().slice(0,10).replaceAll('-','');}
export function buildEventCalendar(event:CalendarEvent,now=new Date()){
 const end=calendarEndDate(event.date);if(!end)return null;
 const timed=event.start&&/(?:Z|[+-]\d{2}:\d{2})$/.test(event.start)?new Date(event.start):null;
 const timing=timed&&!Number.isNaN(timed.getTime())?[`DTSTART:${compactTime(timed)}`]:[`DTSTART;VALUE=DATE:${event.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${end}`];
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Urban Gang Tour//Event Calendar//EN','BEGIN:VEVENT',`UID:${escapeText(event.url)}@urbangangtour.co.ke`,`DTSTAMP:${compactTime(now)}`,...timing,`SUMMARY:${escapeText(event.name)}`,`LOCATION:${escapeText(event.venue)}`,`DESCRIPTION:${escapeText('Event date reminder. Check the event page for confirmed timings. End time has not been confirmed. '+event.url)}`,`URL:${event.url}`,'END:VEVENT','END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
