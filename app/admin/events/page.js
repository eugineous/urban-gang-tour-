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
  copyBtn: { background: "transparent", color: "#aaa", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(204,0,119,0.15)", color: "#cc0077" },
};

const STATUSES = ["upcoming", "live", "completed", "cancelled"];
const EMPTY = { slug: "", name: "", date: "", startTime: "", endTime: "", location: "", theme: "", description: "", status: "upcoming", image: "" };

function buildGCalUrl(event) {
  if (!event.name || !event.date) return null;
  const start = (event.date + (event.startTime ? "T" + event.startTime : "")).replace(/-/g, "").replace(":", "").replace(":", "");
  const end = event.endTime ? (event.date + "T" + event.endTime).replace(/-/g, "").replace(":", "").replace(":", "") : "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: end ? `${start}/${end}` : start,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function EventsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/events").then(r => r.json()).then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }
  function edit(item) { setForm({ ...EMPTY, ...item }); setEditing(true); window.scrollTo(0, 0); }
  function reset() { setForm(EMPTY); setEditing(false); setStatus(""); }

  async function save() {
    if (!pw) return setStatus("Enter admin password first.");
    setStatus("Saving…");
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/admin/events", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: pw }) });
    const data = await res.json();
    if (data.error) { setStatus("Error: " + data.error); return; }
    setItems(prev => editing ? prev.map(x => x.slug === data.slug ? data : x) : [...prev, data]);
    setStatus("Saved!"); reset();
  }

  async function del(item) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    await fetch("/api/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: item.slug, password: pw }) });
    setItems(prev => prev.filter(x => x.slug !== item.slug));
  }

  function copyCalUrl(item) {
    const url = buildGCalUrl(item);
    if (!url) return alert("Event needs a name and date first.");
    navigator.clipboard.writeText(url).then(() => alert("Google Calendar URL copied!")).catch(() => alert(url));
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Events</h1>
      <p style={S.sub}>Manage tour stops and events.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "Edit Event" : "Add Event"}</h2>
        <div style={S.row}>
          <div><label style={S.label}>Slug *</label><input style={S.input} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. nairobi-2025" disabled={editing} /></div>
          <div><label style={S.label}>Name *</label><input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Urban Gang Tour — Nairobi" /></div>
        </div>
        <div style={S.row3}>
          <div><label style={S.label}>Date *</label><input style={S.input} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><label style={S.label}>Start Time</label><input style={S.input} type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} /></div>
          <div><label style={S.label}>End Time</label><input style={S.input} type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} /></div>
        </div>
        <div style={S.row}>
          <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Westlands, Nairobi" /></div>
          <div><label style={S.label}>Theme</label><input style={S.input} value={form.theme} onChange={e => set("theme", e.target.value)} placeholder="e.g. Afro Fusion Night" /></div>
        </div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>Description</label><textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Status</label>
            <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Image URL</label><input style={S.input} value={form.image} onChange={e => set("image", e.target.value)} placeholder="https://..." /></div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button style={S.saveBtn} onClick={save}>{editing ? "Update" : "Add Event"}</button>
          {editing && <button style={{ ...S.delBtn, background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid #333" }} onClick={reset}>Cancel</button>}
          {status && <span style={{ fontSize: 13, color: status.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{status}</span>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>All Events ({items.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : items.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No events yet.</p> : items.map(item => (
          <div key={item.slug} style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{item.date} · {item.location}</div>
            </div>
            <span style={{ ...S.badge, background: item.status === "upcoming" ? "rgba(76,175,80,0.15)" : "rgba(204,0,119,0.15)", color: item.status === "upcoming" ? "#4caf50" : "#cc0077" }}>{item.status}</span>
            <button style={S.copyBtn} onClick={() => copyCalUrl(item)}>📅 Calendar URL</button>
            <button style={S.editBtn} onClick={() => edit(item)}>Edit</button>
            <button style={S.delBtn} onClick={() => del(item)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
