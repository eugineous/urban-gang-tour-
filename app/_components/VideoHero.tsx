"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const REEL = [
  { id: "P7a9iFNE33g", title: "Loreto Kiambu Girls High" },
  { id: "JSMflLGKaAw", title: "Senior Chief Koinange Girls" },
];

const ROTATE_MS = 26000;

export default function VideoHero() {
  const [index, setIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVideoReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!videoReady || REEL.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % REEL.length);
    }, ROTATE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [videoReady]);

  const current = REEL[index];

  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-ink">
      {/* Poster frame: the actual LCP element. Always painted, never removed. */}
      <Image
        src={`https://img.youtube.com/vi/${REEL[0].id}/maxresdefault.jpg`}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {videoReady && (
        <div className="absolute inset-0">
          {REEL.map((v, i) => (
            <motion.iframe
              key={v.id}
              src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&loop=1&playlist=${v.id}&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`}
              title={v.title}
              allow="autoplay; encrypted-media"
              className="absolute left-1/2 top-1/2 h-[max(100%,177.78vh)] w-[max(100%,56.25vw)] -translate-x-1/2 -translate-y-1/2 border-0"
              initial={false}
              animate={{ opacity: i === index ? 1 : 0 }}
              transition={{ duration: 0.9, ease: [0.77, 0, 0.175, 1] }}
              style={{ pointerEvents: "none" }}
            />
          ))}
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,7,16,0.35) 0%, rgba(12,7,16,0.25) 40%, rgba(12,7,16,0.92) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 pb-20 pt-40 sm:px-10 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="inline-flex -rotate-1 items-center rounded-full bg-ink px-4 py-2 shadow-magenta"
        >
          <span className="font-display text-[11px] uppercase tracking-wide text-gold">Second Term</span>
          <span className="ml-1.5 font-display text-[11px] uppercase tracking-wide text-paper">Tour Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="mt-6 max-w-4xl text-balance font-display text-[clamp(2.75rem,7.5vw,5.75rem)] uppercase leading-[0.95] tracking-[-0.03em] text-paper"
        >
          Kenya's touring youth festival
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-paper/75"
        >
          Live battles, a full runway, mentorship pods, and a national broadcast. We build one stage at a
          time and take it to schools, campuses, and open grounds across the country.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-9 flex flex-wrap gap-4"
        >
          <Link
            href="/book"
            className="rounded-full bg-magenta px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
          >
            Book the Tour
          </Link>
          <Link
            href="/events"
            className="rounded-full border border-white/25 bg-white/5 px-8 py-4 text-[14px] font-bold uppercase tracking-wide text-paper backdrop-blur-sm transition-all duration-150 ease-out hover:border-white/50 active:scale-[0.97]"
          >
            See the Tour
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
