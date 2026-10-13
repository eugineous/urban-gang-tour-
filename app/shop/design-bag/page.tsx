import type {Metadata} from 'next';
import DesignBag from '@/app/_components/merch/DesignBag';
export const metadata:Metadata={title:'Design Bag | Urban Gang Tour',description:'Your saved Color Blast design previews. No order or payment is created.',alternates:{canonical:'/shop/design-bag'},robots:{index:false,follow:true}};
export default function Page(){return <DesignBag/>}
