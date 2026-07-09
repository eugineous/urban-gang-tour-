import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { IMPACT_PILLARS, IMPACT_NUMBERS } from "@/content/about";

const title = "About & The Gang";
const description =
  "Urban Gang Tour is a Kenyan youth entertainment and media company founded by Eugine Micah and Lucy Ogunde: a travelling school tour, mentorship, a modelling runway, and a national broadcast on Urban News.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about", type: "website" },
};

const DIFFERENTIATORS = [
  { n: "01", title: "We come to you", body: "The full production travels: stage, sound, crew, cameras, hosts." },
  { n: "02", title: "Talent, showcased & awarded", body: "Every talent gets a stage — music, dance, spoken word, comedy, modelling and more — judged and crowned." },
  { n: "03", title: "Mentorship built in", body: "Urban Pods on sexual education, substance abuse, career, digital literacy and life run alongside the stage." },
  { n: "04", title: "National broadcast", body: "Every stop feeds Urban News on PPP TV Kenya, plus short-form content everywhere." },
  { n: "05", title: "A real crew", body: "Hosts, DJs, stage managers, videographers, models, medics, and mentorship facilitators." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-magenta">
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">WHO WE ARE</div>
            <h1 className="mt-4 font-display text-[clamp(40px,7vw,88px)] uppercase leading-[0.9] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              We Turn Potential
              <br />
              Into <span className="rounded border-[3px] border-ink bg-cyan px-2.5">Purpose</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[18px] font-medium leading-relaxed text-white">
              Urban Gang Tour is a Kenyan entertainment and media company. We create the moments, own the
              production, and carry them to the national screen. When a brand, an institution, or a name
              wants to reach young Kenya where it actually lives, this is the room they come to.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-12 sm:px-10">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-8">
          <div className="flex flex-none">
            <div className="w-[180px] -rotate-[5deg] rounded border-2 border-ink/15 bg-white p-2.5 pb-8 shadow-[0_12px_24px_rgba(17,17,17,0.25)]">
              <div className="relative aspect-square overflow-hidden">
                <Image src="/assets/p/eugine_4.jpg" alt="Eugine Micah — Co-Founder, Urban Gang Tour" fill sizes="180px" className="object-cover" />
              </div>
              <div className="mt-2 text-center font-marker text-[14px]">eugine — the face</div>
            </div>
            <div className="ml-[-24px] mt-6 w-[180px] rotate-3 rounded border-2 border-ink/15 bg-white p-2.5 pb-8 shadow-[0_12px_24px_rgba(17,17,17,0.25)]">
              <div className="relative aspect-square overflow-hidden">
                <Image src="/assets/p/lucy_portrait.jpg" alt="Lucy Ogunde — Co-Founder, Urban Gang Tour" fill sizes="180px" className="object-cover" />
              </div>
              <div className="mt-2 text-center font-marker text-[14px]">lucy — the voice</div>
            </div>
          </div>
          <div className="min-w-[260px] flex-1">
            <div className="-rotate-1 font-marker text-lg text-magenta">it started with these two</div>
            <h2 className="mt-1.5 font-display text-[clamp(26px,4vw,44px)] uppercase leading-[0.92]">
              Founded On A Mic
              <br />
              And A Promise
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink/80">
              Eugine Micah and Lucy Ogunde built the Urban Gang Tour from one school hall into a national
              movement — him on the mic, her holding the room, both carrying every stop to the country on
              Urban News. The whole thing still runs on their promise: every young person deserves one
              loud day where the country learns their name.
            </p>
            <Link href="/the-gang" className="mt-4 inline-block rounded-xl border-[3px] border-ink bg-ink px-5 py-3 font-display text-[15px] text-gold shadow-[4px_4px_0_#E6218C]">
              Meet The Whole Gang →
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-12 sm:px-10">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-8 sm:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="mb-3.5 font-display text-[38px] uppercase">Our Story</h2>
            <p className="mb-3.5 font-medium leading-relaxed text-ink/80">
              Kenya is overflowing with young talent that never gets a stage, a mentor, or a camera. So we
              built all three into one travelling machine. One day, one institution: talent showcases
              judged live, life-skills pods that actually speak the language of young people, a full
              modelling runway, an awards ceremony, and a broadcast on national TV through Urban News on
              PPP TV Kenya.
            </p>
            <p className="font-medium leading-relaxed text-ink/80">
              We are not a one-off event company. We are the crew behind the culture, the sound, the
              stage, the cameras, the moment, and the movement that keeps growing every time we show up
              somewhere new.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border-[3px] border-ink bg-magenta p-6 text-white shadow-[6px_6px_0_#111]">
              <div className="font-display text-[22px] uppercase">Mission</div>
              <p className="mt-2 text-[14px] font-medium leading-relaxed">
                Discover, mentor, and platform young Kenyan talent through live events, life skills, and
                national broadcast, turning raw potential into real purpose.
              </p>
            </div>
            <div className="rounded-2xl border-[3px] border-ink bg-cyan p-6 shadow-[6px_6px_0_#111]">
              <div className="font-display text-[22px] uppercase">Vision</div>
              <p className="mt-2 text-[14px] font-medium leading-relaxed">
                To be Africa&apos;s leading youth talent and mentorship tour, where every young person, in
                every county, has a stage within reach.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-gold px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <h2 className="mb-6 font-display text-[38px] uppercase">What Makes Us Different</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DIFFERENTIATORS.map((d, i) => (
              <Reveal key={d.n} delay={i * 0.05}>
                <div className="rounded-2xl border-[3px] border-ink bg-white p-5 shadow-[5px_5px_0_#111]">
                  <div className="font-display text-[38px] leading-[0.8] text-magenta">{d.n}</div>
                  <div className="mt-1.5 font-display text-[17px] uppercase leading-tight">{d.title}</div>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink/75">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          <div className="-rotate-1 font-marker text-lg text-magenta">the tour leaves more than memories</div>
          <h2 className="mb-6 mt-1 font-display text-[clamp(28px,4vw,44px)] uppercase">
            Impact <span className="text-magenta">Pillars</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="rounded-2xl border-2 border-ink/12 bg-concrete p-5">
                  <div className="h-9 w-9 rounded-lg border-2 border-ink" style={{ background: p.color }} />
                  <div className="mt-3 text-[15px] font-bold">{p.title}</div>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink/70">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {IMPACT_NUMBERS.map((n) => (
              <div key={n.label} className="border-r-2 border-dashed border-ink/15 p-2 text-center last:border-r-0">
                <div className="font-display text-[30px] text-magenta">{n.v}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink/65">{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[900px] rounded-2xl border-4 border-gold bg-magenta p-8 shadow-[10px_10px_0_rgba(255,212,0,0.3)]">
          <div className="font-display text-[clamp(22px,3.2vw,34px)] leading-[1.2] text-white">
            &quot;Every school we walk into, there is a star nobody has noticed yet. Our job is to make
            sure the whole country notices.&quot;
          </div>
          <div className="mt-4 font-marker text-[19px] text-gold">Eugine Micah · Co-Founder &amp; Creative Director</div>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3.5">
          <Link href="/the-gang" className="rounded-xl border-[3px] border-ink bg-gold px-6 py-4 font-display text-[17px] text-ink shadow-[5px_5px_0_#E6218C]">
            Meet the Full Gang
          </Link>
          <Link href="/experience" className="rounded-xl border-2 border-white px-6 py-4 font-display text-[17px] text-white">
            See the Experience
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
