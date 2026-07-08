import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import GalleryClient from "./GalleryClient";

const title = "Gallery";
const description = "Photos and reels from the road, shot by Vibes Studios and the Urban Gang Tour crew.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/gallery" },
  openGraph: { title, description, url: "/gallery", type: "website" },
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="px-6 pb-2 pt-20 text-center sm:px-10 sm:pt-28">
        <div
          className="mx-auto max-w-[760px]"
          style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.4), transparent 65%)" }}
        >
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Caught live</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">shot by Vibes Studios and Urban Gang Tour crews</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,6vw,5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              The <span className="text-magenta">gallery</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <div className="text-center">
        <GalleryClient />
      </div>

      <Footer />
    </div>
  );
}
