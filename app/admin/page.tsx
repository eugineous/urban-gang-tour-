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

interface GalleryPhoto {
  id: number;
  category: string;
  url: string;
  caption: string;
  width: number;
  height: number;
  created_at: string;
}

interface TourStop {
  id: number;
  name: string;
  location: string;
  day: string;
  month: string;
  status: string;
}

interface BlogSubmission {
  id: number;
  name: string;
  org: string;
  title: string;
  body: string;
  status: "new" | "published";
}

interface AdminUser {
  id: number;
  name: string;
  perms: string[];
  pass?: string;
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

const TABS = ["bookings", "orders", "catalog", "gallery", "stops", "newsroom", "admins", "stats", "activity"] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  bookings: "Bookings Inbox",
  orders: "Orders & Tickets",
  catalog: "Catalog & Prices",
  gallery: "Gallery Manager",
  stops: "Tour Stops",
  newsroom: "Newsroom",
  admins: "Admins & Access",
  stats: "YouTube Stats",
  activity: "Activity Log",
};

const ADMIN_PERMS = ["bookings", "orders", "catalog", "gallery", "stops", "newsroom", "admins"];

const BOOKING_STATUS_COLOR: Record<Booking["status"], string> = {
  new: "#E6218C",
  review: "#FFB800",
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
  const [bookingFilter, setBookingFilter] = useState<"all" | Booking["status"]>("all");

  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[] | null>(null);
  const [galleryCategory, setGalleryCategory] = useState("");
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState("");

  // The three tabs below are UI-first: they read from endpoints that Claude Code
  // will build later, and fall back to local state so they're fully usable now.
  const [stops, setStops] = useState<TourStop[]>([]);
  const [stopForm, setStopForm] = useState({ name: "", location: "", day: "", month: "" });
  const [stopMsg, setStopMsg] = useState("");

  const [submissions, setSubmissions] = useState<BlogSubmission[]>([]);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPerms, setNewAdminPerms] = useState<string[]>([]);
  const [madeAdmin, setMadeAdmin] = useState<AdminUser | null>(null);

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

  const loadGallery = useCallback((category: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    fetch(`/api/ugt-admin/gallery${qs}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setGalleryPhotos(data.photos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (tab !== "bookings" || bookings !== null) return;
    fetch("/api/ugt-admin/bookings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setBookings(data.bookings);
      })
      .catch(() => {});
  }, [tab, bookings]);

  useEffect(() => {
    if (tab === "gallery" && galleryPhotos === null) loadGallery(galleryCategory);
  }, [tab, galleryPhotos, galleryCategory, loadGallery]);

  async function setBookingStatus(id: number, status: Booking["status"]) {
    const res = await fetch("/api/ugt-admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const { booking } = await res.json();
      setBookings((prev) => (prev ? prev.map((b) => (b.id === id ? booking : b)) : prev));
    }
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!galleryCategory.trim()) {
      setGalleryMsg("Type a school / catalogue name first.");
      e.target.value = "";
      return;
    }
    setGalleryBusy(true);
    setGalleryMsg("");
    const form = new FormData();
    form.append("category", galleryCategory.trim());
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/ugt-admin/gallery", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setGalleryMsg(data.error || "Upload failed");
      } else {
        setGalleryMsg(`Uploaded ${data.uploaded} photo(s)${data.skipped ? `, ${data.skipped} skipped (cap)` : ""}.`);
        setGalleryPhotos(null);
        loadGallery(galleryCategory.trim());
      }
    } catch {
      setGalleryMsg("Upload failed");
    } finally {
      setGalleryBusy(false);
      e.target.value = "";
    }
  }

  async function removeGalleryPhoto(id: number) {
    const res = await fetch("/api/ugt-admin/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setGalleryPhotos((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
  }

  useEffect(() => {
    if (tab !== "stops") return;
    fetch("/api/ugt-admin/stops")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stops) setStops(d.stops);
      })
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (tab !== "newsroom") return;
    fetch("/api/ugt-admin/blog-queue")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.submissions) setSubmissions(d.submissions);
      })
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (tab !== "admins") return;
    fetch("/api/ugt-admin/admins")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.admins) setAdmins(d.admins);
      })
      .catch(() => {});
  }, [tab]);

  function addStop() {
    if (!stopForm.name.trim()) {
      setStopMsg("Give the stop a name first.");
      return;
    }
    const stop: TourStop = { id: Date.now(), ...stopForm, status: "upcoming" };
    setStops((prev) => [stop, ...prev]);
    setStopForm({ name: "", location: "", day: "", month: "" });
    setStopMsg("Added. (Saves permanently once the backend is wired.)");
    fetch("/api/ugt-admin/stops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stop) }).catch(() => {});
  }

  function removeStop(id: number) {
    setStops((prev) => prev.filter((s) => s.id !== id));
    fetch("/api/ugt-admin/stops", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  function publishSubmission(id: number) {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "published" } : s)));
    fetch("/api/ugt-admin/blog-queue", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "published" }) }).catch(() => {});
  }

  function rejectSubmission(id: number) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    fetch("/api/ugt-admin/blog-queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  function toggleNewAdminPerm(p: string) {
    setNewAdminPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function createAdmin() {
    if (!newAdminName.trim()) return;
    const pass = Math.random().toString(36).slice(2, 8).toUpperCase();
    const admin: AdminUser = {
      id: Date.now(),
      name: newAdminName.trim(),
      perms: newAdminPerms.length ? newAdminPerms : ["bookings"],
      pass,
    };
    setAdmins((prev) => [admin, ...prev]);
    setMadeAdmin(admin);
    setNewAdminName("");
    setNewAdminPerms([]);
    fetch("/api/ugt-admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(admin) }).catch(() => {});
  }

  function revokeAdmin(id: number) {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    fetch("/api/ugt-admin/admins", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  useEffect(() => {
    if (tab === "catalog" && merch === null) loadCatalog();
  }, [tab, merch, loadCatalog]);

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
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "new", "review", "confirmed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`rounded-full border-2 border-ink px-4 py-2 text-[12.5px] font-bold uppercase ${bookingFilter === f ? "bg-magenta text-white" : "bg-white"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {bookings === null && <div className="text-ink/60">Loading...</div>}
            {bookings && bookings.length === 0 && (
              <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-white p-8 text-center font-semibold text-ink/60">
                No bookings yet. Submissions from the Contact form land here automatically.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {(bookings || [])
                .filter((b) => bookingFilter === "all" || b.status === bookingFilter)
                .map((b) => (
                  <div key={b.id} className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-[14px] text-ink/40">#{b.id}</span>
                        <div>
                          <div className="font-display text-[17px] uppercase leading-none">{b.org || b.name}</div>
                          <div className="mt-1 text-[12.5px] text-ink/60">
                            {b.name}
                            {b.email ? ` · ${b.email}` : ""}
                            {b.phone ? ` · ${b.phone}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border-2 border-ink bg-concrete px-3 py-1 text-[11px] font-bold uppercase">{b.intent}</span>
                        <span className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase text-white" style={{ background: BOOKING_STATUS_COLOR[b.status] }}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-ink/80">{b.message}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setBookingStatus(b.id, "review")} className="rounded-lg border-2 border-ink bg-gold px-4 py-2 text-[12.5px] font-bold">
                        Mark in review
                      </button>
                      <button onClick={() => setBookingStatus(b.id, "confirmed")} className="rounded-lg border-2 border-ink bg-success px-4 py-2 text-[12.5px] font-bold text-white">
                        Confirm booking
                      </button>
                    </div>
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

        {tab === "gallery" && (
          <div className="mt-6 flex flex-col gap-5">
            <div className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
              <div className="font-display text-[17px] uppercase">Post photos to a school catalogue</div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <input
                  value={galleryCategory}
                  onChange={(e) => {
                    setGalleryCategory(e.target.value);
                    setGalleryPhotos(null);
                  }}
                  placeholder="School / catalogue name"
                  className={`${INPUT_CLASS} max-w-xs`}
                />
                <button onClick={() => loadGallery(galleryCategory)} className={`${BTN_CLASS} bg-concrete`}>
                  Load
                </button>
                <label className={`${BTN_CLASS} cursor-pointer bg-magenta text-white`}>
                  + Upload Photos
                  <input type="file" accept="image/*" multiple onChange={uploadGallery} className="hidden" />
                </label>
                {galleryBusy && <span className="font-marker text-[14px] text-magenta">compressing…</span>}
              </div>
              {galleryMsg && <div className="mt-2 text-[12.5px] font-bold text-magenta">{galleryMsg}</div>}
              <div className="mt-2 text-[11.5px] font-semibold text-ink/55">
                Images only · auto-compressed · up to 100 per school · live on the public Gallery instantly.
              </div>
            </div>
            {galleryPhotos && galleryPhotos.length > 0 && (
              <div className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
                <div className="mb-3 font-display text-[15px] uppercase">
                  {galleryCategory || "All"} · {galleryPhotos.length} photos
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                  {galleryPhotos.map((p) => (
                    <div key={p.id} className="relative overflow-hidden rounded-lg border-2 border-ink">
                      <img src={p.url} alt={p.caption} className="aspect-square w-full object-cover" />
                      <button
                        onClick={() => removeGalleryPhoto(p.id)}
                        aria-label="Delete"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md border-2 border-ink bg-white text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {galleryPhotos && galleryPhotos.length === 0 && (
              <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-white p-8 text-center font-semibold text-ink/60">
                No photos in “{galleryCategory || "this catalogue"}” yet. Upload some above.
              </div>
            )}
          </div>
        )}

        {tab === "stops" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
              <div className="font-display text-[17px] uppercase">+ Add a tour stop</div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <input value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} placeholder="School / venue name" className={`${INPUT_CLASS} min-w-[180px] flex-[2]`} />
                <input value={stopForm.location} onChange={(e) => setStopForm({ ...stopForm, location: e.target.value })} placeholder="Location (town, county)" className={`${INPUT_CLASS} min-w-[160px] flex-[2]`} />
                <input value={stopForm.day} onChange={(e) => setStopForm({ ...stopForm, day: e.target.value })} placeholder="Day" className={`${INPUT_CLASS} w-[70px] flex-none`} />
                <input value={stopForm.month} onChange={(e) => setStopForm({ ...stopForm, month: e.target.value })} placeholder="Month" className={`${INPUT_CLASS} w-[110px] flex-none`} />
                <button onClick={addStop} className={`${BTN_CLASS} bg-magenta text-white`}>Add</button>
              </div>
              {stopMsg && <div className="mt-2 text-[12.5px] font-bold text-magenta">{stopMsg}</div>}
            </div>
            {stops.length === 0 && (
              <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-white p-8 text-center font-semibold text-ink/60">
                No stops added here yet. Add one above.
              </div>
            )}
            {stops.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border-[3px] border-ink bg-white p-4 shadow-[4px_4px_0_#111]">
                <div className="min-w-[56px] text-center">
                  <div className="font-display text-[26px] leading-none text-magenta">{s.day || "—"}</div>
                  <div className="text-[12px] font-bold">{s.month}</div>
                </div>
                <div className="flex-1">
                  <div className="font-display text-[16px] uppercase">{s.name}</div>
                  <div className="text-[12.5px] text-ink/60">{s.location}</div>
                </div>
                <button onClick={() => removeStop(s.id)} className="rounded-lg border-2 border-ink bg-white px-3 py-2 text-[12px] font-bold text-magenta">Remove</button>
              </div>
            ))}
          </div>
        )}

        {tab === "newsroom" && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="rounded-xl border-[3px] border-ink bg-ink p-5 text-white shadow-[4px_4px_0_#FFD400]">
              <span className="font-display text-[17px] uppercase text-gold">Student submissions</span>
              <span className="ml-2.5 text-[12.5px] text-white/70">Approve to publish on Urban News. Your call, no AI, no waiting.</span>
            </div>
            {submissions.length === 0 && (
              <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-white p-8 text-center font-semibold text-ink/60">
                No student submissions yet. They arrive here from the &ldquo;Write For Urban News&rdquo; form.
              </div>
            )}
            {submissions.map((b) => (
              <div key={b.id} className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-display text-[16px] uppercase leading-none">
                      {b.title || b.name} <span className="font-sans text-[12px] normal-case text-ink/50">· {b.name}{b.org ? ` · ${b.org}` : ""}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink/70">{b.body}</p>
                  </div>
                  <div className="flex flex-none gap-2">
                    {b.status !== "published" ? (
                      <button onClick={() => publishSubmission(b.id)} className="rounded-lg border-2 border-ink bg-success px-4 py-2 font-display text-[13px] text-white">Publish ✓</button>
                    ) : (
                      <span className="rounded-lg border-2 border-ink bg-success px-4 py-2 text-[12px] font-bold text-white">Published</span>
                    )}
                    <button onClick={() => rejectSubmission(b.id)} className="rounded-lg border-2 border-dashed border-magenta px-3 py-2 text-[12px] font-bold text-magenta">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "admins" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border-[3px] border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
              <div className="font-display text-[17px] uppercase">Add a crew admin</div>
              <div className="mt-1 text-[12px] font-semibold text-ink/55">They get a generated password that opens ONLY the tools you tick. Revoke any time.</div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Admin name (e.g. Rania)" className={`${INPUT_CLASS} min-w-[200px] flex-1`} />
                <button onClick={createAdmin} className={`${BTN_CLASS} bg-ink text-gold`}>Generate Password →</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ADMIN_PERMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggleNewAdminPerm(p)}
                    className={`rounded-full border-2 border-ink px-3.5 py-2 text-[11.5px] font-bold uppercase ${newAdminPerms.includes(p) ? "bg-cyan" : "bg-white"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {madeAdmin && (
                <div className="mt-3.5 rounded-xl border-[3px] border-ink bg-success p-4 text-white">
                  <div className="text-[12px] font-bold uppercase tracking-wide">Access created for {madeAdmin.name}</div>
                  <div className="mt-1 font-display text-[26px] tracking-[0.08em]">{madeAdmin.pass}</div>
                  <div className="mt-1 text-[11.5px] opacity-90">Send them this password — it only opens their permitted tools at /admin.</div>
                </div>
              )}
            </div>
            {admins.length === 0 && (
              <div className="rounded-xl border-[3px] border-dashed border-ink/40 bg-white p-8 text-center font-semibold text-ink/60">
                No crew admins yet. Create the first one above.
              </div>
            )}
            {admins.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[3px] border-ink bg-white p-4 shadow-[4px_4px_0_#111]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-display text-[16px] uppercase">{a.name}</span>
                  {a.perms.map((p) => (
                    <span key={p} className="rounded-full border-2 border-ink bg-cyan px-2.5 py-0.5 text-[10px] font-bold uppercase">{p}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  {a.pass && <span className="rounded-lg border-2 border-dashed border-ink/40 bg-concrete px-3 py-1.5 text-[12.5px] font-bold">{a.pass}</span>}
                  <button onClick={() => revokeAdmin(a.id)} className="rounded-lg border-2 border-dashed border-magenta px-3 py-1.5 text-[12px] font-bold text-magenta">Revoke</button>
                </div>
              </div>
            ))}
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
