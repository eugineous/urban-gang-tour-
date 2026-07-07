"use client";
import { useState, useEffect } from "react";
import { useAdminPw } from "../useAdminPw";
import AdminPwPrompt from "../AdminPwPrompt";

const S = {
  page: { color: "#fff" },
  h1: { fontSize: 26, fontWeight: 800, margin: "0 0 8px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" },
  card: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 20, marginBottom: 24 },
  label: { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", background: "#111", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
  saveBtn: { background: "#cc0077", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid #2a2a2a" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #1e1e1e", verticalAlign: "middle" },
};

export default function TicketsAdminPage() {
  const [pw, setPw] = useAdminPw();
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [tiersJson, setTiersJson] = useState("");
  const [status, setStatus] = useState("");
  const [tiersStatus, setTiersStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tickets").then(r => r.json()),
      fetch("/api/admin/events").then(r => r.json()),
    ]).then(([o, e]) => {
      setOrders(Array.isArray(o) ? o : []);
      const evList = Array.isArray(e) ? e : [];
      setEvents(evList);
      if (evList.length > 0) {
        setSelectedEvent(evList[0].slug);
        const tiers = evList[0].ticketTiers;
        setTiersJson(tiers ? JSON.stringify(tiers, null, 2) : "[]");
      }
      setLoading(false);
    });
  }, []);

  function handleEventChange(slug) {
    setSelectedEvent(slug);
    const ev = events.find(e => e.slug === slug);
    const tiers = ev?.ticketTiers;
    setTiersJson(tiers ? JSON.stringify(tiers, null, 2) : "[]");
    setTiersStatus("");
  }

  async function saveTiers() {
    if (!pw) return setTiersStatus("Enter admin password first.");
    let parsed;
    try { parsed = JSON.parse(tiersJson); } catch { return setTiersStatus("Error: Invalid JSON."); }
    setTiersStatus("Saving…");
    const res = await fetch("/api/admin/tickets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSlug: selectedEvent, ticketTiers: parsed, password: pw }) });
    const data = await res.json();
    if (data.error) { setTiersStatus("Error: " + data.error); return; }
    setTiersStatus("Saved!");
  }

  function statusColor(s) {
    if (s === "completed" || s === "paid") return "#4caf50";
    if (s === "pending") return "#ffa500";
    if (s === "failed" || s === "cancelled") return "#ff6b6b";
    return "#aaa";
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Tickets</h1>
      <p style={S.sub}>View orders and configure ticket tiers per event.</p>
      <AdminPwPrompt pw={pw} setPw={setPw} />

      {/* Orders Table */}
      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Orders ({orders.length})</h2>
        {loading ? <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p> : orders.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No ticket orders yet.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={S.th}>Phone / Buyer</th>
                  <th style={S.th}>Item / Event</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order.id || i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={S.td}>{order.phone || order.buyerPhone || "—"}</td>
                    <td style={S.td}>{order.item || order.eventSlug || order.eventName || "—"}</td>
                    <td style={S.td}>{order.amount ? `KSh ${order.amount}` : "—"}</td>
                    <td style={S.td}><span style={{ color: statusColor(order.status), fontWeight: 600, fontSize: 12 }}>{order.status || "—"}</span></td>
                    <td style={S.td}><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{order.timestamp ? new Date(order.timestamp).toLocaleString() : "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Tiers Config */}
      <div style={S.card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Ticket Tier Config</h2>
        {events.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)" }}>No events found. Add events first.</p> : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Select Event</label>
              <select style={S.input} value={selectedEvent} onChange={e => handleEventChange(e.target.value)}>
                {events.map(ev => <option key={ev.slug} value={ev.slug}>{ev.name} ({ev.date})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Ticket Tiers (JSON)</label>
              <textarea style={{ ...S.input, height: 160, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} value={tiersJson} onChange={e => setTiersJson(e.target.value)} placeholder={'[{"name": "General", "price": 500, "available": true}]'} />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button style={S.saveBtn} onClick={saveTiers}>Save Tiers</button>
              {tiersStatus && <span style={{ fontSize: 13, color: tiersStatus.startsWith("E") ? "#ff6b6b" : "#4caf50" }}>{tiersStatus}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
