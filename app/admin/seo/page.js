"use client";
import { useState, useEffect } from "react";
import { useAdminPw } from "../useAdminPw";
import AdminPwPrompt from "../AdminPwPrompt";

const S = {
  page: { color: "#fff" },
  h1: { fontSize: 26, fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 16 },
  label: { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 },
  mb: { marginBottom: 12 },
  saveBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" },
};

const PAGE_KEYS = ["home", "events", "crew", "shop", "partners", "contact", "performers", "stops", "press", "tickets", "people"];

export default function SeoAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [data, setData] = useState({});
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/seo").then(r => r.json()).then(d => { setData(d || {}); setLoading(false); });
  }, []);

  function setField(pageKey, field, val) {
    setData(prev => ({ ...prev, [pageKey]: { ...(prev[pageKey] || {}), [field]: val } }));
  }

  async function savePage(pageKey) {
    if (!pw) return setStatuses(s => ({ ...s, [pageKey]: "Enter admin password first." }));
    setStatuses(s => ({ ...s, [pageKey]: "Saving…" }));
    const pageData = data[pageKey] || {};
    const res = await fetch("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pageData, pageKey, password: pw }) });
    const result = await res.json();
    if (result.error) { setStatuses(s => ({ ...s, [pageKey]: "Error: " + result.error })); return; }
    setStatuses(s => ({ ...s, [pageKey]: "Saved!" }));
    setTimeout(() => setStatuses(s => ({ ...s, [pageKey]: "" })), 3000);
  }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>SEO</h1>
      <p style={S.sub}>Configure page titles, descriptions, and meta tags for each page.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      {PAGE_KEYS.map(pageKey => {
        const p = data[pageKey] || {};
        return (
          <div key={pageKey} style={S.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "capitalize", color: "#cc0077" }}>/{pageKey === "home" ? "" : pageKey}</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {statuses[pageKey] && <span style={{ fontSize: 12, color: statuses[pageKey]?.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{statuses[pageKey]}</span>}
                <button style={S.saveBtn} onClick={() => savePage(pageKey)}>Save</button>
              </div>
            </div>
            <div style={S.row}>
              <div><label style={S.label}>Title</label><input style={S.input} value={p.title || ""} onChange={e => setField(pageKey, "title", e.target.value)} placeholder={`Urban Gang Tour — ${pageKey}`} /></div>
              <div><label style={S.label}>OG Image URL</label><input style={S.input} value={p.ogImage || ""} onChange={e => setField(pageKey, "ogImage", e.target.value)} placeholder="https://..." /></div>
            </div>
            <div style={S.mb}><label style={S.label}>Description</label><input style={S.input} value={p.description || ""} onChange={e => setField(pageKey, "description", e.target.value)} placeholder="Page meta description (150–160 chars)" /></div>
            <div><label style={S.label}>Keywords</label><input style={S.input} value={p.keywords || ""} onChange={e => setField(pageKey, "keywords", e.target.value)} placeholder="urban gang tour, nairobi events, afrobeats" /></div>
          </div>
        );
      })}
    </div>
  );
}
