/** One deterministic ranking policy for hero, discovery, search and festival recommendations. */
export const RANKING_VERSION='2026-10-08.1';
export function entertainmentTier(event){return event.category==='Music & nightlife'?2:event.category==='Arts & culture'?1:0}
function number(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null}
export function reportedSales(event,now=Date.now()){const d=event.demand;if(!d||d.kind!=='seller-reported-sales'||event.sourceId!=='ticket-yetu'||d.sourceUrl!==event.url||!Number.isFinite(Date.parse(d.capturedAt))||now-Date.parse(d.capturedAt)>21600000||Date.parse(d.capturedAt)>now+60000)return null;return number(d.value)}
export function scoreEvent(event,{now=Date.now(),region='Nairobi & nearby',query=''}={}){const starts=Date.parse(event.dateOnly?event.startsAt+'T00:00:00+03:00':event.startsAt);const ends=event.endsAt?Date.parse(event.endsAt.length===10?event.endsAt+'T23:59:59+03:00':event.endsAt):event.dateOnly?starts+86400000:starts;if(!Number.isFinite(starts)||!Number.isFinite(ends)||ends<=now||event.cancelled||event.soldOut)return {eligible:false,score:-Infinity,reasons:[]};const reasons=[];let score=0;
if(region==='All Kenya'||event.region===region){score+=15;reasons.push('Matches your location')}
const hours=Math.max(0,(starts-now)/3600000);const timing=hours<=72?18:hours<=168?12:hours<=720?7:2;score+=timing;if(hours<=72)reasons.push('Happening in the next 72 hours');
const age=Math.max(0,(now-Date.parse(event.checkedAt))/3600000);score+=Number.isFinite(age)?age<1?10:age<6?5:0:0;if(age<1)reasons.push('Recently checked');
if(event.image)score+=4;if(event.venue&&event.venue!=='Venue on seller’s page')score+=5;if(event.price!==null&&event.price!==undefined)score+=3;if(!event.dateOnly)score+=3;
if(event.sourceType==='Ticket seller'){score+=5;reasons.push('Original ticket seller')}
const sales=reportedSales(event,now);score+=sales===null?8:Math.min(28,Math.log1p(sales)/Math.log1p(1000)*28);if(sales!==null&&sales>0)reasons.push('Seller-reported ticket sales');
// Optional search-demand input is accepted only with a dated Google Trends provenance record.
const interest=event.searchDemand;if(interest?.source==='Google Trends'&&/^https:\/\/trends\.google\.com\//.test(interest.sourceUrl||'')&&now-Date.parse(interest.capturedAt)<86400000&&Date.parse(interest.capturedAt)<=now&&number(interest.value)!==null&&interest.value<=100){score+=interest.value*.2;reasons.push('Search interest from Google Trends')}
const q=query.trim().toLowerCase();if(q){const title=event.title.toLowerCase();score+=title===q?45:title.startsWith(q)?30:title.includes(q)?20:5;reasons.unshift('Matches your search')}
return {eligible:true,score:Math.round(score*100)/100,reasons};}
export function rankEvents(events,context={}){const now=context.now??Date.now(),mode=context.mode||'recommended';const ranked=events.filter(e=>scoreEvent(e,{...context,now}).eligible).sort((a,b)=>{if(mode==='soonest')return Date.parse(a.startsAt)-Date.parse(b.startsAt)||String(a.id).localeCompare(String(b.id));const tier=entertainmentTier(b)-entertainmentTier(a);if(tier)return tier;if(mode==='booked'){const delta=(reportedSales(b,now)??-1)-(reportedSales(a,now)??-1);if(delta)return delta}return scoreEvent(b,{...context,now}).score-scoreEvent(a,{...context,now}).score||Date.parse(a.startsAt)-Date.parse(b.startsAt)||String(a.id).localeCompare(String(b.id))});
if(mode!=='recommended'||context.diversify===false)return ranked;
// Preserve the highest-ranked event; prevent one platform occupying the entire first screen.
const output=[],pool=ranked.slice();while(pool.length){const tier=entertainmentTier(pool[0]);const last=output.slice(-6);let index=pool.findIndex(e=>entertainmentTier(e)===tier&&last.filter(p=>p.sourceId===e.sourceId).length<2);if(index<0)index=0;output.push(pool.splice(index,1)[0])}return output;}
