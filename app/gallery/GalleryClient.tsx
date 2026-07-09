"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GALLERY_PHOTOS, GALLERY_REELS, MOMENT_FILTERS, PEOPLE_FILTERS, type GalleryPhoto } from "@/content/gallery";

export default function GalleryClient({ uploadedPhotos = [] }: { uploadedPhotos?: GalleryPhoto[] }) {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(-1);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const allPhotos = useMemo(() => [...uploadedPhotos, ...GALLERY_PHOTOS], [uploadedPhotos]);

  const photos = useMemo(() => {
    if (filter === "all") return allPhotos;
    return allPhotos.filter((p) => p.cat === filter || p.who === filter);
  }, [filter, allPhotos]);

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
      <div className="mt-6">
        <div className="-rotate-1 font-marker text-[14px] text-ink/70">by moment</div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {MOMENT_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setLightbox(-1);
              }}
              className={`rounded-full border-2 border-ink px-4 py-2 text-[12.5px] font-bold transition-all duration-150 ease-out hover:-translate-y-0.5 ${
                filter === f.key ? "bg-magenta text-white" : "bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-3 -rotate-1 font-marker text-[14px] text-ink/70">by the people</div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {PEOPLE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setLightbox(-1);
              }}
              className={`rounded-full border-2 border-dashed border-ink px-3.5 py-2 text-[12px] font-bold transition-all duration-150 ease-out hover:-translate-y-0.5 ${
                filter === f.key ? "bg-magenta text-white" : "bg-white"
              }`}
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
              className="group relative mb-3.5 block w-full overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-[4px_4px_0_#111] [break-inside:avoid]"
            >
              <img src={p.src} alt={p.cap} className="block h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" />
              <div
                className="absolute inset-x-0 bottom-0 px-3.5 pb-2.5 pt-6 text-left text-[12px] font-semibold text-white"
                style={{ background: "linear-gradient(transparent, rgba(17,17,17,0.85))" }}
              >
                {p.cap}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t-4 border-ink bg-ink py-14">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
          <h2 className="font-display text-[clamp(26px,4vw,38px)] uppercase text-white">
            Reels From The <span className="text-gold">Road</span>
          </h2>
          <p className="mt-1.5 text-[13.5px] text-white/60">Straight from @urban_newsgang and the partner pages.</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY_REELS.map((r, i) => (
              <div key={r.src} className="overflow-hidden rounded-2xl border-2 border-white/15 bg-white/5">
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
                  className="block h-[220px] w-full bg-black object-cover"
                />
                <div className="p-3 text-[12.5px] font-semibold text-white/85">{r.cap}</div>
              </div>
            ))}
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
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-8"
          >
            <img src={lb.src} alt="" className="max-h-[88vh] max-w-[92%] rounded-lg border-4 border-white shadow-[0_20px_80px_rgba(0,0,0,0.7)]" />
            <div className="absolute inset-x-0 bottom-6 text-center text-[14px] font-semibold text-white">{lb.cap}</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((lightbox - 1 + photos.length) % photos.length);
              }}
              aria-label="Previous"
              className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-magenta text-2xl text-white"
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
              className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-magenta text-2xl text-white"
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
              className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-ink text-lg text-white"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
