import {ownedEventPresentation,publicOwnedEvents,type OwnedEvent} from './owned-event-presentation';

export type PresenterStory=Record<string,unknown>;
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const slug=(value:unknown)=>/^[a-z0-9][a-z0-9-]{0,179}$/.test(text(value))?text(value):'';
const mentions=(value:string,lucy:boolean)=>(lucy?/\blucy\s+ogunde\b/i:/\beugine\s+micah\b/i).test(value);
const dateValue=(value:unknown)=>{const time=Date.parse(text(value));return Number.isFinite(time)?time:0};

/** Professional information already present in the site's biographies and media archive. */
export const PRESENTER_BIOGRAPHIES={
 eugine:{
  name:'Eugine Micah',firstName:'Eugine',path:'/author/eugine-micah',portrait:'M230',
  roles:['TV presenter','Journalist','MC','Event host','Creative producer'],
  position:'Founder and executive producer',
  collaborator:'Lucy Ogunde',collaboratorPath:'/author/lucy-ogunde',
  films:['M210','M213','M219'],
  practice:'Television presenting, journalism, live hosting and creative production.',
 },
 lucy:{
  name:'Lucy Ogunde',firstName:'Lucy',path:'/author/lucy-ogunde',portrait:'M228',
  roles:['TV presenter','MC','Event host'],position:'Presenter and event host',
  collaborator:'Eugine Micah',collaboratorPath:'/author/eugine-micah',
  films:['M215','M216','M220'],
  practice:'Television presenting, interviews, live hosting and commercial campaigns.',
 },
} as const;

/** Being part of the company is not evidence of an individual event appearance. */
export function presenterEventCredits(events:OwnedEvent[],lucy:boolean,now:number){
 return publicOwnedEvents(events,now).filter(event=>slug(event.slug)&&mentions(
  [text(event.description),text((event.partnerDetails as Record<string,unknown>|null)?.role)].join(' '),lucy,
 )).sort((a,b)=>dateValue(b.eventDate)-dateValue(a.eventDate)||text(a.name).localeCompare(text(b.name)))
 .slice(0,6).map(event=>({
  id:text(event.id)||text(event.slug),name:text(event.name),href:'/events/'+text(event.slug),
  date:ownedEventPresentation(event,now).dateLabel,status:ownedEventPresentation(event,now).label,
  venue:[text(event.venue),text(event.city)].filter(Boolean).join(', '),
 }));
}

/** Input is the public newsroom excerpt list; a subject mention is not an author credit. */
export function presenterRelatedStories(posts:PresenterStory[],lucy:boolean){
 return posts.filter(post=>{
  if(post.status!==undefined&&post.status!=='published')return false;
  if(post.published===false)return false;
  return slug(post.id||post.slug)&&text(post.headline)&&mentions(
   [text(post.headline),text(post.dek),text(post.description)].join(' '),lucy,
  );
 }).sort((a,b)=>dateValue(b.date||b.datePublished)-dateValue(a.date||a.datePublished)||text(a.headline).localeCompare(text(b.headline)))
 .slice(0,4).map(post=>({id:slug(post.id||post.slug),headline:text(post.headline),href:'/blog/'+slug(post.id||post.slug)}));
}
