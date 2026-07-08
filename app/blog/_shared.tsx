import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/events", label: "Tour Stops" },
  { href: "/the-gang", label: "The Gang" },
  { href: "/gallery", label: "Gallery" },
  { href: "/blog", label: "Blog" },
  { href: "/shop", label: "Shop" },
  { href: "/contact-us", label: "Contact" },
];

export function BlogNav() {
  return (
    <div className="sticky top-0 z-50 border-b border-[#C7238E]/25 bg-[#150E13]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" width={1024} height={1024} priority className="h-10 w-auto bg-[#1B1118]" />
          <span className="font-[family-name:var(--font-display)] text-sm uppercase tracking-wide text-white">
            Urban Gang Tour
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-white/75 transition hover:text-white">
              {l.label}
            </Link>
          ))}
          <Link
            href="/book"
            className="rounded-full bg-[#C7238E] px-4 py-2 text-white transition hover:bg-[#E12FA3]"
          >
            Book Us Now
          </Link>
        </nav>
      </div>
    </div>
  );
}

export function BlogFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#C7238E]/30 bg-[#110A0F] px-6 py-8 sm:px-[clamp(24px,5vw,70px)]">
      <div className="flex items-center gap-3.5">
        <Image src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" width={1024} height={1024} loading="lazy" className="h-[50px] w-auto bg-[#1B1118]" />
        <div>
          <div className="font-[family-name:var(--font-marker)] text-sm text-[#F5A623]">From Potential to Purpose</div>
          <div className="text-xs text-white/50">© 2026 Urban Gang Tour · Nairobi, Kenya</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-[13px]">
        <Link href="/" className="text-white/75 hover:text-white">Home</Link>
        <Link href="/events" className="text-white/75 hover:text-white">Tour Stops</Link>
        <Link href="/gallery" className="text-white/75 hover:text-white">Gallery</Link>
        <a href="https://instagram.com/urban_newsgang" target="_blank" rel="noopener noreferrer" className="font-bold text-[#C7238E]">
          @urban_newsgang
        </a>
      </div>
    </div>
  );
}
