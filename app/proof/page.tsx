import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
export const metadata:Metadata={title:'Our event record | Urban Gang Tour',description:'Explore published tour records and available event evidence.',alternates:{canonical:'https://urbangangtour.co.ke/proof'}};
export default function Page(){return <RenderedPage pathName="/proof"/>}
// Completed-work counts follow the same live event records as the portfolio.
export const dynamic = 'force-dynamic';
