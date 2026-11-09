import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import library from '@/ui/data/media-library.json';
import {instagramCatalog} from '@/lib/instagram-archive';
import {readPublicInstagramArchive} from '@/lib/server/instagram-archive';
import {RenderedPage} from '@/app/_components/RenderedPage';
type Props={params:Promise<{slug:string}>};
async function lookup(slug:string){const own=library.collections.find(c=>c.slug===slug);if(own)return{collection:own,archive:undefined};if(!/^instagram-\d{5,40}(?:_\d{5,40})?$/.test(slug))return null;const archive=await readPublicInstagramArchive();const collection=instagramCatalog(archive).collections.find(c=>c.slug===slug);return collection?{collection,archive}:null}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const found=await lookup(slug);return {title:found?`${found.collection.title} | Urban Gang Tour`:'Collection not found',description:found?`Videos and photographs from ${found.collection.title}. Explore the Urban Gang Tour archive.`:undefined,alternates:{canonical:`https://urbangangtour.co.ke/gallery/${slug}`}}}
export default async function Page({params}:Props){const {slug}=await params;const found=await lookup(slug);if(!found)notFound();return <RenderedPage pathName={'/gallery/'+slug} initialInstagramArchive={found.archive}/>}
export function generateStaticParams(){return library.collections.map(c=>({slug:c.slug}))}
