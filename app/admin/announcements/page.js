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

const COLORS = [
  { value: "magenta", label: "Magenta", hex: "#cc0077" },
  { value: "orange", label: "Orange", hex: "#ff6b00" },
  { value: "green", label: "Green", hex: "#00a550" },
  { value: "ink", label: "Ink (dark)", hex: "#1a1a1a" },
];

export default function AnnouncementsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [form, setForm] = useState({ text: "", color: "magenta", active: true });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/announcements").then(r => r.json()).then(data => {
      if (data && !data.error) setForm(f => ({ ...f, ...data }));
      setLoading(false);
    });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const res = await fetch("/api/admin/announcements", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setStatus("Saved!");
  }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  const previewColor = COLORS.find(c => c.value === form.color)?.hex || "#cc0077";

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Announcement Banner</h1>
      <p style={S.sub}>Sitewide announcement shown at the top of every page.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      {form.text && (
        <div style={{ background: previewColor, padding: "10px 20px", borderRadius: 6, marginBottom: 24, fontSize: 14, color: "#fff", fontWeight: 600 }}>
          Preview: {form.text}
        </div>
      )}

      <div style={S.card}>
        <div style={S.mb}><label style={S.label}>Announcement Text</label><input style={S.input} value={form.text} onChange={e => set("text", e.target.value)} placeholder="🎉 Next show: Nairobi, March 22 — Get tickets now!" /></div>
        <div style={S.mb}>
          <label style={S.label}>Color</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <label key={c.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="radio" name="color" value={c.value} checked={form.color === c.value} onChange={() => set("color", c.value)} />
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: c.hex, display: "inline-block", border: "2px solid #444" }} />
                <span style={{ fontSize: 13, color: "#fff" }}>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ ...S.mb, display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="active" checked={!!form.active} onChange={e => set("active", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
          <label htmlFor="active" style={{ fontSize: 13, color: "#fff", cursor: "pointer" }}>Active (show on site)</label>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>Save Announcement</button>
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
