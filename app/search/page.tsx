import type {Metadata} from 'next';
import {readSiteSearch} from '@/lib/server/site-search';
import {requestTime} from '@/lib/server/request-time';
import SiteSearch from '@/app/_components/SiteSearch';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Search — Urban Gang Tour',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default async function Page({searchParams}:{searchParams:Promise<{q?:string|string[]}>}){const params=await searchParams;return <SiteSearch {...await readSiteSearch(params.q,requestTime())}/>}
