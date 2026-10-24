import HostedSite from '@/ui/components/HostedSite';
import {LiveCommerce} from './LiveCommerce';
import {BookingForm} from './BookingForm';
import {getBlogPosts} from '@/app/_lib/blog';
import {readPublicEvents,type PublicEvent} from '@/lib/server/public-events';
import {readPublicProducts,type PublicProduct} from '@/lib/server/public-products';
import {readWebsiteContent} from '@/lib/server/website-content';
import {requestTime} from '@/lib/server/request-time';
import {newestPublishedFirst} from '@/lib/shared/newsroom-chronology';
export async function RenderedPage({pathName}:{pathName:string}){
 if(pathName==='/shop')return <LiveCommerce/>;
 if(pathName==='/book')return <BookingForm/>;
 const presenter=pathName.startsWith('/author/');
 const home=pathName==='/';
 const [published,events,products,pageContent]=await Promise.all([
  (home||pathName==='/blog'||presenter)?getBlogPosts():Promise.resolve([]),
  (presenter||['/', '/events', '/portfolio', '/about', '/the-gang', '/proof'].includes(pathName))?readPublicEvents().catch(()=>[] as PublicEvent[]):Promise.resolve([]),
  home?readPublicProducts().catch(()=>[] as PublicProduct[]):Promise.resolve([]),
  readWebsiteContent(pathName==='/the-gang'?'/about':pathName),
 ]);
 // Index cards need excerpts only. Do not serialize the full newsroom and all
 // article bodies into the home page's hydration payload.
 const ordered=newestPublishedFirst(published);
 const posts=(home?ordered.slice(0,3):ordered).map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description}));
 return <HostedSite path={pathName} screens={[]} products={products} events={events} posts={posts} pageContent={pageContent} initialNow={requestTime()}/>;
}
