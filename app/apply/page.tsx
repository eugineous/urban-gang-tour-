import type {Metadata} from 'next';
import {ContactEntry} from '@/ui/components/ContactEntry';
export const metadata:Metadata={title:'Contact Urban Gang Tour — Book Eugine & Lucy',description:'Book Eugine and Lucy for your event or contact Urban Gang Tour.',alternates:{canonical:'/apply'},openGraph:{title:'Book or Contact Urban Gang Tour',description:'Choose a booking enquiry or a quick message.',url:'/apply'}};
export default function Page(){return <ContactEntry/>}
