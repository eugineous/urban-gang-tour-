import {notFound} from 'next/navigation';
import {codeAuthentic,getTicket,getEventName,getEventMeta} from '@/lib/server/tickets';
export const dynamic='force-dynamic';
export const metadata={title:'Ticket verification | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{code:string}>}){
 const {code}=await params;if(!codeAuthentic(code))notFound();const ticket=await getTicket(code);if(!ticket)notFound();
 const [event,meta]=await Promise.all([getEventName(ticket.event_id,ticket.marketplace_event_id),getEventMeta(ticket.event_id,ticket.marketplace_event_id)]),paid=['paid','fulfilled'].includes(ticket.order_status);
 const status=!paid?'Not valid for admission':ticket.used_at?'Already checked in':'Issued · Not yet checked in';
 return <section className="document-stage"><article className="document-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span>Ticket verification</span></a><p className={`document-status ${paid&&!ticket.used_at?'valid':'void'}`} role="status">{status}</p><h1>{event}</h1><dl className="document-details">{[['Ticket tier',ticket.tier_name],['Date and venue',`${meta?.date||'To be confirmed'} · ${meta?.venue||'To be confirmed'}`],['Ticket identifier',ticket.code],['Gate status',ticket.used_at?new Date(ticket.used_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'})+' EAT':'Not checked in']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p>Viewing this page does not admit anyone. Authorized gate staff must validate entry.</p><p className="document-note">Contact details are private. This check does not show email addresses, phone numbers or the customer’s account.</p><a className="button" href="/privacy-policy">Privacy policy</a></article></section>
}
