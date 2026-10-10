import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifyAdminSession,isSuperAdmin} from '@/lib/server/session';
import PrivacyRequests from './PrivacyRequests';
export const dynamic='force-dynamic';
export const metadata={title:'Privacy requests | Urban Gang Tour Control Room',robots:{index:false,follow:false}};
export default async function Page(){const c=await cookies();const req=new Request('https://urbangangtour.co.ke/admin/privacy',{headers:{cookie:c.toString()}});if(!(await verifyAdminSession(req))||!isSuperAdmin(req))redirect('/admin');return <PrivacyRequests/>}
