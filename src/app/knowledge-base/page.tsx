"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "../shell";

type SectionId = "brand_voice" | "headline_guide" | "caption_guide" | "kenya_knowledge" | "gen_z_guide" | "video_topics" | "hashtag_strategy";

type Section = { id: SectionId; title: string; content: string; updated_at?: string };

const ORDER: SectionId[] = [
  "brand_voice",
  "headline_guide",
  "caption_guide",
  "kenya_knowledge",
  "gen_z_guide",
  "video_topics",
  "hashtag_strategy",
];

function SectionCard({ section, onSave, onReset }: { section: Section; onSave: (s: Section) => Promise<void>; onReset: (id: SectionId) => Promise<void>; }) {
  const [value, setValue] = useState(section.content);
  const [saving, setSaving] = useState(false);
  const dirty = value !== section.content;

  useEffect(() => { setValue(section.content); }, [section.content]);

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{section.title}</div>
          {section.updated_at && <div style={{ fontSize: 11, color: "#777" }}>Updated {new Date(section.updated_at).toLocaleString()}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" disabled={!dirty || saving} onClick={async () => { setSaving(true); await onReset(section.id); setSaving(false); }}>Reset</button>
          <button className="btn-red" disabled={!dirty || saving} onClick={async () => { setSaving(true); await onSave({ ...section, content: value }); setSaving(false); }}>Save</button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="inp"
        style={{ minHeight: 160, background: "#111", borderColor: dirty ? "#E50914" : "#333", fontFamily: "Inter, system-ui", lineHeight: 1.5 }}
      />
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState<"brain" | "test" | "how">("brain");
  const [sections, setSections] = useState<Record<SectionId, Section> | null>(null);
  const [loading, setLoading] = useState(true);
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const customizedCount = useMemo(() => {
    if (!sections) return 0;
    return ORDER.filter(id => sections[id]?.updated_at).length;
  }, [sections]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge-base", { cache: "no-store" });
      const data = await res.json();
      setSections(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save(section: Section) {
    await fetch("/api/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(section),
    });
    await load();
  }

  async function reset(id: SectionId) {
    await fetch(`/api/knowledge-base?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function runTest() {
    if (!testUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/preview-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testUrl }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally { setTesting(false); }
  }

  return (
    <Shell>
      <div className="fade" style={{ padding: 20, color: "#eee", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>?? Knowledge Base</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>The AI brain for headlines, captions, topics, hashtags.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <span className="tag tag-dark">{customizedCount} customized</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab === "brain" ? "btn-red" : "btn-ghost"}`} onClick={() => setTab("brain")}>AI Brain Sections</button>
          <button className={`btn ${tab === "test" ? "btn-red" : "btn-ghost"}`} onClick={() => setTab("test")}>Test the AI</button>
          <button className={`btn ${tab === "how" ? "btn-red" : "btn-ghost"}`} onClick={() => setTab("how")}>How It Works</button>
        </div>

        {tab === "brain" && (
          loading ? <div>Loading…</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12 }}>
              {ORDER.map(id => sections && (
                <SectionCard
                  key={id}
                  section={sections[id]}
                  onSave={save}
                  onReset={reset}
                />
              ))}
            </div>
          )
        )}

        {tab === "test" && (
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700 }}>Preview with current rules</div>
            <input className="inp" placeholder="Paste any article URL" value={testUrl} onChange={e => setTestUrl(e.target.value)} />
            <button className="btn btn-red" disabled={testing || !testUrl} onClick={runTest}>{testing ? "Generating…" : "Generate"}</button>
            {testResult && (
              <div className="card" style={{ padding: 12, background: "#111" }}>
                {testResult.error && <div style={{ color: "#f87171" }}>{testResult.error}</div>}
                {testResult.ai && (
                  <>
                    <div style={{ fontSize: 13, color: "#aaa" }}>Headline</div>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>{testResult.ai.clickbaitTitle}</div>
                    <div style={{ fontSize: 13, color: "#aaa" }}>Caption</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{testResult.ai.caption}</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "how" && (
          <div className="card" style={{ padding: 16, lineHeight: 1.6 }}>
            <h3 style={{ marginTop: 0 }}>Pipelines</h3>
            <ul style={{ color: "#ddd", paddingLeft: 18 }}>
              <li>Worker cron hits /api/automate every 10 minutes with jitter.</li>
              <li>/api/automate pulls PPP TV feed (24h window), filters quality, dedupes via Worker KV, posts 1 article.</li>
              <li>Headlines: Gemini 2.5 Flash with KB rules (4–7 words).</li>
              <li>Captions: NVIDIA Llama 3.1 8B with KB voice + structure; Gemini fallback; excerpt fallback.</li>
              <li>Images: satori + sharp with 9:16 default and PPP TV overlay; 4:5 fallback.</li>
              <li>Monitor: /api/monitor for env + feed health.</li>
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
