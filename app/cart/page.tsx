import {LiveCommerce} from '../_components/LiveCommerce';
// Keep the transaction shell tied to the current request while the browser
// restores its own saved cart; do not reuse a build-time route context.
export const dynamic='force-dynamic';
export const metadata={title:'Your cart · Urban Gang Tour',robots:{index:false,follow:true},alternates:{canonical:'https://urbangangtour.co.ke/cart'}};
export default function Page(){return <LiveCommerce view="cart"/>}
