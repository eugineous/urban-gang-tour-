"use client";

// Private commercial workspace for real merchandise sourcing. Supplier names,
// contacts and quotes never leave /api/admin/ops?view=merch, which requires
// ops_merch. Gross guidance is intentionally not called "profit": delivery,
// tax, payment fees and unsaved costs may still change the final result.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  OC,
  card,
  btn,
  btnDark,
  btnMagenta,
  btnSmall,
  inp,
  label,
  h3,
  td,
  th,
  Chip,
  fmtDate,
  fmtKES,
  opsGet,
  opsPost,
  SearchBox,
  Toast,
  useSearch,
  useToast,
} from "./ui";

type Product = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  inventory_tracked: boolean;
  reorder_point: number | null;
  inventory_move_count: number;
  inventory_on_hand: number;
};
type Supplier = {
  id: number;
  name: string;
  service: string;
  contact_name: string;
  phone: string;
  email: string;
  location: string;
  lead_days: number | null;
  minimum_order: number | null;
  notes: string;
  status: string;
};
type Quote = {
  id: number;
  supplier_id: number | null;
  product_id: string | null;
  supplier_name: string;
  product_name: string;
  retail_price: number | null;
  production_method: string;
  minimum_quantity: number | null;
  unit_cost: number | null;
  setup_cost: number | null;
  valid_until: string | null;
  note: string;
};
type InventoryMove = {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  move_type: string;
  note: string;
  reference: string;
  created_at: string;
};

const EMPTY_SUPPLIER = {
  id: null as number | null,
  name: "",
  service: "",
  contactName: "",
  phone: "",
  email: "",
  location: "",
  leadDays: null as number | null,
  minimumOrder: null as number | null,
  notes: "",
  status: "prospect",
};
const EMPTY_QUOTE = {
  id: null as number | null,
  supplierId: null as number | null,
  productId: "",
  productionMethod: "",
  minimumQuantity: null as number | null,
  unitCost: null as number | null,
  setupCost: null as number | null,
  validUntil: "",
  note: "",
};
const EMPTY_STOCK = {
  productId: "",
  moveType: "received",
  quantity: null as number | null,
  reorderPoint: null as number | null,
  note: "",
  reference: "",
};

function optionalNumber(value: string): number | null {
  return value === "" ? null : Math.max(0, Math.round(Number(value) || 0));
}

