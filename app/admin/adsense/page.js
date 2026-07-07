"use client";
import { useState, useEffect } from "react";
import { useAdminPw } from "../useAdminPw";
import AdminPwPrompt from "../AdminPwPrompt";

const S = {
  page: { color: "#fff" },
  h1: { fontSize: 26, fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24, marginBottom: 24 },
  label: { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
  mb: { marginBottom: 16 },
  saveBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)", margin: "20px 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" },
};

const SLOT_KEYS = [
  { key: "homeHero", label: "Home Hero" },
  { key: "eventsMid", label: "Events Mid" },
  { key: "blogLeaderboard", label: "Blog Leaderboard" },
  { key: "blogRectangle", label: "Blog Rectangle" },
  { key: "shopBottom", label: "Shop Bottom" },
];

export default function AdsenseAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [pubId, setPubId] = useState("");
  const [slots, setSlots] = useState({ homeHero: "", eventsMid: "", blogLeaderboard: "", blogRectangle: "", shopBottom: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/adsense").then(r => r.json()).then(data => {
      setPubId(data.adsensePubId || "");
      if (data.adSlots && typeof data.adSlots === "object") {
        setSlots(s => ({ ...s, ...data.adSlots }));
      }
      setLoading(false);
    });
  }, []);

  function setSlot(key, val) { setSlots(s => ({ ...s, [key]: val })); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const payload = { adsensePubId: pubId, adSlots: slots, password: pw };
    const res = await fetch("/api/admin/adsense", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setStatus("Saved!");
  }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>AdSense</h1>
      <p style={S.sub}>Configure Google AdSense publisher ID and ad slot IDs.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <div style={S.mb}>
          <label style={S.label}>AdSense Publisher ID</label>
          <input style={S.input} value={pubId} onChange={e => setPubId(e.target.value)} placeholder="ca-pub-0000000000000000" />
        </div>

        <div style={S.sectionTitle}>Ad Slot IDs</div>
        {SLOT_KEYS.map(({ key, label }) => (
          <div key={key} style={S.mb}>
            <label style={S.label}>{label}</label>
            <input style={S.input} value={slots[key] || ""} onChange={e => setSlot(key, e.target.value)} placeholder="0000000000" />
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <button style={S.saveBtn} onClick={save}>Save AdSense Config</button>
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
