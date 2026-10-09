import {notFound} from 'next/navigation';
import {q} from '@/lib/server/db';
export const dynamic='force-dynamic';
export const metadata={title:'Receipt verification | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^ORD-[A-Z0-9-]{4,40}$/.test(id))notFound();const rows=await q<{id:string;status:string}>('SELECT id,status FROM orders WHERE id=$1',[id]);if(!rows[0])notFound();const order=rows[0];
 return <section className="document-stage"><article className="document-card"><a className="document-brand" href="/"><img src="/assets/ugt-logo.png" alt="Urban Gang Tour" width={72}/><span>Receipt verification</span></a><h1>Order verification.</h1><p className="document-note">Checked against our official records.</p><dl className="document-details"><div><dt>Order reference</dt><dd>{order.id}</dd></div><div><dt>Status</dt><dd>{order.status}</dd></div></dl><p>Customer details and purchased items are private. Sign in to view your own orders.</p><div className="current-actions"><a className="button" href="/account">My account</a><a href="/privacy-policy">Privacy policy</a></div></article></section>
}
