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
};

const EMPTY = { slug: "", title: "", excerpt: "", body: "", featuredImage: "", author: "", category: "", tags: "", keywords: "", status: "draft", datePublished: "" };

function StatusBadge({ status }) {
  const colors = { published: { bg: "rgba(76,175,80,0.15)", color: "#4caf50" }, draft: { bg: "rgba(255,165,0,0.15)", color: "#ffa500" } };
  const c = colors[status] || { bg: "rgba(255,255,255,0.1)", color: "#aaa" };
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.color }}>{status}</span>;
}

export default function BlogAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/blog").then(r => r.json()).then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) { setForm({ ...EMPTY, ...item }); setEditing(true); window.scrollTo(0, 0); }
  function reset() { setForm(EMPTY); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/blog", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => editing ? prev.map(x => x.slug === data.slug ? data : x) : [...prev, data]);
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    await fetch("/api/admin/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: item.slug, password: pw }) });
    setItems(prev => prev.filter(x => x.slug !== item.slug));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Blog / Press</h1>
      <p style={S.sub}>Write and publish articles, press releases, and news.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Post" : "New Post"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>Slug *</label><input style={S.input} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. tour-2025-recap" disabled={editing} /></div>
          <div><label style={S.label}>Title *</label><input style={S.input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Article title" /></div>
        </div>
        <div style={S.row}>
          <div><label style={S.label}>Author</label><input style={S.input} value={form.author} onChange={e => set("author", e.target.value)} placeholder="Author name" /></div>
          <div><label style={S.label}>Category</label><input style={S.input} value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Press, News, Blog" /></div>
        </div>
        <div style={S.row3}>
          <div>
            <label style={S.label}>Status</label>
            <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div><label style={S.label}>Date Published</label><input style={S.input} type="date" value={form.datePublished} onChange={e => set("datePublished", e.target.value)} /></div>
          <div><label style={S.label}>Featured Image URL</label><input style={S.input} value={form.featuredImage} onChange={e => set("featuredImage", e.target.value)} placeholder="https://..." /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Excerpt</label><input style={S.input} value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="Short summary for previews" /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Tags (comma-separated)</label><input style={S.input} value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="music, nairobi, tour" /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Keywords (SEO)</label><input style={S.input} value={form.keywords} onChange={e => set("keywords", e.target.value)} placeholder="urban gang tour, nairobi events" /></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Body *</label><textarea style={{ ...S.input, height: 200, resize: "vertical", fontFamily: "monospace" }} value={form.body} onChange={e => set("body", e.target.value)} placeholder="Article content (HTML or markdown)" /></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update Post" : "Publish / Save"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>All Posts ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No posts yet.</p> : items.map(item => (
          <div key={item.slug} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{item.datePublished} · {item.author} · {item.category}</div>
            </div>
            <StatusBadge status={item.status} />
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
