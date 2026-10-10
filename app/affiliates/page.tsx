import type {Metadata} from 'next';
import AffiliateProgramme from '@/ui/components/AffiliateProgramme';
export const metadata:Metadata={title:'Event referral programme | Urban Gang Tour',description:'Apply to refer audiences to eligible Urban Gang Tour events. Review configured terms, track verified ticket sales and manage your referral link.',alternates:{canonical:'https://urbangangtour.co.ke/affiliates'},openGraph:{title:'Event referral programme | Urban Gang Tour',description:'Connect your audience with Urban Gang Tour events. Apply and review the current referral programme terms.',url:'https://urbangangtour.co.ke/affiliates',type:'website'}};
export default function Page(){return <AffiliateProgramme/>}
