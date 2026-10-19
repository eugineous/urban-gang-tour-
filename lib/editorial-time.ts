/** Known legacy dates have day precision only. Use Nairobi midnight when a
 * protocol requires an instant; do not invent a 06:00 UTC publication time. */
export function publicationInstant(value:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw Error('publication_timezone_required');
 const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T00:00:00+03:00':value;
 const date=new Date(normalized);if(!Number.isFinite(date.getTime()))throw Error('invalid_publication_time');
 if(value.length===10&&new Date(date.getTime()+3*3600000).toISOString().slice(0,10)!==value)throw Error('invalid_publication_time');
 return date;
}
/** Explicit Nairobi wall time. Validates rollovers; no guessed browser timezone. */
export function nairobiScheduleInstant(value:string):string{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))throw Error('invalid_nairobi_time');
 const wall=value.length===16?value+':00':value;
 const instant=new Date(wall+'+03:00');
 if(!Number.isFinite(instant.getTime())||new Date(instant.getTime()+3*3600000).toISOString().slice(0,19)!==wall)throw Error('invalid_nairobi_time');
 return instant.toISOString();
}
/** Calendar only; exact times and article assignments must come from the ZIP. */
export function editorialCalendarDates():string[]{
 const dates:string[]=[];for(let now=Date.parse('2026-10-20T00:00:00Z');now<=Date.parse('2026-12-31T00:00:00Z');now+=86400000)dates.push(new Date(now).toISOString().slice(0,10));return dates;
}
