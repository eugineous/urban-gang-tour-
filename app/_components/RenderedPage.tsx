import HostedSite from '@/ui/components/HostedSite';
import {LiveCommerce} from './LiveCommerce';
import {BookingForm} from './BookingForm';
import {getBlogPosts} from '@/app/_lib/blog';
export async function RenderedPage({pathName}:{pathName:string}){
 if(pathName==='/shop')return <LiveCommerce/>;
 if(pathName==='/book')return <BookingForm/>;
 const published=(pathName==='/'||pathName==='/blog')?await getBlogPosts():[];
 // Index cards need excerpts only. Do not serialize the full newsroom and all
 // article bodies into the home page's hydration payload.
 const posts=(pathName==='/'?published.slice(0,3):published).map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description}));
 return <HostedSite path={pathName} screens={[]} products={[]} events={[]} posts={posts}/>;
}
