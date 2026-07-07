"use client";
import { useState, useEffect } from "react";
import { useAdminPw } from "../useAdminPw";
import AdminPwPrompt from "../AdminPwPrompt";

const S = {
  page: { color: "#fff" },
  h1: { fontSize: 26, fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 12 },
  label: { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 },
  saveBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  delBtn: { background: "#3a0a0a", color: "#ff6b6b", border: "1px solid #5a1a1a", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" },
  editBtn: { background: "transparent", color: "#cc0077", border: "1px solid #cc0077", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(204,0,119,0.15)", color: "#cc0077" },
};

const EMPTY = { slug: "", name: "", role: "", bio: "", photo: "", instagram: "", tiktok: "", youtube: "", twitter: "", website: "", videoEmbedUrl: "", associatedStops: "", worksFor: "" };

export default function PeopleAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/people").then(r => r.json()).then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) {
    setForm({ ...EMPTY, ...item, associatedStops: Array.isArray(item.associatedStops) ? item.associatedStops.join(", ") : (item.associatedStops || "") });
    setEditing(true); window.scrollTo(0, 0);
  }
  function reset() { setForm(EMPTY); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const payload = { ...form, associatedStops: form.associatedStops.split(",").map(s => s.trim()).filter(Boolean), password: pw };
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/people", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => editing ? prev.map(x => x.slug === data.slug ? data : x) : [...prev, data]);
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete profile for ${item.name}? This cannot be undone.`)) return;
    await fetch("/api/admin/people", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: item.slug, password: pw }) });
    setItems(prev => prev.filter(x => x.slug !== item.slug));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>People / Profiles</h1>
      <p style={S.sub}>Individual profile pages for artists, hosts, and talent.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Profile" : "Add Profile"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>Slug *</label><input style={S.input} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. hype-ola" disabled={editing} /></div>
          <div><label style={S.label}>Name *</label><input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Hype Ola" /></div>
        </div>
        <div style={S.row}>
          <div><label style={S.label}>Role *</label><input style={S.input} value={form.role} onChange={e => set("role", e.target.value)} placeholder="MC, DJ, Dancer…" /></div>
          <div><label style={S.label}>Works For</label><input style={S.input} value={form.worksFor} onChange={e => set("worksFor", e.target.value)} placeholder="Urban Gang Tour" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Photo URL</label><input style={S.input} value={form.photo} onChange={e => set("photo", e.target.value)} placeholder="https://..." /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Video Embed URL</label><input style={S.input} value={form.videoEmbedUrl} onChange={e => set("videoEmbedUrl", e.target.value)} placeholder="https://www.youtube.com/embed/..." /></div>
        <div style={S.row3}>
          <div><label style={S.label}>Instagram</label><input style={S.input} value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@handle" /></div>
          <div><label style={S.label}>TikTok</label><input style={S.input} value={form.tiktok} onChange={e => set("tiktok", e.target.value)} placeholder="@handle" /></div>
          <div><label style={S.label}>YouTube</label><input style={S.input} value={form.youtube} onChange={e => set("youtube", e.target.value)} placeholder="https://youtube.com/..." /></div>
        </div>
        <div style={S.row}>
          <div><label style={S.label}>Twitter/X</label><input style={S.input} value={form.twitter} onChange={e => set("twitter", e.target.value)} placeholder="@handle" /></div>
          <div><label style={S.label}>Website</label><input style={S.input} value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Associated Stops (comma-separated)</label><input style={S.input} value={form.associatedStops} onChange={e => set("associatedStops", e.target.value)} placeholder="nairobi-2025, mombasa-2025" /></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Bio</label><textarea style={{ ...S.input, height: 100, resize: "vertical" }} value={form.bio} onChange={e => set("bio", e.target.value)} /></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update Profile" : "Add Profile"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>All Profiles ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No profiles yet.</p> : items.map(item => (
          <div key={item.slug} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16 }}>
            {item.photo && <img src={item.photo} alt={item.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{item.role} {item.worksFor && `· ${item.worksFor}`}</div>
            </div>
            <span style={S.badge}>{item.slug}</span>
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
