import type { Metadata } from "next";
import Nav from "../_components/Nav";
import Footer from "../_components/Footer";
import Reveal from "../_components/Reveal";
import ContactForm from "./ContactForm";
import { CONTACT_EMAIL, WHATSAPP_OPENERS } from "./constants";

const title = "Contact & Bookings";
const description = "Bookings, partnerships, media, or joining the crew. One form, fast replies. We reply within 48 hours.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact-us" },
  openGraph: { title, description, url: "/contact-us", type: "website" },
};

const WHATSAPP_NUMBER = "254799886247";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-gold">
      <Nav />

      <div className="border-b-4 border-ink bg-magenta px-6 py-14 text-center sm:px-10">
        <div className="mx-auto max-w-[700px]">
          <Reveal>
            <div className="inline-block -rotate-2 rounded-full border-2 border-ink bg-ink px-4 py-2 font-badge text-[13px] text-gold">BOOK THE TOUR</div>
            <h1 className="mt-4 font-display text-[clamp(40px,7vw,80px)] uppercase leading-[0.9] text-ink" style={{ textShadow: "4px 4px 0 #fff" }}>
              Let&apos;s <span className="rounded border-[3px] border-ink bg-gold px-2.5">Talk</span>
            </h1>
            <p className="mx-auto mt-3.5 max-w-[540px] text-[16px] font-semibold leading-relaxed text-white">
              Bookings, partnerships, media, or joining the crew. One form, fast replies.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="px-6 py-14 sm:px-10">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border-[3px] border-ink bg-success p-7 text-white shadow-[6px_6px_0_#111]">
                <div className="font-display text-xl uppercase">Skip the form. WhatsApp us.</div>
                <div className="mt-1.5 text-[13.5px] text-white/90">0799 886 247, tap an opener:</div>
                <div className="mt-4 flex flex-col gap-2">
                  {WHATSAPP_OPENERS.map((text) => (
                    <a
                      key={text}
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border-2 border-white/40 bg-white/10 px-4 py-3 text-[13px] font-semibold transition-all duration-150 ease-out hover:translate-x-1"
                    >
                      &quot;{text}&quot;
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-[3px] border-ink bg-white p-6 shadow-[5px_5px_0_#111]">
                <div className="font-display text-lg uppercase">Email</div>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1.5 inline-block text-[14.5px] font-bold text-magenta">
                  {CONTACT_EMAIL}
                </a>
                <div className="my-3.5 border-t-2 border-dashed border-ink/20" />
                <div className="font-display text-lg uppercase">Socials, @urban_newsgang</div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[
                    { href: "https://instagram.com/urban_newsgang", label: "Instagram" },
                    { href: "https://tiktok.com/@urban_newsgang", label: "TikTok" },
                    { href: "https://youtube.com/@urban_newsgang", label: "YouTube" },
                    { href: "https://facebook.com/urban_newsgang", label: "Facebook" },
                  ].map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-ink bg-concrete px-3.5 py-1.5 text-[12.5px] font-bold">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-ink bg-cyan/40 p-5">
                <div className="font-marker text-lg">our promise:</div>
                <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed">
                  We reply within 48 hours. Every quotation is built for your numbers, rates are
                  negotiable and we work with institutions of every size.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <Footer />
    </div>
  );
}
