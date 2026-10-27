import {DocumentLabel,DocumentStatus} from '@/app/_components/PrintDocumentButton';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {MessageText} from '@/ui/i18n/MessageText';
import {documentsMessages} from '@/ui/i18n/catalogues/documents';
import type {Metadata} from 'next';
import {verifyToken} from '@/lib/server/session';
import {q,hasDb} from '@/lib/server/db';
export const metadata:Metadata={title:'Your booking enquiry | Urban Gang Tour',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function BookingStatus({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;const claim=verifyToken<{scope?:string;bookingId?:string}>(token);let booking:any=null;if(claim?.scope==='booking_status'&&typeof claim.bookingId==='string'&&hasDb())try{booking=(await q(`SELECT id,type,status,preferred_date FROM bookings WHERE id=$1`,[claim.bookingId]))[0]}catch{}return <section className="modern-page"><h1><MessageText catalogue={documentsMessages} message="copy.your_event_enquiry"/></h1>{booking?<section className="modern-card"><p><MessageText catalogue={documentsMessages} message="copy.reference_2"/> {booking.id}</p><h2>{booking.status==='new'?<MessageText catalogue={documentsMessages} message="copy.your_brief_is_with_the_team"/>:<DocumentStatus status={booking.status}/>}</h2><p>{booking.type}</p><p><MessageText catalogue={documentsMessages} message="copy.your_event_date_is_reserved_only_after_the_scope_and_payment"/></p></section>:<p><MessageText catalogue={documentsMessages} message="copy.this_enquiry_link_has_expired_or_is_unavailable_contact_the_team"/></p>}<a className="button" href="/contact-us"><MessageText catalogue={documentsMessages} message="copy.talk_to_the_team"/></a></section>}
