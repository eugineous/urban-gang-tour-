import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import BuyButton from "../_components/BuyButton";
import { getTicketEvents } from "@/lib/catalog-store";
import { NEXT_STOP, COMPLETED_STOPS, UPCOMING_STOPS } from "@/content/tour";

const title = "The Tour — Stops & Calendar";
const description = "Where the Urban Gang Tour has been, and where it's going next. Completed stops, upcoming dates, and ticketed public events.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/events" },
  openGraph: { title, description, url: "/events", type: "website" },
};

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  "IN TALKS": "bg-gold text-ink",
  "DATE BEING SET": "bg-gold text-ink",
  "IN THE PIPELINE": "bg-white text-ink",
  CANCELLED: "bg-ink text-white",
};

export default async function EventsPage() {
  const ticketEvents = await getTicketEvents();

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: NEXT_STOP.school,
    location: { "@type": "Place", name: NEXT_STOP.school, address: NEXT_STOP.location },
    organizer: { "@type": "Organization", name: "Urban Gang Tour", url: "https://urbangangtour.co.ke" },
  };

  return (
    <div className="min-h-screen bg-magenta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">2026 TOUR · THE ROUTE</div>
            <h1 className="mt-4 font-display text-[clamp(36px,6vw,76px)] uppercase leading-[0.9] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              Where The Tour Has Been.
              <br />
              <span className="rounded border-[3px] border-ink bg-cyan px-2.5">Where It&apos;s Going.</span>
            </h1>
          </Reveal>
        </div>
      </div>

      <div className="border-b-4 border-gold bg-ink px-6 py-10 sm:px-10">
        <Reveal>
          <div className="mx-auto grid max-w-[1000px] grid-cols-1 overflow-hidden rounded-2xl border-4 border-gold shadow-[10px_10px_0_rgba(255,212,0,0.2)] sm:grid-cols-2">
            <div className="bg-[#1b1b1b] p-7">
              <span className="inline-block rounded-full border-2 border-white bg-magenta px-3.5 py-1.5 font-badge text-[11px] text-white">● NEXT STOP</span>
              <div className="mt-3 flex items-center gap-3.5">
                <div className="rounded-xl border-2 border-white bg-gold px-3.5 py-2 text-center">
                  <div className="font-display text-[26px] leading-[0.85] text-ink">{NEXT_STOP.day}</div>
                  <div className="font-display text-[11px] text-ink">{NEXT_STOP.month.split(" ")[0].slice(0, 3)}</div>
                </div>
                <div>
                  <div className="font-display text-[clamp(20px,3vw,28px)] uppercase leading-[0.95] text-white">{NEXT_STOP.school}</div>
                  <div className="mt-1 text-[12.5px] font-bold text-gold">{NEXT_STOP.location}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20details%20on%20the%20next%20stop."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border-2 border-white bg-gold px-5 py-3 text-[13px] font-bold text-ink"
                >
                  Get Details, WhatsApp
                </a>
                <Link href="/book" className="rounded-xl bg-white px-5 py-3 text-[13px] font-bold text-magenta">
                  Book Your School
                </Link>
              </div>
            </div>
            <div className="relative min-h-[220px] bg-concrete">
              <img src="/assets/g/stage_12.jpg" alt={NEXT_STOP.school} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
        </Reveal>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-[clamp(26px,3vw,38px)] uppercase leading-none">
              2026 Tour, <span className="text-magenta">completed stops</span>
            </h2>
            <div className="mt-7 flex flex-col gap-5">
              {COMPLETED_STOPS.map((s, i) => (
                <Reveal key={s.school} delay={i * 0.08}>
                  <div className="grid grid-cols-[60px_1fr] gap-3.5">
                    <div className="text-right">
                      <div className="font-display text-2xl leading-none text-magenta">{s.day}</div>
                      <div className="mt-1 text-[10.5px] font-bold text-ink/45">{s.month}</div>
                    </div>
                    <div className="rounded-2xl border-[3px] border-ink bg-concrete p-5 shadow-[4px_4px_0_#111]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="font-display text-[17px] uppercase leading-tight">{s.school}</div>
                        <div className="rounded-full border-2 border-ink bg-gold px-2.5 py-1 text-[10px] font-bold">TOURED ✓</div>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink/70">{s.body}</p>
                      <div className="mt-2.5 flex gap-4 text-[12px] font-bold text-magenta">
                        <Link href="/gallery">Photos</Link>
                        <Link href="/blog">Read the recap →</Link>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-display text-[clamp(26px,3vw,38px)] uppercase leading-none">
              On The <span className="text-magenta">Radar</span>
            </h2>
            <p className="mt-2.5 max-w-md text-[13.5px] font-medium leading-relaxed text-ink/60">
              The route the tour is building right now. Follow{" "}
              <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener noreferrer" className="font-bold text-magenta">
                @urban_newsgang
              </a>{" "}
              to catch the announcements first.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {UPCOMING_STOPS.map((u, i) => (
                <Reveal key={u.name} delay={i * 0.06}>
                  <div className="rounded-2xl border-2 border-dashed border-ink/30 bg-concrete p-5">
                    <div className="font-marker text-[13px] text-magenta">{u.tag}</div>
                    <div className="mt-1.5 font-display text-[17px] uppercase leading-tight">{u.name}</div>
                    <div className="mt-1.5 text-[12px] font-semibold text-ink/60">{u.where}</div>
                    <div className={`mt-3 inline-block rounded-full border-2 border-ink px-3 py-1.5 text-[10.5px] font-bold ${STATUS_STYLE[u.status]}`}>
                      {u.status}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <div className="inline-block -rotate-2 rounded-full border-2 border-gold bg-white px-4 py-2 font-badge text-[13px] text-ink">TICKET HUB</div>
          <h2 className="mt-3.5 font-display text-[clamp(26px,3.2vw,40px)] uppercase leading-none text-white">
            Get Your <span className="text-magenta">Ticket</span>
          </h2>
          <p className="mt-2.5 max-w-2xl text-[14px] font-medium leading-relaxed text-white/70">
            School stops are for the students of that school. Public events and festival appearances are
            ticketed here — paid by M-Pesa, instant e-ticket and invoice.
          </p>

          <div className="mt-7 flex flex-col gap-4">
            {ticketEvents.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-white/25 p-8 text-center text-[14px] text-white/60">
                No public tickets on sale right now. Follow the socials for the next drop.
              </div>
            )}
            {ticketEvents.map((tev, i) => (
              <Reveal key={tev.key} delay={i * 0.08}>
                <div className="relative rounded-2xl border-[3px] border-gold bg-magenta p-7 shadow-[8px_8px_0_rgba(255,212,0,0.25)]">
                  <div className="font-display text-2xl uppercase text-white">{tev.name}</div>
                  <div className="mt-1 text-[13px] font-semibold text-white/85">{tev.dateLabel}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {tev.ticketTypes.map((tt) => (
                      <div key={tt.key} className="flex items-center gap-4 rounded-xl border-2 border-ink bg-white px-5 py-3.5">
                        <div>
                          <div className="text-[13px] font-bold">{tt.name}</div>
                          <div className="font-display text-[17px] text-magenta">KES {tt.priceKes.toLocaleString("en-KE")}</div>
                        </div>
                        <BuyButton
                          className="whitespace-nowrap rounded-lg border-2 border-ink bg-gold px-4 py-2.5 text-[12.5px] font-bold text-ink"
                          item={{ kind: "ticket", eventKey: tev.key, itemKey: tt.key, name: `${tev.name} - ${tt.name}`, priceKes: tt.priceKes }}
                        >
                          Buy Ticket
                        </BuyButton>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gold px-6 py-16 text-center sm:px-10">
        <div className="font-display text-[clamp(26px,4vw,48px)] uppercase leading-tight">Your institution could be the next stop</div>
        <Link href="/book" className="mt-6 inline-block rounded-xl border-[3px] border-ink bg-ink px-9 py-4 font-display text-[17px] text-gold shadow-[6px_6px_0_#E6218C]">
          Book the Tour
        </Link>
      </div>

      <Footer />
    </div>
  );
}
