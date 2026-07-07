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

const EMPTY = { slug: "", title: "", date: "", theme: "", location: "", color: "", description: "", images: "" };

export default function GalleryAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/gallery").then(r => r.json()).then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) {
    setForm({ ...EMPTY, ...item, images: Array.isArray(item.images) ? item.images.join("\n") : (item.images || "") });
    setEditing(true); window.scrollTo(0, 0);
  }
  function reset() { setForm(EMPTY); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const payload = { ...form, images: form.images.split("\n").map(s => s.trim()).filter(Boolean), password: pw };
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/gallery", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => editing ? prev.map(x => x.slug === data.slug ? data : x) : [...prev, data]);
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete album "${item.title}"? This cannot be undone.`)) return;
    await fetch("/api/admin/gallery", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: item.slug, password: pw }) });
    setItems(prev => prev.filter(x => x.slug !== item.slug));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Gallery</h1>
      <p style={S.sub}>Manage photo albums per event stop.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Album" : "New Album"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>Slug *</label><input style={S.input} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. nairobi-2025" disabled={editing} /></div>
          <div><label style={S.label}>Title *</label><input style={S.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nairobi Night — 2025" /></div>
        </div>
        <div style={S.row3}>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><label style={S.label}>Theme</label><input style={S.input} value={form.theme} onChange={e => set("theme", e.target.value)} placeholder="Afro Fusion" /></div>
          <div><label style={S.label}>Color (accent)</label><input style={S.input} value={form.color} onChange={e => set("color", e.target.value)} placeholder="#cc0077" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Westlands, Nairobi" /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short album description" /></div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Images (one URL per line)</label>
          <textarea style={{ ...S.input, height: 120, resize: "vertical", fontFamily: "monospace" }} value={form.images} onChange={e => set("images", e.target.value)} placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update Album" : "Add Album"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Albums ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No albums yet.</p> : items.map(item => (
          <div key={item.slug} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {item.color && <div style={{ width: 12, height: 40, borderRadius: 4, background: item.color, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{item.date} · {item.location} · {Array.isArray(item.images) ? item.images.length : 0} photos</div>
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
