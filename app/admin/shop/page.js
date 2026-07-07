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

const EMPTY = { id: "", name: "", price: "", description: "", tag: "", image: "", variants: "", available: true };

export default function ShopAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/shop").then(r => r.json()).then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) {
    setForm({ ...EMPTY, ...item, variants: Array.isArray(item.variants) ? item.variants.join(", ") : (item.variants || "") });
    setEditing(true); window.scrollTo(0, 0);
  }
  function reset() { setForm(EMPTY); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const payload = { ...form, variants: form.variants.split(",").map(s => s.trim()).filter(Boolean), available: Boolean(form.available), password: pw };
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/shop", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => editing ? prev.map(x => x.id === data.id ? data : x) : [...prev, data]);
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await fetch("/api/admin/shop", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, password: pw }) });
    setItems(prev => prev.filter(x => x.id !== item.id));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Shop</h1>
      <p style={S.sub}>Manage merch products and pricing.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Product" : "Add Product"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>ID *</label><input style={S.input} value={form.id} onChange={e => set("id", e.target.value)} placeholder="e.g. ugt-tee-black" disabled={editing} /></div>
          <div><label style={S.label}>Name *</label><input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="UGT Classic Tee" /></div>
        </div>
        <div style={S.row3}>
          <div><label style={S.label}>Price (KSh) *</label><input style={S.input} type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="2500" /></div>
          <div><label style={S.label}>Tag</label><input style={S.input} value={form.tag} onChange={e => set("tag", e.target.value)} placeholder="New, Bestseller, etc." /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 28 }}>
            <input type="checkbox" id="available" checked={!!form.available} onChange={e => set("available", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="available" style={{ fontSize: 13, color: "#fff", cursor: "pointer" }}>Available</label>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Image URL</label><input style={S.input} value={form.image} onChange={e => set("image", e.target.value)} placeholder="https://..." /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Variants (comma-separated)</label><input style={S.input} value={form.variants} onChange={e => set("variants", e.target.value)} placeholder="S, M, L, XL, XXL" /></div>
        <div style={{ marginBottom: 20 }}><label style={S.label}>Description</label><textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update Product" : "Add Product"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Products ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No products yet.</p> : items.map(item => (
          <div key={item.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16 }}>
            {item.image && <img src={item.image} alt={item.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>KSh {item.price} · {item.available ? "Available" : "Unavailable"}</div>
            </div>
            <span style={S.badge}>{item.id}</span>
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
