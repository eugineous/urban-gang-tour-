import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
import TicketDesignStudio from '@/app/_components/TicketDesignStudio';
export const metadata={title:'Document Design Studio | Urban Gang Tour',robots:{index:false,follow:false}};
export default async function Page(){const c=await cookies();const req=new Request('https://urbangangtour.co.ke/admin/docs/designs',{headers:{cookie:c.toString()}});if(!(await verifyAdminSession(req))||!hasPerm(req,'documents'))redirect('/admin?tab=Documents');return <TicketDesignStudio/>}
