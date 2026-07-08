"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { GALLERY_PHOTOS, GALLERY_REELS, MOMENT_FILTERS, PEOPLE_FILTERS } from "@/content/gallery";

export default function GalleryClient() {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(-1);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const photos = useMemo(() => {
    if (filter === "all") return GALLERY_PHOTOS;
    return GALLERY_PHOTOS.filter((p) => p.cat === filter || p.who === filter);
  }, [filter]);

  const lb = lightbox >= 0 && lightbox < photos.length ? photos[lightbox] : null;

  function toggleVideo(index: number) {
    const v = videoRefs.current.get(index);
    if (!v) return;
    if (v.paused) {
      videoRefs.current.forEach((other, i) => {
        if (i !== index) other.pause();
      });
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  return (
    <>
      <div className="mt-7">
        <div className="-rotate-1 font-marker text-[15px] text-gold/85">by moment</div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          {MOMENT_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setLightbox(-1);
              }}
              className="rounded-full border-2 px-[1.125rem] py-2 text-[13px] font-bold text-paper transition-all duration-150 ease-out hover:-translate-y-0.5 hover:-rotate-1 hover:border-gold"
              style={{
                background: filter === f.key ? "#C7238E" : "rgba(255,255,255,0.05)",
                borderColor: filter === f.key ? "#C7238E" : "rgba(255,255,255,0.25)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-4 -rotate-1 font-marker text-[15px] text-gold/85">by the people</div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          {PEOPLE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setLightbox(-1);
              }}
              className="rounded-full border-2 border-dashed px-3.5 py-2 text-[12.5px] font-bold text-paper transition-all duration-150 ease-out hover:translate-y-[-2px] hover:rotate-1 hover:border-magenta"
              style={{
                background: filter === f.key ? "#C7238E" : "rgba(255,255,255,0.05)",
                borderColor: filter === f.key ? "#C7238E" : "rgba(255,255,255,0.25)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 py-8 sm:px-10">
        <div className="[column-gap:14px] [columns:280px]">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setLightbox(i)}
              className="group relative mb-3.5 block w-full overflow-hidden rounded-2xl bg-surface-raised [break-inside:avoid]"
            >
              <Image
                src={p.src}
                alt={p.cap}
                width={p.width}
                height={p.height}
                loading="lazy"
                sizes="(max-width: 640px) 90vw, 280px"
                className="block h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.015]"
              />
              <div
                className="absolute inset-x-0 bottom-0 px-3.5 pb-2.5 pt-[1.625rem] text-left text-[12px] font-semibold text-paper/90"
                style={{ background: "linear-gradient(transparent, rgba(21,14,19,0.9))" }}
              >
                {p.cap}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 border-t-[3px] border-dashed border-magenta/40 bg-surface py-14">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
          <h2 className="font-display text-[clamp(1.9rem,4vw,2.4rem)] uppercase">
            Reels from the <span className="text-gold">road</span>
          </h2>
          <p className="mt-2 text-[13.5px] text-paper/60">
            Straight from @urban_newsgang and the partner pages. Follow for the full feed.
          </p>
          <div className="mt-[1.625rem] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY_REELS.map((r, i) => (
              <div key={r.src} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors duration-150 hover:border-magenta">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(i, el);
                  }}
                  onClick={() => toggleVideo(i)}
                  poster={r.poster}
                  playsInline
                  src={r.src}
                  controls
                  preload="metadata"
                  className="block h-[260px] w-full bg-black object-cover"
                />
                <div className="p-3.5 text-[13px] font-semibold text-paper/85">{r.cap}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3.5">
            <a
              href="https://instagram.com/urban_newsgang"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-magenta px-6 py-3.5 text-[14.5px] font-bold text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
            >
              More on Instagram
            </a>
            <a
              href="https://tiktok.com/@urban_newsgang"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border-2 border-white/50 px-6 py-3 text-[14.5px] font-bold text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
            >
              TikTok @urban_newsgang
            </a>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lb && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightbox(-1)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/[0.93] p-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lb.src}
              alt=""
              className="max-h-[88vh] max-w-[92%] rounded-[10px] shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
            />
            <div className="absolute inset-x-0 bottom-[1.625rem] text-center text-[14px] font-semibold text-paper/85">{lb.cap}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((lightbox - 1 + photos.length) % photos.length);
              }}
              aria-label="Previous"
              className="absolute left-[1.375rem] top-1/2 flex h-[3.125rem] w-[3.125rem] -translate-y-1/2 items-center justify-center rounded-full bg-magenta/85 text-2xl text-paper transition-colors duration-150 hover:bg-magenta"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((lightbox + 1) % photos.length);
              }}
              aria-label="Next"
              className="absolute right-[1.375rem] top-1/2 flex h-[3.125rem] w-[3.125rem] -translate-y-1/2 items-center justify-center rounded-full bg-magenta/85 text-2xl text-paper transition-colors duration-150 hover:bg-magenta"
            >
              &rsaquo;
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(-1);
              }}
              aria-label="Close"
              className="absolute right-[1.375rem] top-[1.375rem] flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] text-lg text-paper transition-colors duration-150 hover:bg-white/30"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
