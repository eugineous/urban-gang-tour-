import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifyAdminSession,isSuperAdmin} from '@/lib/server/session';
import EmailDeliveryPanel from '@/app/admin/EmailDeliveryPanel';
export const dynamic='force-dynamic';
export const metadata={title:'Receipt email delivery | Urban Gang Tour Control Room',robots:{index:false,follow:false}};
export default async function Page(){const c=await cookies();const req=new Request('https://urbangangtour.co.ke/admin/email-delivery',{headers:{cookie:c.toString()}});if(!(await verifyAdminSession(req))||!isSuperAdmin(req))redirect('/admin');return <main className="modern-page"><a className="text-link" href="/admin">← Control Room</a><h1>Email delivery</h1><EmailDeliveryPanel/></main>}
