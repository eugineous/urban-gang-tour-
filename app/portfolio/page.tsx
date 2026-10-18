import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
import PartnerEventPortfolio from '@/app/_components/PartnerEventPortfolio';
export const revalidate=0;
export const metadata:Metadata={title:'Our work | Urban Gang Tour',description:'Explore school stages, campus events and live hosting from our portfolio.',alternates:{canonical:'https://urbangangtour.co.ke/portfolio'}};
export default function Page(){return <><RenderedPage pathName="/portfolio"/><PartnerEventPortfolio excludeSchool/></>}
