import type {Metadata} from 'next';
import {permanentRedirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Live Merchandise Catalogue | Urban Gang Tour',description:'Browse owner-managed merchandise availability and prices.',alternates:{canonical:'/shop/available'}};
export default function Page(){permanentRedirect('/shop')}
