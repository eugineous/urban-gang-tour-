import HostedSite from '@/ui/components/HostedSite';
import {LiveCommerce} from './LiveCommerce';
import {BookingForm} from './BookingForm';
import {getBlogPosts} from '@/app/_lib/blog';
export async function RenderedPage({pathName}:{pathName:string}){
 if(pathName==='/shop')return <LiveCommerce/>;
 if(pathName==='/book')return <BookingForm/>;
 const posts=(pathName==='/'||pathName==='/blog')?(await getBlogPosts()).map(p=>({id:p.slug,headline:p.headline,date:p.datePublished,section:p.section,img:p.image,dek:p.description,body:p.body})):[];
 return <HostedSite path={pathName} screens={[]} products={[]} events={[]} posts={posts}/>;
}
