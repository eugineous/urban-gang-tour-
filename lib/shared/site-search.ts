import {isEventIndexable} from '@/lib/server/event-lifecycle';
export type SiteSearchGroup='news'|'events'|'shop'|'films'|'people';
export type SiteSearchResult={group:SiteSearchGroup;items:{title:string;description:string;href:string}[]};
type News={slug:string;headline:string;description?:string;section?:string;datePublished:string;status?:string;published?:boolean};
type Event={slug:string;name:string;description?:string;venue?:string;city?:string;status:string};
type Product={id:string;name:string;description?:string;category?:string;active?:boolean};
type Film={id:string;kind:string;title:string;collection:string;src:string;poster:string|null;adult:boolean;originalCaption?:string};
type Person={name:string;path:string;practice:string};
type ManagedFilm={id:string|number;caption:string;category:string;altText:string;mediaType?:string};
export type SiteSearchInput={news:readonly News[];events:readonly Event[];products:readonly Product[];films:readonly Film[];people:readonly Person[];managedFilms?:readonly ManagedFilm[]};
export function normalizeSiteQuery(value:unknown):string{return typeof value==='string'?value.normalize('NFKC').replace(/[\u0000-\u001f\u007f\s]+/g,' ').trim().slice(0,200):''}
/** Callers provide current eligible public DTOs only; never private drafts/candidates. */
export function searchPublicSite(input:SiteSearchInput,query:unknown,now:number):SiteSearchResult[]{
 const q=normalizeSiteQuery(query).toLocaleLowerCase();if(!q)return [];
 const terms=q.split(' '),results:SiteSearchResult[]=[];
 const matches=(...parts:(string|undefined)[])=>{const text=parts.filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase();return terms.every(term=>text.includes(term))};
 const groups:Record<SiteSearchGroup,SiteSearchResult['items']>={news:[],events:[],shop:[],films:[],people:[]};
 const seen=new Set<string>();
 function add(group:SiteSearchGroup,title:string,description:string|undefined,href:string){if(groups[group].length>=8||seen.has(href))return;seen.add(href);groups[group].push({title:title.slice(0,300),description:(description||'').slice(0,240),href})}
 for(const row of input.news.slice(0,5000)){const date=Date.parse(row.datePublished);if(!/^[\w-]{1,180}$/.test(row.slug)||row.published===false||(row.status!==undefined&&row.status!=='published')||!Number.isFinite(date)||date>now)continue;if(matches(row.headline,row.description,row.section))add('news',row.headline,row.description,'/blog/'+encodeURIComponent(row.slug))}
 for(const row of input.events.slice(0,5000)){if(!isEventIndexable(row.status)||!row.slug)continue;if(matches(row.name,row.description,row.venue,row.city))add('events',row.name,row.description,'/events/'+encodeURIComponent(row.slug))}
 for(const row of input.products.slice(0,5000)){if(row.active===false||!row.id)continue;if(matches(row.name,row.description,row.category))add('shop',row.name,row.description,'/shop/'+encodeURIComponent(row.id))}
 const seenFilms=new Set<string>();for(const row of input.films.slice(0,5000)){if(row.kind!=='video'||row.adult||!row.src||!row.poster||seenFilms.has(row.src))continue;seenFilms.add(row.src);if(matches(row.title,row.originalCaption,row.collection))add('films',row.title,row.originalCaption,'/watch?clip='+encodeURIComponent(row.id)+'#film-'+encodeURIComponent(row.id))}
 for(const row of (input.managedFilms||[]).slice(0,5000)){if(row.mediaType!=='video'&&row.mediaType!=='youtube')continue;if(matches(row.caption,row.altText,row.category))add('films',row.caption||row.altText,row.category,'/watch?managed='+encodeURIComponent(row.id)+'#uploaded-film-'+encodeURIComponent(row.id))}
 for(const row of input.people){if(!/^\/author\/[a-z0-9-]+$/.test(row.path))continue;if(matches(row.name,row.practice))add('people',row.name,row.practice,row.path)}
 for(const group of ['news','events','shop','films','people'] as const)if(groups[group].length)results.push({group,items:groups[group]});return results;
}
