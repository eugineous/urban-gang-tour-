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
  saveBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  delBtn: { background: "#3a0a0a", color: "#ff6b6b", border: "1px solid #5a1a1a", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" },
  editBtn: { background: "transparent", color: "#cc0077", border: "1px solid #cc0077", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" },
};

function genId() { return "t-" + Math.random().toString(36).slice(2, 9); }

const EMPTY = { id: "", author: "", quote: "", role: "", photo: "", order: "" };

export default function TestimonialsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, id: genId() });
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/testimonials").then(r => r.json()).then(data => {
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)) : [];
      setItems(sorted); setLoading(false);
    });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) { setForm({ ...EMPTY, ...item }); setEditing(true); window.scrollTo(0, 0); }
  function reset() { setForm({ ...EMPTY, id: genId() }); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/testimonials", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, order: Number(form.order) || 0, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => {
      const updated = editing ? prev.map(x => x.id === data.id ? data : x) : [...prev, data];
      return [...updated].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    });
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete testimonial from ${item.author}? This cannot be undone.`)) return;
    await fetch("/api/admin/testimonials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, password: pw }) });
    setItems(prev => prev.filter(x => x.id !== item.id));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Testimonials</h1>
      <p style={S.sub}>Quotes and reviews from fans and attendees.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Testimonial" : "Add Testimonial"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>ID (auto-generated)</label><input style={S.input} value={form.id} onChange={e => set("id", e.target.value)} disabled={editing} /></div>
          <div><label style={S.label}>Order</label><input style={S.input} type="number" value={form.order} onChange={e => set("order", e.target.value)} placeholder="1, 2, 3…" /></div>
        </div>
        <div style={S.row}>
          <div><label style={S.label}>Author *</label><input style={S.input} value={form.author} onChange={e => set("author", e.target.value)} placeholder="Jane Mwangi" /></div>
          <div><label style={S.label}>Role</label><input style={S.input} value={form.role} onChange={e => set("role", e.target.value)} placeholder="Fan, Attendee, Artist…" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Photo URL</label><input style={S.input} value={form.photo} onChange={e => set("photo", e.target.value)} placeholder="https://..." /></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Quote *</label><textarea style={{ ...S.input, height: 100, resize: "vertical" }} value={form.quote} onChange={e => set("quote", e.target.value)} placeholder="Best event in Nairobi!" /></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update" : "Add Testimonial"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>All Testimonials ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No testimonials yet.</p> : items.map(item => (
          <div key={item.id} style={{ ...S.card, display: "flex", alignItems: "flex-start", gap: 16 }}>
            {item.photo && <img src={item.photo} alt={item.author} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.author} <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>— {item.role}</span></div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4, fontStyle: "italic" }}>"{item.quote?.slice(0, 120)}{item.quote?.length > 120 ? "…" : ""}"</div>
            </div>
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
