import { CockpitNav } from "@/components/cockpit/CockpitNav";
import { CockpitTopBar } from "@/components/cockpit/CockpitTopBar";
import { loadOfficeItems, groupOfficeItemsByCategory } from "@/lib/office";
import { OfficeHQ } from "@/components/cockpit/OfficeHQ";

const CATEGORY_LABELS: Record<string, string> = {
  physical: "Physical Space",
  behavior: "Human Behaviors",
  ritual: "Rituals & Processes",
  tool: "Tools & Interfaces",
  signal: "Signals & Feedback",
  role: "Roles & Hierarchy",
  failure: "Failure & Edge States",
};

export default function OfficePage() {
  const officeItems = loadOfficeItems();
  const grouped = groupOfficeItemsByCategory(officeItems);
  const summaries = Object.entries(grouped).map(([key, items]) => ({
    key,
    label: CATEGORY_LABELS[key] ?? key,
    count: items.length,
    preview: items.slice(0, 6),
  }));

  return (
    <div className="min-h-screen bg-[#08080b] text-white">
      <CockpitTopBar />
      <div className="flex">
        <CockpitNav />
        <div className="flex-1 px-4 lg:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300">ProPost HQ</p>
              <h1 className="text-2xl font-semibold">Immersive Office Backlog</h1>
              <p className="text-sm text-white/70">{officeItems.length} items parsed from office-immersive-300.md</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <div className="font-semibold text-white">Live run state</div>
              <div className="text-white/70">
                Sandbox-safe: office simulation can run without platform tokens. Tie behaviors to agent workloads next.
              </div>
            </div>
          </div>

          <OfficeHQ items={officeItems} />

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {summaries.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">{item.label}</div>
                <div className="text-3xl font-semibold text-white">{item.count}</div>
                <div className="space-y-1">
                  {item.preview.map((p) => (
                    <div key={p.id} className="text-xs text-white/70">
                      <span className="font-semibold text-white">{p.id}</span> - {p.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">Full backlog</div>
                <div className="text-lg font-semibold text-white">All office sim items</div>
              </div>
              <div className="text-xs text-white/60">Sorted by category, then ID</div>
            </div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {Object.entries(grouped).map(([key, items]) => (
                <div key={key} className="space-y-2">
                  <div className="text-sm font-semibold text-white">
                    {CATEGORY_LABELS[key] ?? key} ({items.length})
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {items.map((i) => (
                      <div key={i.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80">
                        <span className="font-semibold text-white">{i.id}</span> - {i.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
