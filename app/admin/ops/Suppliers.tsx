'use client';

// Supplier / vendor management for the UGT Ops Suite.
// Tracks PA system providers, printers, caterers, staging companies,
// security firms and any other service vendor used on the tour.
// Same visual conventions as the rest of the ops suite: readable headings,
// magenta/yellow/cyan, hard drop shadows.

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Toast,
  useToast,
} from './ui';

interface Supplier {
  id: number;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  default_rate: number;
  notes: string;
  last_used_at: string | null;
  created_at: string;
}

const CATEGORIES = ['PA', 'Printing', 'Catering', 'Staging', 'Security', 'Other'] as const;

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  PA: { bg: '#E7EFF5', color: '#1A4F7A' },
  Printing: { bg: '#F5F0E7', color: '#7A4F1A' },
  Catering: { bg: '#E7F5EE', color: OC.green },
  Staging: { bg: '#F0E7F5', color: '#7A1A7A' },
  Security: { bg: '#FBE9E7', color: OC.red },
  Other: { bg: '#eee', color: '#555' },
};

const EMPTY = {
  id: null as number | null,
  name: '',
  category: 'Other',
  phone: '',
  email: '',
  address: '',
  defaultRate: 0,
  notes: '',
  lastUsedAt: '',
};

const fmt = (n: number) =>
  n ? 'KES ' + Math.round(n).toLocaleString('en-KE') : '—';

export default function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('suppliers');
    if (data.error) say('Load failed: ' + data.error);
    else setRows(data.rows || []);
  }, [say]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let result = rows;
    if (catFilter) result = result.filter((r) => r.category === catFilter);
    if (qy.trim()) {
      const needle = qy.toLowerCase();
      result = result.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(needle),
      );
    }
    return result;
  }, [rows, qy, catFilter]);

  // Group by category for the catalog view
  const byCategory = useMemo(() => {
    const map = new Map<string, Supplier[]>();
    for (const r of filtered) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const save = async () => {
    if (!edit || !edit.name.trim()) {
      say('Name is required');
      return;
    }
    setBusy(true);
    const { data } = await opsPost('supplier.save', {
      id: edit.id,
      name: edit.name,
      category: edit.category,
      phone: edit.phone,
      email: edit.email,
      address: edit.address,
      defaultRate: edit.defaultRate,
      notes: edit.notes,
      lastUsedAt: edit.lastUsedAt || null,
    });
    setBusy(false);
    if (data.error) {
      say('Failed: ' + data.error);
      return;
    }
    say('Saved');
    setEdit(null);
    reload();
  };

  const startEdit = (s: Supplier) =>
    setEdit({
      id: s.id,
      name: s.name,
      category: s.category,
      phone: s.phone,
      email: s.email,
      address: s.address,
      defaultRate: s.default_rate,
      notes: s.notes,
      lastUsedAt: fmtDate(s.last_used_at),
    });

  const del = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
    const { data } = await opsPost('supplier.delete', { id: s.id });
    if (data.error) say('Failed: ' + data.error);
    else reload();
  };

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT SUPPLIER' : 'NEW SUPPLIER'}</h3>
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <div>
            <span style={label}>Supplier name *</span>
            <input
              style={inp}
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="e.g. Sauti Sound Systems"
            />
          </div>
          <div>
            <span style={label}>Category</span>
            <select
              style={inp}
              value={edit.category}
              onChange={(e) => setEdit({ ...edit, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>Phone</span>
            <input
              style={inp}
              value={edit.phone}
              onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              placeholder="07..."
            />
          </div>
          <div>
            <span style={label}>Email</span>
            <input
              style={inp}
              type="email"
              value={edit.email}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
          </div>
          <div>
            <span style={label}>Default rate (KES)</span>
            <input
              style={inp}
              type="number"
              min="0"
              value={edit.defaultRate}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  defaultRate: Math.max(0, Number(e.target.value) || 0),
                })
              }
              placeholder="0"
            />
          </div>
          <div>
            <span style={label}>Last used</span>
            <input
              style={inp}
              type="date"
              value={edit.lastUsedAt}
              onChange={(e) => setEdit({ ...edit, lastUsedAt: e.target.value })}
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Address</span>
          <input
            style={inp}
            value={edit.address}
            onChange={(e) => setEdit({ ...edit, address: e.target.value })}
            placeholder="Physical address or area"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Notes (services offered, contact notes, price history)</span>
          <textarea
            style={{ ...inp, minHeight: 80 }}
            value={edit.notes}
            onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>
            Save supplier
          </button>
          <button style={btnDark} onClick={() => setEdit(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />

      {/* Header bar */}
      <div style={card}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h3 style={{ ...h3, marginBottom: 0 }}>
            SUPPLIERS &amp; VENDORS ({rows.length})
          </h3>
          <div style={{ flex: 1 }} />
          <input
            style={{ ...inp, maxWidth: 200 }}
            placeholder="Search..."
            value={qy}
            onChange={(e) => setQy(e.target.value)}
          />
          <select
            style={{ ...inp, maxWidth: 140 }}
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>
            + Add supplier
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          Service vendors for events — PA, printing, catering, staging,
          security and more. Default rates are reference figures for budgeting;
          always confirm current quotes before committing.
        </div>
      </div>

      {/* Price catalog grouped by category */}
      {byCategory.map(([category, suppliers]) => {
        const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
        return (
          <div key={category} style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  ...h3,
                  marginBottom: 0,
                  fontFamily: 'inherit',
                  color: OC.magenta,
                }}
              >
                {category.toUpperCase()}
              </h3>
              <Chip
                text={`${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''}`}
                bg={colors.bg}
                color={colors.color}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {['name', 'phone', 'email', 'default rate', 'address', 'last used', 'notes', ''].map(
                      (col) => (
                        <th key={col} style={th}>
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td style={td}>
                        <b>{s.name}</b>
                      </td>
                      <td style={td}>
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            style={{ color: OC.magenta, fontWeight: 700 }}
                          >
                            {s.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={td}>
                        {s.email ? (
                          <a
                            href={`mailto:${s.email}`}
                            style={{ color: OC.magenta, fontWeight: 700 }}
                          >
                            {s.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ ...td, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            background: s.default_rate ? '#FDF2D9' : '#eee',
                            color: s.default_rate ? OC.orange : '#999',
                            borderRadius: 100,
                            padding: '3px 10px',
                            fontSize: 12,
                          }}
                        >
                          {fmt(s.default_rate)}
                        </span>
                      </td>
                      <td style={{ ...td, fontSize: 12, color: '#666' }}>
                        {s.address || '—'}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {s.last_used_at ? (
                          <Chip
                            text={fmtDate(s.last_used_at)}
                            bg="#E7F5EE"
                            color={OC.green}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          ...td,
                          fontSize: 12,
                          color: '#666',
                          maxWidth: 260,
                        }}
                      >
                        {s.notes
                          ? s.notes.length > 100
                            ? s.notes.slice(0, 100) + '…'
                            : s.notes
                          : '—'}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button
                            style={btnSmall}
                            onClick={() => startEdit(s)}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              ...btnSmall,
                              background: '#111',
                              color: '#fff',
                            }}
                            onClick={() => del(s)}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {!rows.length && (
        <div
          style={{
            ...card,
            textAlign: 'center',
            color: '#666',
            fontSize: 13,
          }}
        >
          No suppliers yet. Add the PA companies, printers, caterers and other
          vendors you work with on tour.
        </div>
      )}
    </div>
  );
}
