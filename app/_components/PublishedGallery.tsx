import {MessageText} from '@/ui/i18n/MessageText';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {publishedGallery} from '@/lib/server/published-gallery';
import {PhotoGallery} from './PhotoGallery';
export default async function PublishedGallery(){
 const photos=await publishedGallery();if(!photos.length)return null;
 return <section className="wrap section" aria-labelledby="latest-published-photos"><h2 id="latest-published-photos"><MessageText catalogue={mediaMessages} message="latestPhotos"/></h2><PhotoGallery photos={photos.map(photo=>({...photo,id:String(photo.id)}))}/></section>;
}
