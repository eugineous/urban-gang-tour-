import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
export const metadata:Metadata={title:'Our work | Urban Gang Tour',description:'Explore school stages, campus events and live hosting from our portfolio.',alternates:{canonical:'https://urbangangtour.co.ke/portfolio'}};
export default function Page(){return <RenderedPage pathName="/portfolio"/>}
