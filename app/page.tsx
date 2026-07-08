import type { Metadata } from "next";
import Link from "next/link";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";
import VideoHero from "./_components/VideoHero";
import Reveal from "./_components/Reveal";
import BuyButton from "./_components/BuyButton";
import { BLOG_POSTS } from "@/content/blog";
import { TICKET_EVENTS } from "@/content/catalog";

const title = "Urban Gang Tour — Kenya's Touring Youth Festival";
const description =
  "Urban Gang Tour produces live touring festivals, talent search battles, mentorship programs, and broadcast content across Kenya. Founded by Eugine Micah and Lucy Ogunde.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", type: "website" },
};

const PILLARS = [
  {
    name: "Live Tours & Festivals",
    detail:
      "Full-scale touring productions: main-stage talent battles, a live runway, and a festival build that lands and strikes in a day.",
  },
  {
    name: "Broadcast & Content",
    detail:
      "Every stop is filmed and cut for Urban News on Urban Gang Tour, plus short-form content built for reach on Instagram, TikTok, and YouTube.",
  },
  {
    name: "Talent & Artiste Management",
    detail:
      "We scout, develop, and book talent from our own tour stops: musicians, MCs, dancers, and models who go on to work with our partner brands.",
  },
  {
    name: "Brand Activations & Sponsorship",
    detail:
      "Structured activation formats for brands who want direct access to Kenya's youth market at scale, with measurable reach per stop.",
  },
];

const PARTNERS = [
  "The Experience Hub",
  "Ashton Sounds",
  "Synapse Models",
  "Vibes Studios",
  "Moyo Response",
  "Delo Greens Movement",
];

export default function HomePage() {
  const nextEvent = TICKET_EVENTS[0];
  const recentPosts = BLOG_POSTS.slice(0, 3);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />
      <VideoHero />

      <section className="border-y border-white/10 bg-surface py-10">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-10">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 text-[13px] font-semibold uppercase tracking-wide text-paper/50">
            <span className="text-paper/30">Recent stops</span>
            {["Senior Chief Koinange Girls", "Loreto Kiambu Girls", "PCEA Gituamba Girls"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-10">
          <Reveal>
            <div className="max-w-2xl">
              <div className="inline-flex -rotate-1 rounded-full bg-ink px-4 py-1.5 shadow-magenta">
                <span className="font-display text-[11px] uppercase tracking-wide text-gold">What We Build</span>
              </div>
              <h2 className="mt-5 text-balance font-display text-[clamp(2rem,4.5vw,3.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
                One company, the full production
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-paper/65">
                Urban Gang Tour runs the tour, the cameras, the talent, and the brand deal that pays for
                all of it. Everything under one roof, one crew, one calendar.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.06} className="bg-ink p-9 sm:p-11">
                <div className="font-display text-[22px] uppercase leading-tight tracking-[-0.02em]">{p.name}</div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-paper/60">{p.detail}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {nextEvent && (
        <section className="py-20">
          <div className="mx-auto max-w-[1440px] px-6 sm:px-10">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-gradient-to-br from-magenta-deep via-magenta to-magenta-bright p-10 sm:flex-row sm:items-center sm:p-14">
                <div>
                  <div className="font-display text-[11px] uppercase tracking-wide text-paper/70">Now Booking</div>
                  <div className="mt-3 max-w-md text-balance font-display text-[clamp(1.75rem,3.5vw,2.75rem)] uppercase leading-[0.98] tracking-[-0.03em] text-paper">
                    {nextEvent.name}
                  </div>
                  <div className="mt-2 text-[15px] text-paper/80">{nextEvent.dateLabel}</div>
                </div>
                <BuyButton
                  className="shrink-0 rounded-full bg-ink px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
                  item={{
                    kind: "ticket",
                    eventKey: nextEvent.key,
                    itemKey: nextEvent.ticketTypes[0].key,
                    name: `${nextEvent.name} - ${nextEvent.ticketTypes[0].name}`,
                    priceKes: nextEvent.ticketTypes[0].priceKes,
                  }}
                >
                  Get Tickets, KES {nextEvent.ticketTypes[0].priceKes.toLocaleString("en-KE")}
                </BuyButton>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-10">
          <Reveal>
            <div className="text-center font-display text-[11px] uppercase tracking-wide text-paper/40">
              Trusted by
            </div>
          </Reveal>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
            {PARTNERS.map((p, i) => (
              <Reveal key={p} delay={i * 0.04}>
                <span className="font-display text-[15px] uppercase tracking-wide text-paper/45">{p}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-24 sm:py-32">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-10">
          <Reveal>
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-balance font-display text-[clamp(2rem,4.5vw,3.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
                From the newsroom
              </h2>
              <Link href="/blog" className="hidden shrink-0 text-[14px] font-bold text-gold sm:block">
                All stories
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {recentPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.08}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.img}
                      alt={post.title}
                      loading="lazy"
                      className="h-56 w-full bg-surface object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 text-[12.5px] font-semibold uppercase tracking-wide text-paper/45">
                    {post.dateLabel}
                  </div>
                  <div className="mt-2 font-display text-[20px] uppercase leading-tight tracking-[-0.02em] group-hover:text-gold">
                    {post.title}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-2xl px-6 sm:px-10">
          <Reveal>
            <h2 className="text-balance font-display text-[clamp(2rem,5vw,4rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              Bring the tour to your institution
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-paper/65">
              Schools, campuses, and brands: tell us the date and the ground, and we build the rest.
            </p>
            <Link
              href="/book"
              className="mt-8 inline-block rounded-full bg-magenta px-10 py-4 text-[14px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
            >
              Start a Booking
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
