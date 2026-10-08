import {notFound} from 'next/navigation';
import {codeAuthentic,getTicket,getEventName,getEventMeta} from '@/lib/server/tickets';
export const dynamic='force-dynamic';
export const metadata={title:'Ticket verification | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{code:string}>}){
 const {code}=await params;if(!codeAuthentic(code))notFound();const ticket=await getTicket(code);if(!ticket)notFound();
 const [event,meta]=await Promise.all([getEventName(ticket.event_id,ticket.marketplace_event_id),getEventMeta(ticket.event_id,ticket.marketplace_event_id)]),paid=['paid','fulfilled'].includes(ticket.order_status);
 const status=!paid?'Not valid for admission':ticket.used_at?'Already checked in':'Issued · Not yet checked in';
 return <main style={{maxWidth:520,margin:'0 auto',padding:'120px 24px 32px',fontFamily:'Arial,sans-serif',lineHeight:1.5}}><a href="/">Urban Gang Tour</a><p>Official verification</p><h1>{status}</h1><h2>{event}</h2><dl><dt>Ticket tier</dt><dd>{ticket.tier_name}</dd><dt>Date and venue</dt><dd>{meta?.date||'To be confirmed'} · {meta?.venue}</dd><dt>Ticket identifier</dt><dd style={{overflowWrap:'anywhere'}}>{ticket.code}</dd><dt>Gate status</dt><dd>{ticket.used_at?new Date(ticket.used_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'})+' EAT':'Not checked in'}</dd></dl><p>Viewing this page does not admit anyone. Authorized gate staff must validate entry.</p><p>Contact details are private. This public check does not show email addresses, phone numbers or the customer’s account.</p><a href="/privacy-policy">Privacy policy</a></main>
}
