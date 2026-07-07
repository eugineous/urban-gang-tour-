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

const FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/urbangangtour" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@urbangangtour" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/urbangangtour" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@urbangangtour" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/254..." },
];

export default function SocialAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [form, setForm] = useState({ instagram: "", tiktok: "", facebook: "", youtube: "", whatsapp: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/social").then(r => r.json()).then(data => {
      if (data && !data.error) setForm(f => ({ ...f, ...data }));
      setLoading(false);
    });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    // Validate all non-empty URLs start with https://
    for (const { key } of FIELDS) {
      if (form[key] && !form[key].startsWith("https://")) {
        return setStatus(`Error: ${key} URL must start with https://`);
      }
    }
    setStatus("Saving…");
    const res = await fetch("/api/admin/social", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setStatus("Saved!");
  }

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</div>;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Social Links</h1>
      <p style={S.sub}>Manage social media URLs displayed across the site.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} style={S.mb}>
            <label style={S.label}>{label}</label>
            <input style={{ ...S.input, borderColor: form[key] && !form[key].startsWith("https://") ? "#cc0077" : "#333" }} value={form[key] || ""} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
            {form[key] && !form[key].startsWith("https://") && <div style={{ fontSize: 11, color: "#ff6b6b", marginTop: 4 }}>Must start with https://</div>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
          <button style={S.saveBtn} onClick={save}>Save Social Links</button>
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
