'use client';

// Product review moderation for the existing /api/admin/reviews API.
// Only approved reviews are served publicly (and to Google via JSON-LD),
// so everything customers see passes through this screen.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OC, card, btnSmall, h3, td, th,
  Chip, api, fmtDate, Toast, useToast,
} from './ui';

interface Review {
  id: number; product_id: string; author: string; rating: number;
  body: string; approved: boolean; created_at: string;
}

export default function Reviews() {
  const [rows, setRows] = useState<Review[]>([]);
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

  const pending = useMemo(() => rows.filter((r) => !r.approved), [rows]);
  const approved = useMemo(() => rows.filter((r) => r.approved), [rows]);

  const stars = (n: number) => '*'.repeat(Math.max(0, Math.min(5, n))) + '.'.repeat(5 - Math.max(0, Math.min(5, n)));

  const table = (list: Review[], emptyMsg: string) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr>{['product', 'author', 'rating', 'review', 'date', 'actions'].map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
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
          {!list.length && <tr><td style={td} colSpan={6}>{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={{ ...card, borderColor: pending.length ? OC.orange : '#111', boxShadow: pending.length ? `5px 5px 0 ${OC.orange}` : '5px 5px 0 #111' }}>
        <h3 style={h3}>PENDING REVIEWS ({pending.length})</h3>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Nothing goes public (or into the shop JSON-LD Google reads) until you approve it here.</div>
        {table(pending, 'No reviews waiting for moderation.')}
      </div>
      <div style={card}>
        <h3 style={h3}>APPROVED AND LIVE ({approved.length})</h3>
        {table(approved, 'No approved reviews yet.')}
      </div>
    </div>
  );
}
