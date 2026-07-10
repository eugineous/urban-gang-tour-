'use client';

// Shared styling + helpers for the UGT Ops Suite tools. Follows AdminApp's
// visual conventions (hard borders, hard shadows, Anton headings) with the
// ops magenta #C7238E as the suite accent. Mobile-first: everything stacks
// and tables scroll inside their card at 375px.

import { useCallback, useEffect, useState } from 'react';

export const OC = {
  magenta: '#C7238E',
  charcoal: '#26262B',
  gold: '#E8A33D',
  green: '#1F8A5B',
  red: '#C0392B',
  orange: '#D97706',
  paper: '#fff',
};

export const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 14, boxShadow: '5px 5px 0 #111', padding: 14 };
export const btn: React.CSSProperties = { background: '#FFD400', color: '#111', fontWeight: 800, fontSize: 13, padding: '9px 14px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };
export const btnDark: React.CSSProperties = { ...btn, background: '#111', color: '#fff' };
export const btnMagenta: React.CSSProperties = { ...btn, background: OC.magenta, color: '#fff' };
export const btnSmall: React.CSSProperties = { ...btn, padding: '5px 9px', fontSize: 12 };
export const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
export const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid #111', whiteSpace: 'nowrap' };
export const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #eee', verticalAlign: 'top' };
export const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#555', display: 'block', marginBottom: 4 };
export const h3: React.CSSProperties = { fontFamily: 'Anton', margin: '0 0 8px', fontSize: 18, letterSpacing: '.02em' };

export function Chip({ text, color, bg }: { text: string; color?: string; bg?: string }) {
  return (
    <span style={{ background: bg || '#eee', color: color || '#333', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {text}
    </span>
  );
}

export function TbdBadge() {
  return <Chip text="TBD" bg="#FDF2D9" color={OC.orange} />;
}

export async function api(path: string, opts?: RequestInit): Promise<{ status: number; data: any }> {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

export function opsGet(view: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ view, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  return api(`/api/admin/ops?${qs}`);
}

export function opsPost(kind: string, data: any) {
  return api('/api/admin/ops', { method: 'POST', body: JSON.stringify({ kind, data }) });
}

export function fmtKES(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'TBD';
  return 'KES ' + Math.round(Number(n)).toLocaleString('en-KE');
}

export function fmtDate(v: unknown): string {
  if (!v) return '';
  return String(v).slice(0, 10);
}

export function waLink(phone: string, text?: string): string {
  const d = String(phone || '').replace(/\D/g, '');
  const wa = d.startsWith('254') ? d : d.startsWith('0') ? '254' + d.slice(1) : d;
  return `https://wa.me/${wa}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

// Numeric input that treats empty as null (renders as TBD in totals).
export function NumInput({ value, onChange, placeholder, min, style }: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  style?: React.CSSProperties;
}) {
  return (
    <input
      style={{ ...inp, ...style }}
      type="number"
      inputMode="numeric"
      min={min}
      placeholder={placeholder || 'TBD'}
      value={value === null || value === undefined ? '' : value}
      onChange={(e) => {
        const t = e.target.value;
        if (t === '') return onChange(null);
        const n = Number(t);
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}

export interface OpsEvent {
  id: number;
  name: string;
  school: string;
  event_date: string | null;
  distance_band: string;
  agreed_amount: number | null;
  next_due_date: string | null;
  status: string;
  latest_budget_version?: number | null;
  paid_total?: number;
}

export function useEvents(): { events: OpsEvent[]; reload: () => Promise<void>; error: string } {
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const { data } = await opsGet('events');
    if (data.error) setError(data.error);
    else setEvents(data.rows || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { events, reload, error };
}

export function EventSelect({ events, value, onChange, allowNone, noneLabel }: {
  events: OpsEvent[];
  value: number | null;
  onChange: (id: number | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  return (
    <select style={inp} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
      {(allowNone || value === null) && <option value="">{noneLabel || '- pick an event -'}</option>}
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.name}{ev.school ? ' - ' + ev.school : ''}{ev.event_date ? ' (' + fmtDate(ev.event_date) + ')' : ''}
        </option>
      ))}
    </select>
  );
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, ...card, padding: '10px 16px', background: '#FFD400' }}>{msg}</div>
  );
}

export function useToast(): [string, (m: string) => void] {
  const [msg, setMsg] = useState('');
  const say = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }, []);
  return [msg, say];
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>, cols: string[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const body = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
