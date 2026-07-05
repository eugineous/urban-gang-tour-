"use client";

import { useEffect, useState, useCallback } from "react";

interface Order {
  id: string;
  kind: "ticket" | "merch";
  items: { key: string; name: string; qty: number; unitPriceKes: number; variant?: string }[];
  totalKes: number;
  phone: string;
  buyerEmail?: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  mpesaReceiptNumber?: string;
  createdAt: number;
}

function money(kes: number) {
  return `KES ${kes.toLocaleString("en-KE")}`;
}

const STATUS_COLOR: Record<Order["status"], string> = {
  paid: "#2E7D32",
  pending: "#F5A623",
  failed: "#C0392B",
  cancelled: "#666",
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/ugt-admin/orders");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Failed to load orders");
      return;
    }
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/ugt-admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || "Login failed");
      return;
    }
    setPassword("");
    loadOrders();
  }

  if (authed === null) {
    return <div style={{ minHeight: "100vh", background: "#150E13" }} />;
  }

  if (authed === false) {
    return (
      <div style={{ minHeight: "100vh", background: "#150E13", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
        <form onSubmit={handleLogin} style={{ background: "#1B1118", border: "1px solid rgba(199,35,142,0.35)", borderRadius: 20, padding: 40, width: 320 }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, color: "#fff", textTransform: "uppercase" }}>Admin</div>
          <div style={{ color: "rgba(255,247,252,0.6)", fontSize: 13, marginTop: 6 }}>Urban Gang Tour orders &amp; tickets</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{ width: "100%", marginTop: 24, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "#0d0b0f", color: "#fff", fontSize: 15 }}
          />
          {loginError && <div style={{ color: "#FF6B6B", fontSize: 13, marginTop: 10 }}>{loginError}</div>}
          <button type="submit" style={{ width: "100%", marginTop: 18, padding: "12px 14px", borderRadius: 10, border: "none", background: "#C7238E", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Log in
          </button>
        </form>
      </div>
    );
  }

  const paid = (orders || []).filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + o.totalKes, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#150E13", color: "#FFF7FC", fontFamily: "'Space Grotesk', sans-serif", padding: "40px clamp(20px,5vw,60px)" }}>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 34, textTransform: "uppercase" }}>Orders &amp; Tickets</div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(199,35,142,0.3)", borderRadius: 14, padding: "16px 22px" }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, color: "#F5A623" }}>{money(revenue)}</div>
          <div style={{ fontSize: 12, color: "rgba(255,247,252,0.6)" }}>TOTAL PAID</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(199,35,142,0.3)", borderRadius: 14, padding: "16px 22px" }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, color: "#F5A623" }}>{paid.length}</div>
          <div style={{ fontSize: 12, color: "rgba(255,247,252,0.6)" }}>PAID ORDERS</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(199,35,142,0.3)", borderRadius: 14, padding: "16px 22px" }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, color: "#F5A623" }}>{(orders || []).length}</div>
          <div style={{ fontSize: 12, color: "rgba(255,247,252,0.6)" }}>ALL ORDERS</div>
        </div>
      </div>

      {loadError && <div style={{ color: "#FF6B6B", marginTop: 20 }}>{loadError}</div>}

      <div style={{ marginTop: 30, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "rgba(255,247,252,0.5)", fontSize: 12, letterSpacing: "0.05em" }}>
              <th style={{ padding: "8px 12px" }}>WHEN</th>
              <th style={{ padding: "8px 12px" }}>KIND</th>
              <th style={{ padding: "8px 12px" }}>ITEMS</th>
              <th style={{ padding: "8px 12px" }}>PHONE</th>
              <th style={{ padding: "8px 12px" }}>TOTAL</th>
              <th style={{ padding: "8px 12px" }}>STATUS</th>
              <th style={{ padding: "8px 12px" }}>RECEIPT</th>
            </tr>
          </thead>
          <tbody>
            {(orders || []).map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{new Date(o.createdAt).toLocaleString("en-KE")}</td>
                <td style={{ padding: "10px 12px", textTransform: "capitalize" }}>{o.kind}</td>
                <td style={{ padding: "10px 12px" }}>{o.items.map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ""}`).join(", ")}</td>
                <td style={{ padding: "10px 12px" }}>{o.phone}</td>
                <td style={{ padding: "10px 12px", fontWeight: 700 }}>{money(o.totalKes)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ color: STATUS_COLOR[o.status], fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{o.status}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "rgba(255,247,252,0.7)" }}>{o.mpesaReceiptNumber || "-"}</td>
              </tr>
            ))}
            {orders && orders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "30px 12px", textAlign: "center", color: "rgba(255,247,252,0.5)" }}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
