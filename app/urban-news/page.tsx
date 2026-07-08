import type { Metadata } from "next";
import Link from "next/link";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import AlbumsClient from "./AlbumsClient";
import { STUDIO_GALLERY, SEGMENTS } from "@/content/urban-news";

const title = "Urban News";
const description = "Urban News follows the Urban Gang Tour into every institution, hosted by Eugine Micah and Lucy Ogunde.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/urban-news" },
  openGraph: { title, description, url: "/urban-news", type: "website" },
};

export default function UrbanNewsPage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(120deg, #1A0D16 0%, #2B0E22 60%, #0E1A24 130%)" }}
      >
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#FF4646]/50 bg-[#FF2828]/[0.14] px-4 py-2 text-[12.5px] font-bold tracking-wide text-[#FF7A7A]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF4040]" />
              ON AIR, URBAN NEWS
            </div>
            <h1 className="mt-[1.125rem] font-display text-[clamp(2.9rem,6.2vw,5.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
              Urban News.
              <br />
              <span className="text-magenta">The tour, on air.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-paper/[0.78]">
              Hosted by{" "}
              <Link href="/the-gang" className="font-bold text-gold">
                Eugine Micah
              </Link>{" "}
              and{" "}
              <Link href="/the-gang" className="font-bold text-gold">
                Lucy Ogunde
              </Link>{" "}
              on the tour, Urban News follows the tour into every institution. A TV show with its own
              company behind it: Urban Gang Tour shoots it, Urban News airs it, up to 8 million viewers
              watch it.
            </p>
            <div className="mt-[1.625rem] flex flex-wrap gap-3.5">
              <a
                href="https://youtube.com/@urban_newsgang"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-magenta px-7 py-4 text-[15px] font-bold text-paper shadow-[0_12px_30px_rgba(199,35,142,0.4)] transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
              >
                Watch Highlights
              </a>
              <a
                href="https://instagram.com/urban_newsgang"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border-2 border-white/60 px-[1.625rem] py-3.5 text-[15px] font-bold text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
              >
                @urban_newsgang
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-[20px] border-[3px] border-[#E61E8C]/60 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                poster="/assets/thumbs/recap_1.jpg"
                playsInline
                src="/assets/video/recap_1.mp4"
                controls
                preload="metadata"
                className="block max-h-[460px] w-full bg-black object-cover"
              />
            </div>
            <div className="mt-3 -rotate-1 text-center font-marker text-[16px] text-gold">latest from the road</div>
            <div className="mt-5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-paper/50">On the couch this season</div>
              <div className="mt-2.5 flex gap-2">
                {["bobby", "hype", "moraa", "kalamu", "tamre"].map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={s}
                    src={`/assets/news/albums/${s}/1.jpg`}
                    alt=""
                    loading="lazy"
                    className="aspect-square min-w-0 flex-1 rounded-[10px] border border-white/15 object-cover"
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-3 pt-16 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-[1.125rem]">
              <div>
                <div className="inline-block -rotate-1 rounded-full bg-magenta px-[1.125rem] py-1.5 font-display text-[13px] tracking-wide text-paper">
                  ON THE COUCH
                </div>
                <h2 className="mt-3.5 font-display text-[clamp(1.9rem,4vw,3.2rem)] uppercase leading-none">
                  Guest <span className="text-gold">albums</span>
                </h2>
              </div>
              <p className="max-w-sm text-[14px] leading-relaxed text-paper/[0.62]">
                Every personality who pulled up to the Urban News set this season. Tap a face to open
                their full photo set.
              </p>
            </div>
          </Reveal>
          <AlbumsClient />
        </div>
      </section>

      <section className="px-6 pb-2.5 pt-14 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="flex flex-wrap items-baseline gap-3.5">
              <h2 className="font-display text-[26px] uppercase">
                What the show <span className="text-gold">covers</span>
              </h2>
              <div className="text-[13px] text-paper/50">Eight beats, every episode.</div>
            </div>
            <div className="mt-[1.125rem] flex flex-wrap gap-2.5">
              {SEGMENTS.map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 transition-colors duration-150 hover:border-magenta"
                >
                  <span className="font-display text-[15px] text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13.5px] font-semibold leading-tight">{s}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-2.5 pt-14 sm:px-10">
        <div className="mx-auto max-w-[1280px] grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { img: "/assets/p/eugine_4.jpg", name: "Eugine Micah", role: "Co Host, Creative Director", ig: "eugine.micah", pos: "center" },
            { img: "/assets/p/lucy_portrait.jpg", name: "Lucy Ogunde", role: "Co Host, Executive Producer", ig: "lucyogunde", pos: "top" },
            { img: "/assets/p/hype_ola_2.jpg", name: "Hype Ola", role: "Lead Hype, The Experience Hub", ig: "hypeola", pos: "center", badge: true },
          ].map((h, i) => (
            <Reveal key={h.name} delay={i * 0.06}>
              <div className="flex items-center gap-[1.375rem] rounded-3xl border border-magenta/40 bg-magenta/[0.08] p-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.img}
                  alt={h.name}
                  className="h-[110px] w-[110px] shrink-0 rounded-full border-4 border-magenta object-cover"
                  style={{ objectPosition: h.pos }}
                />
                <div>
                  {h.badge && (
                    <div
                      className="mb-1.5 inline-block rounded-full px-2.5 py-1 font-display text-[10.5px] tracking-wide text-paper"
                      style={{ background: "linear-gradient(100deg, #C7238E, #F5A623)" }}
                    >
                      MAIN PARTNER
                    </div>
                  )}
                  <div className="font-display text-2xl">{h.name.toUpperCase()}</div>
                  <div className="text-[13px] font-bold tracking-wide text-magenta-bright">{h.role.toUpperCase()}</div>
                  <a href={`https://instagram.com/${h.ig}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[13px] font-bold text-gold">
                    @{h.ig}
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="inline-block -rotate-1 rounded-full bg-paper px-[1.125rem] py-1.5 font-display text-[13px] tracking-wide text-ink">
                STRAIGHT OFF THE SET
              </div>
              <div className="text-[13px] text-paper/55">The LED wall, the lights, the energy, unedited.</div>
            </div>
            <div className="mt-[1.625rem] [column-gap:14px] [columns:250px]">
              {STUDIO_GALLERY.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt="Urban News studio"
                  loading="lazy"
                  className="mb-3.5 block w-full rounded-2xl border border-white/10 [break-inside:avoid]"
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-16 sm:px-10">
        <Reveal>
          <div className="mx-auto max-w-[1080px] rounded-3xl border border-dashed border-gold/50 bg-white/[0.04] p-9 sm:p-11">
            <div className="font-display text-[28px] uppercase">Watch and follow</div>
            <div className="mt-[1.125rem] grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="text-[14.5px] leading-loose text-paper/80">
                <b className="text-paper">On TV:</b> Urban News broadcast. Air times announced per season
                on our socials.
                <br />
                <b className="text-paper">Clips and highlights:</b> TikTok, Instagram, YouTube Shorts,
                Facebook, and X, all at <b className="text-magenta">@urban_newsgang</b>.
              </div>
              <div className="flex flex-wrap content-center gap-2.5">
                {["TikTok", "Instagram", "YouTube", "Facebook", "X"].map((s) => (
                  <a
                    key={s}
                    href={`https://${s === "X" ? "x" : s.toLowerCase()}.com/${s === "YouTube" ? "@" : ""}urban_newsgang`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/20 bg-white/[0.07] px-[1.125rem] py-2.5 text-[13px] font-bold text-paper transition-colors duration-150 hover:border-magenta"
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section
        className="px-6 py-16 text-center sm:px-10"
        style={{ background: "linear-gradient(100deg, #C7238E, #F5A623)" }}
      >
        <Reveal>
          <div className="font-display text-[clamp(1.9rem,3.8vw,3rem)] uppercase text-paper">
            Every booked event includes a feature on Urban News.
          </div>
          <p className="mt-2.5 text-[15.5px] text-white/[0.92]">Your school or campus, on national television.</p>
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
