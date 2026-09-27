import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { AboutPage } from '@/app/_components/AboutPage';
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
      <AboutPage />
    </>
  );
}
