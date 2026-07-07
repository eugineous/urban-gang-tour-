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
};

export default function SettingsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [form, setForm] = useState({ tagline: "", email: "", whatsapp: "", heroStats: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      setForm({
        tagline: data.tagline || "",
        email: data.email || "",
        whatsapp: data.whatsapp || "",
        heroStats: data.heroStats ? JSON.stringify(data.heroStats, null, 2) : "",
      });
      setLoading(false);
    });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    let heroStats;
    try { heroStats = form.heroStats ? JSON.parse(form.heroStats) : undefined; } catch { return setStatus("Error: heroStats is not valid JSON."); }
    const payload = { tagline: form.tagline, email: form.email, whatsapp: form.whatsapp, ...(heroStats !== undefined && { heroStats }), password: pw };
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setStatus("Saved!");
  }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Site Settings</h1>
      <p style={S.sub}>Configure global site settings.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <div style={S.mb}><label style={S.label}>Tagline</label><input style={S.input} value={form.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Africa's Freshest Tour" /></div>
        <div style={S.mb}><label style={S.label}>Contact Email</label><input style={S.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="hello@urbangangtour.co.ke" /></div>
        <div style={S.mb}><label style={S.label}>WhatsApp URL</label><input style={S.input} value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="https://wa.me/254..." /></div>
        <div style={S.mb}>
          <label style={S.label}>Hero Stats (JSON)</label>
          <textarea style={{ ...S.input, height: 140, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} value={form.heroStats} onChange={e => set("heroStats", e.target.value)} placeholder={'[{"label": "Shows", "value": "50+"}, {"label": "Cities", "value": "12"}]'} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>Save Settings</button>
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
