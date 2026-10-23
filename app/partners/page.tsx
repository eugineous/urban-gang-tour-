import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import Link from 'next/link';

const PATH = '/partners';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <section className="page-intro wrap"><div><p className="eyebrow">Work with Urban Gang Tour</p><h1>Partnerships.</h1></div><p>Event bookings, brand campaigns, sponsorships and media partnerships.</p></section>
      <section className="wrap current-grid">
        {[
          {title:'Schools & campuses',copy:'Book talent shows, cultural events or live hosting.',href:'/book?type=school',action:'Plan an event'},
          {title:'Brands & institutions',copy:'Presenting, brand activations and campaign production.',href:'/work-with-us',action:'Explore campaign work'},
          {title:'Sponsors & media',copy:'Discuss tour sponsorship or media coverage.',href:'/book?type=partnership',action:'Ask about partnerships'},
        ].map(item=><article className="current-card" key={item.title}><h2>{item.title}</h2><p>{item.copy}</p><Link className="button" href={item.href}>{item.action} →</Link></article>)}
      </section>
      <section className="section wrap"><div className="section-title"><h2>See who we’ve worked with.</h2></div><Link className="button" href="/clients">Our clients →</Link><Link className="text-link" href="/portfolio">Explore our portfolio →</Link></section>
    </>
  );
}
