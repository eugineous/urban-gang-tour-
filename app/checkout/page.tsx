import {LiveCommerce} from '../_components/LiveCommerce';
export const metadata={title:'Secure checkout · Urban Gang Tour',robots:{index:false,follow:true},alternates:{canonical:'https://urbangangtour.co.ke/checkout'}};
export default async function Page({searchParams}:{searchParams:Promise<{event?:string}>}){const {event}=await searchParams;return <LiveCommerce view="checkout" eventId={event}/> }
