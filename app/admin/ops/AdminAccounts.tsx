'use client';

// Manage who can sign in to the Control Room via Google, and what they can
// touch. SUPER-ADMIN ONLY: AdminApp.tsx only renders this tab's button when
// the signed-in session's scope is super_admin (client-side UX - the real
// gate is app/api/admin/accounts/route.ts's isSuperAdmin() check on every
// call this component makes). Every add/edit/remove is audit-logged
// server-side with the acting super_admin's email.

import { useCallback, useEffect, useState } from 'react';
import { card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, td, th, Chip, Toast, useToast, OC } from './ui';

interface Account {
  email: string;
  role: 'super_admin' | 'crew_admin';
  perms: string[];
  added_at: string;
}

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

const EMPTY = { email: '', role: 'crew_admin' as 'super_admin' | 'crew_admin', perms: [] as string[] };

export default function AdminAccounts() {
  const [rows, setRows] = useState<Account[]>([]);
  const [moduleKeys, setModuleKeys] = useState<string[]>([]);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { status, data } = await api('/api/admin/accounts');
    if (status === 401) { setLoadErr('Super-admin access required.'); return; }
    if (data.error) { setLoadErr(data.error); return; }
    setLoadErr('');
    setRows(data.rows || []);
    setModuleKeys(data.moduleKeys || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const togglePerm = (k: string) => {
    if (!edit) return;
    const has = edit.perms.includes(k);
    setEdit({ ...edit, perms: has ? edit.perms.filter((p) => p !== k) : [...edit.perms, k] });
  };

  const save = async () => {
    if (!edit) return;
    const email = edit.email.trim().toLowerCase();
    if (!email || !email.includes('@')) { say('Enter a valid email'); return; }
    setBusy(true);
    const existing = rows.some((r) => r.email === email);
    const { data } = await api('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify({ kind: existing ? 'update' : 'add', data: { email, role: edit.role, perms: edit.perms } }),
    });
    setBusy(false);
    if (data.error) { say('Failed: ' + data.error); return; }
    say('Saved');
    setEdit(null);
    reload();
  };

  const remove = async (email: string) => {
    if (!confirm(`Remove admin access for ${email}? They will no longer be able to sign in with Google.`)) return;
    const { data } = await api('/api/admin/accounts', { method: 'POST', body: JSON.stringify({ kind: 'remove', data: { email } }) });
    if (data.error) say('Failed: ' + data.error); else { say('Removed'); reload(); }
  };

  if (loadErr) return <div style={{ ...card, fontSize: 13 }}>{loadErr}</div>;

  if (edit) {
    return (
      <div style={card}>
        <Toast msg={toast} />
        <h3 style={h3}>{rows.some((r) => r.email === edit.email.trim().toLowerCase()) ? 'EDIT ADMIN' : 'NEW ADMIN'}</h3>
        <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
          <div><span style={label}>Google email *</span><input style={inp} placeholder="name@example.com" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
          <div>
            <span style={label}>Role</span>
            <select style={inp} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as 'super_admin' | 'crew_admin' })}>
              <option value="crew_admin">Crew admin (scoped to selected modules)</option>
              <option value="super_admin">Super admin (full access, incl. managing admins)</option>
            </select>
          </div>
        </div>
        {edit.role === 'crew_admin' && (
          <div style={{ marginTop: 12 }}>
            <span style={label}>Modules this account can access</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {moduleKeys.map((k) => (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700,
                  padding: '6px 10px', border: '2px solid #111', borderRadius: 100,
                  background: edit.perms.includes(k) ? OC.magenta : '#fff', color: edit.perms.includes(k) ? '#fff' : '#111',
                  cursor: 'pointer',
                }}>
                  <input type="checkbox" checked={edit.perms.includes(k)} onChange={() => togglePerm(k)} style={{ margin: 0 }} />
                  {k}
                </label>
              ))}
            </div>
            {!edit.perms.length && <div style={{ fontSize: 12, color: OC.orange, marginTop: 6 }}>No modules selected - this account will be able to sign in but see nothing.</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={btnMagenta} disabled={busy} onClick={save}>Save admin</button>
          <button style={btnDark} onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={{ ...card, fontSize: 13 }}>
        Controls who can sign in to the Control Room with <b>Google Sign-In</b> and what they can touch. This screen and its API are super-admin only. The owner&apos;s access code always works and is always full access, independent of this list.
      </div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>ADMIN ACCOUNTS ({rows.length})</h3>
          <div style={{ flex: 1 }} />
          <button style={btn} onClick={() => setEdit({ ...EMPTY })}>+ Add admin</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>{['email', 'role', 'modules', 'added', ''].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email}>
                  <td style={td}>{r.email}</td>
                  <td style={td}><Chip text={r.role} bg={r.role === 'super_admin' ? '#111' : '#eee'} color={r.role === 'super_admin' ? '#fff' : '#333'} /></td>
                  <td style={{ ...td, maxWidth: 320 }}>
                    {r.role === 'super_admin' ? <span style={{ color: '#888' }}>all modules</span> : (r.perms.length ? r.perms.join(', ') : <span style={{ color: OC.orange }}>none</span>)}
                  </td>
                  <td style={td}>{String(r.added_at).slice(0, 10)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={btnSmall} onClick={() => setEdit({ email: r.email, role: r.role, perms: r.perms })}>Edit</button>
                      <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => remove(r.email)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td style={td} colSpan={5}>No accounts yet - only the access code and any ADMIN_GOOGLE_EMAILS env-listed addresses can sign in.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
