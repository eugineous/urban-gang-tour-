import type {Metadata} from 'next';
import {LiveCommerce} from '@/app/_components/LiveCommerce';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Live Merchandise Catalogue | Urban Gang Tour',description:'Browse owner-managed merchandise availability and prices.',alternates:{canonical:'/shop/available'}};
export default function Page(){return <><div className="wrap" style={{paddingTop:110}}><a href="/shop">← Explore Color Blast design previews</a></div><LiveCommerce/></>}
