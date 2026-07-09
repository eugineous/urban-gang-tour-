import Link from "next/link";
import Image from "next/image";

const EXPLORE = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/experience", label: "The Experience" },
  { href: "/events", label: "Tour Stops" },
  { href: "/blog", label: "Urban News" },
  { href: "/the-gang", label: "The Gang" },
  { href: "/shop", label: "Shop" },
];

const BOOK = [
  { href: "/book#brands", label: "For Brands" },
  { href: "/book#schools", label: "For Schools" },
  { href: "/book#campus", label: "For Campuses" },
  { href: "/book#mega", label: "For Mega Events" },
  { href: "/partners", label: "Partners" },
];

const SOCIALS = [
  { href: "https://www.tiktok.com/@urban_newsgang", label: "TikTok", bg: "bg-ink" },
  { href: "https://www.instagram.com/urban_newsgang", label: "Instagram", bg: "bg-magenta" },
  { href: "https://www.youtube.com/@urban_newsgang", label: "YouTube", bg: "bg-cyan" },
  { href: "https://www.facebook.com/urban_newsgang", label: "Facebook", bg: "bg-ink" },
  { href: "https://x.com/urban_newsgang", label: "X", bg: "bg-gold" },
];

export default function Footer() {
  return (
    <footer className="border-t-4 border-gold bg-ink px-6 pb-8 pt-14 text-white sm:px-10">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" width={1024} height={1024} className="h-[60px] w-auto" />
          <div className="mt-3 font-marker text-[19px] text-gold">From Potential to Purpose</div>
          <p className="mt-2 max-w-[280px] text-[13.5px] leading-relaxed text-white/70">
            Kenya&apos;s youth talent search, mentorship, and awards concert tour. Live, and on the national screen.
          </p>
        </div>
        <div>
          <div className="mb-3.5 font-display text-lg uppercase text-gold">Explore</div>
          <div className="flex flex-col gap-2.5 text-[14px] font-semibold">
            {EXPLORE.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/75 transition-colors duration-150 hover:text-gold">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3.5 font-display text-lg uppercase text-gold">Book Us</div>
          <div className="flex flex-col gap-2.5 text-[14px] font-semibold">
            {BOOK.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/75 transition-colors duration-150 hover:text-gold">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3.5 font-display text-lg uppercase text-gold">Connect</div>
          <a href="mailto:admin@urbangangtour.co.ke" className="block text-[14px] font-semibold text-white/75 hover:text-gold">
            admin@urbangangtour.co.ke
          </a>
          <div className="mt-1 text-[14px] text-white/75">@urban_newsgang</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white text-[12px] font-bold text-white ${s.bg}`}
              >
                {s.label[0]}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1320px] flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-white/30 pt-6 text-[12.5px] text-white/60">
        <div>© 2026 Urban Gang Tour · Nairobi, Kenya · From Potential to Purpose</div>
        <Link href="/admin" className="text-white/30 hover:text-white/60">
          Staff
        </Link>
      </div>
    </footer>
  );
}
