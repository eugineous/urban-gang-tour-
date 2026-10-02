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

// Crew list sourced from the same data used by PEOPLE JSON-LD
const CREW: { name: string; role: string; description: string }[] = [
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
  {
    name: 'Okiyo DaVinci',
    role: 'Overseer, Urban Gang Structure',
    description:
      'Strategic overseer of the Urban Gang structure, operations and programme design.',
  },
  {
    name: 'Esther Wambui Gakunju',
    role: 'Head of Modelling & Pageantry',
    description:
      'Runway director leading modelling and pageantry across the tour with Synapse Models.',
  },
  {
    name: 'Kalamu Nyeusi',
    role: 'Stage Manager & Spoken Word Lead',
    description:
      'Stage manager and spoken-word lead curating and judging the poetry and spoken-word showcases.',
  },
  {
    name: 'DJ Carian',
    role: 'Resident DJ',
    description: 'Resident DJ providing professional live sound across every tour event.',
  },
  {
    name: 'DJ Xavi',
    role: 'Resident DJ',
    description:
      'Resident DJ and versatile selector keeping the festival energy across long event days.',
  },
  {
    name: 'Hype Ola',
    role: 'Performance Pod Facilitator',
    description: 'Performance pod facilitator coaching young talent in stage presence and delivery.',
  },
  {
    name: 'Khloe Nyarangi',
    role: 'Performance Pod Facilitator',
    description: 'Performance pod facilitator mentoring young performers, especially young women.',
  },
  {
    name: 'Fred (Baba Harshna)',
    role: 'Stage Manager',
    description: 'Stage manager keeping the full production running seamlessly and on time.',
  },
  {
    name: 'George',
    role: 'Lead Videographer',
    description: 'Lead videographer directing the footage that carries every tour stop to the nation.',
  },
  {
    name: 'Jayjey',
    role: 'Field Content Creator',
    description:
      'Field content creator producing social-first reels and stories live from every event.',
  },
  {
    name: 'Tony',
    role: 'Photographer',
    description:
      'Tour photographer producing premium editorial stills for galleries and partners.',
  },
  {
    name: 'Rania',
    role: 'Runway Lead Model',
    description:
      'Runway lead model setting the standard and mentoring student models with Synapse Models.',
  },
  {
    name: 'Pauline Masika',
    role: 'Talent Coordinator',
    description:
      'Talent coordinator managing registrations and the flow of talent across all kinds of talent.',
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
        <h1>The Gang — Hosts, DJs, Crew &amp; Talent Team</h1>
        <p>
          Urban Gang Tour runs on a tightly-knit professional crew of hosts, DJs, stage managers,
          videographers, models and performance facilitators. Every person on this list travels to
          each school and campus stop to deliver a broadcast-quality production.
        </p>
        <h2>Meet the Crew</h2>
        <ul>
          {CREW.map((member) => (
            <li key={member.name}>
              <strong>{member.name}</strong> — {member.role}: {member.description}
            </li>
          ))}
        </ul>
        <h2>Join the Crew</h2>
        <p>
          Interested in working with the Urban Gang Tour as a performer, facilitator, photographer,
          DJ or crew member?{' '}
          <a href="/work-with-us">See open opportunities on our Work With Us page.</a>
        </p>
      </div>
      <RenderedPage pathName={PATH} />
    </>
  );
}
