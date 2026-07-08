"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const LINKS = [
  { href: "/events", label: "Tours" },
  { href: "/experience", label: "Experience" },
  { href: "/the-gang", label: "The Gang" },
  { href: "/shop", label: "Shop" },
  { href: "/blog", label: "Newsroom" },
  { href: "/partners", label: "Partners" },
  { href: "/contact-us", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-ink/90 backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image src="/assets/brand/logo_transparent.png" alt="Urban Gang Tour" width={1024} height={1024} priority className="h-9 w-auto" />
          <span className="hidden font-display text-sm uppercase tracking-[-0.01em] text-paper sm:block">
            Urban Gang Tour
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] font-semibold uppercase tracking-wide text-paper/70 transition-colors duration-150 ease-out hover:text-paper"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/book"
            className="hidden rounded-full bg-magenta px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97] sm:block"
          >
            Book the Tour
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center lg:hidden"
          >
            <span className="sr-only">Menu</span>
            <div className="flex w-6 flex-col items-end gap-1.5">
              <motion.span
                className="h-[2px] w-6 bg-paper"
                animate={open ? { rotate: 45, y: 6.5, width: 24 } : { rotate: 0, y: 0, width: 24 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
              <motion.span
                className="h-[2px] bg-paper"
                animate={open ? { opacity: 0, width: 0 } : { opacity: 1, width: 18 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              />
              <motion.span
                className="h-[2px] w-6 bg-paper"
                animate={open ? { rotate: -45, y: -6.5, width: 24 } : { rotate: 0, y: 0, width: 24 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 top-[64px] z-40 bg-ink/[0.98] backdrop-blur-md lg:hidden"
          >
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-1 px-6 py-8"
            >
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.08 + i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-white/10 py-4 font-display text-2xl uppercase text-paper"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className="mt-6 rounded-full bg-magenta px-6 py-4 text-center text-[13px] font-bold uppercase tracking-wide text-paper active:scale-[0.97]"
              >
                Book the Tour
              </Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
