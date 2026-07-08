import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { BATTLES, RUNWAY_CATEGORIES, PODS, ON_SITE_EXPERIENCES } from "@/content/experience";

const title = "The Experience";
const description = "What happens when the Urban Gang Tour pulls up: one day, one institution, eight battle categories, judged live.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/experience" },
  openGraph: { title, description, url: "/experience", type: "website" },
};

export default function ExperiencePage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/g/stage_2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.32]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(21,14,19,0.6), #150E13 92%)" }} />
        <div className="relative mx-auto max-w-[1280px] px-6 py-28 text-center sm:px-10 sm:py-36">
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-ink px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">The full rundown</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">what happens when the tour pulls up</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.9rem,6.2vw,5.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              One day. One institution.
              <br />
              <span className="text-magenta">Everything changes.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="flex flex-wrap items-baseline gap-4">
              <h2 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] uppercase">
                The 8 battle <span className="text-gold">categories</span>
              </h2>
              <div className="text-[14px] text-paper/60">Competitor vs competitor, judged live, winners crowned on stage</div>
            </div>
          </Reveal>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BATTLES.map((b, i) => (
              <Reveal key={b.n} delay={(i % 4) * 0.05}>
                <div className="relative overflow-hidden rounded-2xl border-2 border-magenta/35 bg-white/[0.04] p-6 transition-all duration-150 ease-out hover:-translate-y-1 hover:-rotate-[0.5deg] hover:border-magenta">
                  <div className="pointer-events-none absolute -right-1.5 -top-4 font-display text-[74px] text-magenta/[0.16]">{b.n}</div>
                  <div className="relative font-display text-[21px] tracking-wide">{b.title.toUpperCase()}</div>
                  <p className="relative mt-1.5 text-[13px] leading-relaxed text-paper/65">{b.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10">
        <Reveal>
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 overflow-hidden rounded-3xl border border-white/10 lg:grid-cols-2">
            <div className="relative min-h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/pt/synapse_3.jpg" alt="Runway" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 55%, #1B0F18)" }} />
              <div className="absolute left-[1.125rem] top-[1.125rem] -rotate-2 rounded-full bg-magenta px-4 py-2 font-display text-[15px] tracking-wide text-paper">
                THE T-SHAPED RUNWAY
              </div>
            </div>
            <div className="bg-[#1B0F18] p-9 sm:p-11">
              <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.2rem)] uppercase">
                The modelling <span className="text-magenta">runway</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/72">
                Four sub categories on a full T shaped runway stage, directed by{" "}
                <Link href="/partners" className="font-bold text-gold">
                  Synapse Models
                </Link>
                :
              </p>
              <div className="mt-[1.125rem] flex flex-col gap-2.5">
                {RUNWAY_CATEGORIES.map((r) => (
                  <div key={r.n} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3">
                    <span className="font-display text-[16px] text-gold">{r.n}</span>
                    <span className="text-[15px] font-semibold">{r.t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-gold/50 bg-gold/10 p-[1.125rem] text-[14px] leading-relaxed text-[#FFE9C7]">
                The day ends with the crowning of <b>Mrs/Miss of the Institution</b>, presented by the
                Principal alongside Eugine and Lucy.
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-6 pb-8 pt-20 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="-rotate-1 font-marker text-lg text-gold">real talk, real skills</div>
            <h2 className="mt-1.5 font-display text-[clamp(1.9rem,4vw,2.6rem)] uppercase">
              The Urban <span className="text-magenta">Pods</span>
            </h2>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-paper/70">
              Small group sessions running through the day, led by{" "}
              <Link href="/the-gang" className="font-bold text-gold">
                MC Paps
              </Link>
              , our resident Mental Health Coach and MC. Five themes on the menu, each stop runs 3 to 5
              pods depending on the topics of the day.
            </p>
          </Reveal>
          <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {PODS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <div
                  className="rounded-2xl p-6 transition-transform duration-150 ease-out hover:-translate-y-1 hover:rotate-1"
                  style={{ background: p.bg, color: p.fg }}
                >
                  <div className="font-display text-[18px] leading-tight">{p.title.toUpperCase()}</div>
                  <p className="mt-2 text-[13px] leading-relaxed opacity-85">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-9">
              <div className="font-display text-[26px] uppercase">The stage</div>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/72">
                T shaped main stage with runway extension, branded backdrop, teardrop banners, full PA
                and DJ rig by our sound partners{" "}
                <Link href="/partners" className="font-bold text-gold">
                  Ashton Sounds
                </Link>
                . Built for crowds from 400 students to festival scale.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="rounded-3xl border border-[#E61E8C]/40 bg-[#E61E8C]/[0.08] p-9">
              <div className="flex items-center gap-3.5">
                <div className="font-display text-[26px] uppercase">The broadcast</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" className="h-9" />
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/72">
                Every event is filmed. Videography is mandatory at every stop, captured by{" "}
                <Link href="/partners" className="font-bold text-gold">
                  Vibes Studios
                </Link>{" "}
                alongside tour camera crews. Highlights feed{" "}
                <Link href="/urban-news" className="font-bold text-gold">
                  Urban News
                </Link>{" "}
                and short form content across TikTok, Instagram, YouTube Shorts, Facebook, and X.
                Winners do not just win on the day. <b className="text-paper">They get seen.</b>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.4rem)] uppercase">
              On site <span className="text-gold">experiences</span>
            </h2>
          </Reveal>
          <div className="mt-[1.625rem] grid grid-cols-1 gap-[1.125rem] sm:grid-cols-3">
            {ON_SITE_EXPERIENCES.map((e, i) => {
              const card = (
                <div className="relative rounded-2xl border border-dashed border-gold/50 bg-white/[0.04] p-[1.625rem] transition-all duration-150 ease-out hover:border-gold hover:-translate-y-1">
                  <div className="font-display text-[21px]">{e.title.toUpperCase()}</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-paper/68">{e.body}</p>
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
      </section>

      <section className="px-6 py-14 sm:px-10">
        <Reveal>
          <div
            className="mx-auto grid max-w-[1080px] grid-cols-[auto_1fr] items-center gap-7 rounded-3xl border p-9 sm:p-11"
            style={{ background: "linear-gradient(150deg, rgba(245,166,35,0.14), rgba(199,35,142,0.12))", borderColor: "rgba(245,166,35,0.35)" }}
          >
            <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#F5A623" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
              <path d="M8 5H4v2a4 4 0 0 0 4 4" />
              <path d="M16 5h4v2a4 4 0 0 1-4 4" />
              <line x1="12" y1="14" x2="12" y2="18" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
            <div>
              <div className="font-display text-[26px] uppercase">Awards</div>
              <p className="mt-2 text-[15px] leading-relaxed text-paper/75">
                Category winners, runner up recognition, participant certificates, and the institution
                crown. Awards are presented on camera, with partner branding on certificates where
                applicable.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        className="px-6 py-16 text-center sm:px-10"
        style={{ background: "linear-gradient(100deg, #C7238E, #F5A623)" }}
      >
        <Reveal>
          <div className="font-display text-[clamp(2rem,4vw,3.25rem)] uppercase text-paper">Bring this to your institution</div>
          <Link
            href="/book"
            className="mt-6 inline-block rounded-2xl bg-ink px-8 py-4 text-[15.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]"
          >
            Book the Tour
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
