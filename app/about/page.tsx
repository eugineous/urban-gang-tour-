import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { DIFFERENTIATORS, IMPACT_PILLARS, IMPACT_NUMBERS } from "@/content/about";

const title = "About";
const description =
  "Urban Gang Tour is a Kenyan events company founded by Eugine Micah and Lucy Ogunde, running a youth talent search, mentorship, and awards concert programme touring high schools, universities, colleges, and large-scale events.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about", type: "website" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="relative overflow-hidden px-6 pb-14 pt-20 sm:px-10 sm:pt-28">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(1000px 500px at 30% -20%, rgba(199,35,142,0.4), transparent 65%)" }}
        />
        <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Our story</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">who we are</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,5.6vw,5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              We turn <span className="text-magenta">potential</span> into <span className="text-gold">purpose</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-paper/78">
              Urban Gang Tour is a Kenyan events company founded by Eugine Micah and Lucy Ogunde, running
              a youth talent search, mentorship, and awards concert programme. We move countrywide: high
              schools, universities, colleges, and large scale events. An independent company with its
              own crew and systems, where every stop airs on Urban News.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mx-auto w-full max-w-[380px] rotate-3 rounded-md bg-paper p-3 pb-10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/g/stage_1.jpg" alt="On stage" className="aspect-[3/3.4] w-full bg-surface object-cover" />
              <div className="mt-2.5 text-center font-marker text-[15px] text-ink">
                one day. one institution. everything changes.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10">
        <Reveal>
          <div className="mx-auto grid max-w-[1080px] grid-cols-[auto_1fr] gap-8">
            <div className="w-1.5 rounded-full" style={{ background: "linear-gradient(#C7238E, #F5A623)" }} />
            <div>
              <div className="font-display text-4xl uppercase">Our story</div>
              <p className="mt-3.5 text-[16.5px] leading-loose text-paper/80">
                Urban Gang Tour was born from a simple frustration: Kenya is overflowing with young talent
                that never gets a stage, a mentor, or a camera. So we built all three into one travelling
                machine. One day. One institution. Talent battles judged live, life skills pods that
                actually speak the language of young people, a modelling runway, an awards ceremony, and
                a broadcast on national TV through Urban News.
              </p>
              <div className="mt-4.5 -rotate-1 font-marker text-xl text-magenta">
                We are not a one off event company. We are a movement that keeps showing up.
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-7 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl p-9"
              style={{ background: "linear-gradient(150deg, #C7238E, #91186A)" }}
            >
              <div className="font-display text-[26px] text-[#FFD9EF]">Mission</div>
              <p className="mt-3 text-[16.5px] leading-relaxed text-paper">
                To discover, mentor, and platform young Kenyan talent through live events, life skills
                education, and national broadcast, turning raw potential into real purpose.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div
              className="relative overflow-hidden rounded-3xl p-9"
              style={{ background: "linear-gradient(150deg, #F5A623, #C97F0A)" }}
            >
              <div className="font-display text-[26px] text-[#4A2D00]">Vision</div>
              <p className="mt-3 text-[16.5px] font-medium leading-relaxed text-[#2E1C00]">
                To be Africa&apos;s leading youth talent and mentorship tour, where every young person, in
                every county, has a stage within reach.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-8 pt-16 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] uppercase">
              What makes us <span className="text-magenta">different</span>
            </h2>
          </Reveal>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DIFFERENTIATORS.map((d, i) => (
              <Reveal key={d.n} delay={i * 0.05}>
                <div className="rounded-2xl border border-dashed border-gold/45 bg-white/[0.04] p-6 transition-all duration-150 ease-out hover:-translate-y-1 hover:border-gold">
                  <div className="font-display text-[28px] text-gold">{d.n}</div>
                  <div className="mt-2 text-[15px] font-bold">{d.title}</div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-paper/68">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10">
        <Reveal>
          <div className="relative mx-auto grid max-w-[1080px] grid-cols-[auto_1fr] items-center gap-8 rounded-r-3xl border-l-4 border-gold bg-gold/[0.07] p-9 sm:p-11">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/p/eugine_3.jpg" alt="Eugine Micah" className="h-[130px] w-[130px] rounded-full border-4 border-magenta object-cover" />
            <div>
              <div className="text-[21px] font-medium leading-relaxed text-[#FFE9C7]">
                &quot;Every school we walk into, there is a star nobody has noticed yet. Our job is to make
                sure the whole country notices.&quot;
              </div>
              <div className="mt-3.5 font-bold text-gold">Eugine Micah</div>
              <div className="text-[13.5px] text-paper/60">Founder, Creative Director and Lead Host</div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-y-2 border-dashed border-magenta/40 bg-surface px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="-rotate-1 font-marker text-lg text-gold">the tour leaves more than memories</div>
            <div className="mt-1.5 font-display text-[clamp(1.9rem,4vw,2.6rem)] uppercase">
              Impact <span className="text-magenta">pillars</span>
            </div>
          </Reveal>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IMPACT_PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-150 ease-out hover:-translate-y-1"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: p.color }} />
                  <div className="mt-3.5 text-[16px] font-bold">{p.title}</div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-paper/68">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-5">
              {IMPACT_NUMBERS.map((n) => (
                <div key={n.label} className="border-r border-dashed border-white/15 p-2.5 text-center last:border-r-0">
                  <div className="font-display text-[34px] text-gold">{n.v}</div>
                  <div className="mt-1 text-[12px] uppercase tracking-wide text-paper/65">{n.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
          <Reveal>
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/p/eugine_4.jpg" alt="Eugine Micah" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 45%, rgba(21,14,19,0.95))" }} />
              <div className="absolute bottom-0 p-5.5">
                <div className="font-display text-2xl">EUGINE MICAH</div>
                <div className="text-[13.5px] font-semibold text-gold">Founder, Creative Director, Lead Host</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/p/lucy_portrait.jpg" alt="Lucy Ogunde" className="absolute inset-0 h-full w-full object-cover object-top" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 45%, rgba(21,14,19,0.95))" }} />
              <div className="absolute bottom-0 p-5.5">
                <div className="font-display text-2xl">LUCY OGUNDE</div>
                <div className="text-[13.5px] font-semibold text-gold">Founder, Co Host, Executive Producer</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <Link
              href="/the-gang"
              className="flex min-h-[320px] flex-col items-center justify-center gap-3.5 rounded-3xl border-2 border-dashed border-magenta/60 p-6 text-center transition-colors duration-150 hover:border-magenta hover:bg-magenta/[0.08]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/brand/logo_transparent.png" alt="" className="w-[110px]" />
              <div className="font-display text-[22px]">MEET THE FULL GANG</div>
              <p className="text-[13.5px] text-paper/65">
                A crew thirty to fifty strong. Hosts, DJs, dancers, models, medics, camera crews.
              </p>
            </Link>
          </Reveal>
        </div>
      </section>

      <section
        className="px-6 py-16 text-center sm:px-10"
        style={{ background: "linear-gradient(100deg, #C7238E, #F5A623)" }}
      >
        <Reveal>
          <div className="font-display text-[clamp(2rem,4vw,3.25rem)] uppercase text-paper">Impact needs partners.</div>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/partners" className="rounded-2xl bg-ink px-8 py-4 text-[15px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]">
              Partner With Us
            </Link>
            <Link href="/book" className="rounded-2xl bg-white/90 px-8 py-4 text-[15px] font-bold text-magenta transition-all duration-150 ease-out hover:bg-white active:scale-[0.97]">
              Bring the Tour to Your Institution
            </Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
