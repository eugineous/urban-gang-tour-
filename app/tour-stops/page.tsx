import type {Metadata} from 'next';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {breadcrumbFor} from '@/app/_lib/jsonld';
import {JsonLd} from '@/app/_components/JsonLd';
import {readPublicEvents,type PublicEvent} from '@/lib/server/public-events';
import {TourTimeline} from '@/ui/components/TourTimeline';
import {requestTime} from '@/lib/server/request-time';

export const dynamic='force-dynamic';
export const revalidate=0;
export async function generateMetadata():Promise<Metadata>{return metadataForPathDynamic('/tour-stops')}
export default async function Page(){
 let events:PublicEvent[]=[],unavailable=false;
 try{events=await readPublicEvents()}catch{unavailable=true}
 const initialNow=requestTime();
 return <><JsonLd data={breadcrumbFor('/tour-stops')}/><TourTimeline events={events} initialNow={initialNow} initialUnavailable={unavailable}/></>;
}
