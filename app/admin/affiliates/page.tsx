import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
import AffiliateApplications from '@/ui/components/AffiliateApplications';
export const metadata={title:'Affiliate programme | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page(){const c=await cookies();const req=new Request('https://urbangangtour.co.ke/admin/affiliates',{headers:{cookie:c.toString()}});if(!await verifyAdminSession(req)||!hasPerm(req,'people'))redirect('/admin');return <main className="wrap" style={{paddingBlock:80}}><a href="/admin">← Control Room</a><AffiliateApplications/></main>}
