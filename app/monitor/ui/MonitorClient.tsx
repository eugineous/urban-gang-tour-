"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { OfficeHQ } from "@/components/cockpit/OfficeHQ";
import { OfficeItem } from "@/lib/types";

type MetricBlock = {
  followers: number | string;
  posts: number | string;
  engagement: number | string;
  impressions: number | string;
};

type LiveResponse = {
  timestamp: string;
  actions: number;
  posts: number;
  trends: number;
  agentsActive: number;
  monetization: { goal: number; current: number };
  metrics: {
    instagram: MetricBlock;
    x: MetricBlock;
    linkedin: MetricBlock;
    facebook: MetricBlock;
  };
};

type ActivityItem = { id: string; actor: string; message: string; type: string; at: string };

export function MonitorClient({ officeItems }: { officeItems: OfficeItem[] }) {
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [feed, setFeed] = useState<ActivityItem[]>([]);

  async function pullLive() {
    const res = await fetch("/api/monitor/live", { cache: "no-store" });
    if (res.ok) setLive(await res.json());
  }

  async function pullFeed() {
    const res = await fetch("/api/monitor/activity", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setFeed(data.feed || []);
    }
  }

  useEffect(() => {
    pullLive();
    pullFeed();
    const t1 = setInterval(pullLive, 15_000);
    const t2 = setInterval(pullFeed, 15_000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  const ts = live?.timestamp ? format(new Date(live.timestamp), "HH:mm:ss") : "-";

  return (
    <>
      <section className="grid md:grid-cols-4 gap-4">
        <Card label="Actions" value={live?.actions ?? "-"} ts={ts} />
        <Card label="Posts" value={live?.posts ?? "-"} ts={ts} />
        <Card label="Trends" value={live?.trends ?? "-"} ts={ts} />
        <Card label="Agents" value={live?.agentsActive ?? "-"} ts={ts} />
      </section>

      <section className="grid lg:grid-cols-5 gap-4">
        <MetricCard icon="📸" title="Instagram" data={live?.metrics.instagram} />
        <MetricCard icon="𝕏" title="X / Twitter" data={live?.metrics.x} />
        <MetricCard icon="💼" title="LinkedIn" data={live?.metrics.linkedin} />
        <MetricCard icon="👥" title="Facebook" data={live?.metrics.facebook} />
        <MonetCard goal={live?.monetization.goal} current={live?.monetization.current} />
      </section>

      <section className="grid lg:grid-cols-[2fr,1fr] gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Activity feed</div>
              <div className="text-lg font-semibold">Live</div>
            </div>
            <div className="text-xs text-white/60">{ts}</div>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
            {feed.map((f) => (
              <div key={f.id} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{f.actor}</div>
                  <div className="text-xs text-white/70">{f.message}</div>
                </div>
                <div className="text-[11px] text-white/50">{format(new Date(f.at), "HH:mm:ss")}</div>
              </div>
            ))}
            {feed.length === 0 && <div className="text-xs text-white/60">Waiting for events…</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">Virtual HQ snapshot</div>
          <OfficeHQ items={officeItems} />
        </div>
      </section>
    </>
  );
}

function Card({ label, value, ts }: { label: string; value: number | string; ts: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="text-[11px] text-white/50 mt-1">{ts}</div>
    </div>
  );
}

function MetricCard({ icon, title, data }: { icon: string; title: string; data?: MetricBlock }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-white/80">
        <span>{icon}</span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      <Row label="Followers" value={data?.followers ?? "-"} />
      <Row label="Posts" value={data?.posts ?? "-"} />
      <Row label="Engagement" value={data?.engagement ?? "-"} />
      <Row label="Impressions" value={data?.impressions ?? "-"} />
    </div>
  );
}

function MonetCard({ goal, current }: { goal?: number; current?: number }) {
  const pct = goal ? Math.min(100, Math.round(((current ?? 0) / goal) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="text-xs uppercase tracking-[0.2em] text-white/60">X Monetization</div>
      <div className="text-lg font-semibold text-white">5M goal</div>
      <div className="text-xs text-white/60">
        {current ?? 0} / {goal ?? 5_000_000}
      </div>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm text-white/80">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
