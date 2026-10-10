import CaptionImporter from '@/ui/components/CaptionImporter';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
export const dynamic='force-dynamic';
export const metadata={title:'Video accessibility | Urban Gang Tour Control Room',robots:{index:false,follow:false}};
export default async function Page(){const c=await cookies();const req=new Request('https://urbangangtour.co.ke/admin/accessibility',{headers:{cookie:c.toString()}});if(!(await verifyAdminSession(req))||!hasPerm(req,'gallery'))redirect('/admin');return <main className="wrap" style={{paddingBlock:80}}><a href="/admin">← Control Room</a><CaptionImporter/></main>}
