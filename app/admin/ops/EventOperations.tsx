"use client";

// Operational event desk, deliberately separate from the public Event
// Listings screen. This gives an event manager a safe working surface for an
// internal event header and checklist readiness without exposing commercial
// terms, budget, payment, expense or crew data.

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
  opsGet,
  opsPost,
  SearchBox,
  Toast,
  useSearch,
  useToast,
} from "./ui";

type EventRow = {
  id: number;
  name: string;
  school: string;
  event_date: string | null;
  status: string;
  checklist_total: number;
  checklist_done: number;
  updated_at: string;
};

const EMPTY = {
  id: null as number | null,
  name: "",
  school: "",
  eventDate: "",
  status: "planned",
};

const STATUS = [
  ["planned", "Planned"],
  ["confirmed", "Confirmed"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

function nextAction(row: EventRow): { text: string; color: string; bg: string } {
  const total = Number(row.checklist_total || 0);
  const done = Number(row.checklist_done || 0);
  if (row.status === "cancelled") return { text: "No action, cancelled", color: "#555", bg: "#eee" };
  if (row.status === "completed")
    return total && done < total
      ? { text: `Close ${total - done} checklist item${total - done === 1 ? "" : "s"}`, color: OC.orange, bg: "#FDF2D9" }
      : { text: "Operational record complete", color: OC.green, bg: "#E7F5EE" };
  if (!row.event_date) return { text: "Set the event date", color: OC.orange, bg: "#FDF2D9" };
  if (!total) return { text: "Start the event checklist", color: OC.orange, bg: "#FDF2D9" };
  if (done < total) return { text: `Complete ${total - done} checklist item${total - done === 1 ? "" : "s"}`, color: OC.orange, bg: "#FDF2D9" };
  if (row.status === "planned") return { text: "Update state when the host confirms", color: OC.magenta, bg: "#EFE7EC" };
  if (row.status === "confirmed") return { text: "Use the checklist on event day", color: OC.green, bg: "#E7F5EE" };
  return { text: "Close the operational record after the event", color: OC.magenta, bg: "#EFE7EC" };
}

export default function EventOperations({
  openChecklist,
}: {
  openChecklist: () => void;
}) {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [qy, setQy] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet("eventOps");
    if (data.error) say("Load failed: " + data.error);
    else setRows(data.rows || []);
  }, [say]);
  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useSearch(rows, qy);
  const openItems = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.status !== "completed" &&
          row.status !== "cancelled" &&
          Number(row.checklist_total || 0) > Number(row.checklist_done || 0),
      ).length,
    [rows],
  );

  const save = async () => {
    if (!edit?.name.trim()) {
      say("Event name is required");
      return;
    }
    setBusy(true);
    const { data } = await opsPost("eventOps.save", edit);
    setBusy(false);
    if (data.error) say("Failed: " + data.error);
    else {
      say("Event operations header saved");
      setEdit(null);
      reload();
    }
  };

  if (edit)
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? "EDIT EVENT OPERATIONS" : "NEW EVENT OPERATIONS"}</h3>
        <p style={{ fontSize: 12, color: "#666", marginTop: 0 }}>
          This creates the internal run sheet header only. Public website
          listings, commercial terms, budgets, payments and crew details are
          managed in their separate, permission-controlled tools.
        </p>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          }}
        >
          <div>
            <span style={label}>Event name *</span>
            <input
              style={inp}
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="Event or school activation name"
            />
          </div>
          <div>
            <span style={label}>School or host organisation</span>
            <input
              style={inp}
              value={edit.school}
              onChange={(e) => setEdit({ ...edit, school: e.target.value })}
              placeholder="Host organisation"
            />
          </div>
          <div>
            <span style={label}>Event date</span>
            <input
              style={inp}
              type="date"
              value={edit.eventDate}
              onChange={(e) => setEdit({ ...edit, eventDate: e.target.value })}
            />
          </div>
          <div>
            <span style={label}>Operational state</span>
            <select
              style={inp}
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value })}
            >
              {STATUS.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>
            Save operational event
          </button>
          <button style={btnDark} onClick={() => setEdit(null)}>
            Cancel
          </button>
        </div>
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
          <h3 style={{ ...h3, marginBottom: 0 }}>EVENT OPERATIONS</h3>
          <Chip
            text={`${openItems} checklist${openItems === 1 ? "" : "s"} needing attention`}
            bg={openItems ? "#FDF2D9" : "#E7F5EE"}
            color={openItems ? OC.orange : OC.green}
          />
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search events..." />
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>
            + Operational event
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 0 }}>
          The daily event desk. Use it to make the operational record clear,
          then complete its checklist. It never publishes a page or changes an
          amount.
        </p>
      </div>
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["event", "host", "date", "readiness", "next action", "state", "updated", ""].map(
                  (column) => (
                    <th key={column} style={th}>
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const total = Number(row.checklist_total || 0);
                const done = Number(row.checklist_done || 0);
                const ready = total > 0 && total === done;
                const action = nextAction(row);
                return (
                  <tr key={row.id}>
                    <td style={td}><b>{row.name}</b></td>
                    <td style={td}>{row.school || "—"}</td>
                    <td style={td}>{fmtDate(row.event_date) || "TBA"}</td>
                    <td style={td}>
                      <Chip
                        text={total ? `${done}/${total} checklist` : "checklist not started"}
                        bg={ready ? "#E7F5EE" : "#FDF2D9"}
                        color={ready ? OC.green : OC.orange}
                      />
                    </td>
                    <td style={td}><Chip text={action.text} bg={action.bg} color={action.color} /></td>
                    <td style={td}><Chip text={row.status.replaceAll("_", " ")} /></td>
                    <td style={td}>{fmtDate(row.updated_at)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button
                          style={btnSmall}
                          onClick={() =>
                            setEdit({
                              id: row.id,
                              name: row.name,
                              school: row.school,
                              eventDate: fmtDate(row.event_date),
                              status: row.status,
                            })
                          }
                        >
                          Edit
                        </button>
                        <button style={btnSmall} onClick={openChecklist}>
                          Checklist
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                    <td style={td} colSpan={8}>
                    {rows.length ? "No events match your search." : "No operational events yet. Create one after a lead is qualified or a school date is confirmed."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
