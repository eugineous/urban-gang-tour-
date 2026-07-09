import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { BATTLES, RUNWAY_CATEGORIES, PODS, ON_SITE_EXPERIENCES } from "@/content/experience";

const title = "The Tour — The Experience";
const description = "What happens when the Urban Gang Tour pulls up: one day, one institution, talent showcases judged live, mentorship pods, and a modelling runway.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/experience" },
  openGraph: { title, description, url: "/experience", type: "website" },
};

export default function ExperiencePage() {
  return (
    <div className="min-h-screen bg-cyan">
      <Nav />

      <div className="border-b-4 border-ink bg-cyan px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">THE EXPERIENCE</div>
            <h1 className="mt-4 font-display text-[clamp(38px,6vw,80px)] uppercase leading-[0.9]" style={{ textShadow: "4px 4px 0 #fff" }}>
              One Day. One Institution.
              <br />
              <span className="rounded border-[3px] border-ink bg-magenta px-2.5 text-white">Everything Changes.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[18px] font-semibold leading-relaxed">
              Here is what happens when the tour pulls up: a full crew, a T-shaped stage, cameras rolling,
              and a crowd that becomes the show.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="font-marker text-lg text-gold">the official call sheet — first light to final pack-down</div>
          <h2 className="mt-1.5 font-display text-[clamp(30px,5vw,52px)] uppercase leading-[0.92] text-white">
            How The Day <span className="text-magenta">Runs</span>
          </h2>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h2 className="font-display text-[clamp(28px,4vw,42px)] uppercase">
              Talent <span className="text-magenta">Showcase Categories</span>
            </h2>
            <div className="text-[14px] font-semibold text-ink/60">Judged live, winners crowned on stage</div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BATTLES.map((b, i) => (
              <Reveal key={b.n} delay={(i % 4) * 0.05}>
                <div className="relative overflow-hidden rounded-2xl border-[3px] border-ink bg-concrete p-6 shadow-[5px_5px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1">
                  <div className="pointer-events-none absolute -right-1.5 -top-4 font-display text-[70px] text-magenta/15">{b.n}</div>
                  <div className="relative font-display text-[20px] uppercase tracking-wide">{b.title}</div>
                  <p className="relative mt-1.5 text-[13px] font-medium leading-relaxed text-ink/70">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-gold px-6 py-14 sm:px-10">
        <Reveal>
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 overflow-hidden rounded-2xl border-[3px] border-ink shadow-[8px_8px_0_#111] lg:grid-cols-2">
            <div className="relative min-h-[300px]">
              <Image src="/assets/pt/synapse_3.jpg" alt="Runway" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute left-4 top-4 -rotate-2 rounded-full border-2 border-ink bg-magenta px-4 py-2 font-display text-[14px] text-white">
                THE T-SHAPED RUNWAY
              </div>
            </div>
            <div className="bg-white p-8 sm:p-10">
              <h2 className="font-display text-[clamp(24px,3.4vw,32px)] uppercase">
                The Modelling <span className="text-magenta">Runway</span>
              </h2>
              <p className="mt-2.5 text-[14.5px] font-medium leading-relaxed text-ink/75">
                Four sub-categories on a full T-shaped runway stage, directed by{" "}
                <Link href="/partners" className="font-bold text-magenta">Synapse Models</Link>:
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {RUNWAY_CATEGORIES.map((r) => (
                  <div key={r.n} className="flex items-center gap-3 rounded-lg border-2 border-ink/10 bg-concrete px-4 py-2.5">
                    <span className="font-display text-[15px] text-magenta">{r.n}</span>
                    <span className="text-[14px] font-semibold">{r.t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border-2 border-dashed border-ink/25 bg-gold/20 p-4 text-[13.5px] font-medium leading-relaxed">
                The day ends with the crowning of <b>Mrs/Miss of the Institution</b>, presented by the
                Principal alongside Eugine and Lucy.
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="-rotate-1 font-marker text-lg text-gold">real talk, real skills</div>
          <h2 className="mt-1.5 font-display text-[clamp(28px,4vw,42px)] uppercase text-white" style={{ textShadow: "2px 2px 0 #111" }}>
            The Urban <span className="text-gold">Pods</span>
          </h2>
          <p className="mt-2.5 max-w-2xl text-[14.5px] font-medium leading-relaxed text-white">
            Small-group mentorship sessions running through the day, led by our facilitators. Every stop
            runs 3 to 5 pods depending on the topics of the day.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {PODS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <div className="rounded-2xl border-[3px] border-ink p-5 shadow-[4px_4px_0_#111]" style={{ background: p.bg, color: p.fg }}>
                  <div className="font-display text-[17px] uppercase leading-tight">{p.title}</div>
                  <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed opacity-90">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border-[3px] border-ink bg-concrete p-8 shadow-[6px_6px_0_#111]">
            <div className="font-display text-[24px] uppercase text-magenta">The Stage</div>
            <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-ink/75">
              T-shaped main stage with runway extension, branded backdrop, full PA and DJ rig. Built for
              crowds from 400 students to festival scale.
            </p>
          </div>
          <div className="rounded-2xl border-[3px] border-ink bg-ink p-8 text-white shadow-[6px_6px_0_#FFD400]">
            <div className="font-display text-[24px] uppercase text-gold">The Broadcast</div>
            <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-white/75">
              Every event is filmed. Highlights feed Urban News on PPP TV Kenya, plus short-form content
              across TikTok, Instagram, YouTube Shorts, Facebook and X. Winners don&apos;t just win on the
              day — they get seen, nationwide.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-gold px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="font-display text-[clamp(24px,3.6vw,34px)] uppercase">On-Site Experiences</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ON_SITE_EXPERIENCES.map((e, i) => {
              const card = (
                <div className="h-full rounded-2xl border-2 border-dashed border-ink/40 bg-white p-6 transition-all duration-150 ease-out hover:border-ink hover:-translate-y-1">
                  <div className="font-display text-[19px] uppercase">{e.title}</div>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink/70">{e.body}</p>
                </div>
              );
              return (
                <Reveal key={e.title} delay={i * 0.06}>
                  {e.href ? <Link href={e.href}>{card}</Link> : card}
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-magenta px-6 py-16 text-center sm:px-10">
        <h2 className="font-display text-[clamp(28px,4vw,48px)] uppercase text-white" style={{ textShadow: "3px 3px 0 #111" }}>
          Bring this to your institution
        </h2>
        <Link href="/book" className="mt-6 inline-block rounded-xl border-[3px] border-ink bg-gold px-8 py-4 font-display text-[18px] text-ink shadow-[6px_6px_0_#111]">
          BOOK THE TOUR
        </Link>
      </div>

      <Footer />
    </div>
  );
}
