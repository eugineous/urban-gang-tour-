import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import ContactForm from "./ContactForm";
import { CONTACT_EMAIL, WHATSAPP_OPENERS } from "./constants";

const title = "Contact and Bookings";
const description =
  "Bookings, partnerships, media, or joining the crew. One form, fast replies. We reply within 48 hours.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact-us" },
  openGraph: { title, description, url: "/contact-us", type: "website" },
};

const WHATSAPP_NUMBER = "254799886247";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />

      <section className="px-6 pb-10 pt-20 text-center sm:px-10 sm:pt-28">
        <div
          className="mx-auto max-w-[760px]"
          style={{ background: "radial-gradient(900px 500px at 50% -20%, rgba(199,35,142,0.35), transparent 65%)" }}
        >
          <Reveal>
            <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
              <span className="font-display text-[11px] uppercase tracking-wide text-gold">Get in touch</span>
            </div>
            <div className="mt-3 -rotate-1 font-marker text-xl text-gold">we reply within 48 hours</div>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.75rem,6vw,5rem)] uppercase leading-[0.96] tracking-[-0.03em]">
              Let us <span className="text-magenta">talk</span>
            </h1>
            <p className="mx-auto mt-4 max-w-[540px] text-[15.5px] leading-relaxed text-paper/70">
              Bookings, partnerships, media, or joining the crew. One form, fast replies. Welcome to the gang.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-6 pb-24 sm:px-10">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl p-8" style={{ background: "linear-gradient(150deg, #1E7A43, #0F4326)" }}>
                <div className="font-display text-xl uppercase text-paper">Skip the form. WhatsApp us.</div>
                <div className="mt-1.5 text-[13.5px] text-paper/85">0799 886 247, tap an opener:</div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {WHATSAPP_OPENERS.map((text) => (
                    <a
                      key={text}
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-white/25 bg-white/10 px-4 py-3.5 text-[13.5px] font-semibold text-paper transition-all duration-150 ease-out hover:translate-x-1 hover:bg-white/20"
                    >
                      &quot;{text}&quot;
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                <div className="font-display text-lg uppercase">Email</div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-block text-[15px] font-bold text-gold">
                  {CONTACT_EMAIL}
                </a>
                <div className="my-4 border-t border-dashed border-white/15" />
                <div className="font-display text-lg uppercase">Socials, @urban_newsgang</div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {[
                    { href: "https://instagram.com/urban_newsgang", label: "Instagram", accent: true },
                    { href: "https://tiktok.com/@urban_newsgang", label: "TikTok" },
                    { href: "https://youtube.com/@urban_newsgang", label: "YouTube" },
                    { href: "https://facebook.com/urban_newsgang", label: "Facebook" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        s.accent
                          ? "rounded-full bg-magenta/15 px-4 py-2 text-[13px] font-bold text-magenta-bright transition-colors duration-150 hover:bg-magenta hover:text-paper"
                          : "rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 text-[13px] font-bold text-paper transition-colors duration-150 hover:border-magenta"
                      }
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border-2 border-dashed border-gold/55 bg-gold/5 p-6">
                <div className="font-marker text-lg text-gold">our promise:</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-paper/80">
                  We reply within 48 hours. Every quotation is built for your numbers, rates are negotiable
                  and we work with institutions of every size.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
