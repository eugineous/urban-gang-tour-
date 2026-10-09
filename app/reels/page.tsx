import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
export const metadata:Metadata={title:'Reels | Urban Gang Tour',description:'Watch Urban Gang Tour school, campus and live event videos.',alternates:{canonical:'https://urbangangtour.co.ke/reels'}};
export default function Page(){return <RenderedPage pathName="/reels"/>}
