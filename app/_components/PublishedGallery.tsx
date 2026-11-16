import {MessageText} from '@/ui/i18n/MessageText';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {publishedGallery} from '@/lib/server/published-gallery';
import {PhotoGallery} from './PhotoGallery';
import ManagedFilms from './ManagedFilms';
export default async function PublishedGallery(){
 const photos=await publishedGallery();if(!photos.length)return null;
 const films=photos.filter(photo=>photo.mediaType),images=photos.filter(photo=>!photo.mediaType);
 if(films.length)return <>{images.length>0&&<section className="wrap section" aria-labelledby="latest-published-photos"><h2 id="latest-published-photos"><MessageText catalogue={mediaMessages} message="latestPhotos"/></h2><PhotoGallery photos={images.map(photo=>({...photo,id:String(photo.id)}))}/></section>}<ManagedFilms films={films}/></>;
 return <section className="wrap section" aria-labelledby="latest-published-photos"><h2 id="latest-published-photos"><MessageText catalogue={mediaMessages} message="latestPhotos"/></h2><PhotoGallery photos={photos.map(photo=>({...photo,id:String(photo.id)}))}/></section>;
}
