import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import BuyButton from "../_components/BuyButton";
import { getTicketEvents } from "@/lib/catalog-store";
import { NEXT_STOP, COMPLETED_STOPS, UPCOMING_STOPS } from "@/content/tour";

const title = "Tour Calendar — Urban Gang Tour";
const description =
  "Where the Urban Gang Tour has been, and where it's going next. Completed stops, upcoming dates, and ticketed public events.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/events" },
  openGraph: { title, description, url: "/events", type: "website" },
};

// Without this, Next statically optimizes this page at build time and
// bakes in whatever Redis returns then - admin catalog price edits would
// never reach visitors until the next deploy. Same bug class fixed
// earlier in app/api/catalog/route.ts.
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  "IN TALKS": "bg-gold/15 text-gold",
  "DATE BEING SET": "bg-gold/15 text-gold",
  "IN THE PIPELINE": "bg-white/10 text-paper/75",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export default async function EventsPage() {
  const ticketEvents = await getTicketEvents();

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: NEXT_STOP.school,
    startDate: "2026-07-24",
    location: {
      "@type": "Place",
      name: NEXT_STOP.school,
      address: NEXT_STOP.location,
    },
    organizer: { "@type": "Organization", name: "Urban Gang Tour", url: "https://urbangangtour.co.ke" },
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />
      <Nav />

      <section className="px-6 pb-10 pt-20 sm:px-10 sm:pt-28">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Tour Calendar</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-balance font-display text-[clamp(2.25rem,5.5vw,4.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              Where the tour has been. <span className="text-magenta-bright">Where it is going.</span>
            </h1>
            <div className="mt-7 flex flex-wrap gap-4">
              <a
                href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20to%20book%20the%20tour."
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-magenta px-7 py-4 text-[14.5px] font-bold text-paper shadow-magenta transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
              >
                Bookings Open, 0799 886 247
              </a>
              <Link
                href="/gallery"
                className="rounded-2xl border-2 border-white/30 px-6 py-4 text-[14.5px] font-bold text-paper transition-all duration-150 ease-out hover:border-gold hover:text-gold active:scale-[0.97]"
              >
                See Past Event Photos
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-magenta-deep to-magenta p-9 sm:p-12">
              <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="inline-block rounded-full bg-ink px-4 py-1.5 font-display text-[11px] uppercase tracking-wide text-[#8FE89A]">
                    Next Confirmed Stop
                  </div>
                  <div className="mt-3.5 text-balance font-display text-[clamp(1.75rem,3.5vw,2.75rem)] uppercase leading-[1.02] text-paper">
                    {NEXT_STOP.school}
                  </div>
                  <div className="mt-2 text-[14.5px] text-paper/85">{NEXT_STOP.location}</div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href="https://wa.me/254799886247?text=Hi%20UGT%2C%20I%20want%20details%20on%20the%20Ngeya%20Girls%20stop%20on%2024%20July%202026."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-ink px-6 py-3.5 text-[13.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]"
                    >
                      Get Details, WhatsApp
                    </a>
                    <Link
                      href="/book"
                      className="rounded-xl bg-paper px-6 py-3.5 text-[13.5px] font-bold text-magenta transition-all duration-150 ease-out hover:bg-white active:scale-[0.97]"
                    >
                      Book Your School
                    </Link>
                  </div>
                </div>
                <div className="rounded-2xl bg-black/25 px-8 py-6 text-center">
                  <div className="font-marker text-[15px] text-gold">Save the date</div>
                  <div className="mt-1 font-display text-[64px] leading-none text-paper">{NEXT_STOP.day}</div>
                  <div className="font-display text-[20px] tracking-wide text-paper">{NEXT_STOP.month}</div>
                  <div className="mt-2 text-[11.5px] tracking-wide text-paper/70">{NEXT_STOP.note}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-14 lg:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] uppercase leading-none tracking-[-0.02em]">
                2026 Tour, <span className="text-magenta-bright">completed stops</span>
              </h2>
            </Reveal>
            <div className="mt-8 flex flex-col">
              {COMPLETED_STOPS.map((s, i) => (
                <Reveal key={s.school} delay={i * 0.08}>
                  <div className="grid grid-cols-[64px_1fr] gap-4 pb-6">
                    <div className="text-right">
                      <div className="font-display text-2xl leading-none text-gold">{s.day}</div>
                      <div className="mt-1 text-[11px] font-bold tracking-wide text-paper/50">{s.month}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-150 hover:border-magenta/50">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="font-display text-lg uppercase leading-tight">{s.school}</div>
                        <div className="rounded-full bg-magenta/20 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-magenta-bright">
                          TOURED
                        </div>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-paper/65">{s.body}</p>
                      <div className="mt-3 flex gap-4 text-[12.5px] font-bold">
                        <Link href="/gallery" className="text-gold">Photos</Link>
                        <Link href="/urban-news" className="text-gold">Urban News episode</Link>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div>
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] uppercase leading-none tracking-[-0.02em]">
                In the <span className="text-gold">works</span>
              </h2>
              <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-paper/60">
                The route the tour is building right now: confirmed, in talks, and in the pipeline. Follow{" "}
                <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener noreferrer" className="font-bold text-magenta-bright">
                  @urban_newsgang
                </a>{" "}
                to catch the announcements first.
              </p>
            </Reveal>
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {UPCOMING_STOPS.map((u, i) => (
                <Reveal key={u.name} delay={i * 0.06}>
                  <div className="rounded-2xl border-2 border-dashed border-white/15 bg-gold/[0.04] p-6">
                    <div className="font-marker text-[14px] text-gold">{u.tag}</div>
                    <div className="mt-2 font-display text-[19px] uppercase leading-tight">{u.name}</div>
                    <div className="mt-2 text-[13px] text-paper/60">{u.where}</div>
                    <div className={`mt-3.5 inline-block rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${STATUS_STYLE[u.status]}`}>
                      {u.status}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Ticket Hub</span>
            </div>
            <h2 className="mt-3.5 font-display text-[clamp(1.75rem,3.2vw,2.75rem)] uppercase leading-none tracking-[-0.02em]">
              Get your <span className="text-magenta-bright">ticket</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-paper/65">
              School stops are for the students of that school. Public events, Campus XP editions, and
              festival appearances are ticketed here, paid by M-Pesa, no back-and-forth.
            </p>
          </Reveal>

          <div className="mt-8 flex flex-col gap-4">
            {ticketEvents.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-[14px] text-paper/60">
                No public tickets on sale right now. Follow the socials for the next drop.
              </div>
            )}
            {ticketEvents.map((tev, i) => (
              <Reveal key={tev.key} delay={i * 0.08}>
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-magenta-deep to-magenta p-8">
                  <div className="font-display text-2xl uppercase text-paper">{tev.name}</div>
                  <div className="mt-1 text-[13.5px] text-paper/80">{tev.dateLabel}</div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {tev.ticketTypes.map((tt) => (
                      <div key={tt.key} className="flex items-center gap-4 rounded-2xl bg-black/25 px-5 py-3.5">
                        <div>
                          <div className="text-[14px] font-bold text-paper">{tt.name}</div>
                          <div className="mt-0.5 font-display text-lg text-[#FFD9EF]">
                            KES {tt.priceKes.toLocaleString("en-KE")}
                          </div>
                        </div>
                        <BuyButton
                          className="whitespace-nowrap rounded-xl bg-ink px-5 py-3 text-[13px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]"
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

          <Reveal>
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-white/20 p-6">
              <div className="flex-1 text-[13px] leading-relaxed text-paper/65">
                Want early word on the next public or campus event before tickets go live? We will add you
                to the list.
              </div>
              <a
                href="https://wa.me/254799886247?text=Hi%20UGT%2C%20put%20me%20on%20the%20early%20list%20for%20the%20next%20public%20event!"
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-full bg-white/10 px-5 py-2.5 text-[13px] font-bold text-paper transition-colors duration-150 hover:bg-white/[0.16]"
              >
                RSVP on WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gradient-to-br from-magenta to-gold px-6 py-16 text-center sm:px-10">
        <Reveal>
          <div className="text-balance font-display text-[clamp(1.75rem,4vw,3.25rem)] uppercase leading-tight text-ink">
            Your institution could be the next stop
          </div>
          <Link
            href="/book"
            className="mt-6 inline-block rounded-2xl bg-ink px-9 py-4 text-[14.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-black active:scale-[0.97]"
          >
            Book the Tour
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
