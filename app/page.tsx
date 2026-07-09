import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";
import Reveal from "./_components/Reveal";
import BuyButton from "./_components/BuyButton";
import TypedWord from "./_components/TypedWord";
import CountdownStrip from "./_components/CountdownStrip";
import { BLOG_POSTS } from "@/content/blog";
import { TICKET_EVENTS } from "@/content/catalog";
import { NEXT_STOP, COMPLETED_STOPS } from "@/content/tour";
import { MERCH_PRODUCTS } from "@/content/merch";
import { LEADERSHIP, OPERATIONS_CREW } from "@/content/team";

const title = "Urban Gang Tour — Where the Culture Gets Made";
const description =
  "Urban Gang Tour is Kenya's youth talent search, mentorship, and awards concert tour. Showcasing and awarding youth talent while curating unforgettable experiences and festivals for young people, live and on the national screen.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", type: "website" },
};

const DIVISIONS = [
  { title: "Live", card: "bg-gold", desc: "Festivals, concerts, awards, showcases, campus takeovers. Built to broadcast standard, run first light to final pack-down." },
  { title: "Broadcast", card: "bg-cyan", desc: "We make television and we host it. Every stage feeds the national screen through Urban News on PPP TV Kenya." },
  { title: "Content", card: "bg-white", desc: "We shoot it, cut it, and send it everywhere. The reels, the recaps, the moments that travel far past the room." },
  { title: "Talent", card: "bg-gold", desc: "We find it, back it, and put it in front of the country. Urban Gang Tour is a launchpad, and everyone is watching." },
  { title: "Culture", card: "bg-cyan", desc: "Urban Gang Merch. What you wear from us says you were there when it happened." },
];

const AUDIENCES = [
  { n: "01", title: "Brands", desc: "The audience everyone is chasing is already in front of us. We put your name inside the moment.", href: "/book#brands" },
  { n: "02", title: "Institutions", desc: "Universities, corporates, government. The message lands hardest from inside the culture, not above it.", href: "/book#brands" },
  { n: "03", title: "Campuses", desc: "The tour, fully grown. Bigger stage, bigger sound, broadcast-ready, career-connected.", href: "/book#campus" },
  { n: "04", title: "Schools", desc: "The biggest day of the year, on the national screen, planned to the minute with the administration.", href: "/book#schools" },
];

const PARTNERS_LOOP = [
  "The Experience Hub", "Ashton Sounds", "Synapse Models", "Vibes Studios", "Moyo Response", "Delo Greens Movement", "TIBS College", "Hewitt & Bennet",
];

const HEADLINERS = [...LEADERSHIP.map((p) => ({ name: p.name, role: p.role, img: p.img })), ...OPERATIONS_CREW.slice(0, 4).filter((m) => m.img).map((m) => ({ name: m.name, role: m.role, img: m.img! }))];

function nextStopTarget() {
  const monthMap: Record<string, number> = { JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5, JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11 };
  const [monthName, year] = NEXT_STOP.month.split(" ");
  const m = monthMap[monthName.toUpperCase()] ?? 0;
  return new Date(Number(year), m, Number(NEXT_STOP.day), 9, 0, 0).getTime();
}

