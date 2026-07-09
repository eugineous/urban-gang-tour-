"use client";

interface VideoItem {
  src: string;
  tag: string;
  label: string;
  shadow: string;
}

const VIDEOS: VideoItem[] = [
  {
    src: "https://www.youtube.com/embed/videoseries?list=PLWRdLORbKcqU",
    tag: "THE PLAYLIST",
    label: "Urban News — every episode, in order",
    shadow: "#E6218C",
  },
  {
    src: "https://www.youtube.com/embed/P7a9iFNE33g",
    tag: "ON THE ROAD",
    label: "Straight from the tour, on Urban News",
    shadow: "#21C7E6",
  },
  {
    src: "https://www.youtube.com/embed/JSMflLGKaAw",
    tag: "THE FEATURE",
    label: "A full stop, start to finish",
    shadow: "#FFD400",
  },
];

export default function VideoRail() {
  function scrollBy(dir: number) {
    const el = document.getElementById("ugt-vid-rail");
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: "smooth" });
  }

  return (
    <div className="border-b-4 border-ink bg-magenta px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="-rotate-2 font-marker text-lg text-gold">roll the tape</div>
            <h2
              className="mt-1 font-display text-[clamp(30px,4.5vw,56px)] uppercase leading-[0.9] text-white"
              style={{ textShadow: "3px 3px 0 #111" }}
            >
              Watch The <span className="text-gold">Tour</span>
            </h2>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Previous videos"
              className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-white text-xl text-ink shadow-[3px_3px_0_#111]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="More videos"
              className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-white text-xl text-ink shadow-[3px_3px_0_#111]"
            >
              ›
            </button>
          </div>
        </div>

        <div
          id="ugt-vid-rail"
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {VIDEOS.map((v) => (
            <div key={v.src} className="w-[min(86%,760px)] flex-none snap-center">
              <div
                className="relative aspect-video overflow-hidden rounded-[20px] border-4 border-ink bg-black"
                style={{ boxShadow: `8px 8px 0 ${v.shadow}` }}
              >
                <iframe
                  src={v.src}
                  title={v.label}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <span className="flex-none rounded-full bg-ink px-3 py-1.5 font-badge text-[11px] text-gold">{v.tag}</span>
                <span className="pt-1 text-[13.5px] font-semibold leading-tight text-white">{v.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex justify-center">
          <a
            href="https://www.youtube.com/playlist?list=PLWRdLORbKcqU"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-gold px-6 py-3 font-badge text-[13px] text-gold"
          >
            OPEN THE FULL PLAYLIST ON YOUTUBE →
          </a>
        </div>
      </div>
    </div>
  );
}
