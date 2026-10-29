import {marketingMessages} from '@/ui/i18n/catalogues/marketing';
import {MessageText} from '@/ui/i18n/MessageText';
import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import Link from 'next/link';
import {vendorMessages} from '@/lib/vendor/messages';
import DocumentLink from '@/ui/components/DocumentLink';

const PATH = '/partners';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <section className="page-intro wrap"><div><p className="eyebrow"><MessageText catalogue={marketingMessages} message="partners.eyebrow"/></p><h1><MessageText catalogue={marketingMessages} message="partners.title"/></h1></div><p><MessageText catalogue={marketingMessages} message="partners.summary"/></p></section>
      <section className="wrap current-grid">
        {[
          {title:<MessageText catalogue={marketingMessages} message="partners.school.title"/>,copy:<MessageText catalogue={marketingMessages} message="partners.school.text"/>,href:'/book?type=school',action:<MessageText catalogue={marketingMessages} message="planEvent"/>},
          {title:<MessageText catalogue={marketingMessages} message="partners.brands.title"/>,copy:<MessageText catalogue={marketingMessages} message="partners.brands.text"/>,href:'/work-with-us',action:<MessageText catalogue={marketingMessages} message="partners.brands.action"/>},
          {title:<MessageText catalogue={marketingMessages} message="partners.media.title"/>,copy:<MessageText catalogue={marketingMessages} message="partners.media.text"/>,href:'/book?type=partnership',action:<MessageText catalogue={marketingMessages} message="partners.media.action"/>},
        ].map(item=><article className="current-card" key={item.href}><h2>{item.title}</h2><p>{item.copy}</p><Link className="button" href={item.href}>{item.action} →</Link></article>)}
      </section>
      <section className="section wrap"><div className="section-title"><h2><MessageText catalogue={vendorMessages} message="eyebrow"/></h2><p><MessageText catalogue={vendorMessages} message="intro"/></p></div><Link className="button" href="/vendors"><MessageText catalogue={vendorMessages} message="visitVendors"/> →</Link><DocumentLink className="text-link" href="/downloads/sponsorship-partnership-pack.pdf" download><MessageText catalogue={vendorMessages} message="downloadSponsor"/> ↓</DocumentLink></section>
      <section className="section wrap"><div className="section-title"><h2><MessageText catalogue={marketingMessages} message="partners.archive"/></h2></div><Link className="button" href="/clients"><MessageText catalogue={marketingMessages} message="partners.clients"/> →</Link><Link className="text-link" href="/portfolio"><MessageText catalogue={marketingMessages} message="partners.portfolio"/> →</Link></section>
    </>
  );
}
