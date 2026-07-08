import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import TeamCard from "./_TeamCard";
import { LEADERSHIP, OPERATIONS_CREW, ENERGY_UNIT, TOURING_ARTISTS } from "@/content/team";

const title = "The Gang — Urban Gang Tour Crew";
const description =
  "Meet the people who build, run, and film every Urban Gang Tour event: leadership, production, entertainment, and the touring artists who ride with the tour.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/the-gang" },
  openGraph: { title, description, url: "/the-gang", type: "website" },
};

export default function TheGangPage() {
  const peopleLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: LEADERSHIP.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: p.name,
        jobTitle: p.role,
        sameAs: `https://instagram.com/${p.ig}`,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(peopleLd) }} />
      <Nav />

      <section className="px-6 pb-16 pt-20 sm:px-10 sm:pt-28">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">The Gang</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-balance font-display text-[clamp(2.5rem,6vw,5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              The crew behind every stage
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-paper/65">
              Thirty to fifty strong at every stop. Hosts, producers, DJs, dancers, camera crews, and
              medics who build, run, and film the tour.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-24 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="font-display text-sm uppercase tracking-wide text-paper/40">Leadership</div>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {LEADERSHIP.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-7">
                    <div className="font-display text-2xl uppercase leading-tight tracking-[-0.02em]">{p.name}</div>
                    <div className="mt-1.5 text-[12px] font-bold uppercase tracking-wide text-magenta-bright">{p.role}</div>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-paper/65">{p.bio}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-paper/70">
                          {t}
                        </span>
                      ))}
                    </div>
                    <a
                      href={`https://instagram.com/${p.ig}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-[13px] font-bold text-magenta-bright"
                    >
                      @{p.ig}
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="font-display text-sm uppercase tracking-wide text-paper/40">Production & Operations</div>
            <p className="mt-2 max-w-lg text-[13.5px] text-paper/55">
              Every title holder runs their own lane; the machine that gets a stage up before sunrise and
              packed before dark.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {OPERATIONS_CREW.map((m, i) => (
              <Reveal key={m.name} delay={(i % 5) * 0.05}>
                <TeamCard member={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="font-display text-sm uppercase tracking-wide text-paper/40">Energy Unit</div>
            <p className="mt-2 max-w-lg text-[13.5px] text-paper/55">
              Dancers and creatives from The Experience Hub who fill the room between every battle.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {ENERGY_UNIT.map((m, i) => (
              <Reveal key={m.name} delay={(i % 5) * 0.05}>
                <TeamCard member={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="font-display text-sm uppercase tracking-wide text-paper/40">Touring Artists</div>
            <p className="mt-2 max-w-lg text-[13.5px] text-paper/55">
              Performers who ride with the tour and take the main stage between battles.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {TOURING_ARTISTS.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 0.05}>
                <TeamCard member={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-24 text-center sm:px-10">
        <div className="mx-auto max-w-xl">
          <Reveal>
            <h2 className="text-balance font-display text-[clamp(1.75rem,4vw,3rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              Want to join a future crew?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-paper/65">
              Reach out with your skill and your county. Dancers, MCs, camera operators, medics,
              logistics. The gang keeps growing.
            </p>
            <a
              href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20to%20join%20the%20crew!%20My%20skill%3A%20"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-block rounded-full bg-gold px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-ink transition-all duration-150 ease-out hover:bg-gold-bright active:scale-[0.97]"
            >
              Join the Gang on WhatsApp
            </a>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
