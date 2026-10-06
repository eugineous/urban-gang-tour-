import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { PEOPLE } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';
import { SITE } from '@/lib/site';

const PATH = '/the-gang';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

// Public founder list sourced from the same data used by PEOPLE JSON-LD.
const FOUNDERS: { name: string; role: string; description: string }[] = [
  {
    name: 'Eugine Micah',
    role: 'Co-Founder, Creative Director & Lead Host',
    description:
      'Co-founder and creative director of the Urban Gang Tour and lead host of Urban News on PPP TV Kenya.',
  },
  {
    name: 'Lucy Ogunde',
    role: 'Co-Founder & Co-Host',
    description:
      'Co-founder and co-host of the Urban Gang Tour and Urban News on PPP TV Kenya.',
  },
];

export default function Page() {
  const structured = structuredDataForPath(PATH);
  return (
    <>
      <JsonLd data={[PEOPLE, ...structured]} />
      {/* Rich SSR shell — visible to crawlers, hidden once v25 boots */}
      <div
        id="team-summary"
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        <h1>Urban Gang Tour — The Founders</h1>
        <p>
          Urban Gang Tour is publicly led by co-founders Eugine Micah and Lucy Ogunde. They shape
          the live experience, host the movement and carry its voice on screen.
        </p>
        <h2>Meet the founders</h2>
        <ul>
          {FOUNDERS.map((member) => (
            <li key={member.name}>
              <strong>{member.name}</strong> — {member.role}: {member.description}
            </li>
          ))}
        </ul>
        <h2>Work with Urban Gang Tour</h2>
        <p>
          Planning a school, campus or brand experience?{' '}
          <a href="/book">Start a booking conversation.</a>
        </p>
      </div>
      <RenderedPage pathName={PATH} />
    </>
  );
}
