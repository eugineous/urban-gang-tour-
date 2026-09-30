import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';
import { SITE } from '@/lib/site';

const PATH = '/about';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'EntertainmentBusiness'],
  '@id': `${SITE.domain}/#org`,
  name: 'Urban Gang Tour',
  alternateName: 'Urban Gang',
  url: SITE.domain,
  logo: `${SITE.domain}/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png`,
  image: `${SITE.domain}/assets/poster.png`,
  slogan: 'From Potential to Purpose',
  foundingDate: '2019',
  numberOfEmployees: { '@type': 'QuantitativeValue', value: 15 },
  description:
    "Kenya's premier campus entertainment and youth talent tour since 2019 — visiting 50+ schools, reaching 100,000+ students, and broadcasting every stop nationally on Urban News via PPP TV Kenya.",
  email: 'admin@urbangangtour.co.ke',
  telephone: '+254799886247',
  areaServed: 'KE',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Chelezo Apartments, Kindaruma Road, Floor 15, Door 2',
    addressLocality: 'Kilimani, Nairobi',
    addressRegion: 'Nairobi County',
    postalCode: '00622',
    addressCountry: 'KE',
  },
  founder: [
    { '@type': 'Person', name: 'Eugine Micah' },
    { '@type': 'Person', name: 'Lucy Ogunde' },
  ],
  sameAs: [
    'https://www.instagram.com/urban_newsgang',
    'https://www.tiktok.com/@urban_newsgang',
    'https://www.youtube.com/@urban_newsgang',
    'https://www.facebook.com/profile.php?id=61572771956199',
    'https://x.com/urban_newsgang',
  ],
};

const ABOUT_PAGE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${SITE.domain}/about`,
  url: `${SITE.domain}/about`,
  name: 'About the Urban Gang Tour — Our Story & Mission',
  description:
    'How the Urban Gang Tour showcases, mentors and awards young Kenyan talent — travelling the full production to schools and campuses and broadcasting every stop nationally.',
  isPartOf: { '@id': `${SITE.domain}/#website` },
  about: { '@id': `${SITE.domain}/#org` },
  mainEntity: { '@id': `${SITE.domain}/#org` },
};

export default function Page() {
  const structured = structuredDataForPath(PATH);
  return (
    <>
      <JsonLd data={[ORG_JSONLD, ABOUT_PAGE_JSONLD, ...structured]} />
      {/* Rich SSR shell — visible to crawlers, hidden once v25 boots */}
      <div
        id="ssr-shell"
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        <h1>About the Urban Gang Tour — Our Story &amp; Mission</h1>
        <p>
          Urban Gang Tour (UGT) is Kenya&rsquo;s premier campus and school entertainment tour, founded
          in 2019 by Eugine Micah and Lucy Ogunde. Since its first stop, UGT has visited over 50
          schools and reached more than 100,000 students across Kenya — bringing a full
          broadcast-ready production to every institution free of charge.
        </p>
        <h2>Our Mission: From Potential to Purpose</h2>
        <p>
          Every Urban Gang Tour stop is a full day on your campus: morning mentorship pods, tree
          planting, talent competitions across music, dance, poetry, comedy and fashion, a modelling
          runway, awards and crowning ceremonies — all recorded live and broadcast nationally on
          Urban News via PPP TV Kenya.
        </p>
        <h2>Key Facts</h2>
        <ul>
          <li>Founded: 2019</li>
          <li>Schools visited: 50+</li>
          <li>Students reached: 100,000+</li>
          <li>Broadcast partner: PPP TV Kenya (Urban News)</li>
          <li>Headquarters: Kilimani, Nairobi, Kenya</li>
          <li>Founders: Eugine Micah &amp; Lucy Ogunde</li>
        </ul>
        <h2>What Happens on Tour Day</h2>
        <p>
          UGT arrives with a full production crew — hosts, resident DJs, stage managers,
          videographers, a runway team from Synapse Models, and performance pod facilitators. Students
          compete in talent categories, receive mentorship, walk the runway, and watch their school
          become the loudest place in Kenya for one day. The entire event is filmed and broadcast on
          the national Urban News programme.
        </p>
        <h2>Broadcast &amp; Media</h2>
        <p>
          Urban News airs on PPP TV Kenya and reaches audiences nationwide. Every tour stop becomes a
          national broadcast feature — meaning the students who shine on stage are seen across the
          country.
        </p>
        <h2>Contact</h2>
        <p>
          Email: admin@urbangangtour.co.ke &mdash; Phone: +254 799 886 247 &mdash; Nairobi, Kenya
        </p>
      </div>
      <RenderedPage pathName={PATH} />
    </>
  );
}
