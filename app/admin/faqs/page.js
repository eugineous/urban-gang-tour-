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

function genId() { return "faq-" + Math.random().toString(36).slice(2, 9); }

const EMPTY = { id: "", question: "", answer: "", order: "" };

export default function FaqsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, id: genId() });
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/faqs").then(r => r.json()).then(data => {
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
    const res = await fetch("/api/admin/faqs", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, order: Number(form.order) || 0, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => {
      const updated = editing ? prev.map(x => x.id === data.id ? data : x) : [...prev, data];
      return [...updated].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    });
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete this FAQ? This cannot be undone.`)) return;
    await fetch("/api/admin/faqs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, password: pw }) });
    setItems(prev => prev.filter(x => x.id !== item.id));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>FAQs</h1>
      <p style={S.sub}>Frequently asked questions displayed on the site.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit FAQ" : "Add FAQ"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>ID (auto-generated)</label><input style={S.input} value={form.id} onChange={e => set("id", e.target.value)} disabled={editing} /></div>
          <div><label style={S.label}>Order</label><input style={S.input} type="number" value={form.order} onChange={e => set("order", e.target.value)} placeholder="1, 2, 3…" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Question *</label><input style={S.input} value={form.question} onChange={e => set("question", e.target.value)} placeholder="What is Urban Gang Tour?" /></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Answer *</label><textarea style={{ ...S.input, height: 100, resize: "vertical" }} value={form.answer} onChange={e => set("answer", e.target.value)} /></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update FAQ" : "Add FAQ"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>All FAQs ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No FAQs yet.</p> : items.map(item => (
          <div key={item.id} style={{ ...S.card, display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 28, height: 28, background: "rgba(204,0,119,0.15)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#cc0077", fontWeight: 700, flexShrink: 0 }}>{item.order || "—"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.question}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>{item.answer?.slice(0, 120)}{item.answer?.length > 120 ? "…" : ""}</div>
            </div>
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
