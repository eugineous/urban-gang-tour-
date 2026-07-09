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

interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface AuditEntry {
  action: string;
  summary: string;
  actor: string;
  at: number;
}

interface Booking {
  id: number;
  name: string;
  org: string | null;
  email: string | null;
  phone: string | null;
  intent: string;
  message: string;
  status: "new" | "review" | "confirmed";
  created_at: string;
}

function money(kes: number) {
  return `KES ${kes.toLocaleString("en-KE")}`;
}

const STATUS_COLOR: Record<Order["status"], string> = {
  paid: "#1F8A5B",
  pending: "#FFD400",
  failed: "#E6218C",
  cancelled: "#888",
};

const INPUT_CLASS = "w-full rounded-lg border-2 border-ink bg-white px-3 py-2 text-[13px] outline-none focus:border-magenta";
const BTN_CLASS = "rounded-lg border-2 border-ink px-4 py-2.5 font-bold text-[13px]";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}

const TABS = ["bookings", "orders", "catalog", "stats", "activity"] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  bookings: "Bookings Inbox",
  orders: "Orders & Tickets",
  catalog: "Catalog & Prices",
  stats: "YouTube Stats",
  activity: "Activity Log",
};

const BOOKING_STATUS_COLOR: Record<Booking["status"], string> = {
  new: "#E6218C",
  review: "#FFD400",
  confirmed: "#1F8A5B",
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("bookings");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [bookingsError, setBookingsError] = useState("");

  const [merch, setMerch] = useState<CatalogItem[] | null>(null);
  const [events, setEvents] = useState<TicketEvent[] | null>(null);
  const [catalogMsg, setCatalogMsg] = useState("");

  const [videos, setVideos] = useState<YoutubeVideo[] | null>(null);
  const [statsError, setStatsError] = useState("");

  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [auditError, setAuditError] = useState("");

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

  useEffect(() => {
    if (tab !== "bookings" || bookings !== null) return;
    fetch("/api/ugt-admin/bookings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setBookingsError(data.error || "Failed to load bookings");
          return;
        }
        setBookings(data.bookings);
      })
      .catch(() => setBookingsError("Failed to load bookings"));
  }, [tab, bookings]);

  async function setBookingStatus(id: number, status: Booking["status"]) {
    const res = await fetch("/api/ugt-admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookings((prev) => (prev || []).map((b) => (b.id === id ? data.booking : b)));
    }
  }

  useEffect(() => {
    if (tab !== "stats" || videos !== null) return;
    fetch("/api/ugt-admin/youtube-stats")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatsError(data.error || "Failed to load YouTube stats");
          return;
        }
        setVideos(data.videos);
      })
      .catch(() => setStatsError("Failed to load YouTube stats"));
  }, [tab, videos]);

  useEffect(() => {
    if (tab !== "activity" || auditLog !== null) return;
    fetch("/api/ugt-admin/audit-log")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setAuditError(data.error || "Failed to load activity log");
          return;
        }
        setAuditLog(data.entries);
      })
      .catch(() => setAuditError("Failed to load activity log"));
  }, [tab, auditLog]);

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
    return <div className="min-h-screen bg-ink" />;
  }

  if (authed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-magenta px-6">
        <form onSubmit={handleLogin} className="w-[340px] rounded-2xl border-4 border-ink bg-white p-8 shadow-[8px_8px_0_#111]">
          <div className="font-display text-[28px] uppercase text-ink">Control Room</div>
          <div className="mt-1.5 text-[13px] font-medium text-ink/60">Urban Gang Tour · orders &amp; tickets admin</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access code"
            autoFocus
            className="mt-6 w-full rounded-lg border-2 border-ink px-4 py-3 text-[15px] outline-none focus:border-magenta"
          />
          {loginError && <div className="mt-2.5 text-[13px] font-semibold text-magenta">{loginError}</div>}
          <button type="submit" className="mt-4.5 w-full rounded-xl border-[3px] border-ink bg-ink py-3.5 font-display text-[16px] text-gold shadow-[4px_4px_0_#E6218C]">
            ENTER CONTROL ROOM
          </button>
        </form>
      </div>
    );
  }

  const paid = (orders || []).filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + o.totalKes, 0);

  return (
    <div className="min-h-screen bg-concrete">
      <div className="border-b-4 border-gold bg-ink px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <div className="font-display text-[26px] uppercase text-white">Control Room</div>
          <div className="flex items-center gap-2.5 rounded-full border border-dashed border-white/30 px-4 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-2 w-2 animate-blink rounded-full bg-live" /> ON AIR
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-2 w-2 rounded-full bg-success" /> BOOKINGS OPEN
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <div className="flex flex-wrap gap-2.5 border-b-2 border-ink/15 pb-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full border-2 border-ink px-4 py-2 text-[13px] font-bold uppercase ${tab === t ? "bg-magenta text-white" : "bg-white"}`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {tab === "bookings" && (
          <div className="mt-6">
            <div className="mb-4 text-[13px] text-ink/60">
              Every Work With Us / Contact form submission, newest first.
            </div>
            {bookingsError && <div className="mb-4 text-[13px] font-semibold text-magenta">{bookingsError}</div>}
            {!bookingsError && bookings === null && <div className="text-ink/60">Loading...</div>}
            {bookings && bookings.length === 0 && <div className="py-5 text-ink/50">No bookings yet.</div>}
            <div className="flex flex-col gap-3">
              {(bookings || []).map((b) => (
                <div key={b.id} className="rounded-xl border-[3px] border-ink bg-white p-4 shadow-[3px_3px_0_#111]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-[18px] uppercase">{b.name}</div>
                      <div className="text-[12.5px] font-bold uppercase tracking-wide text-magenta">{b.intent}</div>
                      <div className="mt-1 text-[12px] text-ink/50">{new Date(b.created_at).toLocaleString("en-KE")}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {(["new", "review", "confirmed"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setBookingStatus(b.id, s)}
                          className="rounded-full border-2 px-3 py-1.5 text-[11px] font-bold uppercase"
                          style={
                            b.status === s
                              ? { background: BOOKING_STATUS_COLOR[s], borderColor: "#111", color: s === "review" ? "#111" : "#fff" }
                              : { borderColor: "#111", background: "#fff", color: "#111" }
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink/70">
                    {b.org && <span>{b.org}</span>}
                    {b.email && <span>{b.email}</span>}
                    {b.phone && <span>{b.phone}</span>}
                  </div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink/85">{b.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <>
            <div className="mt-6 flex flex-wrap gap-3.5">
              <div className="rounded-xl border-[3px] border-ink bg-white px-6 py-4 shadow-[4px_4px_0_#111]">
                <div className="font-display text-[26px] text-magenta">{money(revenue)}</div>
                <div className="text-[12px] font-bold text-ink/60">TOTAL PAID</div>
              </div>
              <div className="rounded-xl border-[3px] border-ink bg-white px-6 py-4 shadow-[4px_4px_0_#111]">
                <div className="font-display text-[26px] text-magenta">{paid.length}</div>
                <div className="text-[12px] font-bold text-ink/60">PAID ORDERS</div>
              </div>
              <div className="rounded-xl border-[3px] border-ink bg-white px-6 py-4 shadow-[4px_4px_0_#111]">
                <div className="font-display text-[26px] text-magenta">{(orders || []).length}</div>
                <div className="text-[12px] font-bold text-ink/60">ALL ORDERS</div>
              </div>
            </div>

            {loadError && <div className="mt-5 font-semibold text-magenta">{loadError}</div>}

            <div className="mt-6 overflow-x-auto rounded-xl border-[3px] border-ink bg-white shadow-[4px_4px_0_#111]">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b-2 border-ink/15 text-left text-[11px] font-bold uppercase tracking-wide text-ink/50">
                    <th className="px-3.5 py-2.5">When</th>
                    <th className="px-3.5 py-2.5">Kind</th>
                    <th className="px-3.5 py-2.5">Items</th>
                    <th className="px-3.5 py-2.5">Phone</th>
                    <th className="px-3.5 py-2.5">Total</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders || []).map((o) => (
                    <tr key={o.id} className="border-t border-ink/10">
                      <td className="whitespace-nowrap px-3.5 py-2.5">{new Date(o.createdAt).toLocaleString("en-KE")}</td>
                      <td className="px-3.5 py-2.5 capitalize">{o.kind}</td>
                      <td className="px-3.5 py-2.5">{o.items.map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ""}`).join(", ")}</td>
                      <td className="px-3.5 py-2.5">{o.phone}</td>
                      <td className="px-3.5 py-2.5 font-bold">{money(o.totalKes)}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="text-[11.5px] font-bold uppercase" style={{ color: STATUS_COLOR[o.status] }}>{o.status}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-ink/60">{o.mpesaReceiptNumber || "-"}</td>
                    </tr>
                  ))}
                  {orders && orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3.5 py-8 text-center text-ink/50">No orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "catalog" && (
          <div className="mt-6 flex flex-col gap-9">
            {catalogMsg && <div className="text-[13px] font-bold text-magenta">{catalogMsg}</div>}

            <div>
              <div className="font-display text-[19px] uppercase">Merch prices</div>
              <div className="mt-3 flex flex-col gap-2">
                {(merch || []).map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_110px_1fr_auto] gap-2 rounded-lg border-2 border-ink/10 bg-white p-2">
                    <input
                      className={INPUT_CLASS}
                      value={item.name}
                      placeholder="Name"
                      onChange={(e) => {
                        const next = [...(merch || [])];
                        next[i] = { ...item, name: e.target.value, key: item.key || slugify(e.target.value) };
                        setMerch(next);
                      }}
                    />
                    <input className={`${INPUT_CLASS} opacity-60`} value={item.key} readOnly />
                    <input
                      className={INPUT_CLASS}
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
                      className={INPUT_CLASS}
                      value={(item.variants || []).join(", ")}
                      placeholder="Variants (S, M, L)"
                      onChange={(e) => {
                        const next = [...(merch || [])];
                        next[i] = { ...item, variants: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) };
                        setMerch(next);
                      }}
                    />
                    <button onClick={() => setMerch((merch || []).filter((_, idx) => idx !== i))} className={`${BTN_CLASS} bg-white text-magenta`}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex gap-2.5">
                <button onClick={() => setMerch([...(merch || []), { key: "", name: "", priceKes: 0 }])} className={`${BTN_CLASS} bg-concrete`}>
                  + Add item
                </button>
                <button onClick={() => merch && saveMerch(merch)} className={`${BTN_CLASS} bg-magenta text-white`}>
                  Save merch
                </button>
              </div>
            </div>

            <div>
              <div className="font-display text-[19px] uppercase">Ticketed events</div>
              <div className="mt-3 flex flex-col gap-3.5">
                {(events || []).map((ev, i) => (
                  <div key={i} className="rounded-xl border-[3px] border-ink bg-white p-4 shadow-[3px_3px_0_#111]">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        className={INPUT_CLASS}
                        value={ev.name}
                        placeholder="Event name"
                        onChange={(e) => {
                          const next = [...(events || [])];
                          next[i] = { ...ev, name: e.target.value, key: ev.key || slugify(e.target.value) };
                          setEvents(next);
                        }}
                      />
                      <input
                        className={INPUT_CLASS}
                        value={ev.dateLabel}
                        placeholder="Date / label"
                        onChange={(e) => {
                          const next = [...(events || [])];
                          next[i] = { ...ev, dateLabel: e.target.value };
                          setEvents(next);
                        }}
                      />
                      <button onClick={() => setEvents((events || []).filter((_, idx) => idx !== i))} className={`${BTN_CLASS} bg-white text-magenta`}>
                        Remove event
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2">
                      {ev.ticketTypes.map((tt, j) => (
                        <div key={j} className="grid grid-cols-[1fr_110px_auto] gap-2">
                          <input
                            className={INPUT_CLASS}
                            value={tt.name}
                            placeholder="Ticket type"
                            onChange={(e) => {
                              const next = [...(events || [])];
                              const types = [...ev.ticketTypes];
                              types[j] = { ...tt, name: e.target.value, key: tt.key || slugify(e.target.value) };
                              next[i] = { ...ev, ticketTypes: types };
                              setEvents(next);
                            }}
                          />
                          <input
                            className={INPUT_CLASS}
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
                            className={`${BTN_CLASS} bg-white text-[12px] text-magenta`}
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
                        className={`${BTN_CLASS} self-start bg-concrete text-[12px]`}
                      >
                        + Add ticket type
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex gap-2.5">
                <button
                  onClick={() => setEvents([...(events || []), { key: "", name: "", dateLabel: "", ticketTypes: [{ key: "general", name: "General Entry", priceKes: 0 }] }])}
                  className={`${BTN_CLASS} bg-concrete`}
                >
                  + Add event
                </button>
                <button onClick={() => events && saveEvents(events)} className={`${BTN_CLASS} bg-magenta text-white`}>
                  Save events
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="mt-6">
            {statsError && <div className="mb-4 text-[13px] font-semibold text-magenta">{statsError}</div>}
            {!statsError && videos === null && <div className="text-ink/60">Loading...</div>}
            <div className="flex flex-wrap gap-4">
              {(videos || []).map((v) => (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-[280px] overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-[3px_3px_0_#111]"
                >
                  {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="block w-full bg-concrete" />}
                  <div className="p-3.5">
                    <div className="text-[13px] font-bold leading-tight">{v.title}</div>
                    <div className="mt-3 flex gap-4">
                      <div>
                        <div className="font-display text-[17px] text-magenta">{v.viewCount.toLocaleString("en-KE")}</div>
                        <div className="text-[10.5px] font-semibold text-ink/50">VIEWS</div>
                      </div>
                      <div>
                        <div className="font-display text-[17px] text-magenta">{v.likeCount.toLocaleString("en-KE")}</div>
                        <div className="text-[10.5px] font-semibold text-ink/50">LIKES</div>
                      </div>
                      <div>
                        <div className="font-display text-[17px] text-magenta">{v.commentCount.toLocaleString("en-KE")}</div>
                        <div className="text-[10.5px] font-semibold text-ink/50">COMMENTS</div>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="mt-6">
            <div className="mb-4 text-[13px] text-ink/60">
              Every catalog and event price change, newest first. Attributed by request IP.
            </div>
            {auditError && <div className="mb-4 text-[13px] font-semibold text-magenta">{auditError}</div>}
            {!auditError && auditLog === null && <div className="text-ink/60">Loading...</div>}
            {auditLog && auditLog.length === 0 && <div className="py-5 text-ink/50">No activity recorded yet.</div>}
            <div className="overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-[3px_3px_0_#111]">
              {(auditLog || []).map((entry, i) => (
                <div key={i} className="flex flex-wrap gap-4 border-t border-ink/10 px-4 py-3 text-[13px] first:border-t-0">
                  <div className="min-w-[150px] whitespace-nowrap text-ink/45">{new Date(entry.at).toLocaleString("en-KE")}</div>
                  <div className="min-w-[90px] whitespace-nowrap font-bold text-magenta">{entry.action}</div>
                  <div className="flex-1">{entry.summary}</div>
                  <div className="whitespace-nowrap text-[12px] text-ink/40">{entry.actor}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
