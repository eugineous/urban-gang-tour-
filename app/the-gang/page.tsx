import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import TeamCard from "./_TeamCard";
import { LEADERSHIP, OPERATIONS_CREW, ENERGY_UNIT, TOURING_ARTISTS } from "@/content/team";

const title = "Meet The Gang";
const description =
  "Around thirty people build, run, and film every Urban Gang Tour event. Meet the leadership, production crew, energy unit, and touring artists.";

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
      item: { "@type": "Person", name: p.name, jobTitle: p.role, sameAs: `https://instagram.com/${p.ig}` },
    })),
  };

  return (
    <div className="min-h-screen bg-magenta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(peopleLd) }} />
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">THE CREW BEHIND THE CULTURE</div>
            <h1 className="mt-4 font-display text-[clamp(40px,7vw,88px)] uppercase leading-[0.9] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              Meet <span className="rounded border-[3px] border-ink bg-cyan px-2.5">The Gang</span>
            </h1>
            <p className="mt-4 max-w-xl text-[18px] font-medium leading-relaxed text-white">
              Around thirty people build, run, and film every event. These are the leads.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="bg-gold px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-4 font-display text-sm uppercase tracking-wide text-ink/50">Leadership</div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {LEADERSHIP.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className="overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-[6px_6px_0_#111]">
                  <div className="relative aspect-[4/5] w-full overflow-hidden border-b-[3px] border-ink">
                    <img src={p.img} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="font-display text-[22px] uppercase leading-tight">{p.name}</div>
                    <div className="mt-1.5 text-[12px] font-bold uppercase tracking-wide text-magenta">{p.role}</div>
                    <p className="mt-3 text-[13.5px] font-medium leading-relaxed text-ink/70">{p.bio}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span key={t} className="rounded-full border-2 border-ink/15 bg-concrete px-3 py-1.5 text-[11px] font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                    <a href={`https://instagram.com/${p.ig}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[13px] font-bold text-magenta">
                      @{p.ig}
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="font-display text-sm uppercase tracking-wide text-ink/45">Production &amp; Operations</div>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-ink/60">
            Every title holder runs their own lane; the machine that gets a stage up before sunrise and
            packed before dark.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {OPERATIONS_CREW.map((m, i) => (
              <Reveal key={m.name} delay={(i % 5) * 0.05}>
                <TeamCard member={m} tilt={i % 2 ? "rotate-1" : "-rotate-1"} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-4 border-ink bg-cyan px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="font-display text-sm uppercase tracking-wide text-ink/60">Energy Unit</div>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-ink/70">
            Dancers and creatives from The Experience Hub who fill the room between every showcase.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ENERGY_UNIT.map((m, i) => (
              <Reveal key={m.name} delay={(i % 5) * 0.05}>
                <TeamCard member={m} tilt={i % 2 ? "rotate-1" : "-rotate-1"} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="font-display text-sm uppercase tracking-wide text-ink/45">Touring Artists</div>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-ink/60">Performers who ride with the tour and take the main stage between showcases.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {TOURING_ARTISTS.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 0.05}>
                <TeamCard member={m} tilt={i % 2 ? "rotate-1" : "-rotate-1"} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-4 border-ink bg-ink px-6 py-16 text-center sm:px-10">
        <h2 className="font-display text-[clamp(26px,4vw,44px)] uppercase leading-[0.98] text-white">
          Want to join a future crew?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[14.5px] font-medium leading-relaxed text-white/70">
          Reach out with your skill and your county. Dancers, MCs, camera operators, medics, logistics.
          The gang keeps growing.
        </p>
        <a
          href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20to%20join%20the%20crew!%20My%20skill%3A%20"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-xl border-[3px] border-ink bg-gold px-7 py-4 font-display text-[16px] text-ink shadow-[5px_5px_0_#E6218C]"
        >
          Join the Gang on WhatsApp
        </a>
      </div>

      <Footer />
    </div>
  );
}
