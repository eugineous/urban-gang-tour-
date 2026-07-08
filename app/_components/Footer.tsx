import Link from "next/link";

const SOCIALS = [
  { href: "https://instagram.com/urban_newsgang", label: "Instagram" },
  { href: "https://facebook.com/urban_newsgang", label: "Facebook" },
  { href: "https://tiktok.com/@urban_newsgang", label: "TikTok" },
  { href: "https://youtube.com/@urban_newsgang", label: "YouTube" },
];

const COLUMNS = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/the-gang", label: "The Gang" },
      { href: "/partners", label: "Partners" },
      { href: "/blog", label: "Newsroom" },
    ],
  },
  {
    title: "Work With Us",
    links: [
      { href: "/events", label: "Tours" },
      { href: "/book", label: "Book the Tour" },
      { href: "/contact-us", label: "Sponsor an Event" },
      { href: "/shop", label: "Merch" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" className="h-12 w-auto" />
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-paper/60">
              Urban Gang Tour builds and produces youth culture experiences across Kenya: live tours,
              broadcast content, talent development, and brand activations.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-paper/70 transition-all duration-150 ease-out hover:border-magenta hover:text-paper active:scale-[0.95]"
                >
                  <SocialIcon platform={s.label} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="font-display text-sm uppercase tracking-wide text-paper/40">{col.title}</div>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14px] text-paper/75 transition-colors duration-150 hover:text-paper">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <div className="font-marker text-sm text-gold">From Potential to Purpose</div>
          <div className="text-[13px] text-paper/40">Copyright 2026 Urban Gang Tour. Nairobi, Kenya.</div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, width: 17, height: 17 };
  if (platform === "Instagram")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  if (platform === "Facebook")
    return (
      <svg {...common}>
        <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4v-2c0-.5.5-1 1-1z" />
      </svg>
    );
  if (platform === "TikTok")
    return (
      <svg {...common}>
        <path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46" />
        <path d="M14 3a5 5 0 0 0 5 5" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M11 10l4 2-4 2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
