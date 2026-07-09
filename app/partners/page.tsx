import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";

const title = "Our Partners";
const description = "Urban Gang Tour runs on a network of media, education, creative, and safety partners.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/partners" },
  openGraph: { title, description, url: "/partners", type: "website" },
};

const PARTNERS = [
  { name: "Vibes Studios", role: "Videography Partner", blurb: "Every frame you see from the tour passes through Vibes. Ground footage that feeds Urban News and every social platform.", ig: "the_vibestudios" },
  { name: "Synapse Models", role: "Modelling & Pageantry", blurb: "Led by Esther Wambui Gakunju, Head of Modelling and Pageantry. Directs the runway and the Mrs/Miss of the Institution pageant.", ig: "synapsemodels" },
  { name: "The Experience Hub", role: "Entertainment Partner", blurb: "Led by Hype Ola, Lead Hype. Brings a 30-strong energy unit to every stop and turns any crowd into participants.", ig: "theexperiencehubke_" },
  { name: "Moyo Response", role: "Safety & First Aid", blurb: "On-site emergency response and first aid coverage at every single event.", ig: "moyo_response" },
  { name: "Delo Greens Movement", role: "Environmental Partner", blurb: "Founded and led by CEO Justus (Tae), championing tree planting and environmental action at every stop.", ig: "" },
  { name: "Ashton Sounds", role: "Stage & Sound Partner", blurb: "Professional stage and sound production for tour events, led by Jeff Ashton.", ig: "" },
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-magenta">
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1120px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">THE NETWORK</div>
            <h1 className="mt-4 font-display text-[clamp(36px,6vw,72px)] uppercase leading-[0.9] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              The Gang Behind <span className="rounded border-[3px] border-ink bg-cyan px-2.5">The Gang</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] font-medium leading-relaxed text-white">
              Urban Gang Tour runs on a network of media, education, creative, and safety partners.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PARTNERS.map((p, i) => (
              <Reveal key={p.name} delay={(i % 4) * 0.05}>
                <div className="relative rounded-[6px_22px_16px_16px] border-[3px] border-ink bg-concrete p-6 shadow-[5px_5px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1">
                  <div className="absolute -top-3 left-4 rounded-b-lg border-2 border-ink bg-magenta px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                    PARTNER FILE
                  </div>
                  <div className="mt-3 font-display text-[20px] uppercase">{p.name}</div>
                  <div className="mt-1.5 inline-block rounded border-2 border-ink bg-gold px-2 py-0.5 text-[10.5px] font-bold uppercase">{p.role}</div>
                  <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed text-ink/75">{p.blurb}</p>
                  {p.ig && (
                    <a href={`https://instagram.com/${p.ig}`} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-block text-[12.5px] font-bold text-magenta">
                      @{p.ig}
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ink px-6 py-16 text-center sm:px-10">
        <h2 className="font-display text-[clamp(26px,4.5vw,48px)] uppercase text-white">
          There&apos;s a seat at <span className="text-gold">this table.</span>
        </h2>
        <p className="mt-2.5 text-[14px] font-medium text-white/70">Media houses, agencies, colleges, brands, and institutions.</p>
        <Link href="/book#brands" className="mt-6 inline-block rounded-xl border-[3px] border-ink bg-gold px-7 py-4 font-display text-[17px] text-ink shadow-[6px_6px_0_#E6218C]">
          Start a Partnership
        </Link>
      </div>

      <Footer />
    </div>
  );
}
