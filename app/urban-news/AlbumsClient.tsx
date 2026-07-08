"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { GUEST_ALBUMS, SESSION_ALBUMS, type Album } from "@/content/urban-news";

export default function AlbumsClient() {
  const [active, setActive] = useState<Album | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      else if (e.key === "ArrowRight") setIdx((i) => i + 1);
      else if (e.key === "ArrowLeft") setIdx((i) => i - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  function open(album: Album) {
    setActive(album);
    setIdx(0);
  }

  const len = active ? active.photos.length : 0;
  const nIdx = active ? ((idx % len) + len) % len : 0;

  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {GUEST_ALBUMS.map((a) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => open(a)}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-surface-raised transition-all duration-150 ease-out hover:-translate-y-1 hover:border-magenta"
          >
            <Image
              src={a.photos[0]}
              alt={a.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
              className="object-cover"
              style={{ objectPosition: a.pos }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,5,8,0.95) 0%, rgba(10,5,8,0.15) 46%, transparent 74%)" }} />
            <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-paper">{a.count}</div>
            <div className="absolute inset-x-0 bottom-0 p-4 text-left">
              <div className="inline-block rounded-full bg-magenta/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-paper">{a.tag}</div>
              <div className="mt-2 font-display text-[20px] uppercase leading-tight">{a.name}</div>
              <div className="mt-1 text-[12px] font-bold text-magenta-bright">View album</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-11 font-display text-[22px] uppercase text-paper/[0.92]">Sessions and theme days</div>
      <div className="mt-[1.125rem] grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SESSION_ALBUMS.map((a) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => open(a)}
            className="group relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 bg-surface-raised transition-all duration-150 ease-out hover:-translate-y-1 hover:border-gold"
          >
            <Image
              src={a.photos[0]}
              alt={a.name}
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 90vw, 45vw"
              className="object-cover"
              style={{ objectPosition: a.pos }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,5,8,0.92) 4%, rgba(10,5,8,0.1) 60%, transparent 82%)" }} />
            <div className="absolute right-3.5 top-3.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-paper">{a.count}</div>
            <div className="absolute inset-x-0 bottom-0 p-5 text-left">
              <div className="inline-block rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">{a.tag}</div>
              <div className="mt-2 font-display text-[26px] uppercase leading-none">{a.name}</div>
              <div className="mt-1.5 text-[12.5px] font-bold text-gold">Open session</div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-4 backdrop-blur-md sm:p-7"
          >
            <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4">
              <div>
                <div className="font-display text-[clamp(1.4rem,3vw,2rem)] uppercase leading-none">{active.name}</div>
                <div className="mt-1 text-[12px] font-bold uppercase tracking-wide text-magenta-bright">
                  {active.tag}, {active.count} photos
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg text-paper transition-colors duration-150 hover:bg-magenta"
              >
                &times;
              </button>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              className="mx-auto mt-4 flex w-full max-w-[1100px] flex-1 items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={() => setIdx((i) => i - 1)}
                aria-label="Previous"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-paper transition-colors duration-150 hover:bg-magenta"
              >
                &lsaquo;
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.photos[nIdx]}
                alt={active.name}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              />
              <button
                type="button"
                onClick={() => setIdx((i) => i + 1)}
                aria-label="Next"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-paper transition-colors duration-150 hover:bg-magenta"
              >
                &rsaquo;
              </button>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="mx-auto mt-4 flex w-full max-w-[1100px] flex-wrap justify-center gap-2">
              {active.photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIdx(i)}
                  className="relative h-[58px] w-[58px] overflow-hidden rounded-lg border-2"
                  style={{ borderColor: i === nIdx ? "#C7238E" : "transparent", opacity: i === nIdx ? 1 : 0.5 }}
                >
                  <Image src={src} alt="" fill sizes="58px" className="object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
