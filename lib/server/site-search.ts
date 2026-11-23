import {getBlogPostSummaries} from '@/app/_lib/blog';
import {readPublicEvents} from './public-events';
import {readPublicProducts} from './public-products';
import {publishedGallery} from './published-gallery';
import {PRESENTER_BIOGRAPHIES} from '@/ui/lib/presenter-biography';
import library from '@/ui/data/media-library.json';
import {normalizeSiteQuery,searchPublicSite} from '@/lib/shared/site-search';
export async function readSiteSearch(query:unknown,now:number){
 const q=normalizeSiteQuery(query);if(!q)return{query:q,results:[],unavailable:false};
 const [news,events,products,gallery]=await Promise.allSettled([getBlogPostSummaries(true),readPublicEvents(),readPublicProducts(),publishedGallery({strict:true})]);
 return{query:q,unavailable:[news,events,products,gallery].some(source=>source.status==='rejected'),results:searchPublicSite({news:news.status==='fulfilled'?news.value:[],events:events.status==='fulfilled'?events.value:[],products:products.status==='fulfilled'?products.value:[],films:library.assets,people:Object.values(PRESENTER_BIOGRAPHIES),managedFilms:gallery.status==='fulfilled'?gallery.value:[]},q,now)};
}
