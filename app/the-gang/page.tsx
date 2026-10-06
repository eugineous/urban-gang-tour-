import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { PEOPLE } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { SITE } from '@/lib/site';

const PATH = '/the-gang';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

// The public founders page is intentionally limited to the two permanent
// principals. Event contractors and collaborators are credited on the work
// they actually join, not presented as standing crew.
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
];

export default function Page() {
  const structured = structuredDataForPath(PATH);
  return (
    <>
      <JsonLd data={[PEOPLE, ...structured]} />
      <main className="ugt-founders">
        <section className="ugt-founders-hero">
          <p>THE TWO BEHIND THE CULTURE</p>
          <h1>Meet <span>The Gang</span></h1>
          <div className="ugt-founders-intro">Urban Gang Tour is led by Eugine Micah and Lucy Ogunde. Specialist performers, technicians and facilitators join individual productions when the event calls for them.</div>
        </section>
        <section className="ugt-founders-grid" aria-label="Urban Gang Tour founders">
          <article>
            <div className="ugt-founder-photo"><img src="/assets/crew/eugine-micah.png" alt="Eugine Micah, co-founder of Urban Gang Tour" /></div>
            <p>THE FACE · THE MIC · THE BUILD</p>
            <h2>Eugine Micah</h2>
            <h3>Co-Founder, Creative Director &amp; Lead Host</h3>
            <div>{CREW[0].description}</div>
            <a href="/author/eugine-micah">View Eugine&apos;s profile →</a>
          </article>
          <article>
            <div className="ugt-founder-photo cyan"><img src="/assets/crew/lucy-ogunde.jpg" alt="Lucy Ogunde, co-founder of Urban Gang Tour" /></div>
            <p>THE VOICE · THE ROOM · THE ENERGY</p>
            <h2>Lucy Ogunde</h2>
            <h3>Co-Founder &amp; Co-Host</h3>
            <div>{CREW[1].description}</div>
            <a href="/author/lucy-ogunde">View Lucy&apos;s profile →</a>
          </article>
        </section>
        <section className="ugt-founders-note">
          <div><p>HOW THE TEAM WORKS</p><h2>Two permanent principals. The right specialists for every show.</h2><div>Urban Gang Tour does not present occasional collaborators as permanent crew. Production teams are assembled for each event and credited for the work they perform.</div></div>
          <a href="/work-with-us">Work with us →</a>
        </section>
        <section className="ugt-founders-cta"><p>Want Eugine and Lucy at your school or event?</p><a href="/book">Start a booking request →</a></section>
      </main>
    </>
  );
}
