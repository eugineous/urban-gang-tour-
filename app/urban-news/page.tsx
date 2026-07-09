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
    <div className="min-h-screen bg-ink">
      <Nav />

      <div className="border-b-4 border-gold bg-ink px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 rounded-full border-2 border-live bg-live/15 px-4 py-2 text-[12.5px] font-bold text-live">
              <span className="h-2.5 w-2.5 animate-blink rounded-full bg-live" /> ON AIR, URBAN NEWS
            </div>
            <h1 className="mt-4 font-display text-[clamp(38px,6.2vw,72px)] uppercase leading-[0.95] text-white">
              Urban News.
              <br />
              <span className="text-magenta">The tour, on air.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[16px] font-medium leading-relaxed text-white/75">
              Hosted by <Link href="/the-gang" className="font-bold text-gold">Eugine Micah</Link> and{" "}
              <Link href="/the-gang" className="font-bold text-gold">Lucy Ogunde</Link> on the tour, Urban
              News follows the tour into every institution — shot by Urban Gang Tour, aired nationwide.
            </p>
            <div className="mt-6 flex flex-wrap gap-3.5">
              <a href="https://youtube.com/@urban_newsgang" target="_blank" rel="noopener noreferrer" className="rounded-xl border-[3px] border-ink bg-magenta px-7 py-4 text-[15px] font-bold text-white shadow-[5px_5px_0_#FFD400]">
                Watch Highlights
              </a>
              <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener noreferrer" className="rounded-xl border-2 border-white px-6 py-3.5 text-[15px] font-bold text-white">
                @urban_newsgang
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="border-b-4 border-gold bg-ink px-6 pb-14 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <div className="overflow-hidden rounded-[20px] border-4 border-ink bg-black shadow-[8px_8px_0_#21C7E6]">
            <div className="flex items-center gap-2.5 border-b-[3px] border-ink bg-magenta px-4 py-3">
              <span className="h-2.5 w-2.5 animate-blink rounded-full bg-white" />
              <span className="font-badge text-[12px] uppercase text-white">Urban News — full playlist</span>
            </div>
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/videoseries?list=PLWRdLORbKcqU"
                title="Urban News — full playlist"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <div className="bg-ink px-4 py-3 text-center">
              <a
                href="https://www.youtube.com/playlist?list=PLWRdLORbKcqU"
                target="_blank"
                rel="noopener noreferrer"
                className="font-badge text-[13px] text-gold"
              >
                WATCH EVERY EPISODE ON YOUTUBE →
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-block -rotate-1 rounded-full border-2 border-ink bg-magenta px-4 py-1.5 font-display text-[13px] text-white">ON THE COUCH</div>
                <h2 className="mt-3.5 font-display text-[clamp(28px,4vw,44px)] uppercase leading-none">
                  Guest <span className="text-magenta">Albums</span>
                </h2>
              </div>
              <p className="max-w-sm text-[13.5px] font-medium text-ink/60">
                Every personality who pulled up to the Urban News set this season.
              </p>
            </div>
            <AlbumsClient />
          </Reveal>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-gold px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-display text-[24px] uppercase">
            What The Show <span className="text-magenta">Covers</span>
          </h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {SEGMENTS.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 rounded-xl border-2 border-ink bg-white px-4 py-2.5">
                <span className="font-display text-[15px] text-magenta">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[13.5px] font-semibold leading-tight">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b-4 border-ink bg-ink px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="inline-block -rotate-1 rounded-full border-2 border-white bg-white px-4 py-1.5 font-display text-[13px] uppercase">STRAIGHT OFF THE SET</div>
          <div className="mt-6 [column-gap:14px] [columns:250px]">
            {STUDIO_GALLERY.map((photo) => (
              <img key={photo.src} src={photo.src} alt="Urban News studio" className="mb-3.5 block h-auto w-full rounded-xl border-2 border-white/15 [break-inside:avoid]" />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-magenta px-6 py-16 text-center sm:px-10">
        <div className="font-display text-[clamp(26px,3.8vw,42px)] uppercase text-white" style={{ textShadow: "2px 2px 0 #111" }}>
          Every booked event includes a feature on Urban News.
        </div>
        <p className="mt-2.5 text-[15px] font-medium text-white/90">Your school or campus, on national television.</p>
        <Link href="/book" className="mt-6 inline-block rounded-xl border-[3px] border-ink bg-gold px-8 py-4 font-display text-[16px] text-ink shadow-[6px_6px_0_#111]">
          Book the Tour
        </Link>
      </div>

      <Footer />
    </div>
  );
}
