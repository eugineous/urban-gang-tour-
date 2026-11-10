import type {Metadata} from 'next';
import GuestTicketAccess from './GuestTicketAccess';
export const metadata:Metadata={title:'My tickets — Urban Gang Tour',description:'Open your Urban Gang Tour tickets without creating an account, or sign in to your account wallet.',robots:{index:false,follow:false},referrer:'no-referrer',alternates:{canonical:'https://urbangangtour.co.ke/my-tickets'}};
export default function Page(){return <GuestTicketAccess/>}
