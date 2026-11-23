import type {Metadata} from 'next';
import {MessageText} from '@/ui/i18n/MessageText';
import {discoveryMessages} from '@/ui/i18n/catalogues/urban-discovery';
import {publishedGallery} from '@/lib/server/published-gallery';
import ManagedFilms from '@/app/_components/ManagedFilms';
import {WatchLibrary} from '@/ui/components/UrbanMedia';
export const metadata:Metadata={title:'Watch — Urban Gang Tour',description:'Original Urban Gang Tour event and presenter films, with reviewed Instagram archive footage.',alternates:{canonical:'/watch'}};
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{clip?:string;managed?:string}>}){
 const params=await searchParams;
 const clip=typeof params.clip==='string'&&/^[\w-]{1,120}$/.test(params.clip)?params.clip:'';
 const managed=typeof params.managed==='string'&&/^\d{1,20}$/.test(params.managed)?params.managed:'';
 const gallery=await publishedGallery({strict:true}).then(rows=>({rows,current:true}),()=>({rows:[],current:false}));
 const films=gallery.rows.filter(film=>film.mediaType==='video'||film.mediaType==='youtube');
 return <><WatchLibrary initialClip={clip}/>{!gallery.current&&<p className="wrap" role="status"><MessageText catalogue={discoveryMessages} message="unavailable"/></p>}{films.length>0&&<ManagedFilms films={films} initialFilm={managed}/>}</>;
}
