import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";

const title = "Partners";
const description = "Urban Gang Tour runs on a network of media, education, creative, and safety partners.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/partners" },
  openGraph: { title, description, url: "/partners", type: "website" },
};

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="px-6 pb-8 pt-20 text-center sm:px-10 sm:pt-28">
        <div
          className="mx-auto max-w-[760px]"
          style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.4), transparent 65%)" }}
        >
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">The power behind the tour</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">the gang behind the gang</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,6vw,5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              Our <span className="text-magenta">partners</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-relaxed text-paper/70">
              Urban Gang Tour runs on a network of media, education, creative, and safety partners. Each
              one owns a piece of the machine.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-7 sm:px-10">
        <Reveal>
          <div
            className="relative mx-auto max-w-[1280px] overflow-hidden rounded-3xl p-9 sm:p-12"
            style={{ background: "linear-gradient(120deg, #E61E8C 0%, #C7148A 55%, #2B9FE0 130%)" }}
          >
            <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-2">
              <div>
                <div className="inline-block rounded-full bg-ink px-[1.125rem] py-2 font-display text-[13px] tracking-wide text-paper">
                  THE POWER BEHIND THE TOUR
                </div>
                <div className="mt-3.5 font-display text-[clamp(2.1rem,4vw,3.4rem)] uppercase leading-[1.02] text-paper">
                  Urban Gang Tour
                </div>
                <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/92">
                  Urban Gang Tour is an events company founded by Eugine Micah and Lucy Ogunde, powered
                  by its own crew and close creative partners, including Hype Ola of The Experience Hub,
                  Jeff Ashton of Ashton Sounds, and Esther Wambui Gakunju of Synapse Models. The tour
                  operates as its own company with its own rights, and everything it captures airs
                  nationally through{" "}
                  <Link href="/urban-news" className="font-bold text-[#FFE9C7] underline">
                    Urban News
                  </Link>
                  , with reach of up to 8 million viewers. Tour camera crews are on the ground at every
                  stop.
                </p>
                <div className="mt-5 flex flex-wrap gap-4">
                  {[
                    { v: "8M+", label: "Potential viewers" },
                    { v: "Every stop", label: "Broadcast on Urban News" },
                    { v: "2 crews", label: "George Morgan, Tony Lallez" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-black/25 px-5 py-3.5">
                      <div className="font-display text-[26px] text-paper">{stat.v}</div>
                      <div className="text-[11.5px] tracking-wide text-white/80">{stat.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="-rotate-2 rounded-3xl bg-paper p-9 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/brand/logo_horizontal.png" alt="Urban Gang Tour" className="w-[260px]" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-6 pb-6 pt-4 sm:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6">
          <Reveal>
            <PartnerFeature
              accent="#FF5A5A"
              accentBg="rgba(255,90,90,0.15)"
              accentText="#FF8A8A"
              border="rgba(255,72,72,0.35)"
              bg="#19090C"
              name="Vibes Studios"
              badge="Official videography partner"
              body="Every frame you see from the tour passes through Vibes. The Vibes Studios team captures every battle, every crowning, and every crowd eruption, ground footage that feeds Urban News and every social platform."
              tags={[{ label: "Official tour videography" }]}
              ig="the_vibestudios"
              images={["/assets/pt/vibes_1.jpg", "/assets/pt/vibes_2.jpg", "/assets/pt/vibes_3.jpg"]}
            />
          </Reveal>

          <Reveal delay={0.05}>
            <PartnerFeature
              accent="#C77DFF"
              accentBg="rgba(176,38,255,0.15)"
              accentText="#C77DFF"
              border="rgba(176,38,255,0.35)"
              bg="#130A18"
              name="Synapse Models"
              badge="Modelling and pageantry partner"
              body={
                <>
                  The red carpet, the T shaped runway, and the Mrs/Miss of the Institution pageant are
                  all directed by Synapse. Led by <b className="text-paper">Esther Wambui Gakunju</b>,
                  Head of Modelling and Pageantry, Synapse runs all four runway sub categories and coaches
                  student models from first walk to crowning.
                </>
              }
              tags={[{ label: "Esther Wambui Gakunju, Head" }]}
              ig="synapsemodels"
              images={["/assets/pt/synapse_3.jpg", "/assets/pt/synapse_1.jpg", "/assets/p/esther_wambui.jpg"]}
              imagesFirst
            />
          </Reveal>

          <Reveal delay={0.1}>
            <PartnerFeature
              accent="#fff"
              accentBg="rgba(255,255,255,0.12)"
              accentText="#fff"
              border="rgba(255,255,255,0.25)"
              bg="#101010"
              name="The Experience Hub"
              badge="Entertainment partner"
              body={
                <>
                  Hype sets, dancers, MCs, and crowd energy across the tour. Led by{" "}
                  <b className="text-paper">Hype Ola</b>, Lead Hype, the Hub brings 5+ dancers and a 30
                  strong energy unit to every stop and turns any crowd into participants.
                </>
              }
              tags={[{ label: "Hype Ola, Lead Hype" }]}
              ig="theexperiencehubke_"
              images={["/assets/pt/experience_hub.png", "/assets/pt/xphub_team.jpg"]}
              logoTile
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Reveal delay={0.05}>
              <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "rgba(220,40,40,0.4)", background: "#1A0B0B" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/pt/moyo_2.jpg" alt="Moyo Response team" loading="lazy" className="h-[190px] w-full object-cover" />
                <div className="p-6">
                  <div className="font-display text-[22px] text-[#FF6B6B]">Moyo Response</div>
                  <div className="mt-1 text-[11px] font-bold tracking-wide text-[#FF9C9C]">SAFETY AND FIRST AID PARTNER</div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper/72">
                    On site emergency response and first aid coverage at every single event. If 1,000
                    students are jumping, Moyo is standing by.
                  </p>
                  <a href="https://instagram.com/moyo_response" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] font-bold text-[#FF6B6B]">
                    @moyo_response
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "rgba(46,125,50,0.5)", background: "#0B140C" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/g/event_8.jpg" alt="Tree planting with Delo Greens" className="h-[190px] w-full object-cover" />
                <div className="p-6">
                  <div className="font-display text-[22px] text-[#5BD96A]">Delo Greens Movement</div>
                  <div className="mt-1 text-[11px] font-bold tracking-wide text-[#8FE89A]">ENVIRONMENTAL PARTNER</div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper/72">
                    Founded and led by CEO <b className="text-paper">Justus (TAE)</b>, championing tree
                    planting and environmental action with young audiences at every stop.
                  </p>
                  <div className="mt-3 text-[13px] font-bold text-[#5BD96A]">Trees planted at every school</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "rgba(245,166,35,0.45)", background: "#161007" }}>
                <div
                  className="flex h-[190px] items-center justify-center"
                  style={{ background: "linear-gradient(140deg, #F5A623, #8A5A00)" }}
                >
                  <div className="-rotate-3 font-display text-[36px] text-black/75">ASHTON</div>
                </div>
                <div className="p-6">
                  <div className="font-display text-[22px] text-gold">Ashton Sounds</div>
                  <div className="mt-1 text-[11px] font-bold tracking-wide text-[#FFC96B]">STAGE AND SOUND PARTNER</div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-paper/72">
                    Professional stage and sound production for tour events, owned and headed by{" "}
                    <b className="text-paper">Jeff Ashton</b>, the engine behind the rig at every stop.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Reveal>
              <div className="rounded-3xl border p-8" style={{ borderColor: "rgba(60,130,246,0.4)", background: "#0B1018" }}>
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl text-paper"
                    style={{ background: "linear-gradient(140deg, #3C82F6, #1D4ED8)" }}
                  >
                    T
                  </div>
                  <div>
                    <div className="font-display text-2xl text-[#7EB0FF]">TIBS College</div>
                    <div className="text-[11px] font-bold tracking-wide text-[#A9C8FF]">INSTITUTIONAL MEDIA PARTNER</div>
                  </div>
                </div>
                <p className="mt-3.5 text-[14px] leading-relaxed text-paper/72">
                  Active sponsorship partner. TIBS journalism and media students join the tour as content
                  creators through the <b className="text-paper">TIBS Media Lab</b> activation, real
                  events, real portfolios. Eugine Micah is a TIBS Valedictorian, Class of 2024.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="rounded-3xl border p-8" style={{ borderColor: "rgba(212,175,55,0.4)", background: "#15110A" }}>
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl text-paper"
                    style={{ background: "linear-gradient(140deg, #D4AF37, #8A6D1D)" }}
                  >
                    HB
                  </div>
                  <div>
                    <div className="font-display text-2xl text-[#E8CC6E]">Hewitt and Bennet</div>
                    <div className="text-[11px] font-bold tracking-wide text-[#F0DC9A]">STRATEGIC BRAND PARTNER 2026</div>
                  </div>
                </div>
                <p className="mt-3.5 text-[14px] leading-relaxed text-paper/72">
                  Hewitt and Bennet International College rides with the tour as Brand Ambassador
                  partner, holding the education category presence across every 2026 stop.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        className="mt-12 px-6 py-16 text-center sm:px-10"
        style={{ background: "linear-gradient(100deg, #C7238E, #F5A623)" }}
      >
        <Reveal>
          <div className="font-display text-[clamp(1.9rem,3.8vw,3rem)] uppercase text-paper">There is a seat at this table.</div>
          <p className="mt-2.5 text-[15px] text-white/90">Media houses, agencies, colleges, brands, and institutions.</p>
          <a
            href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20to%20start%20a%20partnership%20conversation."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-2xl bg-ink px-8 py-4 text-[15.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]"
          >
            Start a Partnership Conversation
          </a>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}

function PartnerFeature({
  accentBg,
  accentText,
  border,
  bg,
  name,
  badge,
  body,
  tags,
  ig,
  images,
  imagesFirst,
  logoTile,
}: {
  accent: string;
  accentBg: string;
  accentText: string;
  border: string;
  bg: string;
  name: string;
  badge: string;
  body: React.ReactNode;
  tags: { label: string }[];
  ig: string;
  images: string[];
  imagesFirst?: boolean;
  logoTile?: boolean;
}) {
  const textBlock = (
    <div className="p-9 sm:p-11">
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-display text-[30px] uppercase" style={{ color: accentText }}>
          {name}
        </div>
        <div className="rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide" style={{ background: accentBg, color: accentText }}>
          {badge.toUpperCase()}
        </div>
      </div>
      <div className="mt-3 text-[15px] leading-relaxed text-paper/75">{body}</div>
      <div className="mt-[1.125rem] flex flex-wrap gap-2.5">
        {tags.map((t) => (
          <div key={t.label} className="rounded-full bg-white/[0.06] px-4 py-2 text-[13px] font-semibold">
            {t.label}
          </div>
        ))}
        <a
          href={`https://instagram.com/${ig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-4 py-2 text-[13px] font-bold transition-colors duration-150"
          style={{ background: accentBg, color: accentText }}
        >
          @{ig}
        </a>
      </div>
    </div>
  );

  const imageBlock = logoTile ? (
    <div className="grid min-h-[280px] grid-cols-2 gap-1">
      <div className="flex items-center justify-center bg-paper p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={name} loading="lazy" className="w-4/5 max-w-[200px]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[1]} alt={`${name} team`} className="h-full w-full object-cover" />
    </div>
  ) : (
    <div className="grid min-h-[280px] grid-cols-2 gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[0]} alt={name} loading="lazy" className="h-full w-full object-cover" />
      <div className="grid grid-rows-2 gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[1]} alt="" loading="lazy" className="h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[2]} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    </div>
  );

  return (
    <div
      className="grid grid-cols-1 overflow-hidden rounded-3xl border lg:grid-cols-2"
      style={{ borderColor: border, background: bg }}
    >
      {imagesFirst ? (
        <>
          {imageBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {imageBlock}
        </>
      )}
    </div>
  );
}
