'use client';

// Gallery photo wall — single source of truth for public/v25-template.html's
// this.GALLERY (see app/_components/V25App.tsx's window.__UGT_GALLERY bridge
// and app/api/site-data/gallery/route.ts for the public read side). New
// photos upload straight from the browser to the project's Vercel Blob store
// via @vercel/blob/client, so an 8MB image never has to round-trip through a
// Next.js function body — app/api/admin/gallery/upload/route.ts only ever
// issues the short-lived client token.

import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  OC, card, btn, btnSmall, inp, label, h3,
  api, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

interface Photo {
  id: number;
  url: string;
  caption: string;
  category: string;
  sort_order: number;
  created_at: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

function galleryGet() {
  return api('/api/admin/gallery');
}
function galleryPost(kind: string, data: any) {
  return api('/api/admin/gallery', { method: 'POST', body: JSON.stringify({ kind, data }) });
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'photo';
}

export default function Gallery() {
  const [rows, setRows] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { caption: string; category: string }>>({});
  const [toast, say] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [qy, setQy] = useState('');
  const shown = useSearch(rows, qy);

  const reload = useCallback(async () => {
    const { data } = await galleryGet();
    if (data.error) { say('Load failed: ' + data.error); return; }
    const list: Photo[] = data.rows || [];
    setRows(list);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of list) {
        if (!next[p.id]) next[p.id] = { caption: p.caption || '', category: p.category || '' };
      }
      return next;
    });
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const doUpload = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) { say('Only JPG, PNG or WEBP images are allowed'); return; }
    if (file.size > MAX_BYTES) { say('Image is too large — 8MB max'); return; }
    setBusy(true);
    setUploadPct(0);
    try {
      const blob = await upload(`gallery/${Date.now()}-${safeName(file.name)}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/gallery/upload',
        onUploadProgress: (ev) => setUploadPct(Math.round(ev.percentage)),
      });
      const { data } = await galleryPost('upload', { url: blob.url, caption: '', category: '' });
      if (data.error) { say('Upload failed: ' + data.error); return; }
      say('Photo uploaded');
      await reload();
    } catch (e: any) {
      say('Upload failed: ' + (e?.message || 'network error'));
    } finally {
      setBusy(false);
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) doUpload(f);
  };

  const saveMeta = async (p: Photo) => {
    const d = drafts[p.id] || { caption: '', category: '' };
    const { data } = await galleryPost('update', { id: p.id, caption: d.caption, category: d.category });
    if (data.error) { say('Save failed: ' + data.error); return; }
    say('Saved');
    reload();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = rows.slice();
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setRows(next);
    const { data } = await galleryPost('reorder', { ids: next.map((r) => r.id) });
    if (data.error) { say('Reorder failed: ' + data.error); reload(); }
  };

  const remove = async (p: Photo) => {
    if (!confirm('Delete this photo? This removes it from the site and, if it was an admin upload, permanently deletes the file.')) return;
    const { data } = await galleryPost('delete', { id: p.id });
    if (data.error) { say('Delete failed: ' + data.error); return; }
    say('Deleted');
    reload();
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>GALLERY / PHOTO WALL</h3>
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search by caption or category..." />
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Live: these photos feed the public site's photo wall. A new upload goes straight to storage from your browser (no code deploy) and is live within about a minute. Use the arrows to reorder — first photo shows first. Reordering is disabled while searching.
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `3px dashed ${dragOver ? OC.magenta : '#111'}`,
            borderRadius: 14,
            padding: 20,
            textAlign: 'center',
            background: dragOver ? '#FCE9F4' : '#fafafa',
            marginBottom: 4,
          }}
        >
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onPick} disabled={busy} />
          <div style={{ fontSize: 13, marginBottom: 10 }}>Drag a photo here, or</div>
          <button style={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? (uploadPct !== null ? `Uploading… ${uploadPct}%` : 'Uploading…') : '+ Upload photo'}
          </button>
          <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>JPG, PNG or WEBP — 8MB max</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {shown.map((p) => {
          const d = drafts[p.id] || { caption: '', category: '' };
          const i = rows.findIndex((r) => r.id === p.id);
          const reorderDisabled = qy.trim().length > 0;
          return (
            <div key={p.id} style={{ ...card, padding: 10, display: 'grid', gap: 8 }}>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid #111', aspectRatio: '4/3', background: '#eee' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || 'Gallery photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div>
                <span style={label}>Caption</span>
                <input style={inp} value={d.caption} onChange={(e) => setDrafts({ ...drafts, [p.id]: { ...d, caption: e.target.value } })} placeholder="e.g. Runway finale — Loreto Kiambu" />
              </div>
              <div>
                <span style={label}>Category / school</span>
                <input style={inp} value={d.category} onChange={(e) => setDrafts({ ...drafts, [p.id]: { ...d, category: e.target.value } })} placeholder="e.g. Loreto Kiambu Girls" />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button style={btnSmall} onClick={() => saveMeta(p)}>Save</button>
                <button style={btnSmall} disabled={reorderDisabled || i <= 0} onClick={() => move(i, -1)}>↑ Move up</button>
                <button style={btnSmall} disabled={reorderDisabled || i === rows.length - 1} onClick={() => move(i, 1)}>↓ Move down</button>
                <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          );
        })}
        {!shown.length && <div style={{ ...card, gridColumn: '1 / -1' }}>{rows.length ? 'No photos match your search.' : 'No photos yet — upload the first one above.'}</div>}
      </div>
    </div>
  );
}
