"use client";

import { useEffect, useMemo, useState } from "react";
import { OfficeItem, OfficeItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type AgentState = {
  name: string;
  company: string;
  role: string;
  status: OfficeItemStatus | "active" | "alert" | "break";
  task: string;
  eta: string;
};

const ROOMS = [
  { key: "XForce", title: "War Room", color: "from-sky-600/60 via-slate-900 to-black" },
  { key: "LinkedElite", title: "Boardroom", color: "from-blue-500/50 via-slate-900 to-black" },
  { key: "GramGod", title: "Studio", color: "from-pink-500/50 via-slate-900 to-black" },
  { key: "PagePower", title: "Community Hall", color: "from-blue-400/50 via-slate-900 to-black" },
  { key: "WebBoss", title: "Engine Room", color: "from-emerald-500/50 via-slate-900 to-black" },
  { key: "IntelCore", title: "Situation Room", color: "from-amber-400/60 via-slate-900 to-black" },
];

const BASE_AGENTS: AgentState[] = [
  { name: "ZARA", company: "XForce", role: "CEO", status: "active", task: "Review morning posts", eta: "02m" },
  { name: "BLAZE", company: "XForce", role: "Content", status: "active", task: "Draft thread", eta: "08m" },
  { name: "SCOUT", company: "XForce", role: "Trends", status: "active", task: "Scan trends", eta: "00m" },
  { name: "ECHO", company: "XForce", role: "Engagement", status: "active", task: "Replies", eta: "04m" },
  { name: "HAWK", company: "XForce", role: "Safety", status: "active", task: "Policy check", eta: "03m" },
  { name: "AURORA", company: "GramGod", role: "CEO", status: "break", task: "Story review", eta: "05m" },
  { name: "CHAT", company: "GramGod", role: "DMs", status: "alert", task: "DM queue spike", eta: "01m" },
  { name: "NOVA", company: "LinkedElite", role: "CEO", status: "active", task: "Approve LI post", eta: "06m" },
  { name: "ORATOR", company: "LinkedElite", role: "Content", status: "active", task: "Write carousel", eta: "12m" },
  { name: "CHIEF", company: "PagePower", role: "CEO", status: "active", task: "Review comments", eta: "07m" },
  { name: "ROOT", company: "WebBoss", role: "CEO", status: "active", task: "SEO crawl", eta: "09m" },
  { name: "SOVEREIGN", company: "IntelCore", role: "Supreme", status: "active", task: "Route commands", eta: "-" },
  { name: "SENTRY", company: "IntelCore", role: "Crisis", status: "alert", task: "Crisis scan", eta: "Running" },
  { name: "MEMORY", company: "IntelCore", role: "Learning", status: "active", task: "Post-metrics sync", eta: "15m" },
];

type Props = {
  items: OfficeItem[];
};

const statusToColor: Record<string, string> = {
  active: "bg-emerald-400",
  "in-progress": "bg-emerald-400",
  alert: "bg-red-500",
  break: "bg-amber-400",
  backlog: "bg-slate-500",
  planned: "bg-cyan-400",
  done: "bg-emerald-500",
};

function AnimatedAgent({ agent }: { agent: AgentState }) {
  return (
    <div className="relative rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm shadow-black/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", statusToColor[agent.status] ?? "bg-slate-400")} />
          <div className="text-sm font-semibold text-white">{agent.name}</div>
          <div className="text-[11px] text-white/60">{agent.role}</div>
        </div>
        <div className="text-[11px] text-white/60">{agent.eta}</div>
      </div>
      <div className="mt-1 text-xs text-white/70">{agent.task}</div>
    </div>
  );
}

function RoomCard({ room, agents }: { room: (typeof ROOMS)[number]; agents: AgentState[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br overflow-hidden shadow-md shadow-black/40"
         style={{ minHeight: 220 }}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/60">{room.title}</div>
          <div className="text-lg font-semibold text-white">{room.key}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>online</span>
        </div>
      </div>
      <div className={cn("p-4 grid gap-2", "bg-gradient-to-b", room.color)}>
        {agents.length === 0 && <div className="text-xs text-white/60">No agents assigned</div>}
        {agents.map((a) => (
          <AnimatedAgent key={a.name} agent={a} />
        ))}
      </div>
    </div>
  );
}

export function OfficeHQ({ items }: Props) {
  const [agents, setAgents] = useState<AgentState[]>(BASE_AGENTS);

  // Simple ticker to shuffle tasks/statuses for a “living office” feel.
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          const roll = Math.random();
          let status: AgentState["status"] = a.status;
          if (roll < 0.1) status = "alert";
          else if (roll < 0.25) status = "break";
          else status = "active";
          const task = roll < 0.1 ? "Crisis drill" : roll < 0.25 ? "Coffee cooldown" : a.task;
          const eta = roll < 0.1 ? "now" : roll < 0.25 ? "05m" : a.eta;
          return { ...a, status, task, eta };
        }),
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, AgentState[]> = {};
    for (const room of ROOMS) map[room.key] = [];
    agents.forEach((a) => {
      if (!map[a.company]) map[a.company] = [];
      map[a.company].push(a);
    });
    return map;
  }, [agents]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROOMS.map((room) => (
          <RoomCard key={room.key} room={room} agents={grouped[room.key] || []} />
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Backlog coverage</div>
            <div className="text-lg font-semibold text-white">320 office immersion items</div>
          </div>
          <div className="text-xs text-white/60">Physical + Behavior + Ritual + Tool + Signal + Role + Failure</div>
        </div>
        <div className="text-xs text-white/70">
          Items are parsed from <code>office-immersive-300.md</code> / <code>content/office-items.json</code>. Next step:
          persist into <code>office_items</code> table and drive room props + behaviors directly from status.
        </div>
      </div>
    </div>
  );
}
