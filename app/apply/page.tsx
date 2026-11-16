import type {Metadata} from 'next';
import {ContactEntry} from '@/ui/components/ContactEntry';
export const metadata:Metadata={title:'Contact Urban Gang Tour — Book Us',description:'Book Urban Gang Tour for event hosting and production, or send an enquiry.',alternates:{canonical:'/apply'},openGraph:{title:'Book or Contact Urban Gang Tour',description:'Choose a booking enquiry or send a message.',url:'/apply'}};
export default function Page(){return <ContactEntry/>}
