import type { Metadata } from "next";
import Image from "next/image";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { SCHOOL_GETS, BOOKING_STEPS, CAMPUS_GETS, PLUG_INS, SPONSOR_TIERS, MEGA_FORMATS } from "@/content/book";

const title = "Book the Tour";
const description =
  "Bring Urban Gang Tour to your school, campus, or brand activation. Every booking is quoted for your numbers and calendar.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/book" },
  openGraph: { title, description, url: "/book", type: "website" },
};

const WA = (text: string) => `https://wa.me/254799886247?text=${encodeURIComponent(text)}`;

export default function BookPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-ink text-paper">
      <Nav />

      <section className="px-6 pb-12 pt-20 text-center sm:px-10 sm:pt-28">
        <div
          className="mx-auto max-w-[820px]"
          style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.4), transparent 65%)" }}
        >
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Let&apos;s talk</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">we are always booking</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.9rem,6.2vw,5.5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              Book the <span className="text-magenta">tour</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[620px] text-[16px] leading-relaxed text-paper/70">
              Four ways in. Every booking is quoted for your numbers and your calendar. Rates are
              negotiable and we work with institutions of every size.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#schools" className="rounded-full border-2 border-magenta bg-magenta/15 px-6 py-3 text-[14px] font-bold text-paper transition-colors duration-150 hover:bg-magenta">Schools</a>
              <a href="#campus" className="rounded-full border-2 border-gold bg-gold/10 px-6 py-3 text-[14px] font-bold text-paper transition-colors duration-150 hover:bg-gold hover:text-ink">Campus XP</a>
              <a href="#brands" className="rounded-full border-2 border-white/60 bg-white/[0.06] px-6 py-3 text-[14px] font-bold text-paper transition-colors duration-150 hover:bg-white hover:text-ink">Brands and Sponsors</a>
              <a href="#mega" className="rounded-full border-2 border-[#E61E8C] bg-[#E61E8C]/10 px-6 py-3 text-[14px] font-bold text-paper transition-colors duration-150 hover:bg-[#E61E8C]">Mega Events</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="schools" className="px-6 pb-16 pt-14 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-11 lg:grid-cols-2">
          <Reveal>
            <div className="inline-block -rotate-1 rounded-full bg-magenta px-[1.125rem] py-2 font-display text-[13px] uppercase tracking-wide text-paper">
              Lane 01, for schools
            </div>
            <h2 className="mt-3.5 text-balance font-display text-[clamp(2.1rem,4vw,3.4rem)] uppercase leading-[1.02]">
              Your school. <span className="text-magenta">Their stage.</span>
            </h2>
            <p className="mt-3.5 text-[15.5px] leading-relaxed text-paper/75">
              A full day talent, mentorship, and awards takeover for your students, ending with a
              national TV feature.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              {SCHOOL_GETS.map((g) => (
                <div key={g} className="flex gap-3 text-[14.5px] leading-relaxed text-paper/85">
                  <span className="font-bold text-gold">+</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={WA("Hi UGT, I want to bring the tour to our school.")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-magenta px-6 py-3.5 text-[14.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
              >
                Request a Quotation, WhatsApp
              </a>
              <a
                href="/contact-us"
                className="rounded-xl border-2 border-white/50 px-6 py-3.5 text-[14.5px] font-bold text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
              >
                Use the Form
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mx-auto max-w-[420px] -rotate-2 rounded-md bg-paper p-3 pb-9 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              <div className="relative aspect-[4/3.4] w-full overflow-hidden bg-surface">
                <Image src="/assets/g/stage_12.jpg" alt="School crowd" fill sizes="(max-width: 640px) 90vw, 420px" className="object-cover" />
              </div>
              <div className="mt-2.5 text-center font-marker text-[15px] text-ink">your students. their stage.</div>
            </div>
            <div className="mt-7 rounded-2xl border border-dashed border-gold/50 bg-white/[0.03] p-6">
              <div className="font-display text-[16px] text-gold">How it works</div>
              <div className="mt-3 flex flex-col gap-3.5">
                {BOOKING_STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-3.5">
                    <div className="flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full bg-magenta font-display text-[13px] text-paper">
                      {s.n}
                    </div>
                    <div className="text-[13.5px] leading-relaxed text-paper/80">
                      <b className="text-paper">{s.t}</b> {s.b}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="campus" className="border-y-2 border-dashed border-gold/30 bg-surface px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-11 lg:grid-cols-2">
          <Reveal>
            <div className="mx-auto max-w-[420px] rotate-2 rounded-md bg-paper p-3 pb-9 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              <div className="relative aspect-square w-full overflow-hidden bg-surface-raised">
                <Image src="/assets/g/stage_11.jpg" alt="Campus" fill sizes="(max-width: 640px) 90vw, 420px" className="object-cover" />
              </div>
              <div className="mt-2.5 text-center font-marker text-[15px] text-ink">the tour, fully grown</div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="inline-block rotate-1 rounded-full bg-gold px-[1.125rem] py-2 font-display text-[13px] uppercase tracking-wide text-ink">
              Lane 02, universities and colleges
            </div>
            <h2 className="mt-3.5 text-balance font-display text-[clamp(2.1rem,4vw,3.4rem)] uppercase leading-[1.02]">
              Campus <span className="text-gold">XP</span>
            </h2>
            <p className="mt-3.5 text-[15.5px] leading-relaxed text-paper/75">
              High school built the movement. Campus is where it gets loud. A professional stage,
              national TV exposure, and direct access to brands and industry mentors.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CAMPUS_GETS.map((g) => (
                <div key={g} className="rounded-xl bg-white/[0.04] p-3.5 text-[13.5px] leading-relaxed text-paper/85">
                  {g}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-r-xl border-l-4 border-gold bg-gold/[0.08] p-5 text-[14px] leading-relaxed text-[#FFE9C7]">
              <b>The student creator angle:</b> media, journalism, and communication students work
              alongside our crew as content creators, presenters, and production assistants, with formal
              recognition for their portfolios. Your students do not just attend the event. They help
              make it.
            </div>
            <a
              href={WA("Hi UGT, I am interested in a Campus XP event.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block rounded-xl bg-gold px-6 py-3.5 text-[14.5px] font-bold text-ink transition-all duration-150 ease-out hover:bg-gold-bright active:scale-[0.97]"
            >
              Book a Campus XP Consultation
            </a>
          </Reveal>
        </div>
      </section>

      <section id="brands" className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1280px] text-center">
          <Reveal>
            <div className="inline-block -rotate-1 rounded-full bg-paper px-[1.125rem] py-2 font-display text-[13px] uppercase tracking-wide text-ink">
              Lane 03, for brands and sponsors
            </div>
            <h2 className="mx-auto mt-3.5 max-w-3xl text-balance font-display text-[clamp(2rem,4vw,3.2rem)] uppercase leading-[1.05]">
              Your brand, in front of Kenya&apos;s youth. <span className="text-magenta">Live and on air.</span>
            </h2>
            <p className="mx-auto mt-3.5 max-w-2xl text-[15.5px] leading-relaxed text-paper/70">
              On stage, on camera, on certificates, and in the hands of thousands of students, with
              broadcast reach of up to 8 million viewers via Urban News.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-9 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {PLUG_INS.map((p) => (
                <div key={p} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all duration-150 ease-out hover:-translate-y-1 hover:border-magenta">
                  <div className="font-semibold text-[14px] leading-tight text-paper">{p}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {SPONSOR_TIERS.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl p-6 text-left transition-transform duration-150 ease-out hover:-translate-y-1.5"
                  style={{ background: t.gradient, color: t.fg }}
                >
                  <div className="font-display text-[17px] tracking-wide">{t.name}</div>
                  <div className="mt-2.5 text-[13px] leading-relaxed opacity-90">{t.body}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8">
              <div className="text-[13.5px] text-paper/60">Every package is tailored. Details on request.</div>
              <a
                href={WA("Hi UGT, I want to discuss a sponsorship.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-xl bg-paper px-7 py-3.5 text-[14.5px] font-bold text-magenta transition-all duration-150 ease-out hover:-translate-y-0.5"
              >
                Request the Sponsor Catalogue
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="mega" className="relative mt-4 overflow-hidden">
        <Image src="/assets/g/stage_2.jpg" alt="" fill sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #150E13, rgba(21,14,19,0.75) 30%, #150E13)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 py-24 text-center sm:px-10">
          <Reveal>
            <div className="inline-block rotate-1 rounded-full bg-[#E61E8C] px-[1.125rem] py-2 font-display text-[13px] uppercase tracking-wide text-paper">
              Lane 04, mega events and festivals
            </div>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-[clamp(2.1rem,4.6vw,3.75rem)] uppercase leading-[1.03]">
              We do not just attend big events. <span className="text-gold">We power them.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15.5px] leading-relaxed text-paper/80">
              A full production unit for festivals, expos, county celebrations, corporate fun days, and
              national youth activations. We arrive as one unit with our own crew, our own systems, and
              our own media machine. You get a plug and play youth experience with a national TV tail,
              not a vendor list to manage.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {MEGA_FORMATS.map((f) => (
                <div key={f} className="rounded-full border border-white/20 bg-white/[0.07] px-5 py-2.5 text-[13.5px] font-semibold text-paper">
                  {f}
                </div>
              ))}
            </div>
            <a
              href={WA("Hi UGT, I am planning a large event and want to talk production.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-block rounded-2xl bg-[#E61E8C] px-8 py-4 text-[15px] font-bold text-paper shadow-[0_14px_36px_rgba(230,30,140,0.4)] transition-all duration-150 ease-out hover:bg-[#FF3FA8] active:scale-[0.97]"
            >
              Talk to Us About Your Event
            </a>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
