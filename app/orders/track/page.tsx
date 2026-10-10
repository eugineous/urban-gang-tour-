import type {Metadata} from 'next';
import CustomerFulfillment from '@/app/_components/CustomerFulfillment';
export const metadata:Metadata={title:'Track your order | Urban Gang Tour',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Tracking({searchParams}:{searchParams:Promise<{ref?:string}>}){const {ref}=await searchParams;return <main className="modern-page"><h1>Your merchandise order</h1>{ref&&/^ORD-[A-Z0-9-]{4,40}$/.test(ref)?<CustomerFulfillment orderId={ref}/>:<p>Open the secure order link from checkout or your account to view progress.</p>}<a href="/account">Your account</a></main>}
