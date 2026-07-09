"use client";

import { useEffect, useState } from "react";
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
      <div className="mt-7 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {GUEST_ALBUMS.map((a, i) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => open(a)}
            className={`group relative aspect-[3/4] overflow-hidden rounded-2xl border-[3px] border-ink shadow-[4px_4px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1 ${i % 2 ? "rotate-1" : "-rotate-1"} hover:rotate-0`}
          >
            <img src={a.photos[0]} alt={a.name} style={{ objectPosition: a.pos }} className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0.1) 46%, transparent 74%)" }} />
            <div className="absolute right-2.5 top-2.5 rounded-full border border-white/40 bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white">{a.count}</div>
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-left">
              <div className="inline-block rounded-full border-2 border-white bg-magenta px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">{a.tag}</div>
              <div className="mt-1.5 font-display text-[18px] uppercase leading-tight text-white">{a.name}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-9 font-display text-[20px] uppercase">Sessions &amp; Theme Days</div>
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {SESSION_ALBUMS.map((a) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => open(a)}
            className="group relative aspect-[16/10] overflow-hidden rounded-2xl border-[3px] border-ink shadow-[5px_5px_0_#111] transition-transform duration-150 ease-out hover:-translate-y-1"
          >
            <img src={a.photos[0]} alt={a.name} style={{ objectPosition: a.pos }} className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(17,17,17,0.92) 4%, rgba(17,17,17,0.1) 60%, transparent 82%)" }} />
            <div className="absolute right-3.5 top-3.5 rounded-full border border-white/40 bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white">{a.count}</div>
            <div className="absolute inset-x-0 bottom-0 p-5 text-left">
              <div className="inline-block rounded-full border-2 border-ink bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase">{a.tag}</div>
              <div className="mt-1.5 font-display text-[24px] uppercase leading-none text-white">{a.name}</div>
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
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-4 sm:p-7"
          >
            <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4">
              <div>
                <div className="font-display text-[clamp(20px,3vw,32px)] uppercase leading-none text-white">{active.name}</div>
                <div className="mt-1 text-[12px] font-bold uppercase tracking-wide text-magenta">{active.tag}, {active.count} photos</div>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label="Close" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-white bg-white/10 text-lg text-white">
                &times;
              </button>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="mx-auto mt-4 flex w-full max-w-[1100px] flex-1 items-center justify-center gap-3">
              <button type="button" onClick={() => setIdx((i) => i - 1)} aria-label="Previous" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-white bg-white/10 text-2xl text-white">
                &lsaquo;
              </button>
              <img src={active.photos[nIdx]} alt={active.name} className="max-h-full max-w-full rounded-xl border-2 border-white object-contain" />
              <button type="button" onClick={() => setIdx((i) => i + 1)} aria-label="Next" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-white bg-white/10 text-2xl text-white">
                &rsaquo;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
