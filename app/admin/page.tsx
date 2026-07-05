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

interface CatalogItem {
  key: string;
  name: string;
  priceKes: number;
  variants?: string[];
}

interface TicketEvent {
  key: string;
  name: string;
  dateLabel: string;
  ticketTypes: CatalogItem[];
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

const INPUT_STYLE: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#0d0b0f",
  color: "#fff",
  fontSize: 13,
  width: "100%",
};

const BTN_STYLE: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 9,
  border: "none",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"orders" | "catalog">("orders");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [merch, setMerch] = useState<CatalogItem[] | null>(null);
  const [events, setEvents] = useState<TicketEvent[] | null>(null);
  const [catalogMsg, setCatalogMsg] = useState("");

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

  const loadCatalog = useCallback(async () => {
    const res = await fetch("/api/ugt-admin/catalog");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    if (res.ok) {
      setMerch(data.merch);
      setEvents(data.events);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (tab === "catalog" && merch === null) loadCatalog();
  }, [tab, merch, loadCatalog]);

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

  async function saveMerch(items: CatalogItem[]) {
    setCatalogMsg("Saving...");
    const res = await fetch("/api/ugt-admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "merch", items }),
    });
    const data = await res.json();
    setCatalogMsg(res.ok ? "Saved." : data.error || "Failed to save");
  }

  async function saveEvents(list: TicketEvent[]) {
    setCatalogMsg("Saving...");
    const res = await fetch("/api/ugt-admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "events", events: list }),
    });
    const data = await res.json();
    setCatalogMsg(res.ok ? "Saved." : data.error || "Failed to save");
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
          <button type="submit" style={{ width: "100%", marginTop: 18, ...BTN_STYLE, background: "#C7238E", color: "#fff", fontSize: 15 }}>
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
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 34, textTransform: "uppercase" }}>Admin</div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        {(["orders", "catalog"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid #C7238E" : "2px solid transparent",
              color: tab === t ? "#fff" : "rgba(255,247,252,0.55)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              padding: "10px 4px",
              cursor: "pointer",
            }}
          >
            {t === "orders" ? "Orders & Tickets" : "Catalog & Prices"}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
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
        </>
      )}

      {tab === "catalog" && (
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 40 }}>
          {catalogMsg && <div style={{ color: "#F5A623", fontSize: 13 }}>{catalogMsg}</div>}

          <div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, textTransform: "uppercase" }}>Merch prices</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {(merch || []).map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 1fr auto", gap: 8, alignItems: "center" }}>
                  <input
                    style={INPUT_STYLE}
                    value={item.name}
                    placeholder="Name"
                    onChange={(e) => {
                      const next = [...(merch || [])];
                      next[i] = { ...item, name: e.target.value, key: item.key || slugify(e.target.value) };
                      setMerch(next);
                    }}
                  />
                  <input style={{ ...INPUT_STYLE, opacity: 0.6 }} value={item.key} readOnly />
                  <input
                    style={INPUT_STYLE}
                    type="number"
                    value={item.priceKes}
                    placeholder="Price KES"
                    onChange={(e) => {
                      const next = [...(merch || [])];
                      next[i] = { ...item, priceKes: Number(e.target.value) };
                      setMerch(next);
                    }}
                  />
                  <input
                    style={INPUT_STYLE}
                    value={(item.variants || []).join(", ")}
                    placeholder="Variants (S, M, L)"
                    onChange={(e) => {
                      const next = [...(merch || [])];
                      next[i] = { ...item, variants: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) };
                      setMerch(next);
                    }}
                  />
                  <button
                    onClick={() => setMerch((merch || []).filter((_, idx) => idx !== i))}
                    style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.08)", color: "#FF6B6B" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setMerch([...(merch || []), { key: "", name: "", priceKes: 0 }])}
                style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.08)", color: "#fff" }}
              >
                + Add item
              </button>
              <button onClick={() => merch && saveMerch(merch)} style={{ ...BTN_STYLE, background: "#C7238E", color: "#fff" }}>
                Save merch
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, textTransform: "uppercase" }}>Ticketed events</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
              {(events || []).map((ev, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                    <input
                      style={INPUT_STYLE}
                      value={ev.name}
                      placeholder="Event name"
                      onChange={(e) => {
                        const next = [...(events || [])];
                        next[i] = { ...ev, name: e.target.value, key: ev.key || slugify(e.target.value) };
                        setEvents(next);
                      }}
                    />
                    <input
                      style={INPUT_STYLE}
                      value={ev.dateLabel}
                      placeholder="Date / label"
                      onChange={(e) => {
                        const next = [...(events || [])];
                        next[i] = { ...ev, dateLabel: e.target.value };
                        setEvents(next);
                      }}
                    />
                    <button
                      onClick={() => setEvents((events || []).filter((_, idx) => idx !== i))}
                      style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.08)", color: "#FF6B6B" }}
                    >
                      Remove event
                    </button>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {ev.ticketTypes.map((tt, j) => (
                      <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8 }}>
                        <input
                          style={INPUT_STYLE}
                          value={tt.name}
                          placeholder="Ticket type (e.g. General Entry)"
                          onChange={(e) => {
                            const next = [...(events || [])];
                            const types = [...ev.ticketTypes];
                            types[j] = { ...tt, name: e.target.value, key: tt.key || slugify(e.target.value) };
                            next[i] = { ...ev, ticketTypes: types };
                            setEvents(next);
                          }}
                        />
                        <input
                          style={INPUT_STYLE}
                          type="number"
                          value={tt.priceKes}
                          placeholder="Price KES"
                          onChange={(e) => {
                            const next = [...(events || [])];
                            const types = [...ev.ticketTypes];
                            types[j] = { ...tt, priceKes: Number(e.target.value) };
                            next[i] = { ...ev, ticketTypes: types };
                            setEvents(next);
                          }}
                        />
                        <button
                          onClick={() => {
                            const next = [...(events || [])];
                            next[i] = { ...ev, ticketTypes: ev.ticketTypes.filter((_, idx) => idx !== j) };
                            setEvents(next);
                          }}
                          style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.08)", color: "#FF6B6B", fontSize: 12 }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const next = [...(events || [])];
                        next[i] = { ...ev, ticketTypes: [...ev.ticketTypes, { key: "", name: "", priceKes: 0 }] };
                        setEvents(next);
                      }}
                      style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, alignSelf: "flex-start" }}
                    >
                      + Add ticket type
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() =>
                  setEvents([...(events || []), { key: "", name: "", dateLabel: "", ticketTypes: [{ key: "general", name: "General Entry", priceKes: 0 }] }])
                }
                style={{ ...BTN_STYLE, background: "rgba(255,255,255,0.08)", color: "#fff" }}
              >
                + Add event
              </button>
              <button onClick={() => events && saveEvents(events)} style={{ ...BTN_STYLE, background: "#C7238E", color: "#fff" }}>
                Save events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
