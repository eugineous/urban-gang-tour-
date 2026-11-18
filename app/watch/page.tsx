import type {Metadata} from 'next';
import {WatchLibrary} from '@/ui/components/UrbanMedia';
export const metadata:Metadata={title:'Watch — Urban Gang Tour',description:'Original Urban Gang Tour event and presenter films, with reviewed Instagram archive footage.',alternates:{canonical:'/watch'}};
export default async function Page({searchParams}:{searchParams:Promise<{clip?:string}>}){const params=await searchParams;const clip=typeof params.clip==='string'&&/^[\w-]{1,120}$/.test(params.clip)?params.clip:'';return <WatchLibrary initialClip={clip}/>}
