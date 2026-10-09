import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
export const metadata:Metadata={title:'Our clients | Urban Gang Tour',description:'Supplied school, campus, media and brand logos from our archive.',alternates:{canonical:'https://urbangangtour.co.ke/clients'}};
export default function Page(){return <RenderedPage pathName="/clients"/>}
