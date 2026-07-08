import Link from "next/link";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav />
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center sm:px-10">
        <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
          <span className="font-display text-[11px] uppercase tracking-wide text-gold">404</span>
        </div>
        <h1 className="mt-5 text-balance font-display text-[clamp(2.5rem,6vw,4.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
          This stage <span className="text-magenta">hasn&apos;t been built</span>
        </h1>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-paper/70">
          The page you are looking for does not exist or has moved. Try one of these instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          <Link
            href="/"
            className="rounded-full bg-magenta px-7 py-3.5 text-[14px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
          >
            Home
          </Link>
          <Link
            href="/events"
            className="rounded-full border-2 border-white/25 px-7 py-3.5 text-[14px] font-bold uppercase tracking-wide text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
          >
            Tour Calendar
          </Link>
          <Link
            href="/contact-us"
            className="rounded-full border-2 border-white/25 px-7 py-3.5 text-[14px] font-bold uppercase tracking-wide text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
          >
            Contact
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
