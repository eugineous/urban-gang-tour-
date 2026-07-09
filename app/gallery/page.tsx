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
    <div className="min-h-screen bg-cyan">
      <Nav />

      <div className="border-b-4 border-ink bg-cyan px-6 py-14 text-center sm:px-10">
        <div className="mx-auto max-w-[760px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">THE PHOTO WALL</div>
            <h1 className="mt-4 font-display text-[clamp(40px,7vw,80px)] uppercase leading-[0.9]" style={{ textShadow: "4px 4px 0 #fff" }}>
              Every School.
              <br />
              <span className="rounded border-[3px] border-ink bg-magenta px-2.5 text-white">Its Own Catalogue.</span>
            </h1>
            <p className="mx-auto mt-3.5 max-w-[600px] text-[16px] font-semibold leading-relaxed">
              Shot on the road by Vibes Studios and the crew.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="text-center">
        <GalleryClient />
      </div>

      <Footer />
    </div>
  );
}
