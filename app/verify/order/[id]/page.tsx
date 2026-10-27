import {DocumentLabel,DocumentStatus} from '@/app/_components/PrintDocumentButton';
import LanguageChooser from '@/app/_components/LanguageChooser';
import {MessageText} from '@/ui/i18n/MessageText';
import {documentsMessages} from '@/ui/i18n/catalogues/documents';
import {notFound} from 'next/navigation';
import {q} from '@/lib/server/db';
export const dynamic='force-dynamic';
export const metadata={title:'Receipt verification | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^ORD-[A-Z0-9-]{4,40}$/.test(id))notFound();const rows=await q<{id:string;status:string}>('SELECT id,status FROM orders WHERE id=$1',[id]);if(!rows[0])notFound();const order=rows[0];
 return <section className="document-stage"><div className="no-print"><LanguageChooser path="/documents"/></div><article className="document-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span><MessageText catalogue={documentsMessages} message="copy.receipt_verification"/></span></a><h1><MessageText catalogue={documentsMessages} message="copy.order_verification"/></h1><p className="document-note"><MessageText catalogue={documentsMessages} message="copy.checked_against_our_official_records"/></p><dl className="document-details"><div><dt><MessageText catalogue={documentsMessages} message="copy.order_reference_2"/></dt><dd>{order.id}</dd></div><div><dt><MessageText catalogue={documentsMessages} message="copy.status"/></dt><dd>{<DocumentStatus status={order.status}/>}</dd></div></dl><p><MessageText catalogue={documentsMessages} message="copy.customer_details_and_purchased_items_are_private_sign_in_to_view"/></p><div className="current-actions"><a className="button" href="/account"><MessageText catalogue={documentsMessages} message="copy.my_account"/></a><a href="/privacy-policy"><MessageText catalogue={documentsMessages} message="copy.privacy_policy_2"/></a></div></article></section>
}
