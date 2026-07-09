import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import { SCHOOL_GETS, BOOKING_STEPS, CAMPUS_GETS, PLUG_INS, SPONSOR_TIERS, MEGA_FORMATS } from "@/content/book";

const title = "Work With Us — Book the Tour";
const description = "Bring Urban Gang Tour to your school, campus, or brand activation. Every booking is quoted for your numbers and calendar.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/book" },
  openGraph: { title, description, url: "/book", type: "website" },
};

const WA = (text: string) => `https://wa.me/254799886247?text=${encodeURIComponent(text)}`;

export default function BookPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-magenta">
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 text-center sm:px-10">
        <div className="mx-auto max-w-[820px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">WORK WITH US</div>
            <h1 className="mt-4 font-display text-[clamp(40px,6.2vw,80px)] uppercase leading-[0.92] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              Book The <span className="rounded border-[3px] border-ink bg-cyan px-2.5">Tour</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[620px] text-[16.5px] font-medium leading-relaxed text-white">
              Four ways in. Every booking is quoted for your numbers and your calendar. Rates are
              negotiable and we work with institutions of every size.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="#schools" className="rounded-full border-2 border-ink bg-white px-6 py-3 text-[14px] font-bold">Schools</a>
              <a href="#campus" className="rounded-full border-2 border-ink bg-gold px-6 py-3 text-[14px] font-bold">Campus XP</a>
              <a href="#brands" className="rounded-full border-2 border-ink bg-cyan px-6 py-3 text-[14px] font-bold">Brands &amp; Sponsors</a>
              <a href="#mega" className="rounded-full border-2 border-ink bg-ink px-6 py-3 text-[14px] font-bold text-white">Mega Events</a>
            </div>
          </Reveal>
        </div>
      </div>

      <div id="schools" className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="inline-block -rotate-1 rounded-full border-2 border-ink bg-magenta px-4 py-2 font-display text-[13px] uppercase text-white">
              Lane 01, for schools
            </div>
            <h2 className="mt-3.5 font-display text-[clamp(28px,4vw,44px)] uppercase leading-[1.02]">
              Your school. <span className="text-magenta">Their stage.</span>
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink/75">
              A full day talent, mentorship, and awards takeover for your students, ending with a national
              TV feature.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SCHOOL_GETS.map((g) => (
                <div key={g} className="flex gap-2.5 text-[14px] font-medium leading-relaxed text-ink/85">
                  <span className="font-bold text-magenta">+</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={WA("Hi UGT, I want to bring the tour to our school.")} target="_blank" rel="noopener noreferrer" className="rounded-xl border-[3px] border-ink bg-magenta px-6 py-3.5 text-[14px] font-bold text-white shadow-[4px_4px_0_#111]">
                Request a Quotation, WhatsApp
              </a>
              <a href="/contact-us" className="rounded-xl border-2 border-ink px-6 py-3.5 text-[14px] font-bold">
                Use the Form
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mx-auto max-w-[380px] -rotate-2 rounded border-2 border-ink/15 bg-white p-2.5 pb-7 shadow-[0_16px_30px_rgba(17,17,17,0.3)]">
              <img src="/assets/g/stage_12.jpg" alt="School crowd" className="aspect-[4/3.4] w-full object-cover" />
              <div className="mt-2 text-center font-marker text-[14px]">your students. their stage.</div>
            </div>
            <div className="mt-6 rounded-2xl border-2 border-dashed border-ink/30 bg-concrete p-5">
              <div className="font-display text-[15px] text-magenta">How it works</div>
              <div className="mt-3 flex flex-col gap-3">
                {BOOKING_STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-ink bg-magenta font-display text-[12px] text-white">
                      {s.n}
                    </div>
                    <div className="text-[13px] font-medium leading-relaxed text-ink/80">
                      <b className="text-ink">{s.t}</b> {s.b}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div id="campus" className="border-b-4 border-ink bg-gold px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="mx-auto max-w-[380px] rotate-2 rounded border-2 border-ink/15 bg-white p-2.5 pb-7 shadow-[0_16px_30px_rgba(17,17,17,0.3)]">
              <img src="/assets/g/stage_11.jpg" alt="Campus" className="aspect-square w-full object-cover" />
              <div className="mt-2 text-center font-marker text-[14px]">the tour, fully grown</div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="inline-block rotate-1 rounded-full border-2 border-ink bg-white px-4 py-2 font-display text-[13px] uppercase">
              Lane 02, universities and colleges
            </div>
            <h2 className="mt-3.5 font-display text-[clamp(28px,4vw,44px)] uppercase leading-[1.02]">
              Campus <span className="text-magenta">XP</span>
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-ink/75">
              High school built the movement. Campus is where it gets loud. A professional stage, national
              TV exposure, and direct access to brands and industry mentors.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CAMPUS_GETS.map((g) => (
                <div key={g} className="rounded-xl border-2 border-ink/15 bg-white p-3.5 text-[13.5px] font-medium leading-relaxed">
                  {g}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-r-xl border-l-4 border-ink bg-white p-5 text-[13.5px] font-medium leading-relaxed">
              <b>The student creator angle:</b> media, journalism, and communication students work
              alongside our crew as content creators, presenters, and production assistants, with formal
              recognition for their portfolios.
            </div>
            <a href={WA("Hi UGT, I am interested in a Campus XP event.")} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-xl border-[3px] border-ink bg-ink px-6 py-3.5 text-[14px] font-bold text-gold shadow-[4px_4px_0_#E6218C]">
              Book a Campus XP Consultation
            </a>
          </Reveal>
        </div>
      </div>

      <div id="brands" className="border-b-4 border-ink bg-white px-6 py-16 text-center sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="inline-block -rotate-1 rounded-full border-2 border-ink bg-concrete px-4 py-2 font-display text-[13px] uppercase">
              Lane 03, for brands and sponsors
            </div>
            <h2 className="mx-auto mt-3.5 max-w-3xl font-display text-[clamp(24px,4vw,40px)] uppercase leading-[1.05]">
              Your brand, in front of Kenya&apos;s youth. <span className="text-magenta">Live and on air.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] font-medium leading-relaxed text-ink/70">
              On stage, on camera, on certificates, and in the hands of thousands of students, with
              broadcast reach across Urban News.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PLUG_INS.map((p) => (
                <div key={p} className="rounded-xl border-2 border-ink/15 bg-concrete p-4 text-left text-[13.5px] font-semibold transition-all duration-150 ease-out hover:-translate-y-1 hover:border-magenta">
                  {p}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {SPONSOR_TIERS.map((t) => (
                <div key={t.name} className="rounded-2xl border-[3px] border-ink p-5 text-left shadow-[4px_4px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1.5" style={{ background: t.gradient, color: t.fg }}>
                  <div className="font-display text-[16px] tracking-wide">{t.name}</div>
                  <div className="mt-2 text-[12.5px] leading-relaxed opacity-90">{t.body}</div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-7">
              <div className="text-[13px] text-ink/60">Every package is tailored. Details on request.</div>
              <a href={WA("Hi UGT, I want to discuss a sponsorship.")} target="_blank" rel="noopener noreferrer" className="mt-3.5 inline-block rounded-xl border-[3px] border-ink bg-magenta px-7 py-3.5 text-[14px] font-bold text-white shadow-[4px_4px_0_#111]">
                Request the Sponsor Catalogue
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <div id="mega" className="bg-ink px-6 py-16 text-center sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <Reveal>
            <div className="inline-block rotate-1 rounded-full border-2 border-white bg-magenta px-4 py-2 font-display text-[13px] uppercase text-white">
              Lane 04, mega events and festivals
            </div>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(26px,4.6vw,48px)] uppercase leading-[1.03] text-white">
              We do not just attend big events. <span className="text-gold">We power them.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-white/80">
              A full production unit for festivals, expos, county celebrations, corporate fun days, and
              national youth activations. We arrive as one unit with our own crew and our own media
              machine.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {MEGA_FORMATS.map((f) => (
                <div key={f} className="rounded-full border-2 border-white/30 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white">
                  {f}
                </div>
              ))}
            </div>
            <a href={WA("Hi UGT, I am planning a large event and want to talk production.")} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block rounded-xl border-[3px] border-gold bg-magenta px-8 py-4 text-[14.5px] font-bold text-white shadow-[6px_6px_0_rgba(255,212,0,0.4)]">
              Talk to Us About Your Event
            </a>
          </Reveal>
        </div>
      </div>

      <Footer />
    </div>
  );
}
