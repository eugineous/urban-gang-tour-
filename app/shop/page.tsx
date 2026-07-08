import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import ProductCard from "./ProductCard";
import { MERCH_PRODUCTS, COMING_SOON } from "@/content/merch";
import { getMerchCatalog } from "@/lib/catalog-store";

const title = "Shop, Official Merch";
const description = "Official Urban Gang Tour merch. Pick a piece, pick a size, pay with M-Pesa or order straight through WhatsApp.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/shop" },
  openGraph: { title, description, url: "/shop", type: "website" },
};

// Reads live pricing from Redis at request time, same reason as app/events/page.tsx:
// without this Next.js would statically freeze prices at build time.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const catalog = await getMerchCatalog();
  const byKey = new Map(catalog.map((item) => [item.key, item]));

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="px-6 pb-8 pt-20 text-center sm:px-10 sm:pt-28">
        <div
          className="mx-auto max-w-[760px]"
          style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.35), transparent 65%)" }}
        >
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Official Merch</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">the official drop, 2nd term run</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,6vw,5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              Urban Gang <span className="text-magenta">Merch</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[15.5px] leading-relaxed text-paper/70">
              The official tour drop. Pick a piece, pick a size, and pay with M-Pesa or order straight
              through WhatsApp. We confirm delivery once payment lands.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mt-2 overflow-hidden bg-gold py-2.5">
        <div className="animate-[ugt-marquee_22s_linear_infinite] flex w-max whitespace-nowrap font-display text-[15px] tracking-[0.1em] text-[#3A2300]">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className="px-6">WORN AT EVERY STOP</span>
              <span>*</span>
              <span className="px-6">TEES, HOODIES, CAPS</span>
              <span>*</span>
              <span className="px-6">ORDER VIA WHATSAPP 0799 886 247</span>
              <span>*</span>
              <span className="px-6">FROM POTENTIAL TO PURPOSE</span>
              <span>*</span>
            </span>
          ))}
        </div>
      </div>

      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MERCH_PRODUCTS.map((p, i) => (
              <Reveal key={p.key} delay={(i % 6) * 0.05}>
                <ProductCard product={p} price={byKey.get(p.key)} />
              </Reveal>
            ))}
          </div>

          {COMING_SOON.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON.map((name) => (
                <div
                  key={name}
                  className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gold/50 bg-gold/[0.04] p-8 text-center"
                >
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#F5A623" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <path d="M16 2v20" />
                  </svg>
                  <div className="mt-3 font-display text-xl uppercase">{name}</div>
                  <div className="mt-1.5 font-marker text-[15px] text-gold">dropping soon, watch the socials</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          <Reveal>
            <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-9">
              <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="#C7238E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M3.5 21 14 3" />
                <path d="M20.5 21 10 3" />
                <path d="M15.5 21 12 15l-3.5 6" />
                <path d="M2 21h20" />
              </svg>
              <div className="min-w-[250px] flex-1">
                <div className="font-display text-[20px] uppercase">Find the merch tent at every stop</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-paper/65">
                  Urban Gang Merch, Urban Gang Snacks, and the Urban Gang Moments photobooth travel with the
                  tour to every stop.
                </p>
              </div>
              <a
                href="/events"
                className="shrink-0 whitespace-nowrap rounded-full bg-gold/15 px-5 py-3 text-[13.5px] font-bold text-gold transition-colors duration-150 hover:bg-gold hover:text-ink"
              >
                Next stop
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