export default function HomePage() {
  const nextEvent = TICKET_EVENTS[0];
  const recentPosts = BLOG_POSTS.slice(0, 3);
  const target = nextStopTarget();

  return (
    <div className="min-h-screen bg-magenta">
      <Nav />

      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="relative min-h-[86vh]">
          <Image src="/assets/g/stage_9.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(100deg, rgba(230,33,140,.85) 20%, rgba(230,33,140,.55) 70%, rgba(230,33,140,.35))" }}
          />
          <div className="relative mx-auto flex min-h-[86vh] max-w-[1320px] items-center px-6 py-16 sm:px-10">
            <Reveal className="max-w-2xl">
              <div className="inline-flex -rotate-2 items-center gap-2 rounded-full border-2 border-white bg-ink px-4 py-2 font-sans text-[12px] font-bold uppercase tracking-[0.1em] text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-live" /> Live &amp; On Air · PPP TV Kenya
              </div>
              <h1 className="mt-5 font-display text-[clamp(48px,8vw,104px)] uppercase leading-[0.86] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
                You Already
                <br />
                Know Us.
              </h1>
              <div className="mt-3 font-badge text-[clamp(18px,3vw,32px)] leading-tight text-white">
                WHERE THE <TypedWord /> GETS MADE
              </div>
              <p className="mt-5 max-w-lg text-[17px] font-medium leading-relaxed text-white">
                We are in the business of showcasing and awarding talent while curating unforgettable
                experiences and festivals for young people — from school tours to full-blown festivals.
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  href="/book"
                  className="-rotate-1 rounded-2xl border-[3px] border-ink bg-gold px-8 py-4 font-display text-[19px] uppercase text-ink shadow-[6px_6px_0_#111] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111]"
                >
                  Book the Tour
                </Link>
                <Link
                  href="/shop"
                  className="rotate-1 rounded-2xl border-[3px] border-ink bg-ink px-7 py-4 font-display text-[19px] uppercase text-white shadow-[6px_6px_0_#21C7E6] transition-all duration-150 ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#21C7E6]"
                >
                  Shop the Drop
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* marquee */}
        <div className="overflow-hidden border-y-4 border-ink bg-ink py-3">
          <div className="flex w-max animate-marquee whitespace-nowrap font-badge text-[22px] uppercase text-gold">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="px-6">
                FROM POTENTIAL TO PURPOSE ✦ WHERE THE CULTURE GETS MADE ✦ YOU ALREADY KNOW US ✦ FROM POTENTIAL TO PURPOSE ✦ WHERE THE CULTURE GETS MADE ✦
              </span>
            ))}
          </div>
        </div>

        {/* next stop */}
        <div className="border-b-4 border-ink bg-gold px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="flex-none -rotate-2 rounded-full bg-ink px-3.5 py-1.5 font-badge text-[12px] text-gold">NEXT STOP</span>
              <div className="font-display text-[clamp(17px,2.6vw,26px)] uppercase leading-none">
                {NEXT_STOP.school} <span className="text-magenta">· {NEXT_STOP.day} {NEXT_STOP.month}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <CountdownStrip target={target} />
              <Link
                href="/events"
                className="rounded-xl border-[3px] border-ink bg-white px-4 py-2.5 font-sans text-[13px] font-bold uppercase text-ink shadow-[3px_3px_0_#111] transition-transform duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
              >
                Full Calendar →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ticket booth */}
      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="-rotate-2 font-marker text-lg text-gold">skip the queue</div>
              <h2 className="mt-1 font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9] text-white">
                The Ticket <span className="text-cyan">Booth</span>
              </h2>
            </div>
            <Link href="/events" className="rounded-xl border-[3px] border-gold bg-gold px-5 py-3 font-display text-[15px] text-ink shadow-[5px_5px_0_#E6218C]">
              All Events →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(nextEvent ? [nextEvent] : []).map((ev) => (
              <Link
                key={ev.key}
                href="/events"
                className="relative rounded-2xl border-[3px] border-ink bg-gold px-5 py-4 shadow-[5px_5px_0_rgba(255,212,0,0.3)] transition-transform duration-150 hover:-translate-y-1"
              >
                <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#7a6a00]">Admit One · {ev.dateLabel}</div>
                <div className="mt-1 font-display text-[21px] uppercase leading-[0.98]">{ev.name}</div>
                <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-ink/35 pt-2">
                  <span className="text-[12px] font-bold text-ink/70">KES {ev.ticketTypes[0].priceKes.toLocaleString("en-KE")}</span>
                  <span className="font-badge text-[12px] text-magenta">BUY →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* sticker wall */}
      <div className="border-b-4 border-ink bg-concrete px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="-rotate-2 font-marker text-lg text-magenta">everything we slap our name on</div>
          <h2 className="mb-8 mt-1 font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9]">
            The Sticker <span className="rounded border-[3px] border-ink bg-cyan px-2.5">Wall</span>
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {DIVISIONS.map((d, i) => (
              <Reveal key={d.title} delay={i * 0.05}>
                <div className={`rounded-2xl border-[3px] border-ink p-6 shadow-[6px_6px_0_#111] transition-transform duration-150 hover:-translate-y-1 ${d.card}`}>
                  <div className="font-display text-[24px] uppercase leading-[0.95]">{d.title}</div>
                  <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink/80">{d.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* route board */}
      <div className="border-b-4 border-ink bg-cyan px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="-rotate-2 font-marker text-lg">nganya rules — board the right route</div>
          <h2 className="mb-7 mt-1 font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9]">Who We Build For</h2>
          <div className="flex flex-col gap-3.5">
            {AUDIENCES.map((a) => (
              <Link
                key={a.title}
                href={a.href}
                className="flex flex-wrap items-center gap-4 rounded-2xl border-[3px] border-ink bg-ink px-6 py-4 text-white shadow-[6px_6px_0_rgba(17,17,17,0.35)] transition-transform duration-150 hover:translate-x-2"
              >
                <div className="flex h-14 w-14 flex-none -rotate-3 flex-col items-center justify-center rounded-full border-[3px] border-white bg-gold">
                  <span className="text-[8px] font-bold tracking-[0.1em] text-ink">ROUTE</span>
                  <span className="font-display text-[22px] leading-none text-ink">{a.n}</span>
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="font-display text-[clamp(22px,3.2vw,32px)] uppercase leading-[0.95]">{a.title}</div>
                  <div className="mt-1 text-[13px] font-semibold text-white/70">{a.desc}</div>
                </div>
                <div className="flex-none rounded-full border-2 border-dashed border-gold px-4 py-2.5 font-badge text-[13px] text-gold">BOARD →</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* fresh off the road */}
      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9] text-white" style={{ textShadow: "3px 3px 0 #111" }}>
              Fresh Off <span className="text-gold">The Road</span>
            </h2>
            <Link href="/events" className="rounded-xl border-[3px] border-ink bg-ink px-4 py-2.5 font-sans text-[13px] font-bold uppercase text-white shadow-[4px_4px_0_#FFD400]">
              All tour stops →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {COMPLETED_STOPS.slice(0, 3).map((s, i) => (
              <Reveal key={s.school} delay={i * 0.06}>
                <div className={`rounded border-2 border-white/40 bg-white p-2.5 pb-4 shadow-[0_14px_26px_rgba(17,17,17,0.35)] ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                  <div className="relative aspect-square overflow-hidden bg-concrete">
                    <Image src={`/assets/g/stage_${(i + 12) % 16 + 1}.jpg`} alt={s.school} fill sizes="(max-width:640px) 90vw, 30vw" className="object-cover" />
                    <div className="absolute left-2.5 top-2.5 rounded-lg bg-ink px-2.5 py-1.5 font-display text-[15px] text-white">
                      <span className="text-gold">{s.day}</span> {s.month.split(" ")[0].slice(0, 3)}
                    </div>
                  </div>
                  <div className="px-1.5 pt-3">
                    <div className="font-marker text-[18px] leading-tight">{s.school}</div>
                    <div className="mt-1 text-[12px] font-semibold text-ink/50">as seen on Urban News</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* merch window */}
      <div className="border-b-4 border-ink bg-white px-6 pb-14 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="-rotate-2 font-marker text-lg text-magenta">window shopping? just come in</div>
              <h2 className="mt-1 font-display text-[clamp(28px,4.5vw,52px)] uppercase leading-[0.9]">
                The Merch <span className="rounded border-[3px] border-ink bg-gold px-2.5">Window</span>
              </h2>
            </div>
            <Link href="/shop" className="rounded-xl border-[3px] border-ink bg-ink px-5 py-3 font-display text-[15px] text-white shadow-[5px_5px_0_#21C7E6]">
              Enter The Shop →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {MERCH_PRODUCTS.slice(0, 4).map((p, i) => (
              <Link
                key={p.key}
                href="/shop"
                className={`overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_#111] transition-transform duration-150 hover:-translate-y-1.5 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              >
                <div className="relative aspect-square border-b-[3px] border-ink bg-concrete">
                  <Image src={p.img} alt={p.key} fill sizes="(max-width:640px) 45vw, 22vw" className="object-contain p-3.5" />
                </div>
                <div className="px-3 py-3 font-display text-[14px] uppercase leading-tight">{p.tag}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* headliners */}
      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="-rotate-2 font-marker text-lg text-gold">the crew behind the culture</div>
          <h2 className="mb-7 mt-1 font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9] text-white">
            The <span className="text-magenta">Headliners</span>
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {HEADLINERS.slice(0, 5).map((m, i) => (
              <Link key={m.name} href="/the-gang" className={`block ${i % 2 ? "rotate-1" : "-rotate-1"} transition-transform duration-150 hover:rotate-0 hover:-translate-y-1.5`}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-[999px_999px_18px_18px] border-4 border-cyan bg-white/10 shadow-[6px_6px_0_rgba(0,0,0,0.5)]">
                  <Image src={m.img} alt={m.name} fill sizes="(max-width:640px) 45vw, 18vw" className="object-cover" />
                </div>
                <div className="mt-3 font-display text-[17px] uppercase leading-none text-white">{m.name}</div>
                <div className="mt-1.5 inline-block rounded-full border-2 border-ink bg-cyan px-2.5 py-0.5 text-[9.5px] font-bold uppercase text-ink">{m.role.split(",")[0].split("&")[0]}</div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/the-gang" className="rounded-full border-2 border-dashed border-gold px-6 py-3 font-badge text-[13px] text-gold">
              + THE WHOLE 30-PERSON CREW →
            </Link>
          </div>
        </div>
      </div>

      {/* partners marquee */}
      <div className="border-b-4 border-ink bg-white px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-[1320px] text-center font-marker text-lg">the squad on our lanyard — trusted at every stop</div>
        <div className="mt-5 overflow-hidden">
          <div className="flex w-max animate-marquee-slow gap-4">
            {[...PARTNERS_LOOP, ...PARTNERS_LOOP].map((p, i) => (
              <div key={i} className="flex h-24 min-w-[160px] flex-none items-center justify-center rounded-xl border-[3px] border-ink bg-white px-5 shadow-[3px_3px_0_#111]">
                <span className="text-center font-display text-[14px] uppercase leading-tight">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* news preview */}
      <div className="border-b-4 border-ink bg-concrete px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[clamp(28px,4.5vw,52px)] uppercase leading-[0.9]">
              From The <span className="text-magenta">Newsroom</span>
            </h2>
            <Link href="/blog" className="font-badge text-[14px] text-magenta">All stories →</Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {recentPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block rounded-2xl border-[3px] border-ink bg-white p-3 shadow-[5px_5px_0_#111] transition-transform duration-150 hover:-translate-y-1">
                <div className="relative h-44 w-full overflow-hidden rounded-lg border-2 border-ink">
                  <Image src={post.img} alt={post.title} fill sizes="(max-width:640px) 90vw, 30vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3 text-[11.5px] font-bold uppercase tracking-wide text-ink/45">{post.dateLabel}</div>
                <div className="mt-1.5 font-display text-[18px] uppercase leading-tight group-hover:text-magenta">{post.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* final cta */}
      <div className="bg-gold px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1000px] rounded-[26px] border-4 border-ink bg-ink p-9 text-center shadow-[12px_12px_0_#E6218C] sm:p-14">
          <h2 className="font-display text-[clamp(30px,5vw,58px)] uppercase leading-[0.92] text-white">
            Ready to bring the tour
            <br />
            to <span className="text-gold">your people?</span>
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <Link href="/book" className="rounded-2xl border-[3px] border-ink bg-gold px-7 py-4 font-display text-[17px] text-ink shadow-[5px_5px_0_#E6218C]">
              Book the Tour
            </Link>
            <Link href="/book#brands" className="rounded-2xl border-[3px] border-ink bg-cyan px-7 py-4 font-display text-[17px] text-ink shadow-[5px_5px_0_#fff]">
              Partner With Us
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