export default function MerchDesk() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [inventoryMoves, setInventoryMoves] = useState<InventoryMove[]>([]);
  const [supplierEdit, setSupplierEdit] = useState<
    typeof EMPTY_SUPPLIER | null
  >(null);
  const [quoteEdit, setQuoteEdit] = useState<typeof EMPTY_QUOTE | null>(null);
  const [stockEdit, setStockEdit] = useState<typeof EMPTY_STOCK | null>(null);
  const [tab, setTab] = useState<"overview" | "stock" | "suppliers" | "quotes">(
    "overview",
  );
  const [qy, setQy] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet("merch");
    if (data.error) {
      say("Load failed: " + data.error);
      return;
    }
    setProducts(
      (data.products || []).map((p: any) => ({ ...p, price: Number(p.price) })),
    );
    setSuppliers(data.suppliers || []);
    setQuotes(
      (data.quotes || []).map((q: any) => ({
        ...q,
        retail_price: q.retail_price === null ? null : Number(q.retail_price),
        unit_cost: q.unit_cost === null ? null : Number(q.unit_cost),
        setup_cost: q.setup_cost === null ? null : Number(q.setup_cost),
      })),
    );
    setInventoryMoves(
      (data.inventoryMoves || []).map((m: any) => ({
        ...m,
        quantity: Number(m.quantity),
      })),
    );
  }, [say]);
  useEffect(() => {
    reload();
  }, [reload]);

  const visibleQuotes = useSearch(quotes, qy);
  const activeSuppliers = suppliers.filter((s) => s.status === "active").length;
  const quotedProducts = new Set(
    quotes
      .filter((q) => q.unit_cost !== null && q.product_id)
      .map((q) => q.product_id),
  ).size;
  const bestByProduct = useMemo(() => {
    const map = new Map<string, Quote>();
    for (const quote of quotes) {
      if (!quote.product_id || quote.unit_cost === null) continue;
      const current = map.get(quote.product_id);
      if (!current || quote.unit_cost < (current.unit_cost ?? Infinity))
        map.set(quote.product_id, quote);
    }
    return map;
  }, [quotes]);

  const saveSupplier = async () => {
    if (!supplierEdit?.name.trim()) {
      say("Supplier name is required");
      return;
    }
    setBusy(true);
    const { data } = await opsPost("merchSupplier.save", supplierEdit);
    setBusy(false);
    if (data.error) say("Failed: " + data.error);
    else {
      say("Supplier saved");
      setSupplierEdit(null);
      reload();
    }
  };

  const saveQuote = async () => {
    if (!quoteEdit?.supplierId || !quoteEdit.productId) {
      say("Choose a supplier and product");
      return;
    }
    setBusy(true);
    const { data } = await opsPost("merchQuote.save", quoteEdit);
    setBusy(false);
    if (data.error) say("Failed: " + data.error);
    else {
      say("Quote saved");
      setQuoteEdit(null);
      reload();
    }
  };

  const saveStock = async () => {
    if (
      !stockEdit?.productId ||
      !stockEdit.quantity ||
      stockEdit.quantity < 1
    ) {
      say("Choose a product and enter the verified quantity");
      return;
    }
    setBusy(true);
    const { data } = await opsPost("merchInventory.record", stockEdit);
    setBusy(false);
    if (data.error) say("Failed: " + data.error);
    else {
      say("Stock movement recorded");
      setStockEdit(null);
      reload();
    }
  };

  if (stockEdit)
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>RECORD VERIFIED STOCK MOVEMENT</h3>
        <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
          The first saved movement turns tracking on for this product. Do not
          enter a guess: this is the operational stock record used after paid
          online orders.
        </p>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          }}
        >
          <div>
            <span style={label}>Product *</span>
            <select
              style={inp}
              value={stockEdit.productId}
              onChange={(e) =>
                setStockEdit({ ...stockEdit, productId: e.target.value })
              }
            >
              <option value="">Choose product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>Movement *</span>
            <select
              style={inp}
              value={stockEdit.moveType}
              onChange={(e) =>
                setStockEdit({ ...stockEdit, moveType: e.target.value })
              }
            >
              <option value="opening">Opening count (+)</option>
              <option value="received">Received delivery (+)</option>
              <option value="return">Return (+)</option>
              <option value="event_sale">Event or offline sale (-)</option>
              <option value="damage">Damage or loss (-)</option>
            </select>
          </div>
          <NumberField
            title="Verified quantity *"
            value={stockEdit.quantity}
            set={(quantity) => setStockEdit({ ...stockEdit, quantity })}
          />
          <NumberField
            title="Reorder point"
            value={stockEdit.reorderPoint}
            set={(reorderPoint) => setStockEdit({ ...stockEdit, reorderPoint })}
          />
          <Field
            title="Reference"
            value={stockEdit.reference}
            set={(reference) => setStockEdit({ ...stockEdit, reference })}
            placeholder="GRN, event name, delivery note..."
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Notes</span>
          <textarea
            style={{ ...inp, minHeight: 75 }}
            value={stockEdit.note}
            onChange={(e) =>
              setStockEdit({ ...stockEdit, note: e.target.value })
            }
            placeholder="Verified count, condition, location, or reason."
          />
        </div>
        <Actions
          busy={busy}
          save={saveStock}
          cancel={() => setStockEdit(null)}
        />
      </div>
    );

  if (supplierEdit)
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{supplierEdit.id ? "EDIT SUPPLIER" : "NEW SUPPLIER"}</h3>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          }}
        >
          <Field
            title="Business name *"
            value={supplierEdit.name}
            set={(name) => setSupplierEdit({ ...supplierEdit, name })}
          />
          <Field
            title="Service"
            value={supplierEdit.service}
            set={(service) => setSupplierEdit({ ...supplierEdit, service })}
            placeholder="Screen print, embroidery, blanks..."
          />
          <Field
            title="Contact name"
            value={supplierEdit.contactName}
            set={(contactName) =>
              setSupplierEdit({ ...supplierEdit, contactName })
            }
          />
          <Field
            title="Phone"
            value={supplierEdit.phone}
            set={(phone) => setSupplierEdit({ ...supplierEdit, phone })}
          />
          <Field
            title="Email"
            value={supplierEdit.email}
            set={(email) => setSupplierEdit({ ...supplierEdit, email })}
          />
          <Field
            title="Location"
            value={supplierEdit.location}
            set={(location) => setSupplierEdit({ ...supplierEdit, location })}
            placeholder="Town / delivery area"
          />
          <NumberField
            title="Lead time, days"
            value={supplierEdit.leadDays}
            set={(leadDays) => setSupplierEdit({ ...supplierEdit, leadDays })}
          />
          <NumberField
            title="Minimum order"
            value={supplierEdit.minimumOrder}
            set={(minimumOrder) =>
              setSupplierEdit({ ...supplierEdit, minimumOrder })
            }
          />
          <div>
            <span style={label}>Status</span>
            <select
              style={inp}
              value={supplierEdit.status}
              onChange={(e) =>
                setSupplierEdit({ ...supplierEdit, status: e.target.value })
              }
            >
              {["prospect", "active", "paused", "archived"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Notes</span>
          <textarea
            style={{ ...inp, minHeight: 75 }}
            value={supplierEdit.notes}
            onChange={(e) =>
              setSupplierEdit({ ...supplierEdit, notes: e.target.value })
            }
            placeholder="Quote source, artwork constraints, delivery terms. Enter verified facts only."
          />
        </div>
        <Actions
          busy={busy}
          save={saveSupplier}
          cancel={() => setSupplierEdit(null)}
        />
      </div>
    );

  if (quoteEdit)
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>
          {quoteEdit.id ? "EDIT SUPPLIER QUOTE" : "NEW SUPPLIER QUOTE"}
        </h3>
        <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
          Record a real written or verbal quote. Blank cost fields stay unknown,
          not zero.
        </p>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          }}
        >
          <div>
            <span style={label}>Supplier *</span>
            <select
              style={inp}
              value={quoteEdit.supplierId ?? ""}
              onChange={(e) =>
                setQuoteEdit({
                  ...quoteEdit,
                  supplierId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Choose supplier</option>
              {suppliers
                .filter((s) => s.status !== "archived")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <span style={label}>Product *</span>
            <select
              style={inp}
              value={quoteEdit.productId}
              onChange={(e) =>
                setQuoteEdit({ ...quoteEdit, productId: e.target.value })
              }
            >
              <option value="">Choose product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            title="Production method"
            value={quoteEdit.productionMethod}
            set={(productionMethod) =>
              setQuoteEdit({ ...quoteEdit, productionMethod })
            }
            placeholder="Embroidery, DTF, screen print..."
          />
          <NumberField
            title="Minimum quantity"
            value={quoteEdit.minimumQuantity}
            set={(minimumQuantity) =>
              setQuoteEdit({ ...quoteEdit, minimumQuantity })
            }
          />
          <NumberField
            title="Unit cost, KES"
            value={quoteEdit.unitCost}
            set={(unitCost) => setQuoteEdit({ ...quoteEdit, unitCost })}
          />
          <NumberField
            title="One-off setup cost, KES"
            value={quoteEdit.setupCost}
            set={(setupCost) => setQuoteEdit({ ...quoteEdit, setupCost })}
          />
          <div>
            <span style={label}>Valid until</span>
            <input
              style={inp}
              type="date"
              value={quoteEdit.validUntil}
              onChange={(e) =>
                setQuoteEdit({ ...quoteEdit, validUntil: e.target.value })
              }
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Quote notes</span>
          <textarea
            style={{ ...inp, minHeight: 75 }}
            value={quoteEdit.note}
            onChange={(e) =>
              setQuoteEdit({ ...quoteEdit, note: e.target.value })
            }
            placeholder="What is included, sample status, artwork conditions, delivery."
          />
        </div>
        <Actions
          busy={busy}
          save={saveQuote}
          cancel={() => setQuoteEdit(null)}
        />
      </div>
    );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ ...h3, marginBottom: 0 }}>MERCH DESK</h3>
          <div style={{ flex: 1 }} />
          <button
            style={btn}
            onClick={() => setSupplierEdit({ ...EMPTY_SUPPLIER })}
          >
            + Supplier
          </button>
          <button
            style={btnMagenta}
            onClick={() => setQuoteEdit({ ...EMPTY_QUOTE })}
          >
            + Quote
          </button>
          <button
            style={btnDark}
            onClick={() => setStockEdit({ ...EMPTY_STOCK })}
          >
            + Stock move
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          Private sourcing and cost workspace. It never changes checkout pricing
          by itself. Set the public retail price in Products only after
          reviewing real quotes.
        </div>
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
        >
          {(["overview", "stock", "suppliers", "quotes"] as const).map((t) => (
            <button
              key={t}
              style={{
                ...btnSmall,
                background: tab === t ? OC.magenta : "#fff",
                color: tab === t ? "#fff" : "#111",
                textTransform: "capitalize",
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === "overview" && (
        <>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            }}
          >
            <Metric
              value={String(products.filter((p) => p.active).length)}
              label="Active products"
            />
            <Metric value={String(activeSuppliers)} label="Active suppliers" />
            <Metric
              value={`${quotedProducts} / ${products.length}`}
              label="Products with a unit quote"
            />
            <Metric
              value={String(products.filter((p) => p.inventory_tracked).length)}
              label="Products being tracked"
            />
          </div>
          <div style={card}>
            <h3 style={h3}>PRICE READINESS</h3>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              Best recorded unit quote versus live retail. This is gross
              guidance only, not final profit.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {[
                      "product",
                      "retail",
                      "best recorded quote",
                      "gross before other costs",
                      "supplier",
                    ].map((c) => (
                      <th key={c} style={th}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const quote = bestByProduct.get(p.id);
                    const gross =
                      quote?.unit_cost !== null &&
                      quote?.unit_cost !== undefined
                        ? p.price - quote.unit_cost
                        : null;
                    return (
                      <tr key={p.id}>
                        <td style={td}>
                          <b>{p.name}</b>
                        </td>
                        <td style={td}>{fmtKES(p.price)}</td>
                        <td style={td}>
                          {quote ? (
                            fmtKES(quote.unit_cost)
                          ) : (
                            <Chip
                              text="quote needed"
                              bg="#FDF2D9"
                              color={OC.orange}
                            />
                          )}
                        </td>
                        <td
                          style={{
                            ...td,
                            color:
                              gross !== null && gross < 0 ? OC.red : OC.green,
                            fontWeight: 800,
                          }}
                        >
                          {gross === null ? "Unknown" : fmtKES(gross)}
                        </td>
                        <td style={td}>{quote?.supplier_name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {tab === "stock" && (
        <>
          <div style={card}>
            <h3 style={h3}>STOCK READINESS</h3>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              Untracked means no verified opening or delivery count has been
              recorded. It is not the same as zero stock. Paid online orders
              reduce only tracked products, once per paid order.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {[
                      "product",
                      "on hand",
                      "reorder point",
                      "state",
                      "history",
                    ].map((c) => (
                      <th key={c} style={th}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const needsReorder =
                      p.inventory_tracked &&
                      p.reorder_point !== null &&
                      p.inventory_on_hand <= p.reorder_point;
                    return (
                      <tr key={p.id}>
                        <td style={td}>
                          <b>{p.name}</b>
                        </td>
                        <td style={{ ...td, fontWeight: 800 }}>
                          {p.inventory_tracked
                            ? p.inventory_on_hand
                            : "Not tracking"}
                        </td>
                        <td style={td}>
                          {p.inventory_tracked
                            ? (p.reorder_point ?? "Not set")
                            : "—"}
                        </td>
                        <td style={td}>
                          {p.inventory_tracked ? (
                            <Chip
                              text={needsReorder ? "reorder review" : "tracked"}
                              bg={needsReorder ? "#FDF2D9" : "#E7F7ED"}
                              color={needsReorder ? OC.orange : OC.green}
                            />
                          ) : (
                            <Chip text="not tracking" />
                          )}
                        </td>
                        <td style={td}>
                          {p.inventory_move_count} movement
                          {p.inventory_move_count === 1 ? "" : "s"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={card}>
            <h3 style={h3}>RECENT STOCK ACTIVITY</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {[
                      "date",
                      "product",
                      "movement",
                      "quantity",
                      "reference",
                      "notes",
                    ].map((c) => (
                      <th key={c} style={th}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryMoves.map((m) => (
                    <tr key={m.id}>
                      <td style={td}>{fmtDate(m.created_at)}</td>
                      <td style={td}>{m.product_name}</td>
                      <td style={td}>
                        <Chip text={m.move_type.replace("_", " ")} />
                      </td>
                      <td
                        style={{
                          ...td,
                          fontWeight: 800,
                          color: m.quantity < 0 ? OC.red : OC.green,
                        }}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </td>
                      <td style={td}>{m.reference || "—"}</td>
                      <td style={td}>{m.note || "—"}</td>
                    </tr>
                  ))}
                  {!inventoryMoves.length && (
                    <tr>
                      <td style={td} colSpan={6}>
                        No movements yet. Record a verified opening count or
                        delivery when stock is physically confirmed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {tab === "suppliers" && (
        <div style={card}>
          <h3 style={h3}>SUPPLIERS ({suppliers.length})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {[
                    "supplier",
                    "service",
                    "contact",
                    "lead / minimum",
                    "status",
                    "",
                  ].map((c) => (
                    <th key={c} style={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td style={td}>
                      <b>{s.name}</b>
                      <div style={{ fontSize: 11, color: "#777" }}>
                        {s.location}
                      </div>
                    </td>
                    <td style={td}>{s.service}</td>
                    <td style={td}>
                      {s.contact_name}
                      <div>{s.phone}</div>
                      <div>{s.email}</div>
                    </td>
                    <td style={td}>
                      {s.lead_days ?? "TBD"} days / {s.minimum_order ?? "TBD"}{" "}
                      units
                    </td>
                    <td style={td}>
                      <Chip text={s.status} />
                    </td>
                    <td style={td}>
                      <button
                        style={btnSmall}
                        onClick={() =>
                          setSupplierEdit({
                            id: s.id,
                            name: s.name,
                            service: s.service,
                            contactName: s.contact_name,
                            phone: s.phone,
                            email: s.email,
                            location: s.location,
                            leadDays: s.lead_days,
                            minimumOrder: s.minimum_order,
                            notes: s.notes,
                            status: s.status,
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {!suppliers.length && (
                  <tr>
                    <td style={td} colSpan={6}>
                      No suppliers yet. Add verified printer, embroidery and
                      blanks contacts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "quotes" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h3 style={{ ...h3, marginBottom: 0 }}>QUOTES ({quotes.length})</h3>
            <div style={{ flex: 1 }} />
            <SearchBox
              value={qy}
              onChange={setQy}
              placeholder="Search quotes..."
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {[
                    "product",
                    "supplier",
                    "method",
                    "minimum",
                    "unit cost",
                    "setup",
                    "valid",
                    "",
                  ].map((c) => (
                    <th key={c} style={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleQuotes.map((q) => (
                  <tr key={q.id}>
                    <td style={td}>{q.product_name || "Retained record"}</td>
                    <td style={td}>{q.supplier_name || "Archived supplier"}</td>
                    <td style={td}>{q.production_method}</td>
                    <td style={td}>{q.minimum_quantity ?? "TBD"}</td>
                    <td style={td}>{fmtKES(q.unit_cost)}</td>
                    <td style={td}>{fmtKES(q.setup_cost)}</td>
                    <td style={td}>{fmtDate(q.valid_until)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          style={btnSmall}
                          onClick={() =>
                            setQuoteEdit({
                              id: q.id,
                              supplierId: q.supplier_id,
                              productId: q.product_id || "",
                              productionMethod: q.production_method,
                              minimumQuantity: q.minimum_quantity,
                              unitCost: q.unit_cost,
                              setupCost: q.setup_cost,
                              validUntil: fmtDate(q.valid_until),
                              note: q.note,
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            ...btnSmall,
                            background: "#111",
                            color: "#fff",
                          }}
                          onClick={async () => {
                            if (!confirm("Delete this quote?")) return;
                            const { data } = await opsPost(
                              "merchQuote.delete",
                              { id: q.id },
                            );
                            if (data.error) say("Failed: " + data.error);
                            else reload();
                          }}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleQuotes.length && (
                  <tr>
                    <td style={td} colSpan={8}>
                      {quotes.length
                        ? "No quotes match your search."
                        : "No quotes yet. Add a real supplier quote to compare it safely."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  title,
  value,
  set,
  placeholder,
}: {
  title: string;
  value: string;
  set: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <span style={label}>{title}</span>
      <input
        style={inp}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
function NumberField({
  title,
  value,
  set,
}: {
  title: string;
  value: number | null;
  set: (value: number | null) => void;
}) {
  return (
    <div>
      <span style={label}>{title}</span>
      <input
        style={inp}
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => set(optionalNumber(e.target.value))}
        placeholder="TBD"
      />
    </div>
  );
}
function Actions({
  busy,
  save,
  cancel,
}: {
  busy: boolean;
  save: () => void;
  cancel: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      <button style={btnMagenta} disabled={busy} onClick={save}>
        Save
      </button>
      <button style={btnDark} onClick={cancel}>
        Cancel
      </button>
    </div>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontFamily: "Anton", fontSize: 25, color: OC.magenta }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#666",
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}
