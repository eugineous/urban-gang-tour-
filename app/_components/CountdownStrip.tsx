"use client";

import { useEffect, useState } from "react";

function getParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export default function CountdownStrip({ target, dark = false }: { target: number; dark?: boolean }) {
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const t = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  const cell = (val: number, label: string, accent = false) => (
    <div
      className={`min-w-[52px] rounded-[10px] px-2.5 py-2 text-center ${
        accent ? "border-2 border-ink bg-magenta text-white" : dark ? "border-2 border-white/20 bg-black text-white" : "bg-ink text-white"
      }`}
    >
      <div className="font-display text-[22px] leading-none">{String(val).padStart(2, "0")}</div>
      <div className={`text-[9px] font-bold tracking-[0.1em] ${accent ? "text-white" : "text-gold"}`}>{label}</div>
    </div>
  );

  return (
    <div className="flex gap-1.5">
      {cell(parts.d, "DAYS")}
      {cell(parts.h, "HRS")}
      {cell(parts.m, "MIN")}
      {cell(parts.s, "SEC", true)}
    </div>
  );
}
