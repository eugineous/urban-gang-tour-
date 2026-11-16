import categories from '@/ui/data/news-categories.json';
import {newestPublishedFirst} from './newsroom-chronology';

export const NEWS_PAGE_SIZE=12;
export type NewsArchiveQuery={q:string;category:string;page:number};
export type NewsArchiveParams=Record<string,string|string[]|undefined>;
type Story={id?:string;slug?:string;headline:string;section?:string;dek?:string;description?:string;date?:unknown;datePublished?:unknown};

/** Duplicate/unknown inputs never become alternate archive URLs or unbounded offsets. */
export function newsArchiveQuery(params:NewsArchiveParams={}):NewsArchiveQuery{
 const single=(key:string)=>typeof params[key]==='string'?params[key] as string:'';
 const page=single('page'),category=single('category');
 return {q:single('q').slice(0,200).trim(),category:categories.categories.some(value=>value.id===category)?category:'all',page:/^[1-9]\d{0,5}$/.test(page)?Number(page):1};
}

export function newsArchiveHref(query:NewsArchiveQuery,page=query.page):string{
 const params=new URLSearchParams();
 if(query.q)params.set('q',query.q);
 if(query.category!=='all')params.set('category',query.category);
 if(page>1)params.set('page',String(page));
 return '/blog'+(params.size?'?'+params.toString():'');
}

export function newsStoryCategory(story:Story){
 const id=story.slug??story.id??'',mapped=(categories.byPost as Record<string,string>)[id];
 const section=(story.section||'').toLowerCase().trim();
 const fallback=/school|campus/.test(section)?'schools':/event|recap|concert|festival/.test(section)?'events':/talent|culture/.test(section)?'culture':/eugine|lucy|people|hosts/.test(section)?'people':/partner|sponsor/.test(section)?'partners':/update|tour/.test(section)?'updates':undefined;
 return categories.categories.find(category=>category.id===(mapped||fallback)||category.label.toLowerCase()===section);
}

/** Only accepts the already-public feed; never changes editorial eligibility. */
export function newsArchive<T extends Story>(posts:readonly T[],query:NewsArchiveQuery){
 const seen=new Set<string>();
 const published=newestPublishedFirst(posts).filter(story=>{const id=story.slug??story.id;if(!id||seen.has(id))return false;seen.add(id);return true;});
 const search=query.q.toLowerCase();
 const matches=published.filter(story=>(query.category==='all'||newsStoryCategory(story)?.id===query.category)&&`${story.headline} ${story.dek??story.description??''} ${story.section||''} ${(story.slug??story.id??'').replaceAll('-',' ')}`.toLowerCase().includes(search));
 const pageCount=Math.max(1,Math.ceil(matches.length/NEWS_PAGE_SIZE));
 return {published,matches,pageCount,visible:matches.slice((query.page-1)*NEWS_PAGE_SIZE,query.page*NEWS_PAGE_SIZE)};
}
