import type {Metadata} from 'next';
export const metadata:Metadata={title:'Page not found | Urban Gang Tour',robots:{index:false,follow:true}};
export default function NotFound(){return <section className="current-state wrap"><p className="eyebrow">404 · Page not found</p><h1>Let’s get you back.</h1><p>This link may have moved. Explore our events, browse the shop or contact the team.</p><div className="current-actions"><a className="button" href="/">Go home</a><a href="/events">Find events</a><a href="/contact-us">Contact us</a></div></section>}
