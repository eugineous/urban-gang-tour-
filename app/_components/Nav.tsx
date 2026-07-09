"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "/about", label: "About & The Gang" },
  { href: "/experience", label: "The Tour" },
  { href: "/book", label: "Work With Us" },
  { href: "/blog", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/events", label: "Tickets" },
  { href: "/shop", label: "Shop" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-ink bg-white">
      <nav className="mx-auto flex h-[70px] max-w-[1320px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex flex-none items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" width={1024} height={1024} priority className="h-[46px] w-auto object-contain" />
        </Link>

        <div className="flex-1" />

        <div className="hidden items-center gap-5 font-sans text-[14px] font-bold uppercase tracking-wide lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="py-1.5 text-ink transition-colors duration-150 hover:text-magenta">
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/book"
          className="hidden flex-none -rotate-2 rounded-xl border-[3px] border-ink bg-gold px-5 py-3 font-sans text-[13px] font-bold uppercase tracking-wide text-ink shadow-[4px_4px_0_#111] transition-all duration-150 ease-out hover:-translate-y-0 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111] sm:block"
        >
          Book the Tour
        </Link>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border-[3px] border-ink bg-ink text-2xl text-white lg:hidden"
        >
          {open ? "×" : "☰"}
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 top-[70px] z-40 overflow-y-auto bg-magenta px-6 pb-10 pt-6 lg:hidden">
          <div className="flex flex-col gap-3 font-display text-[26px] uppercase">
            <Link href="/" onClick={() => setOpen(false)} className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 shadow-[4px_4px_0_#111]">
              Home
            </Link>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 shadow-[4px_4px_0_#111]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="rounded-2xl border-[3px] border-ink bg-gold px-5 py-3 shadow-[4px_4px_0_#111]"
            >
              Book the Tour
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
