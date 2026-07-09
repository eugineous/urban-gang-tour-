"use client";

import { useEffect, useState } from "react";

const WORDS = ["CULTURE", "TALENT", "FESTIVALS", "EXPERIENCES", "LEGENDS", "COLOUR"];

export default function TypedWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-block min-w-[11.5ch] -rotate-1 border-2 border-ink bg-gold px-2.5 py-0.5 text-left text-ink">
      {WORDS[i]}
      <span className="ml-0.5 inline-block h-[0.85em] w-[3px] animate-blink bg-ink align-[-1px]" />
    </span>
  );
}
