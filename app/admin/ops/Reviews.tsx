'use client';

// Product review moderation for the existing /api/admin/reviews API.
// Only approved reviews are served publicly (and to Google via JSON-LD),
// so everything customers see passes through this screen.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OC, card, btn, btnSmall, h3, td, th,
  Chip, api, fmtDate, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

interface Review {
  id: number; product_id: string; author: string; rating: number;
  body: string; approved: boolean; created_at: string;
}

export default function Reviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const [qy, setQy] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const reload = useCallback(async () => {
    const { status, data } = await api('/api/admin/reviews');
    if (status !== 200 || data.error) say('Load failed: ' + (data.error || status)); else setRows(data.rows || []);
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const act = async (id: number, action: 'approve' | 'reject' | 'delete') => {
    if (action === 'delete' && !confirm('Delete this review permanently?')) return;
    const { data } = await api('/api/admin/reviews', { method: 'POST', body: JSON.stringify({ id, action }) });
    if (data.error) say('Failed: ' + data.error); else { say(action === 'approve' ? 'Approved (now public)' : action === 'reject' ? 'Unpublished' : 'Deleted'); reload(); }
  };

  const pendingAll = useMemo(() => rows.filter((r) => !r.approved), [rows]);
  const approvedAll = useMemo(() => rows.filter((r) => r.approved), [rows]);
  const pending = useSearch(pendingAll, qy);
  const approved = useSearch(approvedAll, qy);

  const toggleSelected = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allPendingSelected = pending.length > 0 && pending.every((r) => selected.has(r.id));
  const toggleSelectAllPending = () => setSelected((prev) => {
    if (allPendingSelected) {
      const next = new Set(prev);
      pending.forEach((r) => next.delete(r.id));
      return next;
    }
    const next = new Set(prev);
    pending.forEach((r) => next.add(r.id));
    return next;
  });

  // Bulk approve: loops the same single-review POST /api/admin/reviews the
  // per-row Approve button uses (identical isAdmin/hasPerm('reviews') gate,
  // one request per review). That route does not audit-log individual
  // approvals today, so there is no combined-vs-per-item audit_log tradeoff
  // to preserve here - the loop keeps the exact same server-side behaviour
  // as clicking Approve N times, just faster.
  const bulkApprove = async () => {
    const ids = pending.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (!ids.length) { say('Select at least one pending review'); return; }
    setBusy(true);
    let ok = 0; let fail = 0;
    for (const id of ids) {
      const { data } = await api('/api/admin/reviews', { method: 'POST', body: JSON.stringify({ id, action: 'approve' }) });
      if (data.error) fail++; else ok++;
    }
    setBusy(false);
    setSelected(new Set());
    say(fail ? `Approved ${ok}, ${fail} failed` : `Approved ${ok} review${ok === 1 ? '' : 's'}`);
    reload();
  };

  const stars = (n: number) => '*'.repeat(Math.max(0, Math.min(5, n))) + '.'.repeat(5 - Math.max(0, Math.min(5, n)));

  const table = (list: Review[], emptyMsg: string, withBulk?: boolean) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {withBulk && <th style={th}><input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAllPending} aria-label="Select all pending" /></th>}
            {['product', 'author', 'rating', 'review', 'date', 'actions'].map((c) => <th key={c} style={th}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              {withBulk && <td style={td}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)} aria-label={`Select review ${r.id}`} /></td>}
              <td style={td}><b>{r.product_id}</b></td>
              <td style={td}>{r.author}</td>
              <td style={td}><Chip text={`${r.rating}/5 ${stars(r.rating)}`} bg={r.rating >= 4 ? '#E7F5EE' : r.rating >= 3 ? '#FDF2D9' : '#FBE9E7'} color={r.rating >= 4 ? OC.green : r.rating >= 3 ? OC.orange : OC.red} /></td>
              <td style={{ ...td, maxWidth: 380 }}>{r.body}</td>
              <td style={td}>{fmtDate(r.created_at)}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {!r.approved && <button style={{ ...btnSmall, background: OC.green, color: '#fff' }} onClick={() => act(r.id, 'approve')}>Approve</button>}
                  {r.approved && <button style={{ ...btnSmall, background: '#FDF2D9', color: OC.orange }} onClick={() => act(r.id, 'reject')}>Unpublish</button>}
                  <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => act(r.id, 'delete')}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td style={td} colSpan={withBulk ? 7 : 6}>{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <SearchBox value={qy} onChange={setQy} placeholder="Search reviews by product, author, text..." style={{ maxWidth: 320 }} />
      </div>
      <div style={{ ...card, borderColor: pendingAll.length ? OC.orange : '#111', boxShadow: pendingAll.length ? `5px 5px 0 ${OC.orange}` : '5px 5px 0 #111' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>PENDING REVIEWS ({pending.length})</h3>
          <div style={{ flex: 1 }} />
          <button style={btn} disabled={busy || !selected.size} onClick={bulkApprove}>Approve selected ({selected.size})</button>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Nothing goes public (or into the shop JSON-LD Google reads) until you approve it here. Tick "select all pending" to bulk-approve everything currently shown.</div>
        {table(pending, pendingAll.length ? 'No pending reviews match your search.' : 'No reviews waiting for moderation.', true)}
      </div>
      <div style={card}>
        <h3 style={h3}>APPROVED AND LIVE ({approved.length})</h3>
        {table(approved, approvedAll.length ? 'No approved reviews match your search.' : 'No approved reviews yet.')}
      </div>
    </div>
  );
}
