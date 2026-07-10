'use client';

// School and partner contacts: CRUD, wa.me quick chat, follow-up dates.
// Contacts are grouped by school/org; follow-ups due today or earlier float
// to the top so nothing slips.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OC, card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th,
  Chip, fmtDate, opsGet, opsPost, Toast, useToast, waLink,
} from './ui';

interface Contact {
  id: number; name: string; org: string; role: string; phone: string; email: string;
  notes: string; next_followup: string | null; status: string;
}

const EMPTY = { id: null as number | null, name: '', org: '', role: '', phone: '', email: '', notes: '', nextFollowup: '', status: 'lead' };

export default function Contacts() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [qy, setQy] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { data } = await opsGet('contacts');
    if (data.error) say('Load failed: ' + data.error); else setRows(data.rows || []);
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const today = new Date().toISOString().slice(0, 10);
  const due = useMemo(() => rows.filter((r) => r.next_followup && fmtDate(r.next_followup) <= today), [rows, today]);

  const groups = useMemo(() => {
    const filtered = rows.filter((r) => !qy || JSON.stringify(r).toLowerCase().includes(qy.toLowerCase()));
    const map = new Map<string, Contact[]>();
    for (const r of filtered) {
      const k = r.org || 'No school / org';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, qy]);

  const save = async () => {
    if (!edit || !edit.name.trim()) { say('Name is required'); return; }
    setBusy(true);
    const { data } = await opsPost('contact.save', edit);
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  const startEdit = (c: Contact) => setEdit({
    id: c.id, name: c.name, org: c.org, role: c.role, phone: c.phone, email: c.email,
    notes: c.notes, nextFollowup: fmtDate(c.next_followup), status: c.status,
  });

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{edit.id ? 'EDIT CONTACT' : 'NEW CONTACT'}</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div><span style={label}>Name *</span><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><span style={label}>School / org</span><input style={inp} value={edit.org} onChange={(e) => setEdit({ ...edit, org: e.target.value })} /></div>
          <div><span style={label}>Role (e.g. deputy principal)</span><input style={inp} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} /></div>
          <div><span style={label}>Phone</span><input style={inp} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="07... or 2547..." /></div>
          <div><span style={label}>Email</span><input style={inp} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
          <div><span style={label}>Status</span>
            <select style={inp} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              {['lead', 'active', 'partner', 'dormant'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><span style={label}>Next follow-up</span><input style={inp} type="date" value={edit.nextFollowup} onChange={(e) => setEdit({ ...edit, nextFollowup: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={label}>Notes (follow-up note, history)</span>
          <textarea style={{ ...inp, minHeight: 80 }} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save contact</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      {due.length > 0 && (
        <div style={{ ...card, borderColor: OC.orange, boxShadow: `5px 5px 0 ${OC.orange}` }}>
          <h3 style={h3}>FOLLOW-UPS DUE ({due.length})</h3>
          {due.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
              <Chip text={fmtDate(c.next_followup)} bg="#FDF2D9" color={OC.orange} />
              <b>{c.name}</b><span style={{ color: '#666' }}>{c.org}</span>
              <div style={{ flex: 1 }} />
              {c.phone && <a style={{ ...btnSmall, textDecoration: 'none', background: '#E7F5EE', color: OC.green }} target="_blank" rel="noopener" href={waLink(c.phone)}>WhatsApp</a>}
              <button style={btnSmall} onClick={() => startEdit(c)}>Open</button>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>CONTACTS ({rows.length})</h3>
          <div style={{ flex: 1 }} />
          <input style={{ ...inp, maxWidth: 220 }} placeholder="Search..." value={qy} onChange={(e) => setQy(e.target.value)} />
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>+ New contact</button>
        </div>
        {groups.map(([org, list]) => (
          <div key={org} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Anton', fontSize: 14, color: OC.magenta, borderBottom: '2px solid #111', paddingBottom: 4, marginBottom: 4 }}>{org.toUpperCase()}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr>{['name', 'role', 'phone', 'email', 'follow-up', 'status', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td style={td}><b>{c.name}</b>{c.notes ? <div style={{ fontSize: 11, color: '#888', maxWidth: 260 }}>{c.notes.slice(0, 120)}</div> : null}</td>
                      <td style={td}>{c.role}</td>
                      <td style={td}>{c.phone ? <a href={waLink(c.phone)} target="_blank" rel="noopener" style={{ color: OC.green, fontWeight: 700 }}>{c.phone}</a> : ''}</td>
                      <td style={td}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: OC.magenta, fontWeight: 700 }}>{c.email}</a> : ''}</td>
                      <td style={td}>{c.next_followup ? <Chip text={fmtDate(c.next_followup)} bg={fmtDate(c.next_followup) <= today ? '#FDF2D9' : '#eee'} color={fmtDate(c.next_followup) <= today ? OC.orange : '#555'} /> : ''}</td>
                      <td style={td}><Chip text={c.status} /></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button style={btnSmall} onClick={() => startEdit(c)}>Edit</button>
                          <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                            if (!confirm(`Delete contact ${c.name}?`)) return;
                            const { data } = await opsPost('contact.delete', { id: c.id });
                            if (data.error) say('Failed: ' + data.error); else reload();
                          }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!rows.length && <div style={{ fontSize: 13, color: '#666' }}>No contacts yet. Add the school heads, deputies and partners you deal with.</div>}
      </div>
    </div>
  );
}
