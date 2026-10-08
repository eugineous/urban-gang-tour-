"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { media, collections } from "./MediaLibrary";
import { useCalmMotion } from "./ExperienceRails";
const savedKey = "ugt-tok-saved-v1";
export function ReelsFeed() {
  const all = useMemo(
    () =>
      media
        .filter(
          (a) =>
            a.kind === "video" && a.collection !== "host-contact-portraits",
        )
        .sort(
          (a, b) =>
            (collections.find((c) => c.slug === a.collection)?.category ===
            "Campus"
              ? 0
              : 1) -
              (collections.find((c) => c.slug === b.collection)?.category ===
              "Campus"
                ? 0
                : 1) || a.id.localeCompare(b.id),
        ),
    [],
  );
  const [query, setQuery] = useState(""),
    [saved, setSaved] = useState<string[]>([]),
    [savedOnly, setSavedOnly] = useState(false),
    [active, setActive] = useState(0),
    [muted, setMuted] = useState(true),
    [paused, setPaused] = useState(false),
    [manual, setManual] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(false);
  const motion = useCalmMotion(),
    feed = useRef<HTMLDivElement>(null),
    players = useRef(new Map<string, HTMLVideoElement>());
  const films = useMemo(
      () =>
        all.filter(
          (a) =>
            (!savedOnly || saved.includes(a.id)) &&
            (!query ||
              `${a.title} ${collections.find((c) => c.slug === a.collection)?.title || ""}`
                .toLowerCase()
                .includes(query.toLowerCase())),
        ),
      [all, saved, savedOnly, query],
    ),
    item = films[active];
  useEffect(() => {
    try {
      setSaved(
        JSON.parse(localStorage.getItem(savedKey) || "[]").filter(
          (id: string) => all.some((a) => a.id === id),
        ),
      );
    } catch {}
    const id = new URLSearchParams(location.search).get("film"),
      index = all.findIndex((a) => a.id === id);
    if (index > 0) {
      setActive(index);
      requestAnimationFrame(() =>
        feed.current?.scrollTo({
          top: index * (feed.current?.clientHeight || 0),
        }),
      );
    }
  }, [all]);
  useEffect(() => {
    for (const [id, v] of players.current) {
      if (id === item?.id && (motion || manual) && !paused)
        v.play().catch(() => setNotice("Tap play to start this video."));
      else v.pause();
    }
    if (item) {
      const u = new URL(location.href);
      u.searchParams.set("film", item.id);
      history.replaceState(null, "", u);
    }
    setError(false);
  }, [item?.id, motion, manual, paused]);
  useEffect(() => {
    const visibility = () => {
      for (const [id, v] of players.current)
        if (document.hidden) v.pause();
        else if (id === item?.id && (motion || manual) && !paused)
          v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [item?.id, motion, manual, paused]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        move(e.key === "ArrowDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, films.length]);
  function move(direction: number) {
    feed.current?.scrollTo({
      top:
        Math.min(films.length - 1, Math.max(0, active + direction)) *
        (feed.current?.clientHeight || 0),
      behavior: motion ? "smooth" : "instant",
    });
  }
  function change(value: string, only = savedOnly) {
    setQuery(value);
    setSavedOnly(only);
    setActive(0);
    feed.current?.scrollTo({ top: 0 });
    setPaused(false);
  }
  function save() {
    if (!item) return;
    const ids = saved.includes(item.id)
      ? saved.filter((id) => id !== item.id)
      : [...saved, item.id];
    setSaved(ids);
    try {
      localStorage.setItem(savedKey, JSON.stringify(ids));
    } catch {}
    setNotice(
      ids.includes(item.id)
        ? "Saved on this device"
        : "Removed from saved videos",
    );
  }
  async function share() {
    if (!item) return;
    const url = location.origin + "/reels/?film=" + item.id;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Video link copied");
      }
    } catch {
      setNotice("Share the video link from the address bar.");
    }
  }
  return (
    <section className="reels-page">
      <div className="reels-toolbar">
        <h1>Reels</h1>
        <label>
          <span className="sr-only">Search videos</span>
          <input
            type="search"
            placeholder="Find a school, campus or moment"
            value={query}
            onChange={(e) => change(e.target.value)}
          />
        </label>
        <button
          className={savedOnly ? "selected" : ""}
          aria-pressed={savedOnly}
          onClick={() => change(query, !savedOnly)}
        >
          {savedOnly ? "Show all" : "Saved"}
        </button>
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Turn sound on" : "Mute videos"}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
      <div
        className="reels-scroll"
        ref={feed}
        tabIndex={0}
        aria-label="Reels video feed. Swipe or scroll for the next video"
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.min(
            films.length - 1,
            Math.max(0, Math.round(el.scrollTop / el.clientHeight)),
          );
          if (index !== active) {
            setActive(index);
            setPaused(false);
          }
        }}
      >
        {films.length ? (
          films.map((film, index) => {
            const collection = collections.find(
                (c) => c.slug === film.collection,
              ),
              prepared = Math.abs(index - active) <= 1;
            return (
              <article
                className="reels-frame"
                key={film.id}
                data-active={index === active}
              >
                <video
                  ref={(el) => {
                    if (el) players.current.set(film.id, el);
                    else players.current.delete(film.id);
                  }}
                  src={
                    index === active || (prepared && motion)
                      ? film.src
                      : undefined
                  }
                  preload={
                    prepared && motion && film.bytes < 5_000_000
                      ? "auto"
                      : "metadata"
                  }
                  muted={index === active ? muted : true}
                  playsInline
                  loop
                  aria-label={film.title}
                  data-active={index === active}
                  onError={() => {
                    if (index === active) setError(true);
                  }}
                />
                {index === active && (
                  <>
                    <div className="reels-video-controls">
                      <button
                        aria-label={
                          paused || (!motion && !manual)
                            ? "Play video"
                            : "Pause video"
                        }
                        onClick={() => {
                          if (!motion && !manual) {
                            setManual(true);
                            setPaused(false);
                          } else setPaused(!paused);
                        }}
                      >
                        {paused || (!motion && !manual) ? "Play" : "Pause"}
                      </button>
                      <button
                        aria-label={
                          saved.includes(film.id)
                            ? "Unsave video"
                            : "Save video"
                        }
                        aria-pressed={saved.includes(film.id)}
                        onClick={save}
                      >
                        {saved.includes(film.id) ? "Saved" : "Save"}
                      </button>
                      <button onClick={share}>Share</button>
                    </div>
                    <div className="reels-caption">
                      <p>URBAN GANG TOUR · {collection?.category}</p>
                      <h2>
                        {collection?.title || film.title.replace(" · film", "")}
                      </h2>
                      <p>
                        {collection?.description ||
                          "Original moments from the Urban Gang Tour archive."}
                      </p>
                      <a href={"/gallery/" + film.collection}>
                        View this collection ↗
                      </a>
                      <small>Swipe up or scroll for the next moment</small>
                    </div>
                    {error && (
                      <div className="reels-error" role="alert">
                        This clip could not load.{" "}
                        <button
                          onClick={() => {
                            setError(false);
                            players.current.get(film.id)?.load();
                          }}
                        >
                          Retry video
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })
        ) : (
          <div className="reels-no-results">
            <h2>{savedOnly ? "No saved videos yet" : "No matching videos"}</h2>
            <p>
              {savedOnly
                ? "Save a moment to find it here."
                : "Try a school, event or campus name."}
            </p>
            <button onClick={() => change("", false)}>Watch all videos</button>
          </div>
        )}
      </div>
      {notice && (
        <p
          className="reels-notice"
          role="status"
          onAnimationEnd={() => setNotice("")}
        >
          {notice}
        </p>
      )}
    </section>
  );
}
