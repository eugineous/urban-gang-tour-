import type {Metadata} from 'next';
import {RenderedPage} from '@/app/_components/RenderedPage';
const title='Our clients | Urban Gang Tour';
const description='School, campus, media and brand logos from the archive, with links to available past work and the founders’ earlier projects.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://urbangangtour.co.ke/clients'},openGraph:{title,description,url:'https://urbangangtour.co.ke/clients',type:'website'}};
export default function Page(){return <RenderedPage pathName="/clients"/>}
