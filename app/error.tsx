"use client";

import { useEffect } from "react";
import Link from "next/link";

// Deliberately self-contained: does not import Nav/Footer or any component
// that touches the crashed subtree, so this still renders even when the
// failure originated in shared layout chrome.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center text-paper">
      <div className="inline-flex -rotate-1 rounded-full bg-surface px-4 py-1.5 shadow-magenta">
        <span className="font-display text-[11px] uppercase tracking-wide text-gold">Something broke</span>
      </div>
      <h1 className="mt-5 text-balance font-display text-[clamp(2rem,5vw,3.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
        This page hit a <span className="text-magenta">snag</span>
      </h1>
      <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-paper/70">
        Something went wrong loading this page. It has been logged. Try again, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3.5">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-magenta px-7 py-3.5 text-[14px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border-2 border-white/25 px-7 py-3.5 text-[14px] font-bold uppercase tracking-wide text-paper transition-colors duration-150 hover:border-gold hover:text-gold"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
