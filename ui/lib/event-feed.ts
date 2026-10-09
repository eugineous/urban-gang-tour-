export type FeedSource={id:string;allowedHosts:string[]};
export type FeedEvent={id:string;title:string;url:string;startsAt:string;endsAt?:string;venue?:string;city?:string;updatedAt?:string};
export type ListedEvent=FeedEvent&{sourceId:string;key:string;lastSyncedAt:string;ticketing:'external'};
export function normalizeEventFeed(source:FeedSource,input:unknown,now=new Date()):ListedEvent[]{
 if(!Array.isArray(input))throw new Error('Feed must be an array');
 if(input.length>1000)throw new Error('Feed exceeds ingestion limit');
 const seen=new Set<string>();const output:ListedEvent[]=[];
 for(const raw of input){
  if(!raw||typeof raw!=='object')continue;const e=raw as Record<string,unknown>;
  if(typeof e.id!=='string'||!e.id.trim()||typeof e.title!=='string'||typeof e.url!=='string'||typeof e.startsAt!=='string')continue;
  let u:URL;try{u=new URL(e.url)}catch{continue}
  if(u.protocol!=='https:'||u.username||u.password||!source.allowedHosts.includes(u.hostname))continue;
  const start=new Date(e.startsAt),end=e.endsAt?new Date(String(e.endsAt)):start;
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start||end<now)continue;
  u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);
  const key=source.id+':'+e.id.trim();if(seen.has(key))continue;seen.add(key);
  const clean=(v:unknown)=>typeof v==='string'?v.replace(/<[^>]*>/g,'').trim().slice(0,240):undefined;
  const title=clean(e.title);if(!title)continue;
  output.push({id:e.id.trim().slice(0,160),title,url:u.toString(),startsAt:start.toISOString(),endsAt:e.endsAt?end.toISOString():undefined,venue:clean(e.venue),city:clean(e.city),sourceId:source.id,key,lastSyncedAt:now.toISOString(),ticketing:'external'});
 }
 return output.sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
