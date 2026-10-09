import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import library from '@/ui/data/media-library.json';
import {RenderedPage} from '@/app/_components/RenderedPage';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const collection=library.collections.find(c=>c.slug===slug);return {title:collection?`${collection.title} | Urban Gang Tour`:'Collection not found',description:collection?`Videos and photographs from ${collection.title}. Explore the Urban Gang Tour archive.`:undefined,alternates:{canonical:`https://urbangangtour.co.ke/gallery/${slug}`}}}
export default async function Page({params}:Props){const {slug}=await params;if(!library.collections.some(c=>c.slug===slug))notFound();return <RenderedPage pathName={'/gallery/'+slug}/>}
export function generateStaticParams(){return library.collections.map(c=>({slug:c.slug}))}
