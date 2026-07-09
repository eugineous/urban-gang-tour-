import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import ProductCard from "./ProductCard";
import { MERCH_PRODUCTS, COMING_SOON } from "@/content/merch";
import { getMerchCatalog } from "@/lib/catalog-store";

const title = "Shop — Urban Gang Merch";
const description = "Official Urban Gang Tour merch. Pick a piece, pick a size, pay with M-Pesa or order straight through WhatsApp.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/shop" },
  openGraph: { title, description, url: "/shop", type: "website" },
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const catalog = await getMerchCatalog();
  const byKey = new Map(catalog.map((item) => [item.key, item]));

  return (
    <div className="min-h-screen bg-cyan">
      <Nav />

      <div className="border-b-4 border-ink bg-cyan px-6 py-14 text-center sm:px-10">
        <div className="mx-auto max-w-[760px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">URBAN GANG MERCH</div>
            <h1 className="mt-4 font-display text-[clamp(40px,7vw,80px)] uppercase leading-[0.9]" style={{ textShadow: "4px 4px 0 #fff" }}>
              Wear The <span className="rounded border-[3px] border-ink bg-magenta px-2.5 text-white">Culture</span>
            </h1>
            <p className="mx-auto mt-3.5 max-w-[560px] text-[16px] font-semibold leading-relaxed">
              What you wear from us says you were there when it happened. Nairobi pickup, countrywide
              delivery. Pay with M-Pesa or card.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="overflow-hidden border-b-4 border-ink bg-ink py-2.5">
        <div className="flex w-max animate-marquee-fast whitespace-nowrap font-display text-[15px] tracking-[0.1em] text-gold">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="px-6">
              WORN AT EVERY STOP * TEES, HOODIES, CAPS * ORDER VIA WHATSAPP 0799 886 247 * FROM POTENTIAL TO PURPOSE *
            </span>
          ))}
        </div>
      </div>

      <div className="bg-magenta px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 text-center font-marker text-[17px] text-white">
            tap a tag → pick your size → straight in the bag
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {MERCH_PRODUCTS.map((p, i) => (
              <Reveal key={p.key} delay={(i % 8) * 0.04}>
                <ProductCard product={p} price={byKey.get(p.key)} />
              </Reveal>
            ))}
          </div>

          {COMING_SOON.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {COMING_SOON.map((name) => (
                <div key={name} className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/60 bg-white/10 p-6 text-center text-white">
                  <div className="font-display text-lg uppercase">{name}</div>
                  <div className="mt-1.5 font-marker text-[14px] text-gold">dropping soon, watch the socials</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t-4 border-ink bg-white px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1000px]">
          <Reveal>
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border-[3px] border-ink bg-concrete p-7">
              <div className="min-w-[240px] flex-1">
                <div className="font-display text-[19px] uppercase">Find the merch tent at every stop</div>
                <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-ink/65">
                  Urban Gang Merch, snacks, and the photobooth travel with the tour to every stop.
                </p>
              </div>
              <a href="/events" className="flex-none whitespace-nowrap rounded-full border-2 border-ink bg-gold px-5 py-3 text-[13.5px] font-bold">
                Next stop
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <Footer />
    </div>
  );
}
